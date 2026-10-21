<?php

namespace Tests\Feature;

use App\Libraries\LicenseService;
use CodeIgniter\Shield\Models\UserModel;
use CodeIgniter\Shield\Test\AuthenticationTesting;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;
use Tests\Support\CsrfTokenTrait;

/**
 * End-to-end enforcement of the licence rules over real HTTP requests.
 *
 * WHY THIS IS AN HTTP TEST AND NOT A SERVICE TEST
 * ------------------------------------------------
 * LicenseTest already proves what LicenseService decides. What this file
 * proves is that the DECISION REACHES THE WIRE: that a POST to a school
 * endpoint really comes back 402, that a GET still comes back with the data,
 * and that the Super Admin console is never locked out by the rule that
 * collects the money.
 *
 * The licence filter runs on the school routes, so these tests sign a real
 * Shield user in, bind it to a real school, issue it a real licence and then
 * make the request.
 *
 * @internal
 */
final class LicenseEnforcementTest extends CIUnitTestCase
{
    use FeatureTestTrait;
    use AuthenticationTesting;
    use CsrfTokenTrait;

    /** A school id that no real installation uses. */
    private const SCHOOL = 999904;

    /** A user id that no real installation uses. */
    private const USER = 999904;

    private const PASSWORD = 'Licence-Test-Passw0rd!';

    private LicenseService $licenses;

    protected function setUp(): void
    {
        parent::setUp();

        $this->licenses = new LicenseService();

        $this->clean();
    }

    protected function tearDown(): void
    {
        $this->clean();

        // A shared auth service caches the signed-in user across test methods, so
        // a later test inherits a stale identity. Reset it on every tearDown.
        \Config\Services::resetSingle('auth');
        $_SESSION = [];

        parent::tearDown();
    }

    private function clean(): void
    {
        $db = \Config\Database::connect();

        foreach (['license_payments', 'license_invoices', 'school_licenses'] as $table) {
            $db->table($table)->where('school_id', self::SCHOOL)->delete();
        }

        $db->table('user_school_access')->where('user_id', self::USER)->delete();
        $db->table('user_school_access')->where('school_id', self::SCHOOL)->delete();
        $db->table('auth_groups_users')->where('user_id', self::USER)->delete();
        $db->table('auth_identities')->where('user_id', self::USER)->delete();
        $db->table('users')->where('id', self::USER)->delete();
        $db->table('schools')->where('id', self::SCHOOL)->delete();
        $db->table('schools')->where('school_code', 'LICTEST')->delete();
    }

    // -----------------------------------------------------------------
    // fixtures
    // -----------------------------------------------------------------

    private function makeSchool(): int
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $db->table('schools')->insert([
            'id'                 => self::SCHOOL,
            'name'               => 'Licence Test School',
            'status'             => 'active',
            'plan_code'          => 'starter',
            'school_code'        => 'LICTEST',
            'timezone'           => 'Asia/Karachi',
            'currency'           => 'PKR',
            'locale'             => 'en',
            'contact_email'      => 'licence@example.test',
            'contact_phone'      => '0000000000',
            'address'            => '',
            'installation_state' => 'completed',
            'installation_status' => 'completed',
            'created_at'         => $now,
            'updated_at'         => $now,
        ]);

