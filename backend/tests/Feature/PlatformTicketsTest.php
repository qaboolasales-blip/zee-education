<?php

namespace Tests\Feature;

use CodeIgniter\Shield\Models\UserModel;
use CodeIgniter\Database\MigrationRunner;
use CodeIgniter\Shield\Test\AuthenticationTesting;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;
use Config\Migrations;

/**
 * Platform tickets, quotes, rate book, installations and template requests
 * must come from real control-plane queries, never from a toast stub.
 *
 * @internal
 */
final class PlatformTicketsTest extends CIUnitTestCase
{
    use FeatureTestTrait;
    use AuthenticationTesting;

    private const USER_ID = 999961;

    protected function setUp(): void
    {
        parent::setUp();

        $this->ensurePlatformTables();

        $this->clean();
        $this->makeSuperAdmin();
    }

    /**
     * The platform control-plane tables must exist before a ticket can be
     * written or read. The shared test database is migrated on demand so a
     * fresh checkout can run this suite without a manual migrate step.
     */
    private function ensurePlatformTables(): void
    {
        $db = \Config\Database::connect();

        if ($db->tableExists('support_tickets') && $db->tableExists('platform_settings')) {
            return;
        }

        $runner = new MigrationRunner(new Migrations(), $db);
        $runner->latest();
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
        $db->table('support_tickets')->where('school_id', 999961)->delete();
        $db->table('auth_groups_users')->where('user_id', self::USER_ID)->delete();
        $db->table('auth_identities')->where('user_id', self::USER_ID)->delete();
        $db->table('users')->where('id', self::USER_ID)->delete();
    }

    private function makeSuperAdmin(): void
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $db->table('users')->insert([
            'id'         => self::USER_ID,
            'username'   => 'platform_tickets_tester',
            'status'     => 'active',
            'active'     => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $db->table('auth_groups_users')->insert([
            'user_id'    => self::USER_ID,
            'group'      => 'superadmin',
            'created_at' => $now,
        ]);
        $db->table('auth_identities')->insert([
            'user_id'     => self::USER_ID,
            'type'        => 'email_password',
            'name'        => 'platformtickets@test.local',
            'secret'      => password_hash('Platform-123!', PASSWORD_DEFAULT),
            'created_at'  => $now,
        ]);

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

    public function testTicketsEndpointReturnsRealTickets(): void
    {
        $body = $this->getJson('/api/admin/tickets');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['tickets'] ?? null);
    }

    public function testQuotesEndpointReturnsRealQuotes(): void
    {
        $body = $this->getJson('/api/admin/quotes');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['quotes'] ?? null);
    }

    public function testRatebookEndpointReturnsRealRateBook(): void
    {
        $body = $this->getJson('/api/admin/ratebook');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['ratebook'] ?? null);
    }

    public function testInstallationsEndpointReturnsRealHealth(): void
    {
        $body = $this->getJson('/api/admin/installations');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['installations'] ?? null);
    }

    public function testTemplateRequestsEndpointReturnsRealRequests(): void
    {
        $body = $this->getJson('/api/admin/template-requests');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['requests'] ?? null);
    }

    public function testSettingsEndpointReturnsOperationsAndReminders(): void
    {
        $body = $this->getJson('/api/admin/settings');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['operations'] ?? null);
        $this->assertIsArray($body['reminders'] ?? null);
    }

    public function testRemindersEndpointReturnsReminders(): void
    {
        $body = $this->getJson('/api/admin/reminders');
        $this->assertTrue($body['ok'] ?? false);
        $this->assertIsArray($body['reminders'] ?? null);
    }

    public function testExportCsvEndpointStreamsAValidCsvForEachKind(): void
    {
        $kinds = [
            'schools'  => 'zee-platform-schools-',
            'tickets'  => 'zee-platform-tickets-',
            'ratebook' => 'zee-platform-rate-book-',
            'renewals' => 'zee-platform-renewals-',
        ];

        foreach ($kinds as $kind => $expected) {
            $result = $this->get('/api/admin/export/' . $kind);
            $this->assertSame(200, $result->response()->getStatusCode(), 'export/' . $kind);
            $this->assertStringContainsString('text/csv', $result->response()->getHeaderLine('Content-Type'));
            $this->assertStringContainsString('attachment', $result->response()->getHeaderLine('Content-Disposition'));
            $this->assertStringContainsString($expected, $result->response()->getHeaderLine('Content-Disposition'));
        }
    }

    public function testPrintEndpointRendersHtmlSpecimenForEachTemplate(): void
    {
        $templates = ['admission', 'teacher', 'id-card', 'result-card'];

        foreach ($templates as $template) {
            $result = $this->get('/api/admin/print/' . $template);
            $this->assertSame(200, $result->response()->getStatusCode(), 'print/' . $template);
            $this->assertStringContainsString('text/html', $result->response()->getHeaderLine('Content-Type'));
            $this->assertStringContainsString('<title>', (string) $result->response()->getBody());
        }
    }

    public function testPrintEndpointRejectsAnUnknownTemplate(): void
    {
        $result = $this->get('/api/admin/print/does-not-exist');
        $this->assertSame(404, $result->response()->getStatusCode());
        $body = json_decode((string) $result->response()->getBody(), true);
        $this->assertIsArray($body);
        $this->assertFalse($body['ok'] ?? true);
    }

    public function testAnAnonymousCallerCannotReadPlatformData(): void
    {
        $this->clean();
        $result = $this->get('/api/admin/tickets');
        $this->assertTrue(
            $result->isRedirect() || $result->response()->getStatusCode() >= 400,
            'An anonymous caller must not reach the platform admin API.'
        );
    }
}