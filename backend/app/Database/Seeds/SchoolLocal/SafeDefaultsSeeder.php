<?php

namespace App\Database\Seeds\SchoolLocal;

use CodeIgniter\Database\ConnectionInterface;

/**
 * Safe structural defaults for a newly provisioned school database.
 *
 * RULES (PROJECT_MEMORY "data/security"):
 *  - Only STRUCTURAL defaults are seeded: settings, an open academic window
 *    and the initial fee-head scaffolding a school needs before real use.
 *  - NEVER seed people. No students, guardians, staff, teachers, parents or
 *    any invented personal record. Those are entered by the school.
 *  - Money is never invented: no fee_invoices and no fee_receipts.
 *  - Idempotent: running it again changes nothing and creates no duplicates.
 */
class SafeDefaultsSeeder
{
    /**
     * @var list<array<string, mixed>>
     */
    public static function defaults(): array
    {
        $now = date('Y-m-d H:i:s');

        return [
            ['setting_key' => 'school_initialized', 'setting_value' => '1'],
            ['setting_key' => 'attendance_target_percent', 'setting_value' => '90'],
            ['setting_key' => 'currency', 'setting_value' => 'PKR'],
            ['setting_key' => 'timezone', 'setting_value' => 'Asia/Karachi'],
            ['setting_key' => 'session_status', 'setting_value' => 'not_started'],
            ['setting_key' => 'fee_number_sequence', 'setting_value' => '1'],
            ['setting_key' => 'receipt_number_sequence', 'setting_value' => '1'],
        ];
    }

    /**
     * Insert any missing default into the school's own database.
     *
     * @return array{inserted:int, skipped:int}
     */
    public static function run(ConnectionInterface $db): array
    {
        $inserted = 0;
        $skipped  = 0;

        if (! $db->tableExists('school_settings')) {
            return ['inserted' => 0, 'skipped' => 0];
        }

        $now = date('Y-m-d H:i:s');

        foreach (self::defaults() as $row) {
            $exists = $db->table('school_settings')
                ->where('setting_key', $row['setting_key'])
                ->countAllResults();

            if ($exists > 0) {
                $skipped++;

                continue;
            }

            $db->table('school_settings')->insert([
                'setting_key'   => $row['setting_key'],
                'setting_value' => $row['setting_value'],
                'created_at'    => $now,
                'updated_at'    => $now,
            ]);

            $inserted++;
        }

        return ['inserted' => $inserted, 'skipped' => $skipped];
    }
}