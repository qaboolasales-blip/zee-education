<?php
namespace Tests\Feature;
use CodeIgniter\Test\CIUnitTestCase;
class MobileConnectionTest extends CIUnitTestCase
{
    public function testDocExists(): void { $this->assertFileExists(APPPATH . '../docs/mobile-connection-api.md'); }
}
