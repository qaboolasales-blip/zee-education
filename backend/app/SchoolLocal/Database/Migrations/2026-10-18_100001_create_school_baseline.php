<?php

namespace AppSchool\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateSchoolBaseline extends Migration
{
    public function up(): void
    {
        // School-local baseline - never runs on control-plane DB
        // This is applied to dedicated school DBs only during provisioning
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'setting_key' => ['type' => 'VARCHAR', 'constraint' => 191, 'null' => false],
            'setting_value' => ['type' => 'TEXT', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('setting_key', false, true);
        $this->forge->createTable('school_settings', true);
    }

    public function down(): void
    {
        $this->forge->dropTable('school_settings', true);
    }
}
