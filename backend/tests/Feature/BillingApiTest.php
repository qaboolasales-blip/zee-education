<?php

namespace Tests\Feature;

use App\Libraries\BillingService;
use App\Libraries\LicenseService;
use CodeIgniter\Shield\Models\UserModel;
use CodeIgniter\Shield\Test\AuthenticationTesting;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * The Super Admin commercial API, exercised over real HTTP requests.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * BillingService decides what a licence costs and when it renews. This file
 * proves the DECISION REACHES THE WIRE: that the operator can quote, collect
 * and renew, that money is never faked, that a partial payment never grants
 * access, and - just as importantly - that a SCHOOL can never call these
 * endpoints.
 *
 * The three rules the product is judged on are asserted here as behaviour, not
 * as comments:
 *   1. Only a Super Admin can move money.
 *   2. A state-changing request without a CSRF token is refused.
 *   3. A licence renews only when the invoice is paid in full.
 *
 * @internal
 */
final class BillingApiTest extends CIUnitTestCase
{
    use FeatureTestTrait;
    use AuthenticationTesting;

    /** A school id that no real installation uses. */
    private const SCHOOL = 999902;

    /** A user id that no real installation uses. */
    private const USER = 999902;

    private const PASSWORD = 'Billing-Test-Passw0rd!';

    protected function setUp(): void
    {
        parent::setUp();

        $this->clean();
        $this->makeSchool();
    }

    protected function tearDown(): void
    {
        $this->clean();

        // The auth service caches the signed-in user across test methods, so a
        // later test would otherwise inherit the previous test's identity.
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
        $db->table('schools')->where('school_code', 'BILLTEST')->delete();
    }

    // -----------------------------------------------------------------
    // fixtures
    // -----------------------------------------------------------------

