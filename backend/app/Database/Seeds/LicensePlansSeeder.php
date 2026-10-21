<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Commercial plan catalogue.
 *
 * WHY THESE NUMBERS
 * -----------------
 * The plan CODES (starter/growth/complete) and the annual fees are the values
 * already shown in the approved Super Admin UI ("Plans & Add-ons",
 * "Billing & Renewals" and the school table's plan filter). The seed
 * deliberately matches the approved design so the UI and the database cannot
 * drift apart.
 *
 * The seeder is IDEMPOTENT: it updates an existing plan row in place instead of
 * inserting a duplicate, so re-running it during provisioning is safe.
 *
 * Limits (max_students / max_staff) are the operator's commercial policy. A
 * NULL limit means unlimited. Changing a limit here only affects licences
 * issued FROM NOW ON - an existing school_licenses row keeps its own snapshot,
 * so a paid customer never loses capacity because the catalogue was edited.
 */
class LicensePlansSeeder extends Seeder
{
    public function run(): void
    {
        $now = date('Y-m-d H:i:s');

        $plans = [
            [
                'code'       => 'starter',
                'name'       => 'Starter',
                'annual_fee' => '30000.00',
                'currency'   => 'PKR',
                'max_students' => 300,
                'max_staff'    => 20,
                'features'   => json_encode([
                    'Students'    => 'Up to 300',
                    'Staff'       => 'Up to 20',
                    'Mobile PWA'  => true,
                    'Attendance'  => true,
                    'Fees'        => true,
                    'Reports'     => true,
                    'Print templates' => true,
                    'Support'     => 'Business hours',
                ]),
                'sort_order' => 1,
            ],
            [
                'code'       => 'growth',
                'name'       => 'Growth',
                'annual_fee' => '42000.00',
                'currency'   => 'PKR',
                'max_students' => 1000,
                'max_staff'    => 50,
                'features'   => json_encode([
                    'Students'    => 'Up to 1,000',
                    'Staff'       => 'Up to 50',
                    'Mobile PWA'  => true,
                    'Attendance'  => true,
                    'Fees'        => true,
                    'Reports'     => true,
                    'Print templates' => true,
                    'Support'     => 'Priority',
                ]),
                'sort_order' => 2,
            ],
            [
                'code'       => 'complete',
                'name'       => 'Complete',
                'annual_fee' => '65000.00',
                'currency'   => 'PKR',
                'max_students' => 3000,
                'max_staff'    => 150,
                'features'   => json_encode([
                    'Students'    => 'Up to 3,000',
                    'Staff'       => 'Up to 150',
                    'Mobile PWA'  => true,
                    'Attendance'  => true,
                    'Fees'        => true,
                    'Reports'     => true,
                    'Print templates' => true,
                    'Support'     => 'Dedicated',
                ]),
                'sort_order' => 3,
            ],
        ];

        $db = \Config\Database::connect();

        foreach ($plans as $plan) {
            $existing = $db->table('license_plans')
                ->where('code', $plan['code'])
                ->get()
                ->getRow();

            $row = $plan + ['is_active' => 1, 'updated_at' => $now, 'created_at' => $now];

            if ($existing === null) {
                $db->table('license_plans')->insert($row);

                continue;
            }

            $db->table('license_plans')
                ->where('id', $existing->id)
                ->update([
                    'name'         => $row['name'],
                    'annual_fee'   => $row['annual_fee'],
                    'currency'     => $row['currency'],
                    'max_students' => $row['max_students'],
                    'max_staff'    => $row['max_staff'],
                    'features'     => $row['features'],
                    'sort_order'   => $row['sort_order'],
                    'is_active'    => $row['is_active'],
                    'updated_at'   => $row['updated_at'],
                ]);
        }
    }
}