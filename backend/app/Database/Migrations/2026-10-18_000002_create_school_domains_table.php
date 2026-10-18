<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the `school_domains` table.
 *
 * Verified hostnames for each school. One school may have multiple
 * domains; exactly one is marked primary.
 */
class CreateSchoolDomainsTable extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'          => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'school_id'   => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'domain'      => ['type' => 'VARCHAR', 'constraint' => 191, 'null' => false],
            'is_primary'  => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0, 'null' => false],
            'verified_at' => ['type' => 'DATETIME', 'null' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => false],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['school_id', 'domain'], 'uq_school_domain');
        $this->forge->addForeignKey('school_id', 'schools', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('school_domains', true, ['charset' => 'utf8mb4', 'collate' => 'utf8mb4_unicode_ci']);
    }

    public function down(): void
    {
        $this->forge->dropTable('school_domains', true);
    }
}