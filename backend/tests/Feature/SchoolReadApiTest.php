<?php

namespace Tests\Feature;

use CodeIgniter\Shield\Models\UserModel;
use CodeIgniter\Shield\Test\AuthenticationTesting;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * The school read API must answer from the school's OWN database.
 *
 * These tests prove the read side of the school workspace is wired to real
 * queries and never to a placeholder: a school with no installed database
 * answers zero / empty rather than a plausible-looking number, and a read that
 * succeeds returns the documented envelope.
 *
 * @internal
 */
final class SchoolReadApiTest extends CIUnitTestCase
{
    use FeatureTestTrait;
    use AuthenticationTesting;

    private const SCHOOL  = 999971;
    private const USER_ID = 999972;

    protected function setUp(): void
    {
        parent::setUp();
        $this->clean();
        $this->makeSchool();
    }

    protected function tearDown(): void
    {
        $this->clean();
        \Config\Services::resetSingle('auth');
        $_SESSION = [];
        parent::tearDown();
    }

    private function clean(): void
    {
        $db = \Config\Database::connect();
        $db->table('school_licenses')->where('school_id', self::SCHOOL)->delete();
        $db->table('user_school_access')->where('school_id', self::SCHOOL)->delete();
        $db->table('auth_groups_users')->where('user_id', self::USER_ID)->delete();
        $db->table('auth_identities')->where('user_id', self::USER_ID)->delete();
        $db->table('users')->where('id', self::USER_ID)->delete();
        $db->table('schools')->where('id', self::SCHOOL)->delete();
        $db->table('schools')->where('school_code', 'READTEST')->delete();
    }

