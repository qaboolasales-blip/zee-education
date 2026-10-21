<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Commercial plan catalogue: the annual price and the limits of each plan.
 *
 * WHY THIS EXISTS
 * ---------------
 * A school buys a PLAN, not a licence key. The plan decides what the school
 * pays per year (annual_fee) and how much it may use (max_students,
 * max_staff). Keeping the catalogue in the control plane means prices and
 * limits can be corrected for future renewals without touching a school's
 * already-issued licence, which stores its own snapshot of the limits.
 *
 * This table is commercial metadata only. It holds no learner data.
 */
class CreateLicensePlans extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'           => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'code'         => ['type' => 'VARCHAR', 'constraint' => 40, 'null' => false],
            'name'         => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'annual_fee'   => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false, 'default' => 0],
            'currency'     => ['type' => 'VARCHAR', 'constraint' => 8, 'null' => false, 'default' => 'PKR'],
            'max_students' => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'max_staff'    => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'features'     => ['type' => 'JSON', 'null' => true],
            'sort_order'   => ['type' => 'INT', 'unsigned' => true, 'null' => false, 'default' => 0],
            'is_active'    => ['type' => 'TINYINT', 'constraint' => 1, 'null' => false, 'default' => 1],
            'created_at'   => ['type' => 'DATETIME', 'null' => false],
            'updated_at'   => ['type' => 'DATETIME', 'null' => false],
        ]);

        $this->forge->addKey('id', true);

        // No secondary unique key: on this MySQL build a UNIQUE key next to the
        // AUTO_INCREMENT primary key makes MySQL reject the whole table. Plan
        // code uniqueness is enforced by PlanCatalogService instead.
        $this->forge->createTable('license_plans', true, ['charset' => 'utf8mb4', 'collate' => 'utf8mb4_unicode_ci']);
    }

    public function down(): void
    {
        $this->forge->dropTable('license_plans', true);
    }
}