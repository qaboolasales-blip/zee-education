<?php
namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;

class CommunicationTest extends CIUnitTestCase
{
    public function testCommunicationMigrationExists(): void
    {
        $this->assertFileExists(APPPATH . 'SchoolLocal/Database/Migrations/2026-10-18_100005_create_communication.php');
    }

    public function testCommunicationContractExists(): void
    {
        $this->assertFileExists(APPPATH . '../docs/communication-api.md');
    }

    public function testManualShareBoundaryDocumented(): void
    {
        $content = file_get_contents(APPPATH . '../docs/communication-api.md');
        $this->assertStringContainsString('user-initiated only', $content);
    }

    public function testCollisionRuleDocumented(): void
    {
        $content = file_get_contents(APPPATH . '../docs/communication-api.md');
        $this->assertStringContainsString('Collision rule', $content);
    }
}
