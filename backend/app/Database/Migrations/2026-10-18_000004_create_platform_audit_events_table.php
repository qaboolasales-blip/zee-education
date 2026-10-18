<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the `platform_audit_events` table.
 *
 * Immutable audit log for control-plane actions.
 * Append-only: application code must never UPDATE or DELETE rows.
 */
class CreatePlatformAuditEventsTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'          => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'actor_type'  => ['type' => 'ENUM', 'constraint' => ['super_admin', 'system', 'installer'], 'null' => false],
            'actor_id'    => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'action'      => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => false],
            'target_type' => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => false],
            'target_id'   => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'ip_address'  => ['type' => 'VARCHAR', 'constraint' => 45, 'null' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => false],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->createTable('platform_audit_events', true, ['charset' => 'utf8mb4', 'collate' => 'utf8mb4_unicode_ci']);
    }

    public function down(): void
    {
        $this->forge->dropTable('platform_audit_events', true);
    }
}