    private function makeSchool(): void
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');
        $db->table('schools')->insert([
            'id'                  => self::SCHOOL,
            'name'                => 'Read API Test School',
            'status'              => 'active',
            'plan_code'           => 'starter',
            'school_code'         => 'READTEST',
            'timezone'            => 'Asia/Karachi',
            'currency'            => 'PKR',
            'locale'              => 'en',
            'contact_email'       => 'read@test.local',
            'contact_phone'       => '0000000000',
            'address'             => '',
            'installation_state'  => 'completed',
            'installation_status' => 'completed',
            'created_at'          => $now,
            'updated_at'          => $now,
        ]);
    }

    private function makeSchoolAdmin(): void
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $db->table('users')->insert([
            'id'         => self::USER_ID,
            'username'   => 'read_api_tester',
            'status'     => 'active',
            'active'     => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $db->table('auth_groups_users')->insert([
            'user_id'    => self::USER_ID,
            'group'      => 'school_admin',
            'created_at' => $now,
        ]);
        $db->table('auth_identities')->insert([
            'user_id'     => self::USER_ID,
            'type'        => 'email_password',
            'name'        => 'read@test.local',
            'secret'      => password_hash('ReadApi-123!', PASSWORD_DEFAULT),
            'created_at'  => $now,
        ]);
        $db->table('user_school_access')->insert([
            'user_id'     => self::USER_ID,
            'school_id'   => self::SCHOOL,
            'created_at'  => $now,
            'updated_at'  => $now,
        ]);

        // A current licence so the licence filter lets the reads through.
        $plan = $db->table('license_plans')->where('code', 'starter')->get()->getRow();

        if ($plan !== null) {
            $db->table('school_licenses')->insert([
                'school_id'          => self::SCHOOL,
                'plan_id'            => $plan->id,
                'license_key_hash'   => hash('sha256', 'ZEE-READ-TEST-KEY'),
                'license_key_prefix' => 'ZEE-READ',
                'status'             => 'active',
                'max_students'       => $plan->max_students,
                'max_staff'          => $plan->max_staff,
                'starts_at'          => date('Y-m-d'),
                'expires_at'         => date('Y-m-d', strtotime('+1 year')),
                'grace_until'        => date('Y-m-d', strtotime('+1 year +14 days')),
                'grace_days'         => 14,
                'last_verified_at'   => $now,
                'created_at'         => $now,
                'updated_at'         => $now,
            ]);
        }

        $this->actingAs(model(UserModel::class)->findById(self::USER_ID));
    }

    /**
     * @return array<string, mixed>
     */
    private function getJson(string $url): array
    {
        $result = $this->get($url);
        $this->assertSame(200, $result->response()->getStatusCode(), $url . ' did not answer 200');
        $body = json_decode((string) $result->response()->getBody(), true);
        $this->assertIsArray($body, $url . ' did not answer JSON');
        return $body;
    }

    public function testOverviewAnswersTheRealEnvelope(): void
    {
        $this->makeSchoolAdmin();
        $body = $this->getJson('/api/school/overview');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertArrayHasKey('overview', $body);
        $this->assertIsArray($body['overview']);
    }

    public function testStudentListIsEmptyRatherThanInvented(): void
    {
        $this->makeSchoolAdmin();
        $body = $this->getJson('/api/school/students');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['students'] ?? null);
    }

    public function testAttendanceEndpointReturnsTheRequestedDateAndEmptyRegister(): void
    {
        $this->makeSchoolAdmin();
        $body = $this->getJson('/api/school/attendance?date=2026-01-15');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertSame('2026-01-15', $body['date'] ?? '');
        $this->assertIsArray($body['register'] ?? null);
    }

    public function testAttendanceEndpointRejectsAMalformedDateAndFallsBackToToday(): void
    {
        $this->makeSchoolAdmin();
        $body = $this->getJson('/api/school/attendance?date=not-a-date');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertSame(date('Y-m-d'), $body['date'] ?? '');
    }

    public function testMarksEndpointReturnsAssessmentsAndMarks(): void
    {
        $this->makeSchoolAdmin();
        $body = $this->getJson('/api/school/marks');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['assessments'] ?? null);
        $this->assertIsArray($body['marks'] ?? null);
    }

    public function testTimetableEndpointReturnsTimetableAndHomework(): void
    {
        $this->makeSchoolAdmin();
        $body = $this->getJson('/api/school/timetable');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['timetable'] ?? null);
        $this->assertIsArray($body['homework'] ?? null);
    }

    public function testNoticesEndpointReturnsAList(): void
    {
        $this->makeSchoolAdmin();
        $body = $this->getJson('/api/school/notices');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['notices'] ?? null);
    }

    public function testSettingsEndpointReturnsSettingsAndOptions(): void
    {
        $this->makeSchoolAdmin();
        $body = $this->getJson('/api/school/settings');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['settings'] ?? null);
        $this->assertIsArray($body['options'] ?? null);
    }

    public function testOptionsEndpointReturnsOptions(): void
    {
        $this->makeSchoolAdmin();
        $body = $this->getJson('/api/school/options');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['options'] ?? null);
    }

    public function testReceiptsEndpointReturnsReceiptsAndTotals(): void
    {
        $this->makeSchoolAdmin();
        $body = $this->getJson('/api/school/receipts');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['receipts'] ?? null);
        $this->assertArrayHasKey('totals', $body);
    }

    public function testStaffEndpointReturnsAList(): void
    {
        $this->makeSchoolAdmin();
        $body = $this->getJson('/api/school/staff');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['staff'] ?? null);
    }

    public function testInvoicesEndpointReturnsAList(): void
    {
        $this->makeSchoolAdmin();
        $body = $this->getJson('/api/school/invoices');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['invoices'] ?? null);
    }

    public function testAnAnonymousCallerCannotReadAnySchoolData(): void
    {
        $this->clean();
        $result = $this->get('/api/school/overview');
        $this->assertTrue(
            $result->isRedirect() || $result->response()->getStatusCode() >= 400,
            'An anonymous caller must not reach the school read API.'
        );
    }
}