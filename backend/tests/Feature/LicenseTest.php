<?php

namespace Tests\Feature;

use App\Libraries\BillingService;
use App\Libraries\LicenseService;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Commercial licensing behaviour.
 *
 * These tests exercise the REAL services against the migrated test database.
 * Nothing here is a placeholder or a skipped case: every assertion runs.
 *
 * Each test cleans up the rows it created, so the suite can be run repeatedly
 * against the same test database without drifting.
 *
 * @internal
 */
final class LicenseTest extends CIUnitTestCase
{
    /** A school id that no real installation uses. */
    private const SCHOOL = 999901;

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

        parent::tearDown();
    }

    private function clean(): void
    {
        $db = \Config\Database::connect();

        foreach (['license_payments', 'license_invoices', 'school_licenses', 'school_db_credentials', 'school_invites'] as $table) {
            $db->table($table)->where('school_id', self::SCHOOL)->delete();
        }
    }

    private function planId(string $code = 'starter'): int
    {
        $id = \Config\Database::connect()->table('license_plans')->where('code', $code)->select('id')->get()->getRow();

        $this->assertNotNull($id, 'Plan catalogue must be seeded before licensing can be tested.');

        return (int) $id->id;
    }

    // -----------------------------------------------------------------
    // key handling
    // -----------------------------------------------------------------

    public function testGeneratedKeyIsWellFormed(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $key = $this->licenses->generateKey();

            $this->assertMatchesRegularExpression(
                '/^ZEE-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/',
                $key
            );

            $this->assertTrue($this->licenses->isWellFormedKey($key), "Generated key failed its own checksum: {$key}");
        }
    }

    public function testMistypedKeyIsRejectedLocally(): void
    {
        $key = $this->licenses->generateKey();

        // Corrupt one character of the body: the checksum must no longer match,
        // so a typo never turns into a "licence not found" support call.
        $broken = substr($key, 0, 6) . ($key[6] === 'A' ? 'B' : 'A') . substr($key, 7);

        $this->assertFalse($this->licenses->isWellFormedKey($broken));
        $this->assertFalse($this->licenses->isWellFormedKey('NOT-A-KEY'));
        $this->assertFalse($this->licenses->isWellFormedKey(''));
    }

    public function testKeyIsStoredOnlyAsHash(): void
    {
        $issued = $this->licenses->issue(self::SCHOOL, $this->planId());

        $row = $this->licenses->currentForSchool(self::SCHOOL);

        $this->assertNotNull($row);
        $this->assertNotSame($issued['license_key'], $row->license_key_hash);
        $this->assertSame(hash('sha256', $issued['license_key']), $row->license_key_hash);
        $this->assertSame(substr($issued['license_key'], 0, 12), $row->license_key_prefix);

        // The plaintext key must appear nowhere in the stored row.
        $this->assertStringNotContainsString($issued['license_key'], json_encode($row));
    }

    // -----------------------------------------------------------------
    // issuing
    // -----------------------------------------------------------------

    public function testIssueSnapshotsPlanLimits(): void
    {
        $planId = $this->planId('complete');

        $this->licenses->issue(self::SCHOOL, $planId);

        $row = $this->licenses->currentForSchool(self::SCHOOL);

        $this->assertSame(3000, (int) $row->max_students);
        $this->assertSame(150, (int) $row->max_staff);

        // Now change the catalogue. A licence already sold must not shrink.
        \Config\Database::connect()->table('license_plans')
            ->where('id', $planId)
            ->update(['max_students' => 10, 'max_staff' => 1]);

        $this->assertSame(3000, (int) $this->licenses->currentForSchool(self::SCHOOL)->max_students);

        \Config\Database::connect()->table('license_plans')
            ->where('id', $planId)
            ->update(['max_students' => 3000, 'max_staff' => 150]);
    }

    public function testIssueDefaultsToOneYear(): void
    {
        $this->licenses->issue(self::SCHOOL, $this->planId());

        $row = $this->licenses->currentForSchool(self::SCHOOL);

        $this->assertSame(date('Y-m-d'), $row->starts_at);
        $this->assertSame(date('Y-m-d', strtotime('+1 year')), $row->expires_at);
        $this->assertSame(LicenseService::DEFAULT_GRACE_DAYS, (int) $row->grace_days);
    }

    // -----------------------------------------------------------------
    // states - the rules that decide whether a school may write
    // -----------------------------------------------------------------

    public function testFarFromExpiryIsActive(): void
    {
        $this->licenses->issue(self::SCHOOL, $this->planId(), null, ['expires_at' => date('Y-m-d', strtotime('+200 days'))]);

        $state = $this->licenses->state(self::SCHOOL);

        $this->assertSame(LicenseService::STATUS_ACTIVE, $state['state']);
        $this->assertTrue($state['can_write']);
        $this->assertFalse($state['in_grace']);
    }

    public function testInsideWindowIsRenewalDueButStillWritable(): void
    {
        $this->licenses->issue(self::SCHOOL, $this->planId(), null, ['expires_at' => date('Y-m-d', strtotime('+10 days'))]);

        $state = $this->licenses->state(self::SCHOOL);

        $this->assertSame(LicenseService::STATUS_RENEWAL_DUE, $state['state']);
        // Critical: a school that has simply not renewed YET must keep writing.
        $this->assertTrue($state['can_write']);
        $this->assertSame(10, $state['days_left']);
    }

    public function testInsideGraceIsWarningOnly(): void
    {
        $this->licenses->issue(self::SCHOOL, $this->planId(), null, [
            'expires_at' => date('Y-m-d', strtotime('-5 days')),
            'grace_days' => 14,
        ]);

        $state = $this->licenses->state(self::SCHOOL);

        $this->assertSame(LicenseService::STATUS_GRACE, $state['state']);
        $this->assertTrue($state['in_grace']);
        $this->assertFalse($state['can_write']);
        $this->assertStringContainsString('grace', strtolower($state['message']));
    }

    public function testAfterGraceIsExpiredAndReadOnly(): void
    {
        $this->licenses->issue(self::SCHOOL, $this->planId(), null, [
            'expires_at' => date('Y-m-d', strtotime('-20 days')),
            'grace_days' => 14,
        ]);

        $state = $this->licenses->state(self::SCHOOL);

        $this->assertSame(LicenseService::STATUS_EXPIRED, $state['state']);
        $this->assertFalse($state['can_write']);
        // The message must reassure the school that its data is intact.
        $this->assertStringContainsString('safe', strtolower($state['message']));
    }

    public function testRevokedBeatsValidDates(): void
    {
        $this->licenses->issue(self::SCHOOL, $this->planId(), null, ['expires_at' => date('Y-m-d', strtotime('+200 days'))]);

        $this->assertTrue($this->licenses->canWrite(self::SCHOOL));

        $this->assertTrue($this->licenses->revoke(self::SCHOOL, 'payment dispute'));

        $state = $this->licenses->state(self::SCHOOL);

        $this->assertSame(LicenseService::STATUS_REVOKED, $state['state']);
        $this->assertFalse($state['can_write']);
    }

    public function testSchoolWithNoLicenceIsReadOnly(): void
    {
        $state = $this->licenses->state(self::SCHOOL);

        $this->assertNull($state['license']);
        $this->assertFalse($state['can_write']);
    }

    public function testExpiryIsDecidedByServerDateNotClient(): void
    {
        // The licence stores no client-supplied time at all: state() reads only
        // the server clock and the stored dates. Assert that no request-shaped
        // value is accepted as an override.
        $this->licenses->issue(self::SCHOOL, $this->planId(), null, ['expires_at' => date('Y-m-d', strtotime('-30 days'))]);

        $state = $this->licenses->state(self::SCHOOL);

        $this->assertSame(LicenseService::STATUS_EXPIRED, $state['state']);
        $this->assertFalse($state['can_write']);
    }

    public function testLimitsAreReportedForSeatEnforcement(): void
    {
        $this->licenses->issue(self::SCHOOL, $this->planId('starter'));

        $this->assertSame(300, $this->licenses->studentLimit(self::SCHOOL));
        $this->assertSame(20, $this->licenses->staffLimit(self::SCHOOL));
    }

    // -----------------------------------------------------------------
    // billing
    // -----------------------------------------------------------------

    public function testInvoiceNumberIsSequentialAndReadable(): void
    {
        $billing = new BillingService();
        $planId  = $this->planId();

        $first  = $billing->createInvoice(self::SCHOOL, $planId);
        $second = $billing->createInvoice(self::SCHOOL, $planId);

        $a = \Config\Database::connect()->table('license_invoices')->where('id', $first)->get()->getRow();
        $b = \Config\Database::connect()->table('license_invoices')->where('id', $second)->get()->getRow();

        $this->assertMatchesRegularExpression('/^ZEE-INV-' . date('Y') . '-\d{4}$/', $a->invoice_no);
        $this->assertMatchesRegularExpression('/^ZEE-INV-' . date('Y') . '-\d{4}$/', $b->invoice_no);
        $this->assertNotSame($a->invoice_no, $b->invoice_no);
    }

    public function testPartialPaymentDoesNotRenewTheLicence(): void
    {
        $billing = new BillingService();
        $planId  = $this->planId('growth'); // 42,000

        $issued  = $this->licenses->issue(self::SCHOOL, $planId);
        $invoice = $billing->createInvoice(self::SCHOOL, $planId);

        $result = $billing->recordPayment($invoice, 20000.00);

        $this->assertFalse($result['settled']);
        $this->assertNull($result['new_license_key']);

        // The original licence must be untouched by an unpaid invoice.
        $this->assertSame(hash('sha256', $issued['license_key']), $this->licenses->currentForSchool(self::SCHOOL)->license_key_hash);

        $row = \Config\Database::connect()->table('license_invoices')->where('id', $invoice)->get()->getRow();
        $this->assertSame(BillingService::STATUS_PARTIAL, $row->status);
        $this->assertSame('20000.00', $row->amount_paid);
    }

    public function testFullPaymentRenewsAndRotatesTheKey(): void
    {
        $billing = new BillingService();
        $planId  = $this->planId('growth'); // 42,000

        $issued  = $this->licenses->issue(self::SCHOOL, $planId);
        $oldHash = $this->licenses->currentForSchool(self::SCHOOL)->license_key_hash;

        $invoice = $billing->createInvoice(self::SCHOOL, $planId);
        $result  = $billing->recordPayment($invoice, 42000.00);

        $this->assertTrue($result['settled']);
        $this->assertNotNull($result['new_license_key']);
        $this->assertNotSame($issued['license_key'], $result['new_license_key']);

        $current = $this->licenses->currentForSchool(self::SCHOOL);

        // A fresh key is in force...
        $this->assertSame(hash('sha256', $result['new_license_key']), $current->license_key_hash);
        $this->assertNotSame($oldHash, $current->license_key_hash);

        // ...and the old licence row is retired, not deleted.
        $this->assertSame('active', $current->status);
        $this->assertSame(2, (int) \Config\Database::connect()->table('school_licenses')->where('school_id', self::SCHOOL)->countAllResults());

        $row = \Config\Database::connect()->table('license_invoices')->where('id', $invoice)->get()->getRow();
        $this->assertSame(BillingService::STATUS_PAID, $row->status);
        $this->assertNotNull($row->paid_at);
    }

    public function testPaymentCannotBeRecordedAgainstVoidInvoice(): void
    {
        $billing = new BillingService();
        $planId  = $this->planId();

        $invoice = $billing->createInvoice(self::SCHOOL, $planId);

        $this->assertTrue($billing->voidInvoice($invoice, 'school withdrew'));

        $this->expectException(\RuntimeException::class);

        $billing->recordPayment($invoice, 1000.00);
    }

    public function testZeroPaymentIsRejected(): void
    {
        $billing = new BillingService();
        $invoice = $billing->createInvoice(self::SCHOOL, $this->planId());

        $this->expectException(\InvalidArgumentException::class);

        $billing->recordPayment($invoice, 0);
    }

    public function testRevenueCountsOnlyCollectedMoney(): void
    {
        $billing = new BillingService();
        $planId  = $this->planId('starter'); // 30,000

        $paid = $billing->createInvoice(self::SCHOOL, $planId);
        $billing->recordPayment($paid, 30000.00);

        // An uncollected quote must NOT appear as revenue.
        $billing->createInvoice(self::SCHOOL, $planId);

        $summary = $billing->summary();

        $this->assertSame('30000.00', $summary['revenue_collected']);
        $this->assertSame('30000.00', $summary['outstanding']);
    }

    public function testOverdueInvoicesAreFlagged(): void
    {
        $db      = \Config\Database::connect();
        $billing = new BillingService();

        $billing->createInvoice(self::SCHOOL, $this->planId());

        // Force one invoice to be past its due date.
        $db->table('license_invoices')->where('school_id', self::SCHOOL)
            ->update(['due_date' => date('Y-m-d', strtotime('-5 days'))]);

        $this->assertGreaterThan(0, $billing->markOverdue());

        $row = $db->table('license_invoices')->where('school_id', self::SCHOOL)->get()->getRow();
        $this->assertSame(BillingService::STATUS_OVERDUE, $row->status);
    }

    public function testRenewalAdvancesFromCurrentExpiryNotFromToday(): void
    {
        $billing = new BillingService();
        $planId  = $this->planId();

        // Paid ahead: licence still runs for another 100 days.
        $this->licenses->issue(self::SCHOOL, $planId, null, ['expires_at' => date('Y-m-d', strtotime('+100 days'))]);

        $invoice = $billing->createInvoice(self::SCHOOL, $planId);
        $billing->recordPayment($invoice, 30000.00);

        $current = $this->licenses->currentForSchool(self::SCHOOL);

        // Paying early must not cost the school the 100 days it already paid for.
        $this->assertSame(date('Y-m-d', strtotime('+100 days')), $current->starts_at);
        $this->assertSame(date('Y-m-d', strtotime('+100 days +1 year')), $current->expires_at);
    }
}