<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Individual money received against a licence invoice.
 *
 * WHY THIS EXISTS
 * ---------------
 * Fee collection is manual, so an owner may receive an instalment rather than
 * the whole amount at once. Keeping each handover as its own row means the
 * invoice total is always the SUM of its payments and can be re-derived at any
 * time - the invoice's amount_paid column is only a cached convenience.
 *
 * A licence is renewed only when the payments for its invoice reach the invoiced
 * amount. Partial payments are recorded but never grant access (see
 * BillingService::isSettled).
 *
 * received_by is the platform user who recorded the handover, for audit.
 *
 * This table holds commercial metadata only. No learner data.
 */
class CreateLicensePayments extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'          => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'invoice_id'  => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'school_id'   => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'amount'      => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false, 'default' => 0],
            'method'      => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => false, 'default' => 'bank_transfer'],
            'reference'   => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'received_at' => ['type' => 'DATETIME', 'null' => false],
            'received_by' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'note'        => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => false],
        ]);

        $this->forge->addKey('id', true);

        $this->forge->createTable('license_payments', true, ['charset' => 'utf8mb4', 'collate' => 'utf8mb4_unicode_ci']);
    }

    public function down(): void
    {
        $this->forge->dropTable('license_payments', true);
    }
}