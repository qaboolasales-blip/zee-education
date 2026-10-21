<?php
namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;

class FeesTest extends CIUnitTestCase
{
    public function testFeesMigrationExists(): void
    {
        $this->assertFileExists(APPPATH . 'SchoolLocal/Database/Migrations/2026-10-18_100007_create_fees.php');
    }
    public function testFeesContractExists(): void
    {
        $this->assertFileExists(APPPATH . '../docs/fees-api.md');
    }
    public function testNoPaymentGatewayDocumented(): void
    {
        $content = file_get_contents(APPPATH . '../docs/fees-api.md');
        $this->assertStringContainsString('No payment gateway', $content);
    }
}
