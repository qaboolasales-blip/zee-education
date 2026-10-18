<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the `schools` table for the Super Admin control plane.
 *
 * One row per school installation. Holds identity, lifecycle status and
 * branding metadata only — never student, guardian, staff, attendance,
 * results or fee data (ADR-001).
 */
class CreateSchoolsTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'         => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'name'       => ['type' => 'VARCHAR', 'constraint' => 191, 'null' => false],
            'status'     => ['type' => 'ENUM', 'constraint' => ['pending', 'active', 'suspended', 'decommissioned'], 'default' => 'pending', 'null' => false],
            'plan_code'  => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => true],
            'timezone'   => ['type' => 'VARCHAR', 'constraint' => 64, 'default' => 'Asia/Karachi', 'null' => false],
            'currency'   => ['type' => 'VARCHAR', 'constraint' => 8, 'default' => 'PKR', 'null' => false],
            'locale'     => ['type' => 'VARCHAR', 'constraint' => 8, 'default' => 'en', 'null' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->createTable('schools', true, ['charset' => 'utf8mb4', 'collate' => 'utf8mb4_unicode_ci']);
    }

    public function down(): void
    {
        $this->forge->dropTable('schools', true);
    }
}