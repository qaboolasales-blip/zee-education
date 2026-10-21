<?php
namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;

class ReportsTest extends CIUnitTestCase
{
    public function testReportsMigrationExists(): void
    {
        $this->assertFileExists(APPPATH . 'SchoolLocal/Database/Migrations/2026-10-18_100008_create_reports.php');
    }
    public function testReportsContractExists(): void
    {
        $this->assertFileExists(APPPATH . '../docs/reports-api.md');
    }
}
