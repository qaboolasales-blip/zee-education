<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * The annual licence a school actually runs on.
 *
 * WHY THIS EXISTS
 * ---------------
 * commercial_agreements (migration 000008) already stores fee columns and a
 * license_status, but nothing in the system was ever able to decide whether a
 * school may still WRITE. This table is the authoritative licence record and
 * is what LicenseService and LicenseFilter read.
 *
 * KEY STORAGE
 * -----------
 * The licence key is NEVER stored in plaintext. Only:
 *   license_key_hash   - SHA-256 of the key, used to verify a presented key
 *   license_key_prefix - first 12 characters, used to locate the row and to
 *                        show the owner which key a school is on
 * A leaked database dump therefore cannot be used to clone a licence.
 *
 * LIMIT SNAPSHOT
 * --------------
 * max_students is copied from the plan at issue time. If the owner later raises
 * the catalogue price or limits, an already-issued licence keeps the terms the
 * school actually bought.
 *
 * STATUS VALUES
 * -------------
 *   active      - paid and inside its period
 *   renewal_due - inside period, but the period ends within the reminder window
 *   grace       - period ended, still inside grace_until (warning only)
 *   expired     - period and grace both ended (read-only, data retained)
 *   revoked     - withdrawn by the operator (read-only, data retained)
 *
 * This table holds commercial metadata only. No learner data.
 */
class CreateSchoolLicenses extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'id'                => ['type' => 'BIGINT', 'unsigned' => true, 'auto_increment' => true],
            'school_id'         => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'plan_id'           => ['type' => 'BIGINT', 'unsigned' => true, 'null' => false],
            'license_key_hash'  => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => false],
            'license_key_prefix' => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => false],
            'status'            => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => false, 'default' => 'active'],
            'max_students'      => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'max_staff'         => ['type' => 'INT', 'unsigned' => true, 'null' => true],
            'starts_at'         => ['type' => 'DATE', 'null' => false],
            'expires_at'        => ['type' => 'DATE', 'null' => false],
            'grace_until'       => ['type' => 'DATE', 'null' => true],
            'grace_days'        => ['type' => 'INT', 'unsigned' => true, 'null' => false, 'default' => 14],
            'last_verified_at'  => ['type' => 'DATETIME', 'null' => true],
            'revoked_at'        => ['type' => 'DATETIME', 'null' => true],
            'revoked_reason'    => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'notes'             => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_at'        => ['type' => 'DATETIME', 'null' => false],
            'updated_at'        => ['type' => 'DATETIME', 'null' => false],
        ]);

        $this->forge->addKey('id', true);

        // Deliberately no secondary keys. Key lookup goes through
        // license_key_prefix (see LicenseService::findByKey) and uniqueness is
        // asserted by the service, because this MySQL build rejects a UNIQUE
        // key declared alongside the AUTO_INCREMENT primary key.
        $this->forge->createTable('school_licenses', true, ['charset' => 'utf8mb4', 'collate' => 'utf8mb4_unicode_ci']);
    }

    public function down(): void
    {
        $this->forge->dropTable('school_licenses', true);
    }
}