        return self::SCHOOL;
    }

    /**
     * A real Shield user in a real group, bound to a real school.
     */
    private function makeUser(string $group = 'school_admin', ?int $schoolId = null): int
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $db->table('users')->insert([
            'id'         => self::USER,
            'username'   => 'licence_tester',
            'status'     => 'active',
            'active'     => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $db->table('auth_identities')->insert([
            'user_id'    => self::USER,
            'type'       => 'email_password',
            'name'       => 'licence@example.test',
            'secret'     => password_hash(self::PASSWORD, PASSWORD_DEFAULT),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $db->table('auth_groups_users')->insert([
            'user_id'    => self::USER,
            'group'      => $group,
            'created_at' => $now,
        ]);

        if ($schoolId !== null) {
            $db->table('user_school_access')->insert([
                'user_id'    => self::USER,
                'school_id'  => $schoolId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        return self::USER;
    }

    /**
     * Sign the user in for the following request.
     *
     * Shield's own AuthenticationTesting trait is used rather than a faked
     * session: it puts the user straight into the session authenticator, which
     * is the same state a real sign-in leaves behind. Faking only the session
     * array is not enough, because the authenticator is a shared service that
     * remembers the previous request's user.
     */
    private function signIn(int $userId): void
    {
        $user = model(UserModel::class)->findById($userId);

        $this->assertNotNull($user, 'The test user must exist before it can sign in.');

        $this->actingAs($user);
    }

    private function planId(string $code = 'starter'): int
    {
        $row = \Config\Database::connect()->table('license_plans')->where('code', $code)->select('id')->get()->getRow();

        $this->assertNotNull($row, 'Plan catalogue must be seeded before licensing can be tested.');

        return (int) $row->id;
    }

    // -----------------------------------------------------------------
    // the rule: expired means read-only
    // -----------------------------------------------------------------

    public function testWriteOnAnExpiredSchoolIsRefusedWith402(): void
    {
        $this->makeSchool();
        $this->makeUser('school_admin', self::SCHOOL);

        $this->licenses->issue(self::SCHOOL, $this->planId(), null, [
            'expires_at' => date('Y-m-d', strtotime('-20 days')),
            'grace_days' => 14,
        ]);

        $this->signIn(self::USER);

        $result = $this->withCsrf()->post('/api/school/students', ['name' => 'Should Be Refused']);

        $this->assertSame(402, $result->response()->getStatusCode());

        $body = json_decode((string) $result->response()->getBody(), true);

        $this->assertIsArray($body);
        $this->assertFalse($body['can_write'] ?? null);
        $this->assertSame('expired', $body['state'] ?? null);

        // The message must reassure the school that its data is intact.
        $this->assertStringContainsString('safe', strtolower((string) ($body['message'] ?? '')));
    }

    public function testWriteInsideTheGracePeriodIsAlsoRefused(): void
    {
        $this->makeSchool();
        $this->makeUser('school_admin', self::SCHOOL);

        $this->licenses->issue(self::SCHOOL, $this->planId(), null, [
            'expires_at' => date('Y-m-d', strtotime('-5 days')),
            'grace_days' => 14,
        ]);

        $this->signIn(self::USER);

        $result = $this->withCsrf()->post('/api/school/students', ['name' => 'Should Be Refused']);

        $this->assertSame(402, $result->response()->getStatusCode());

        $body = json_decode((string) $result->response()->getBody(), true);

        $this->assertSame('grace', $body['state'] ?? null);
    }

    public function testWriteOnAnActiveSchoolIsAllowed(): void
    {
        $this->makeSchool();
        $this->makeUser('school_admin', self::SCHOOL);

        $this->licenses->issue(self::SCHOOL, $this->planId(), null, [
            'expires_at' => date('Y-m-d', strtotime('+200 days')),
        ]);

        $this->signIn(self::USER);

        $result = $this->withCsrf()->post('/api/school/students', ['name' => 'Should Be Allowed']);

        // The licence must NOT be what stopped it. A school database may be
        // unavailable in the test environment, so the assertion is that the
        // response is not a licence refusal.
        $this->assertNotSame(402, $result->response()->getStatusCode());
    }

    // -----------------------------------------------------------------
    // the rule: expired means READ-ONLY, not deleted
    // -----------------------------------------------------------------

    public function testReadOnAnExpiredSchoolIsStillAllowed(): void
    {
        $this->makeSchool();
        $this->makeUser('school_admin', self::SCHOOL);

        $this->licenses->issue(self::SCHOOL, $this->planId(), null, [
            'expires_at' => date('Y-m-d', strtotime('-20 days')),
            'grace_days' => 14,
        ]);

        $this->signIn(self::USER);

        $result = $this->get('/api/school/students');

        // A GET must never be refused by the licence. It may fail for an
        // unrelated reason (no school database in the test environment), but
        // it must never be a 402.
        $this->assertNotSame(402, $result->response()->getStatusCode());
    }

    public function testLicenceFilterNeverBlocksAReadRequest(): void
    {
        $this->makeSchool();
        $this->makeUser('school_admin', self::SCHOOL);

        $this->licenses->issue(self::SCHOOL, $this->planId(), null, [
            'expires_at' => date('Y-m-d', strtotime('-20 days')),
            'grace_days' => 14,
        ]);

        $this->signIn(self::USER);

        foreach (['/api/school/students', '/api/school/invoices'] as $read) {
            $result = $this->get($read);

            $this->assertNotSame(
                402,
                $result->response()->getStatusCode(),
                "A read ({$read}) must never be refused by the licence."
            );
        }
    }

    // -----------------------------------------------------------------
    // the rule: the operator is never locked out
    // -----------------------------------------------------------------

    public function testSuperAdminIsNotBlockedByTheLicenceFilter(): void
    {
        $this->makeSchool();

        // A Super Admin is a platform operator: no school, and therefore no
        // school licence. The filter must not turn that into a 402.
        $this->makeUser('superadmin', null);

        $this->signIn(self::USER);

        $result = $this->withCsrf()->post('/admin/schools', ['name' => 'Should Be Allowed']);

        $this->assertNotSame(
            402,
            $result->response()->getStatusCode(),
            'The operator who collects the fees must never be locked out by the licence.'
        );
    }

    public function testSuperAdminStillReachesTheConsole(): void
    {
        $this->makeUser('superadmin', null);

        $this->signIn(self::USER);

        $result = $this->get('/portal');

        $this->assertSame(200, $result->response()->getStatusCode());
    }

    public function testSuperAdminRoleIsActuallyDetected(): void
    {
        // Regression guard for a real bug: the filter used
        // auth()->getUserGroups(), which Shield does not implement. The
        // unknown call was swallowed by Auth::__call() and returned null, so
        // EVERY user looked like a non-Super-Admin and the operator was
        // blocked by a licence that does not even apply to them.
        $this->makeUser('superadmin', null);

        $this->signIn(self::USER);

        $user = auth()->user();

        $this->assertNotNull($user, 'The signed-in user must be resolved from the session.');
        $this->assertTrue(
            \App\Policies\RolePolicy::isSuperAdmin($user),
            'A user in the superadmin group must be recognised as a Super Admin.'
        );
    }

    public function testSchoolAdminIsNotMistakenForASuperAdmin(): void
    {
        $this->makeSchool();
        $this->makeUser('school_admin', self::SCHOOL);

        $this->signIn(self::USER);

        $user = auth()->user();

        $this->assertNotNull($user);
        $this->assertFalse(
            \App\Policies\RolePolicy::isSuperAdmin($user),
            'A school admin must never be treated as a platform operator.'
        );
    }

    // -----------------------------------------------------------------
    // the rule: no licence at all is read-only too
    // -----------------------------------------------------------------

    public function testWriteWithNoLicenceAtAllIsRefused(): void
    {
        $this->makeSchool();
        $this->makeUser('school_admin', self::SCHOOL);

        // No licence issued at all.
        $this->signIn(self::USER);

        $result = $this->withCsrf()->post('/api/school/students', ['name' => 'Should Be Refused']);

        $this->assertSame(402, $result->response()->getStatusCode());

        $body = json_decode((string) $result->response()->getBody(), true);

        $this->assertFalse($body['can_write'] ?? null);
    }

    public function testRevokedLicenceIsRefusedEvenWithFutureDates(): void
    {
        $this->makeSchool();
        $this->makeUser('school_admin', self::SCHOOL);

        $this->licenses->issue(self::SCHOOL, $this->planId(), null, [
            'expires_at' => date('Y-m-d', strtotime('+200 days')),
        ]);

        $this->assertTrue($this->licenses->revoke(self::SCHOOL, 'payment dispute'));

        $this->signIn(self::USER);

        $result = $this->withCsrf()->post('/api/school/students', ['name' => 'Should Be Refused']);

        $this->assertSame(402, $result->response()->getStatusCode());

        $body = json_decode((string) $result->response()->getBody(), true);

        $this->assertSame('revoked', $body['state'] ?? null);
    }
}