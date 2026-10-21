<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class ExtendSchoolsTable extends Migration
{
    public function up(): void
    {
        $fields = [
            'contact_email'       => ['type' => 'VARCHAR', 'constraint' => 191, 'null' => true],
            'contact_phone'       => ['type' => 'VARCHAR', 'constraint' => 32, 'null' => true],
            'address'             => ['type' => 'TEXT', 'null' => true],
            'branding_logo_path'  => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'branding_reference'  => ['type' => 'VARCHAR', 'constraint' => 191, 'null' => true],
            'commercial_metadata' => ['type' => 'JSON', 'null' => true, 'comment' => 'Negotiated commercial terms (non-pricing sensitive)'],
            'installation_state'  => ['type' => 'ENUM', 'constraint' => ['requested', 'validating', 'creating', 'migrated', 'seeded', 'completed', 'failed'], 'default' => 'requested', 'null' => true],
            'installation_status' => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => true],
            'provisioned_at'      => ['type' => 'DATETIME', 'null' => true],
        ];
        $this->forge->addColumn('schools', $fields);
    }

    public function down(): void
    {
        $this->forge->dropColumn('schools', [
            'contact_email', 'contact_phone', 'address',
            'branding_logo_path', 'branding_reference',
            'commercial_metadata', 'installation_state',
            'installation_status', 'provisioned_at'
        ]);
    }
}
