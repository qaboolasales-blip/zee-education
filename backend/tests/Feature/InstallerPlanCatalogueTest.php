<?php

namespace Tests\Feature;

use App\Libraries\InstallerService;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * The first-run installer must leave a usable plan catalogue.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * A fresh install migrated every table but seeded none of the commercial
 * plans. Provisioning then created a school, but the Super Admin had no plan
 * to issue a licence from, so the school's every write was refused until
 * somebody ran a CLI seeder - impossible on typical shared hosting. This test
 * pins the catalogue to the installer itself.
 *
 * @internal
 */
final class InstallerPlanCatalogueTest extends CIUnitTestCase
{
    public function testMigrateSeedsPlanCatalogueOnAFreshInstall(): void
    {
        $db = \Config\Database::connect();
        $db->table('license_plans')->emptyTable();

        $result = (new InstallerService())->migrate();

        $this->assertTrue($result['ok'], implode(' | ', $result['log']));
        $this->assertContains('plan catalogue: OK', $result['log']);

        $plans = $db->table('license_plans')->orderBy('id', 'asc')->get()->getResultArray();

        $this->assertSame(['starter', 'growth', 'complete'], array_column($plans, 'code'));
        $this->assertSame('30000.00', $plans[0]['annual_fee']);
        $this->assertSame('PKR', $plans[0]['currency']);
    }

    public function testMigrateIsIdempotentForTheCatalogue(): void
    {
        $db = \Config\Database::connect();

        $this->assertTrue((new InstallerService())->migrate()['ok']);
        $this->assertTrue((new InstallerService())->migrate()['ok']);

        $this->assertSame(3, $db->table('license_plans')->countAllResults());
    }
}
