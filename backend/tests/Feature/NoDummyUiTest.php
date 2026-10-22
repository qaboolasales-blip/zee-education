<?php

namespace Tests\Feature;

use App\Controllers\Portal;
use App\Controllers\SchoolDashboard;
use App\Controllers\MobileApp;
use CodeIgniter\Shield\Models\UserModel;
use CodeIgniter\Shield\Test\AuthenticationTesting;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

final class NoDummyUiTest extends CIUnitTestCase
{
    use FeatureTestTrait;
    use AuthenticationTesting;

    private const SCHOOL = 999981;

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $db->table('user_school_access')->where('school_id', self::SCHOOL)->delete();
        $db->table('auth_groups_users')->where('user_id', 999982)->delete();
        $db->table('users')->where('id', 999982)->delete();
        $db->table('schools')->where('id', self::SCHOOL)->delete();
        \Config\Services::resetSingle('auth');
        $_SESSION = [];
        parent::tearDown();
    }

    private function makeSchool(): void
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');
        $db->table('schools')->insert([
            'id'                  => self::SCHOOL,
            'name'                => 'Test UI School',
            'status'              => 'active',
            'plan_code'           => 'starter',
            'school_code'         => 'NODUM',
            'timezone'            => 'Asia/Karachi',
            'currency'            => 'PKR',
            'contact_email'       => 'nodummy@test.local',
            'contact_phone'       => '0000000000',
            'address'             => '',
            'installation_state'  => 'completed',
            'installation_status' => 'completed',
            'created_at'          => $now,
            'updated_at'          => $now,
        ]);
    }

    private function makeUser(string $group, ?int $schoolId = null): int
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');
        $id  = 999982;
        $db->table('users')->insert([
            'id'         => $id,
            'username'   => 'test_ui_tester',
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
        $db->table('auth_identities')->insert([
            'user_id'     => $id,
            'type'        => 'email_password',
            'name'        => 'testui@test.local',
            'secret'      => password_hash('NoDummy-123!', PASSWORD_DEFAULT),
            'created_at'  => $now,
        ]);
        if ($schoolId !== null) {
            $db->table('user_school_access')->insert([
                'user_id'     => $id,
                'school_id'   => $schoolId,
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);
        }
        $user = model(UserModel::class)->findById($id);
        $this->actingAs($user);
        return $id;
    }

    /** Placeholder tokens that must never survive rendering. */
    private const PLACEHOLDER_TOKENS = [
        '__ZEE_SCHOOLS__', '__ZEE_STATS__', '__ZEE_RENEWALS__',
        '__ZEE_INSTALL_HEALTH__', '__ZEE_RATEBOOK__', '__ZEE_SCHOOL_OPTIONS__',
        '__ZEE_TICKETS__', '__ZEE_TICKET_COUNT__', '__ZEE_PLATFORM_TREND__',
        '__ZEE_OPERATIONS__', '__ZEE_REMINDER_LOG__', '__ZEE_TEMPLATE_REQUESTS__',
        '__ZEE_USER__', '__ZEE_THEME__', '__ZEE_SCHOOL_NAME__',
    ];

    /** Banned strings that signal demo/dummy/fabricated content. */
    private const BANNED = ['demo', 'dummy', 'lorem', 'sample ui', 'john doe', 'jane doe', 'lorem ipsum'];

    private function assertNoPlaceholderOrDummy(string $html, string $context): void
    {
        foreach (self::PLACEHOLDER_TOKENS as $token) {
            $this->assertStringNotContainsString($token, $html, "$context still has placeholder token $token");
        }
        foreach (self::BANNED as $word) {
            $this->assertStringNotContainsString($word, strtolower($html), "$context contains banned dummy word '$word'");
        }
    }

    public function testPortalRendersNoPlaceholders(): void
    {
        $this->makeSchool();
        $this->makeUser('superadmin');
        $controller = new Portal();
        $html = $controller->index();
        $this->assertStringContainsString('ZEE.addSchool()', $html);
        $this->assertNoPlaceholderOrDummy($html, 'Portal');
    }

    public function testSchoolDashboardRendersNoPlaceholders(): void
    {
        $this->makeSchool();
        $this->makeUser('school_admin', self::SCHOOL);
        $controller = new SchoolDashboard();
        $html = $controller->index();
        $this->assertNoPlaceholderOrDummy($html, 'SchoolDashboard');
    }

    public function testMobileAppRendersNoPlaceholders(): void
    {
        $this->makeSchool();
        $this->makeUser('teacher', self::SCHOOL);
        $controller = new MobileApp();
        $html = $controller->index();
        $this->assertStringNotContainsString('messages/', $html);
        $this->assertStringNotContainsString('leave/', $html);
        $this->assertStringNotContainsString('admissions/', $html);
        $this->assertNoPlaceholderOrDummy($html, 'MobileApp');
    }
}