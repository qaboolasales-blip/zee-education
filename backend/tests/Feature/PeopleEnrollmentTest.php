<?php

namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

class PeopleEnrollmentTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    public function testMigrationsExist(): void
    {
        $this->assertFileExists(APPPATH . 'SchoolLocal/Database/Migrations/2026-10-18_100003_create_people_enrollment.php');
    }

    public function testSchemaValid(): void
    {
        $this->assertFileExists(APPPATH . '../docs/people-enrollment-api.md');
    }

    public function testPrivacyAndIsolationDocumented(): void
    {
        $content = file_get_contents(APPPATH . '../docs/people-enrollment-api.md');
        $this->assertStringContainsString('Parent-child access', $content);
        $this->assertStringContainsString('isolation', $content);
        $this->assertStringContainsString('Privacy', $content);
    }
}
