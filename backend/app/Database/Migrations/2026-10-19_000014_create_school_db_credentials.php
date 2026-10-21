<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Per-school MySQL credentials for its dedicated school database.
 *
 * WHY THIS EXISTS
 * ---------------
 * Until now every school database was reached with ONE shared MySQL user
 * (schooldb.default.* in .env). That is not acceptable for a commercial
 * product: a credential leak, or a bug that runs a query against the wrong
 * database name, would expose every tenant at once. Each school must be
 * reached with its own database user so that a school's access can be
 * revoked on its own.
 *
 * PASSWORD STORAGE
 * ----------------
 * db_password_encrypted holds the password encrypted with CodeIgniter's
 * Encryption service, NOT hashed: the application must be able to authenticate
 * to MySQL, so it needs the original value back. The encryption key
 * (encryption_key in .env) must never be committed to the repository. A
 * database dump on its own is therefore not enough to reach any school database.
 *
 * This table never stores learner data - only connection settings.
 */
class CreateSchoolDbCredentials extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'                => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'school_id'         => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'db_hostname'       => ['type' => 'VARCHAR', 'constraint' => 191, 'null' => false, 'default' => 'localhost'],
            'db_port'           => ['type' => 'INT', 'unsigned' => true, 'null' => false, 'default' => 3306],
            'db_name'           => ['type' => 'VARCHAR', 'constraint' => 191, 'null' => false],
            'db_username'       => ['type' => 'VARCHAR', 'constraint' => 191, 'null' => false],
            'db_password_enc'   => ['type' => 'TEXT', 'null' => false],
            'status'            => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => false, 'default' => 'pending'],
            'last_verified_at'  => ['type' => 'DATETIME', 'null' => true],
            'last_error'        => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_at'        => ['type' => 'DATETIME', 'null' => false],
            'updated_at'        => ['type' => 'DATETIME', 'null' => false],
        ]);

        $this->forge->addKey('id', true);

        $this->forge->createTable('school_db_credentials', true, ['charset' => 'utf8mb4', 'collate' => 'utf8mb4_unicode_ci']);
    }

    public function down(): void
    {
        $this->forge->dropTable('school_db_credentials', true);
    }
}