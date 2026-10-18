<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the `provisioning_jobs` table.
 *
 * Tracks installation and lifecycle operations for a school.
 * Connection credentials are NOT stored here — they are encrypted
 * and stored separately per ADR-108.
 */
class CreateProvisioningJobsTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'             => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'school_id'      => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'type'           => ['type' => 'ENUM', 'constraint' => ['install', 'migrate', 'suspend', 'resume', 'decommission'], 'null' => false],
            'status'         => ['type' => 'ENUM', 'constraint' => ['pending', 'running', 'completed', 'failed'], 'default' => 'pending', 'null' => false],
            'target_database' => ['type' => 'VARCHAR', 'constraint' => 191, 'null' => false],
            'attempts'       => ['type' => 'INT', 'unsigned' => true, 'default' => 0, 'null' => false],
            'error_message'  => ['type' => 'TEXT', 'null' => true],
            'started_at'     => ['type' => 'DATETIME', 'null' => true],
            'completed_at'   => ['type' => 'DATETIME', 'null' => true],
            'created_at'     => ['type' => 'DATETIME', 'null' => false],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('school_id', 'schools', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('provisioning_jobs', true, ['charset' => 'utf8mb4', 'collate' => 'utf8mb4_unicode_ci']);
    }

    public function down(): void
    {
        $this->forge->dropTable('provisioning_jobs', true);
    }
}