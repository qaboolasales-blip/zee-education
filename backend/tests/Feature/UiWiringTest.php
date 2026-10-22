<?php

namespace Tests\Feature;

use App\Controllers\Portal;
use App\Controllers\SchoolDashboard;
use CodeIgniter\Shield\Models\UserModel;
use CodeIgniter\Shield\Test\AuthenticationTesting;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * Behavioural coverage for the approved UI shell wiring (6 flows).
 */
final class UiWiringTest extends CIUnitTestCase
{
    use FeatureTestTrait;
    use AuthenticationTesting;

    private const SCHOOL = 999912;

    protected function tearDown(): void
    {
        $db = \Config\Database::connect();
        $db->table('user_school_access')->where('school_id', self::SCHOOL)->delete();
        $db->table('auth_groups_users')->where('user_id', 999912)->delete();
        $db->table('users')->where('id', 999912)->delete();
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
            'name'                => 'UI Wiring School',
            'status'              => 'active',
            'plan_code'           => 'starter',
            'school_code'         => 'UIWTEST',
            'timezone'            => 'Asia/Karachi',
            'currency'            => 'PKR',
            'contact_email'       => 'wiring@test.local',
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
        $id  = 999912;
        $db->table('users')->insert([
            'id'         => $id,
            'username'   => 'wiring_tester',
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
            'name'        => 'wiring@test.local',
            'secret'      => password_hash('Wiring-123!', PASSWORD_DEFAULT),
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

    public function testCsrfEndpointHandsBackTheSessionToken(): void
    {
        $this->makeUser('school_admin', self::SCHOOL);
        $this->makeSchool();
        $result = $this->get('/api/csrf');
        $this->assertSame(200, $result->response()->getStatusCode());
        $body = json_decode((string) $result->response()->getBody(), true);
        $this->assertTrue($body['ok'] ?? false);
        $this->assertNotEmpty($body['hash']);
        $this->assertSame('X-CSRF-TOKEN', $body['header']);
        $this->assertNotEmpty($body['name']);
    }

    public function testAnonymousCsrfRequestIsRedirectedByTheSessionFilter(): void
    {
        $this->clean();
        $result = $this->get('/api/csrf');
        $this->assertTrue($result->isRedirect());
    }

    public function testSchoolDashboardContainsTheWriteClient(): void
    {
        $this->makeSchool();
        $this->makeUser('school_admin', self::SCHOOL);
        $controller = new SchoolDashboard();
        $html = $controller->index();
        $this->assertStringContainsString('ZEE.addStudent()', $html);
        $this->assertStringContainsString('ZEE.submitAttendance(', $html);
        $this->assertStringContainsString('ZEE.addStaff()', $html);
        $this->assertStringContainsString('ZEE.recordPayment()', $html);
        $this->assertStringContainsString('/api/csrf', $html);
        $this->assertStringContainsString('X-CSRF-TOKEN', $html);
        $this->assertStringContainsString('window.ZEE', $html);
    }

    public function testSuperAdminPortalContainsTheWriteClient(): void
    {
        $this->makeUser('superadmin');
        $controller = new Portal();
        $html = $controller->index();
        $this->assertStringContainsString('ZEE.addSchool()', $html);
        $this->assertStringContainsString('ZEE.issueLicense(', $html);
        $this->assertStringContainsString('/api/admin/schools', $html);
        $this->assertStringContainsString('/api/admin/billing/plans', $html);
    }

    public function testBillingPlansEndpointListsTheCatalogue(): void
    {
        $this->makeUser('superadmin');
        $result = $this->get('/api/admin/billing/plans');
        $this->assertSame(200, $result->response()->getStatusCode());
        $body = json_decode((string) $result->response()->getBody(), true);
        $this->assertTrue($body['ok'] ?? false);
        $this->assertNotEmpty($body['plans']);
    }

    protected function clean(): void
    {
        $db = \Config\Database::connect();
        $db->table('user_school_access')->where('user_id', 999912)->delete();
        $db->table('auth_groups_users')->where('user_id', 999912)->delete();
        $db->table('auth_identities')->where('user_id', 999912)->delete();
        $db->table('users')->where('id', 999912)->delete();
        $db->table('schools')->where('id', self::SCHOOL)->delete();
    }
}
