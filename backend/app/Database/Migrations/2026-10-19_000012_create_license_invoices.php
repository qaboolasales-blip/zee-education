<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * A licence fee owed or collected.
 *
 * WHY THIS EXISTS
 * ---------------
 * Fee collection is MANUAL (owner confirms a bank transfer or cash handover),
 * so the system needs a paper trail that stands on its own: what was quoted,
 * what was collected, when, how, and by whom.
 *
 * One row per billing period. A renewal creates a NEW row rather than editing
 * the previous one, so a school's full payment history stays auditable.
 *
 * STATUS VALUES
 * -------------
 *   due     - issued, not collected yet
 *   partial  - some money received, licence not yet renewed
 *   paid     - collected in full; this is what triggers the licence renewal
 *   void     - cancelled before collection (never deleted)
 *   overdue  - past due_date and still not paid
 *
 * This table holds commercial metadata only. No learner data.
 */
class CreateLicenseInvoices extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'                => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'invoice_no'        => ['type' => 'VARCHAR', 'constraint' => 40, 'null' => false],
            'school_id'         => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'license_id'        => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'plan_id'           => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'kind'              => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => false, 'default' => 'renewal'],
            'period_start'      => ['type' => 'DATE', 'null' => true],
            'period_end'        => ['type' => 'DATE', 'null' => true],
            'amount'            => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false, 'default' => 0],
            'amount_paid'       => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false, 'default' => 0],
            'currency'          => ['type' => 'VARCHAR', 'constraint' => 8, 'null' => false, 'default' => 'PKR'],
            'status'            => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => false, 'default' => 'due'],
            'due_date'          => ['type' => 'DATE', 'null' => true],
            'issued_at'         => ['type' => 'DATETIME', 'null' => false],
            'paid_at'           => ['type' => 'DATETIME', 'null' => true],
            'payment_method'    => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true],
            'payment_reference' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'notes'             => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_at'        => ['type' => 'DATETIME', 'null' => false],
            'updated_at'        => ['type' => 'DATETIME', 'null' => false],
        ]);

        $this->forge->addKey('id', true);

        // Invoice number uniqueness is asserted by BillingService when the
        // number is generated; see migration 000009 for why no secondary
        // UNIQUE key is declared here.
        $this->forge->createTable('license_invoices', true, ['charset' => 'utf8mb4', 'collate' => 'utf8mb4_unicode_ci']);
    }

    public function down(): void
    {
        $this->forge->dropTable('license_invoices', true);
    }
}