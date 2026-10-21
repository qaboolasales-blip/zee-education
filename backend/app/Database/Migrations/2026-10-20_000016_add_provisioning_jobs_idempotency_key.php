<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * RB-4 / C-C-03 R-2: DB-level idempotency guard for `provisioning_jobs`.
 *
 * Adds a nullable `idempotency_key` with a UNIQUE index. Job writers must
 * supply a deterministic key (e.g. `install:{school_id}`) so a retried job is
 * rejected-or-updated instead of duplicated. MySQL permits multiple NULLs
 * in a UNIQUE index, so rows written without a key are not blocked while any
 * duplicate key is rejected by the database itself (error 1062).
 *
 * The table is currently a schema placeholder (no writer exists yet), so the
 * index can be added safely on every installation. Note: a UNIQUE key added
 * at CREATE TABLE time next to the AUTO_INCREMENT primary key is rejected by
 * some MySQL builds (see the comments in migrations 000009/000010), which is
 * why this index is applied with an explicit ALTER TABLE.
 */
class AddProvisioningJobsIdempotencyKey extends Migration
{
    public function up(): void
    {
        $this->forge->addColumn('provisioning_jobs', [
            'idempotency_key' => [
                'type'       => 'VARCHAR',
                'constraint' => 191,
                'null'       => true,
                'after'      => 'target_database',
            ],
        ]);

        $this->db->query(
            'ALTER TABLE `provisioning_jobs` '
            . 'ADD UNIQUE `uq_provisioning_jobs_idempotency_key` (`idempotency_key`)'
        );
    }

    public function down(): void
    {
        $this->db->query(
            'ALTER TABLE `provisioning_jobs` '
            . 'DROP INDEX `uq_provisioning_jobs_idempotency_key`'
        );

        $this->forge->dropColumn('provisioning_jobs', 'idempotency_key');
    }
}
