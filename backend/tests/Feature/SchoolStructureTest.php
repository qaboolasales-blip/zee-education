<?php

namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

class SchoolStructureTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    public function testAcademicStructureMigrationsExist(): void
    {
        $this->assertFileExists(APPPATH . 'SchoolLocal/Database/Migrations/2026-10-18_100002_create_academic_structure.php');
    }

    public function testModelsExist(): void
    {
        $this->assertTrue(class_exists('\\App\\Models\\SchoolLocal\\AcademicSessionModel'));
    }

    public function testSchemaDocumentsExist(): void
    {
        $this->assertFileExists(APPPATH . '../docs/school-local-settings-schema.md');
        $this->assertFileExists(APPPATH . '../docs/logo-upload-policy.md');
        $this->assertFileExists(APPPATH . '../docs/school-structure-api.md');
    }
}
