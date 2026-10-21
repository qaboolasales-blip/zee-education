<?php
namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateCommercial extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id' => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'school_id' => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'setup_fee' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true],
            'first_year_fee' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true],
            'renewal_fee' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true],
            'hosting_fee' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true],
            'domain_fee' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true],
            'addon_fees' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true],
            'license_status' => ['type' => 'VARCHAR', 'constraint' => 30, 'default' => 'active'],
            'expiry_date' => ['type' => 'DATE', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('commercial_agreements', true);
    }
    public function down(): void
    {
        $this->forge->dropTable('commercial_agreements', true);
    }
}