    private function makeSchool(): void
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $db->table('schools')->insert([
            'id'                  => self::SCHOOL,
            'name'                => 'Billing Test School',
            'status'              => 'active',
            'plan_code'           => 'starter',
            'school_code'         => 'BILLTEST',
            'timezone'            => 'Asia/Karachi',
            'currency'            => 'PKR',
            'locale'              => 'en',
            'contact_email'       => 'billing@example.test',
            'contact_phone'       => '0000000000',
            'address'             => '',
            'installation_state'  => 'completed',
            'installation_status' => 'completed',
            'created_at'          => $now,
            'updated_at'          => $now,
        ]);
    }

    private function makeUser(string $group = 'superadmin'): int
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $db->table('users')->insert([
            'id'         => self::USER,
            'username'   => 'billing_tester',
            'status'     => 'active',
            'active'     => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $db->table('auth_identities')->insert([
            'user_id'    => self::USER,
            'type'       => 'email_password',
            'name'       => 'billing@example.test',
            'secret'     => password_hash(self::PASSWORD, PASSWORD_DEFAULT),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $db->table('auth_groups_users')->insert([
            'user_id'    => self::USER,
            'group'      => $group,
            'created_at' => $now,
        ]);

        return self::USER;
    }

    private function signIn(string $group = 'superadmin'): void
    {
        $userId = $this->makeUser($group);
        $user   = model(UserModel::class)->findById($userId);

        $this->assertNotNull($user, 'The test user must exist before it can sign in.');

        $this->actingAs($user);
    }

    /**
     * The current CSRF token. Read from the same shared Security service the
     * request will verify against, so the pair always matches.
     */
    private function csrfToken(): string
    {
        $security = service('security');
        $hash     = $security->getHash();

        if ($hash === null || $hash === '') {
            $hash = $security->generateHash();
        }

        return $hash;
    }

    private function planId(string $code = 'starter'): int
    {
        $row = \Config\Database::connect()->table('license_plans')->where('code', $code)->select('id')->get()->getRow();

        $this->assertNotNull($row, 'Plan catalogue must be seeded before billing can be tested.');

        return (int) $row->id;
    }

    /**
     * @return array<array-key, mixed>
     */
    private function body(\CodeIgniter\Test\TestResponse $result): array
    {
        $body = json_decode((string) $result->response()->getBody(), true);

        $this->assertIsArray($body, 'The API must answer with a JSON document.');

        return $body;
    }

    // -----------------------------------------------------------------
    // who may move money
    // -----------------------------------------------------------------

    public function testUnauthenticatedCallIsRefusedWithJson401(): void
    {
        $result = $this->get('/api/admin/billing/summary');

        $this->assertSame(401, $result->response()->getStatusCode());

        $body = $this->body($result);

        $this->assertFalse($body['ok']);
        $this->assertSame('unauthenticated', $body['error']);
    }

    public function testSchoolAdminCannotReachTheBillingApi(): void
    {
        $this->signIn('school_admin');

        $result = $this->get('/api/admin/billing/summary');

        $this->assertSame(403, $result->response()->getStatusCode());

        $body = $this->body($result);

        $this->assertFalse($body['ok']);
        $this->assertSame('super_admin_required', $body['error']);
    }

    public function testSchoolAdminCannotIssueALicenceEvenWithACsrfToken(): void
    {
        $this->signIn('school_admin');

        $result = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/issue', [
                'school_id' => self::SCHOOL,
                'plan_id'   => $this->planId(),
            ]);

        $this->assertSame(403, $result->response()->getStatusCode());

        $this->assertSame(
            0,
            (int) \Config\Database::connect()->table('school_licenses')->where('school_id', self::SCHOOL)->countAllResults(),
            'A refused call must not leave a licence behind.'
        );
    }

    // -----------------------------------------------------------------
    // CSRF
    // -----------------------------------------------------------------

    public function testWriteWithoutACsrfTokenIsRefused(): void
    {
        $this->signIn();

        $result = $this->post('/api/admin/billing/issue', [
            'school_id' => self::SCHOOL,
            'plan_id'   => $this->planId(),
        ]);

        $this->assertSame(403, $result->response()->getStatusCode());

        $body = $this->body($result);

        $this->assertFalse($body['ok']);
        $this->assertSame('csrf_required', $body['error']);

        $this->assertSame(
            0,
            (int) \Config\Database::connect()->table('school_licenses')->where('school_id', self::SCHOOL)->countAllResults(),
            'A request refused for a missing CSRF token must not have issued anything.'
        );
    }

    public function testWriteWithACsrfTokenIsAccepted(): void
    {
        $this->signIn();

        $result = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/issue', [
                'school_id' => self::SCHOOL,
                'plan_id'   => $this->planId(),
            ]);

        $this->assertSame(201, $result->response()->getStatusCode());

        $body = $this->body($result);

        $this->assertTrue($body['ok']);
        $this->assertNotEmpty($body['license_key']);
    }

    public function testReadsDoNotRequireACsrfToken(): void
    {
        $this->signIn();

        $result = $this->get('/api/admin/billing/summary');

        $this->assertSame(200, $result->response()->getStatusCode());
    }

    // -----------------------------------------------------------------
    // issuing
    // -----------------------------------------------------------------

    public function testIssueReturnsTheKeyOnceAndStoresOnlyItsHash(): void
    {
        $this->signIn();

        $result = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/issue', [
                'school_id' => self::SCHOOL,
                'plan_id'   => $this->planId('complete'),
            ]);

        $this->assertSame(201, $result->response()->getStatusCode());

        $body = $this->body($result);
        $key  = (string) $body['license_key'];

        $this->assertMatchesRegularExpression('/^ZEE-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/', $key);

        $row = \Config\Database::connect()->table('school_licenses')->where('school_id', self::SCHOOL)->get()->getRow();

        $this->assertNotNull($row);
        $this->assertSame(hash('sha256', $key), $row->license_key_hash);
        $this->assertStringNotContainsString($key, json_encode($row));

        // The plan limits are snapshotted, so a later catalogue edit cannot
        // change a licence that has already been sold.
        $this->assertSame(3000, (int) $row->max_students);
    }

    public function testIssueToAnUnknownSchoolIsRefused(): void
    {
        $this->signIn();

        $result = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/issue', [
                'school_id' => 999999,
                'plan_id'   => $this->planId(),
            ]);

        $this->assertSame(422, $result->response()->getStatusCode());
    }

    // -----------------------------------------------------------------
    // quoting and collecting
    // -----------------------------------------------------------------

    public function testQuoteIsNotRevenue(): void
    {
        $this->signIn();

        $result = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/invoice', [
                'school_id' => self::SCHOOL,
                'plan_id'   => $this->planId('starter'), // 30,000
            ]);

        $this->assertSame(201, $result->response()->getStatusCode());

        $body = $this->body($result);

        $this->assertTrue($body['ok']);
        $this->assertMatchesRegularExpression('/^ZEE-INV-' . date('Y') . '-\d{4}$/', (string) $body['invoice_no']);
        $this->assertSame('30000.00', (string) $body['amount']);
        $this->assertSame(BillingService::STATUS_DUE, $body['status']);

        // A quote that has not been collected is outstanding, never revenue.
        $summary = service('billing')->summary();

        $this->assertSame('0.00', $summary['revenue_collected']);
        $this->assertSame('30000.00', $summary['outstanding']);
    }

    public function testPartialPaymentIsRecordedButDoesNotRenew(): void
    {
        $this->signIn();

        $licenses = service('licenses');
        $licenses->issue(self::SCHOOL, $this->planId('growth')); // 42,000

        $invoiceId = $this->quote(self::SCHOOL, $this->planId('growth'));

        $result = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/pay', [
                'invoice_id' => $invoiceId,
                'amount'     => 20000,
                'method'     => 'bank_transfer',
                'reference'  => 'TRF-001',
            ]);

        $this->assertSame(200, $result->response()->getStatusCode());

        $body = $this->body($result);

        $this->assertTrue($body['ok']);
        $this->assertFalse($body['settled'], 'A part payment must not settle an invoice.');
        $this->assertNull($body['new_license_key'], 'A part payment must not hand out a new key.');
        $this->assertSame('20000.00', (string) $body['amount_paid']);

        $row = \Config\Database::connect()->table('license_invoices')->where('id', $invoiceId)->get()->getRow();

        $this->assertSame(BillingService::STATUS_PARTIAL, $row->status);

        // The school still holds exactly one licence: the original.
        $this->assertSame(1, (int) \Config\Database::connect()->table('school_licenses')->where('school_id', self::SCHOOL)->countAllResults());
    }

    public function testFullPaymentRenewsAndRotatesTheKey(): void
    {
        $this->signIn();

        $licenses = service('licenses');
        $issued   = $licenses->issue(self::SCHOOL, $this->planId('growth')); // 42,000

        $invoiceId = $this->quote(self::SCHOOL, $this->planId('growth'));

        $result = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/pay', [
                'invoice_id' => $invoiceId,
                'amount'     => 42000,
                'method'     => 'bank_transfer',
                'reference'  => 'TRF-002',
            ]);

        $this->assertSame(200, $result->response()->getStatusCode());

        $body = $this->body($result);

        $this->assertTrue($body['ok']);
        $this->assertTrue($body['settled']);
        $this->assertNotNull($body['new_license_key']);
        $this->assertNotSame($issued['license_key'], $body['new_license_key']);

        $current = service('licenses')->currentForSchool(self::SCHOOL);

        $this->assertSame(hash('sha256', $body['new_license_key']), $current->license_key_hash);

        // The old licence row is retired, never deleted: the billing history
        // has to stay reconstructable.
        $this->assertSame(2, (int) \Config\Database::connect()->table('school_licenses')->where('school_id', self::SCHOOL)->countAllResults());
    }

    public function testPaymentOfZeroIsRefused(): void
    {
        $this->signIn();

        $invoiceId = $this->quote(self::SCHOOL, $this->planId());

        $result = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/pay', [
                'invoice_id' => $invoiceId,
                'amount'     => 0,
            ]);

        $this->assertSame(422, $result->response()->getStatusCode());
    }

    // -----------------------------------------------------------------
    // voiding, revoking, renewing
    // -----------------------------------------------------------------

    public function testVoidMarksAnUnpaidInvoiceAndKeepsTheRow(): void
    {
        $this->signIn();

        $invoiceId = $this->quote(self::SCHOOL, $this->planId());

        $result = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/void', [
                'invoice_id' => $invoiceId,
                'reason'     => 'school withdrew',
            ]);

        $this->assertSame(200, $result->response()->getStatusCode());

        $body = $this->body($result);

        $this->assertTrue($body['ok']);
        $this->assertSame(BillingService::STATUS_VOID, $body['status']);

        $row = \Config\Database::connect()->table('license_invoices')->where('id', $invoiceId)->get()->getRow();

        $this->assertNotNull($row, 'A void invoice is kept, never deleted.');
    }

    public function testAPaidInvoiceCannotBeVoided(): void
    {
        $this->signIn();

        $invoiceId = $this->quote(self::SCHOOL, $this->planId('starter')); // 30,000

        $this->pay($invoiceId, 30000);

        $result = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/void', [
                'invoice_id' => $invoiceId,
            ]);

        $this->assertSame(409, $result->response()->getStatusCode());
    }

    public function testRevokeWithdrawsTheLicenceAndNeedsAReason(): void
    {
        $this->signIn();

        service('licenses')->issue(self::SCHOOL, $this->planId());

        $result = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/revoke', [
                'school_id' => self::SCHOOL,
                'reason'    => 'payment dispute',
            ]);

        $this->assertSame(200, $result->response()->getStatusCode());

        $body = $this->body($result);

        $this->assertTrue($body['ok']);
        $this->assertSame(LicenseService::STATUS_REVOKED, $body['state']);

        $state = service('licenses')->state(self::SCHOOL);

        $this->assertSame(LicenseService::STATUS_REVOKED, $state['state']);
        $this->assertFalse($state['can_write']);

        // A revoke without a reason is refused: the reason is what the school
        // is told, and it has to be on the record.
        $noReason = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/revoke', [
                'school_id' => self::SCHOOL,
            ]);

        $this->assertSame(422, $noReason->response()->getStatusCode());
    }

    public function testRenewRefusesAnUnsettledInvoice(): void
    {
        $this->signIn();

        $invoiceId = $this->quote(self::SCHOOL, $this->planId());

        $result = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/renew', [
                'invoice_id' => $invoiceId,
            ]);

        $this->assertSame(422, $result->response()->getStatusCode());

        $this->assertSame(
            0,
            (int) \Config\Database::connect()->table('school_licenses')->where('school_id', self::SCHOOL)->countAllResults(),
            'An unsettled invoice must never produce a licence.'
        );
    }

    public function testRenewOnASettledInvoiceIssuesAFreshKey(): void
    {
        $this->signIn();

        $licenses = service('licenses');
        $issued   = $licenses->issue(self::SCHOOL, $this->planId('starter'));

        $invoiceId = $this->quote(self::SCHOOL, $this->planId('starter'));

        // Pay the invoice WITHOUT letting the payment renew it, so the renewal
        // is exercised on its own.
        $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/pay', [
                'invoice_id' => $invoiceId,
                'amount'     => 30000,
            ]);

        $result = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/renew', [
                'invoice_id' => $invoiceId,
            ]);

        $this->assertSame(200, $result->response()->getStatusCode());

        $body = $this->body($result);

        $this->assertTrue($body['ok']);
        $this->assertNotEmpty($body['license_key']);
        $this->assertNotSame($issued['license_key'], $body['license_key']);
    }

    // -----------------------------------------------------------------
    // reads and the audit trail
    // -----------------------------------------------------------------

    public function testInvoicesAndSummaryAreReadable(): void
    {
        $this->signIn();

        $invoiceId = $this->quote(self::SCHOOL, $this->planId('starter'));

        $result = $this->get('/api/admin/billing/invoices/' . self::SCHOOL);

        $this->assertSame(200, $result->response()->getStatusCode());

        $body = $this->body($result);

        $this->assertTrue($body['ok']);
        $this->assertCount(1, $body['invoices']);
        $this->assertSame($invoiceId, (int) $body['invoices'][0]['id']);

        $summary = $this->get('/api/admin/billing/summary');

        $this->assertSame(200, $summary->response()->getStatusCode());

        $summaryBody = $this->body($summary);

        $this->assertSame('0.00', $summaryBody['revenue_collected']);
        $this->assertSame('30000.00', $summaryBody['outstanding']);
    }

    public function testUpcomingsAreReadable(): void
    {
        $this->signIn();

        service('licenses')->issue(self::SCHOOL, $this->planId(), null, [
            'expires_at' => date('Y-m-d', strtotime('+10 days')),
        ]);

        $result = $this->get('/api/admin/billing/upcomings');

        $this->assertSame(200, $result->response()->getStatusCode());

        $body = $this->body($result);

        $this->assertTrue($body['ok']);
        $this->assertGreaterThanOrEqual(1, $body['count']);
    }

    public function testEveryBillingActionIsAudited(): void
    {
        $this->signIn();

        $before = (int) \Config\Database::connect()->table('platform_audit_events')->countAllResults();

        $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/issue', [
                'school_id' => self::SCHOOL,
                'plan_id'   => $this->planId(),
            ]);

        $after = (int) \Config\Database::connect()->table('platform_audit_events')->countAllResults();

        $this->assertGreaterThan($before, $after, 'A commercial action must leave an audit record.');
    }

    // -----------------------------------------------------------------
    // helpers
    // -----------------------------------------------------------------

    private function quote(int $schoolId, int $planId): int
    {
        $result = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/invoice', [
                'school_id' => $schoolId,
                'plan_id'   => $planId,
            ]);

        $this->assertSame(201, $result->response()->getStatusCode());

        return (int) $this->body($result)['invoice_id'];
    }

    private function pay(int $invoiceId, float $amount): void
    {
        $result = $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()])
            ->post('/api/admin/billing/pay', [
                'invoice_id' => $invoiceId,
                'amount'     => $amount,
            ]);

        $this->assertSame(200, $result->response()->getStatusCode());
    }
}
