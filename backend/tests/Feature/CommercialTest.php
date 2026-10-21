<?php
namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;

class CommercialTest extends CIUnitTestCase
{
    public function testCommercialMigrationExists(): void
    {
        $this->assertFileExists(APPPATH . 'Database/Migrations/2026-10-18_000008_create_commercial.php');
    }
    public function testCommercialContractExists(): void
    {
        $this->assertFileExists(APPPATH . '../docs/commercial-api.md');
    }
}
