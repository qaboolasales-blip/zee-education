<?php
namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;

class ResultsTest extends CIUnitTestCase
{
    public function testAssessmentMigrationExists(): void
    {
        $this->assertFileExists(APPPATH . 'SchoolLocal/Database/Migrations/2026-10-18_100006_create_assessments.php');
    }
    public function testResultsContractExists(): void
    {
        $this->assertFileExists(APPPATH . '../docs/results-api.md');
    }
    public function testPublishedOnlyRuleDocumented(): void
    {
        $content = file_get_contents(APPPATH . '../docs/results-api.md');
        $this->assertStringContainsString('Parent/student access only when state = published', $content);
    }
}
