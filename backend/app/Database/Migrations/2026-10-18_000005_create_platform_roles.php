<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreatePlatformRoles extends Migration
{
    public function up(): void
    {
        // Shield groups are configured in Config/AuthGroups, not stored in a table.
    }

    public function down(): void
    {
        // No database changes.
    }
}
