<?php

namespace Tests\Feature;

use App\Controllers\Portal;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Super Admin portal token rendering.
 *
 * The approved HTML template is filled with __ZEE_*__ tokens at render time.
 * This test ensures the controller replaces all tokens with real data.
 *
 * @internal
 */
final class PortalTest extends CIUnitTestCase
{
    private const TEST_SCHOOL = 999901;

    protected function setUp(): void
    {
        parent::setUp();

        $db = \Config\Database::connect();

        // Clean up any existing test data
        $db->table('school_licenses')->where('school_id', self::TEST_SCHOOL)->delete();
        $db->table('license_invoices')->where('school_id', self::TEST_SCHOOL)->delete();
        $db->table('schools')->where('id', self::TEST_SCHOOL)->delete();
        $db->table('schools')->where('school_code', 'PORTTEST')->delete();

        // Seed a test school
        $now = date('Y-m-d H:i:s');
        $db->table('schools')->insert([
            'id'                => self::TEST_SCHOOL,
            'name'              => 'Portal Test School',
            'status'            => 'active',
            'plan_code'         => 'starter',
            'school_code'       => 'PORTTEST',
            'timezone'          => 'Asia/Karachi',
            'currency'          => 'PKR',
            'locale'            => 'en',
            'contact_email'     => 'portal@example.test',
            'contact_phone'     => '0000000000',
            'address'           => 'Test City',
            'branding_reference' => 'portaltest',
            'installation_state' => 'completed',
            'installation_status' => 'completed',
            'provisioned_at'    => $now,
            'created_at'        => $now,
            'updated_at'        => $now,
        ]);

        // Seed a licence for the school
        $plan = $db->table('license_plans')->where('code', 'starter')->get()->getRow();
        if ($plan !== null) {
            $db->table('school_licenses')->insert([
                'school_id'          => self::TEST_SCHOOL,
                'plan_id'            => $plan->id,
                'license_key_hash'   => hash('sha256', 'ZEE-ABCD-EFGH-IJKL-MNOP'),
                'license_key_prefix' => 'ZEE-ABCD-EF',
                'status'             => 'active',
                'max_students'       => $plan->max_students,
                'max_staff'          => $plan->max_staff,
                'starts_at'          => date('Y-m-d'),
                'expires_at'         => date('Y-m-d', strtotime('+1 year')),
                'grace_until'        => date('Y-m-d', strtotime('+1 year +14 days')),
                'grace_days'         => 14,
                'last_verified_at'   => $now,
                'created_at'         => $now,
                'updated_at'         => $now,
            ]);
        }

        // Seed an invoice (paid)
        $db->table('license_invoices')->insert([
            'invoice_no'   => 'ZEE-INV-2026-0001',
            'school_id'    => self::TEST_SCHOOL,
            'plan_id'      => $plan->id ?? 1,
            'kind'         => 'first_year',
            'period_start' => date('Y-m-d'),
            'period_end'   => date('Y-m-d', strtotime('+1 year -1 day')),
            'amount'       => $plan->annual_fee ?? 30000,
            'amount_paid'  => $plan->annual_fee ?? 30000,
            'currency'     => 'PKR',
            'status'       => 'paid',
            'due_date'     => date('Y-m-d', strtotime('+15 days')),
            'issued_at'    => $now,
            'paid_at'      => $now,
            'created_at'   => $now,
            'updated_at'   => $now,
        ]);

        // Seed a payment
        $invoice = $db->table('license_invoices')->where('invoice_no', 'ZEE-INV-2026-0001')->get()->getRow();
        if ($invoice !== null) {
            $db->table('license_payments')->insert([
                'invoice_id'  => $invoice->id,
                'school_id'   => self::TEST_SCHOOL,
                'amount'      => $plan->annual_fee ?? 30000,
                'method'      => 'bank_transfer',
                'reference'   => 'TEST-REF-001',
                'received_at' => $now,
                'received_by' => 1,
                'note'        => 'Test payment',
                'created_at'  => $now,
            ]);
        }

        // Seed a support ticket (if table exists)
        if ($db->tableExists('support_tickets')) {
            $db->table('support_tickets')->insert([
                'school_id'   => self::TEST_SCHOOL,
                'ticket_no'   => 'ZE-9999',
                'subject'     => 'Test ticket',
                'priority'    => 'Normal',
                'status'      => 'new',
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);
        }
    }

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();

        $db->table('school_licenses')->where('school_id', self::TEST_SCHOOL)->delete();
        $db->table('license_payments')->where('school_id', self::TEST_SCHOOL)->delete();
        $db->table('license_invoices')->where('school_id', self::TEST_SCHOOL)->delete();
        if ($db->tableExists('support_tickets')) {
            $db->table('support_tickets')->where('school_id', self::TEST_SCHOOL)->delete();
        }
        $db->table('schools')->where('id', self::TEST_SCHOOL)->delete();
        $db->table('schools')->where('school_code', 'PORTTEST')->delete();

        parent::tearDown();
    }

    public function testPortalRendersAllTokens(): void
    {
        $controller = new Portal();

        $html = $controller->index();

        // Every token must have been replaced
        $this->assertStringNotContainsString('__ZEE_SCHOOLS__', $html);
        $this->assertStringNotContainsString('__ZEE_STATS__', $html);
        $this->assertStringNotContainsString('__ZEE_RENEWALS__', $html);
        $this->assertStringNotContainsString('__ZEE_INSTALL_HEALTH__', $html);
        $this->assertStringNotContainsString('__ZEE_RATEBOOK__', $html);
        $this->assertStringNotContainsString('__ZEE_SCHOOL_OPTIONS__', $html);
        $this->assertStringNotContainsString('__ZEE_TICKETS__', $html);
        $this->assertStringNotContainsString('__ZEE_TICKET_COUNT__', $html);

        // The school name must appear in the rendered HTML
        $this->assertStringContainsString('Portal Test School', $html);

        // The plan name must appear
        $this->assertStringContainsString('Starter', $html);

        // Revenue card must have PKR
        $this->assertStringContainsString('PKR', $html);

        // Install health must have a school name
        $this->assertStringContainsString('Portal Test School', $html);
    }

    public function testPortalStatsAreArrays(): void
    {
        $controller = new Portal();

        $html = $controller->index();

        // The stats token is replaced with JSON array - verify structure
        $this->assertStringContainsString('Total school installs', $html);
        $this->assertStringContainsString('Upcoming renewals', $html);
        $this->assertStringContainsString('Licensed revenue', $html);
        $this->assertStringContainsString('Open support tickets', $html);
    }
}