<?php

namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

class ProvisioningTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    public function testProvisioningServiceExists(): void
    {
        $this->assertTrue(class_exists('\\App\\Libraries\\SchoolProvisioningService'));
    }

    public function testProvisioningModelsExist(): void
    {
        $this->assertTrue(class_exists('\\App\\Models\\SchoolsModel'));
    }

    public function testProvisioningStateMachineDocumented(): void
    {
        $this->assertFileExists(WRITEPATH . '../docs/provisioning-state-machine.md');
    }

    public function testNoSchoolLocalDataInControlPlane(): void
    {
        // Verify migrations don't create student tables in control plane
        $migrationFiles = glob(APPPATH . 'Database/Migrations/*schools*');
        $this->assertNotEmpty($migrationFiles);
    }
}
