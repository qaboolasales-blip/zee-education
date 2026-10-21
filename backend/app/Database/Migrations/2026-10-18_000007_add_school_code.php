<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddSchoolCode extends Migration
{
    public function up(): void
    {
        $fields = [
            'school_code' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true, 'unique' => true],
        ];
        $this->forge->addColumn('schools', $fields);
        $this->forge->addKey('school_code', false, true); // unique
    }

    public function down(): void
    {
        $this->forge->dropColumn('schools', ['school_code']);
    }
}
