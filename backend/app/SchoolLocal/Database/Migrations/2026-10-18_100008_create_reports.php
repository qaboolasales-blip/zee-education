<?php
namespace AppSchool\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateReports extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            'owner_role' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'fields' => ['type' => 'TEXT', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('report_definitions', true);

        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'template_name' => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            'is_custom' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'design_charge_paid' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'reprint_count' => ['type' => 'INT', 'default' => 0],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('print_templates', true);
    }
    public function down(): void
    {
        $this->forge->dropTable('print_templates', true);
        $this->forge->dropTable('report_definitions', true);
    }
}
