<?php

namespace Tests\Feature;

use CodeIgniter\Shield\Models\UserModel;
use CodeIgniter\Shield\Test\AuthenticationTesting;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;
use Tests\Support\CsrfTokenTrait;

/**
 * The JSON denial contract of the role filter, the tightened school API
 * route groups (role-permission-matrix section 3), the Super Admin
 * school-link exemption, and disabled public registration.
 *
 * These are the HTTP-level assertions behind gate G6: a refusal on an API
 * path is a JSON 401/403 with a stable error code - never a redirect, never
 * 200-with-data - and browser paths keep their redirect UX.
 *
 * @internal
 */
final class RoleFilterApiDenialTest extends CIUnitTestCase
{
    use FeatureTestTrait;
    use AuthenticationTesting;
    use CsrfTokenTrait;

    /** A user id that no real installation uses. */
    private const USER = 999906;

    /** A school id that no real installation uses. */
    private const SCHOOL = 999906;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clean();
    }

    protected function tearDown(): void
    {
        $this->clean();

        // A shared auth service caches the signed-in user across test methods.
        \Config\Services::resetSingle('auth');
        $_SESSION = [];

        parent::tearDown();
    }

    private function clean(): void
    {
        $db = \Config\Database::connect();

        $db->table('user_school_access')->where('user_id', self::USER)->delete();
        $db->table('user_school_access')->where('school_id', self::SCHOOL)->delete();
        $db->table('auth_groups_users')->where('user_id', self::USER)->delete();
        $db->table('auth_identities')->where('user_id', self::USER)->delete();
        $db->table('users')->where('id', self::USER)->delete();
        $db->table('schools')->where('id', self::SCHOOL)->delete();
        $db->table('schools')->where('school_code', 'RPTEST')->delete();
        $db->table('school_domains')->where('school_id', self::SCHOOL)->delete();
    }

    private function makeSchool(): int
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $db->table('schools')->insert([
            'id'                  => self::SCHOOL,
            'name'                => 'Role Policy Test School',
            'status'              => 'active',
            'plan_code'           => 'starter',
            'school_code'         => 'RPTEST',
            'timezone'            => 'Asia/Karachi',
            'currency'            => 'PKR',
            'locale'              => 'en',
            'contact_email'       => 'roletest@example.test',
            'contact_phone'       => '0000000000',
            'address'             => '',
            'installation_state'  => 'completed',
            'installation_status' => 'completed',
            'created_at'          => $now,
            'updated_at'          => $now,
        ]);

        return self::SCHOOL;
    }

    private function makeUser(string $group, ?int $schoolId = null): int
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $db->table('users')->insert([
            'id'         => self::USER,
            'username'   => 'role_policy_tester',
            'status'     => 'active',
            'active'     => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $db->table('auth_identities')->insert([
            'user_id'    => self::USER,
            'type'       => 'email_password',
            'name'       => 'role-policy@example.test',
            'secret'     => password_hash('Role-Test-Passw0rd!', PASSWORD_DEFAULT),
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

        $this->signIn();

        return self::USER;
    }

    private function signIn(): void
    {
        $user = model(UserModel::class)->findById(self::USER);

        $this->assertNotNull($user, 'The test user must exist before it can be used.');

        $this->actingAs($user);
    }

    private function bodyOf($result): array
    {
        return json_decode((string) $result->response()->getBody(), true) ?? [];
    }

    // -----------------------------------------------------------------
    // API denials are JSON 403 with a stable error code (matrix section 4.1)
    // -----------------------------------------------------------------

    public function testParentReadIsRefusedWithJson403(): void
    {
        $this->makeUser('parent');

        $result = $this->get('/api/school/students');

        $this->assertSame(403, $result->response()->getStatusCode());
        $body = $this->bodyOf($result);
        $this->assertFalse($body['ok'] ?? null);
        $this->assertSame('role_required', $body['error'] ?? null);
    }

    public function testSuperAdminLearnerReadIsRefusedWithJson403(): void
    {
        $this->makeUser('superadmin');

        $result = $this->get('/api/school/students');

        $this->assertSame(403, $result->response()->getStatusCode());
        $this->assertSame('role_required', $this->bodyOf($result)['error'] ?? null);
    }

    public function testParentWriteIsRefusedWithJson403EvenWithCsrf(): void
    {
        $this->makeUser('parent');

        $result = $this->withCsrf()->post('/api/school/students', [
            'first_name'       => 'Should Never Be Written',
            'admission_number' => 'G6-TEST-DENY',
        ]);

        $this->assertSame(403, $result->response()->getStatusCode());
        $this->assertSame('role_required', $this->bodyOf($result)['error'] ?? null);
    }

    // -----------------------------------------------------------------
    // school API route groups match role-permission-matrix section 3
    // (staff create and fees create are School-Admin-only: teacher = N)
    // -----------------------------------------------------------------

    public function testTeacherCannotCreateStaff(): void
    {
        $this->makeUser('teacher');

        $result = $this->withCsrf()->post('/api/school/staff', [
            'first_name'   => 'Should Not Be Created',
            'employee_id'  => 'RPTEST-DENY',
            'role_type'    => 'teacher',
        ]);

        $this->assertSame(403, $result->response()->getStatusCode());
        $this->assertSame('role_required', $this->bodyOf($result)['error'] ?? null);
    }

    public function testTeacherCannotCreateAFeeInvoice(): void
    {
        $this->makeUser('teacher');

        $result = $this->withCsrf()->post('/api/school/fees/invoices', [
            'student_id' => 1,
            'fee_head'   => 'Should Not Bill',
            'amount'     => 100,
        ]);

        $this->assertSame(403, $result->response()->getStatusCode());
        $this->assertSame('role_required', $this->bodyOf($result)['error'] ?? null);
    }

    public function testTeacherCanStillReachAttendance(): void
    {
        // The attendance route keeps teacher access (matrix row: teacher = C),
        // which needs a school-linked teacher. This asserts the FILTER lets
        // them through; the body may fail later in the stack (open defect
        // LB-2 / "Student not found"), so only a role refusal counts as a
        // failure here.
        $this->makeSchool();
        $this->makeUser('teacher', self::SCHOOL);

        $result = $this->withCsrf()->post('/api/school/attendance', [
            'student_id'      => 1,
            'attendance_date' => '2026-10-21',
            'status'          => 'present',
        ]);

        $this->assertNotSame(403, $result->response()->getStatusCode());
        $this->assertNotSame(303, $result->response()->getStatusCode());
    }

    // -----------------------------------------------------------------
    // school-link rule: school roles need a school, JSON refuses otherwise
    // -----------------------------------------------------------------

    public function testSchoolAdminWithoutASchoolIsRefusedWithJson403(): void
    {
        $this->makeUser('school_admin', null);

        $result = $this->get('/api/school/students');

        $this->assertSame(403, $result->response()->getStatusCode());
        $this->assertSame('school_not_linked', $this->bodyOf($result)['error'] ?? null);
    }

    // -----------------------------------------------------------------
    // Super Admin is exempt from the school-link rule when a route
    // explicitly lists `superadmin` (regression: invite minting was dead)
    // -----------------------------------------------------------------

    public function testSuperAdminPassesTheRoleFilterOnTheInviteRoute(): void
    {
        $this->makeSchool();
        $this->makeUser('superadmin');

        // Reaches the controller: with a real school row but no verified
        // domain, ConnectApi answers its business-rule 409 - not a filter
        // redirect. That distinction is the whole point of this test.
        $result = $this->withCsrf()->post('/api/connect/invite', [
            'school_id' => self::SCHOOL,
        ]);

        $this->assertSame(409, $result->response()->getStatusCode());
        $this->assertSame(
            'Your school has no verified domain yet. Finish domain setup first.',
            $this->bodyOf($result)['message'] ?? null
        );
    }

    // -----------------------------------------------------------------
    // public registration is off (default-deny surface, config Auth)
    // -----------------------------------------------------------------

    public function testRegisterViewIsNoLongerServed(): void
    {
        $result = $this->get('/register');

        $result->assertRedirect();
    }

    public function testRegisterPostCreatesNoUser(): void
    {
        $db   = \Config\Database::connect();
        $before = (int) $db->table('users')->countAllResults();

        $result = $this->withCsrf()->post('/register', [
            'email'             => 'should-not-exist@example.test',
            'username'          => 'should_not_exist',
            'password'          => 'Registration-Blocked-Passw0rd!',
            'password_confirm'  => 'Registration-Blocked-Passw0rd!',
        ]);

        $result->assertRedirect();

        $after = (int) $db->table('users')->countAllResults();
        $this->assertSame($before, $after, 'A disabled registration must never create a user.');
    }
}
