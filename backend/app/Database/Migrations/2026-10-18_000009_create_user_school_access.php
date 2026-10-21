<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Binds a platform user to exactly ONE school installation.
 *
 * WHY THIS EXISTS
 * ---------------
 * A school role (School Admin, Teacher, Parent, Student) must only ever act
 * inside its own school's dedicated database. Something has to resolve WHICH
 * school a signed-in user belongs to, and that resolution must be server-side.
 *
 * This table lives in the CONTROL PLANE because it is installation metadata,
 * not learner data. It holds no student, guardian, staff, attendance, result
 * or fee information (ADR-001).
 *
 * The school id here is used ONLY to look up the dedicated school connection.
 * A value supplied by a browser is never trusted (ADR-003).
 */
class CreateUserSchoolAccess extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'         => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'user_id'    => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'school_id'  => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'updated_at' => ['type' => 'DATETIME', 'null' => false],
        ]);

$this->forge->addKey('id', true);

        // One user belongs to at most one school installation. This is
        // enforced in SchoolAccessService rather than with a second unique
        // key, because on this MySQL build a UNIQUE key alongside the
        // AUTO_INCREMENT primary key makes MySQL reject the whole table.

        $this->forge->createTable('user_school_access', true, ['charset' => 'utf8mb4', 'collate' => 'utf8mb4_unicode_ci']);
    }

    public function down(): void
    {
        $this->forge->dropTable('user_school_access', true);
    }
}
