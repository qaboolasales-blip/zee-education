<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Short-lived tokens behind the "connect your school" QR / manual flow.
 *
 * WHY THIS EXISTS
 * ---------------
 * A teacher, parent or student joining a school needs a way to reach that
 * school's own installation without being handed a permanent secret. A QR code
 * has to encode something, and that something must not be a credential.
 *
 * SECURITY CONTRACT
 * -----------------
 * The raw token exists ONLY in the QR image handed to the person. This table
 * stores token_hash = SHA-256(raw token). The server locates a row by
 * comparing hashes, so the database cannot be mined for usable tokens.
 *
 * Invites are deliberately short-lived (minutes, not days) and use-limited.
 * A QR screenshot is therefore near worthless, and a used or revoked invite
 * stops working immediately.
 *
 * An invite identifies WHICH school a person is joining. It is NOT
 * authentication: the person still has to sign in on that school's own domain
 * with their own credentials. Nothing here can read or write learner data.
 */
class CreateSchoolInvites extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'          => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'school_id'   => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'token_hash'  => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => false],
            'kind'        => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => false, 'default' => 'connect'],
            'domain'      => ['type' => 'VARCHAR', 'constraint' => 191, 'null' => true],
            'max_uses'    => ['type' => 'INT', 'unsigned' => true, 'null' => false, 'default' => 1],
            'used_count'  => ['type' => 'INT', 'unsigned' => true, 'null' => false, 'default' => 0],
            'expires_at'  => ['type' => 'DATETIME', 'null' => false],
            'used_at'     => ['type' => 'DATETIME', 'null' => true],
            'revoked_at'  => ['type' => 'DATETIME', 'null' => true],
            'created_by'  => ['type' => 'BIGINT', 'unsigned' => true, 'null' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => false],
        ]);

        $this->forge->addKey('id', true);

        // Token lookup is by token_hash and is asserted in InviteService; no
        // secondary UNIQUE key is declared for the reason recorded in
        // migration 000009.
        $this->forge->createTable('school_invites', true, ['charset' => 'utf8mb4', 'collate' => 'utf8mb4_unicode_ci']);
    }

    public function down(): void
    {
        $this->forge->dropTable('school_invites', true);
    }
}