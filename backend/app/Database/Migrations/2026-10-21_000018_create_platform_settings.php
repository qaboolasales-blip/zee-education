<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Platform settings (control plane).
 *
 * Key/value store for Super Admin workspace preferences that must survive a
 * restart: the platform operation switches, the negotiated per-school rate
 * book and the renewal reminder log. Without it the Super Admin Settings
 * screen could only ever be a set of local toggles that vanish on reload.
 */
class CreatePlatformSettings extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'            => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'setting_key'   => ['type' => 'VARCHAR', 'constraint' => 191, 'null' => false],
            'setting_value' => ['type' => 'TEXT', 'null' => true],
            'updated_by'    => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'created_at'    => ['type' => 'DATETIME', 'null' => false],
            'updated_at'    => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('setting_key');
        $this->forge->createTable('platform_settings', true);
    }

    public function down(): void
    {
        $this->forge->dropTable('platform_settings', true);
    }
}
