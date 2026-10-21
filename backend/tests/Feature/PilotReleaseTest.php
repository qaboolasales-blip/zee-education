<?php
namespace Tests\Feature;
use CodeIgniter\Test\CIUnitTestCase;
class PilotReleaseTest extends CIUnitTestCase
{
    public function testDocExists(): void { $this->assertFileExists(APPPATH . '../docs/pilot-release.md'); }
}
