<?php

namespace Tests\Feature;

use CodeIgniter\Shield\Test\AuthenticationTesting;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * Root-path landing contract for signed-in users.
 *
 * Regression guard for the 2026-10-21 live smoke finding: the root route used
 * to send every authenticated non-Super-Admin user to /login, while Shield
 * sends authenticated visitors of /login back to the root - an infinite
 * redirect loop that trapped every School Admin, Teacher, Parent and Student
 * after sign-in. Whatever the role, the root must end on a real page and must
 * never name /login as the destination for an authenticated user.
 */
class HomeLandingTest extends CIUnitTestCase
{
    use FeatureTestTrait;
    use AuthenticationTesting;

    private const USER  = 79101;
    private const USER2 = 79102;
    private const USER3 = 79103;
    private const SCHOOL = 79101;

    protected function tearDown(): void
    {
        $this->clean();

        // The auth service caches the signed-in user across test methods, so a
        // later test would otherwise inherit the previous test's identity.
        \Config\Services::resetSingle('auth');
        $_SESSION = [];

        parent::tearDown();
    }

    private function clean(): void
    {
        $db = \Config\Database::connect();

        foreach ([self::USER, self::USER2, self::USER3] as $u) {
            $db->table('user_school_access')->where('user_id', $u)->delete();
            $db->table('auth_groups_users')->where('user_id', $u)->delete();
            $db->table('users')->where('id', $u)->delete();
        }

        $db->table('schools')->where('id', self::SCHOOL)->delete();
    }

    private function makeUser(int $id, string $group): void
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $db->table('users')->insert([
            'id'         => $id,
            'username'   => 'landing_test_' . $id,
            'status'     => 'active',
            'active'     => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $db->table('auth_groups_users')->insert([
            'user_id'    => $id,
            'group'      => $group,
            'created_at' => $now,
        ]);
    }

    private function bindSchool(int $userId): void
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $db->table('schools')->insert([
            'id'                  => self::SCHOOL,
            'name'                => 'Landing Test School',
            'status'              => 'active',
            'plan_code'           => 'starter',
            'school_code'         => 'LNDTEST',
            'timezone'            => 'Asia/Karachi',
            'currency'            => 'PKR',
            'locale'              => 'en',
            'contact_email'       => 'landing@example.test',
            'contact_phone'       => '0000000000',
            'address'             => '',
            'installation_state'  => 'completed',
            'installation_status' => 'completed',
            'created_at'          => $now,
            'updated_at'          => $now,
        ]);

        $db->table('user_school_access')->insert([
            'user_id'    => $userId,
            'school_id'  => self::SCHOOL,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function redirectOf(int $userId): string
    {
        $user = model(\CodeIgniter\Shield\Models\UserModel::class)->findById($userId);

        $this->assertNotNull($user, 'The landing-test user must exist.');

        $this->actingAs($user);

        $result = $this->get('/');

        $this->assertTrue($result->isRedirect(), 'The root must redirect a signed-in user.');

        return (string) $result->getRedirectUrl();
    }

    public function testSuperAdminRootGoesToPortal(): void
    {
        $this->makeUser(self::USER, 'superadmin');

        $this->assertStringContainsString('/portal', $this->redirectOf(self::USER));
    }

    public function testSchoolAdminWithSchoolRootGoesToSchool(): void
    {
        $this->makeUser(self::USER, 'school_admin');
        $this->bindSchool(self::USER);

        $this->assertStringContainsString('/school', $this->redirectOf(self::USER));
    }

    public function testParentRootNeverBouncesBackToLogin(): void
    {
        $this->makeUser(self::USER, 'parent');

        $destination = $this->redirectOf(self::USER);

        $this->assertStringNotContainsString('login', $destination,
            'A signed-in user must never be sent to /login: / redirects authed visitors back, which loops.');
    }

    public function testStaffWithoutSchoolNeverBouncesBackToLogin(): void
    {
        $this->makeUser(self::USER2, 'teacher');

        $destination = $this->redirectOf(self::USER2);

        $this->assertStringNotContainsString('login', $destination,
            'Signed-in staff without a linked school must land on a stable page, not /login.');
    }

    public function testAnonymousRootStillGoesToLogin(): void
    {
        $result = $this->get('/');

        $this->assertTrue($result->isRedirect());
        $this->assertStringContainsString('login', (string) $result->getRedirectUrl());
    }
}
