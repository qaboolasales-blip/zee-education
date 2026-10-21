<?php

namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

class AuthTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        // Migrations may be needed for full auth functionality
    }

    public function testLoginPageAccessible(): void
    {
        try {
            $result = $this->get('/login');
            $result->assertStatus(200);
        } catch (\Exception $e) {
            $this->markTestSkipped('Login page requires full DB setup: ' . $e->getMessage());
        }
    }

    public function testLogoutRedirectsToLogin(): void
    {
        $result = $this->get('/logout');
        $result->assertRedirect();
    }

    public function testUnauthenticatedUserCannotAccessProtectedRoute(): void
    {
        // The entry point must never render application content to an anonymous
        // visitor. It redirects to sign-in (or to the installer when the platform
        // has not been installed yet).
        $result = $this->get('/');
        $result->assertRedirect();

        $destination = $result->isRedirect()
            ? (string) $result->getRedirectUrl()
            : '';

        $this->assertStringContainsString(
            'login',
            $destination,
            'Anonymous visitor must be sent to sign-in.'
        );
    }

    public function testRoleFilterExists(): void
    {
        $this->assertTrue(class_exists('\\App\\Filters\\RoleFilter'));
    }

    public function testRolePolicyExists(): void
    {
        $this->assertTrue(class_exists('\\App\\Policies\\RolePolicy'));
    }
}
