<?php

namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

class AttendanceTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    public function testAttendanceMigrationExists(): void
    {
        $this->assertFileExists(APPPATH . 'SchoolLocal/Database/Migrations/2026-10-18_100004_create_attendance.php');
    }

    public function testAttendanceContractExists(): void
    {
        $this->assertFileExists(APPPATH . '../docs/attendance-api.md');
    }

    public function testUniqueConstraintDocumented(): void
    {
        $content = file_get_contents(APPPATH . '../docs/attendance-api.md');
        $this->assertStringContainsString('One attendance record per', $content);
    }
}
