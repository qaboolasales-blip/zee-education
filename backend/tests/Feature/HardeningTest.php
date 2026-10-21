<?php
namespace Tests\Feature;
use CodeIgniter\Test\CIUnitTestCase;
class HardeningTest extends CIUnitTestCase
{
    public function testDocExists(): void { $this->assertFileExists(APPPATH . '../docs/hardening.md'); }
}
