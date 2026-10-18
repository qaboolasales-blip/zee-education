<?php

namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;

/**
 * Tests for GET /health.
 *
 * Covers the M1.2 acceptance criteria:
 *   - returns HTTP 200 JSON
 *   - exposes app name, environment-safe status and version
 *   - does NOT expose database credentials
 *   - does NOT expose detailed server information
 *
 * IMPORTANT: every "must not expose" assertion first asserts that the
 * response body is actually non-empty. Without that guard a negative
 * string assertion would pass vacuously against an empty body.
 */
class HealthTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    protected $mocks = [];

    /**
     * Keys the endpoint is contractually allowed to return.
     */
    private const ALLOWED_KEYS = [
        'status',
        'app',
        'plane',
        'environment',
        'version',
        'milestone',
        'database',
        'time',
        'timezone',
        'currency',
    ];

    /**
     * Decode the raw JSON payload, guaranteeing it is non-empty and valid.
     *
     * `getJSON()` is used instead of decoding `getBody()` because when the
     * request negotiates an HTML output format, CodeIgniter escapes the JSON
     * payload inside an HTML wrapper. `getJSON()` returns the exact bytes
     * that are sent over the wire for an `application/json` response, so it
     * is the correct string to assert secret-leak checks against.
     *
     * @return array<string, mixed>
     */
    private function jsonBody(): array
    {
        $result = $this->get('health');
        $raw    = $result->getJSON();

        $this->assertNotFalse($raw, 'Health response must expose a JSON payload.');
        $this->assertNotSame('', trim((string) $raw), 'Health response body must not be empty.');

        $decoded = json_decode((string) $raw, true);

        $this->assertIsArray($decoded, 'Health response must decode to an array.');

        return $decoded;
    }

    /**
     * The raw JSON string that is actually sent over the wire.
     */
    private function rawPayload(): string
    {
        $result = $this->get('health');
        $raw    = $result->getJSON();

        $this->assertNotFalse($raw, 'Health response must expose a JSON payload.');

        return (string) $raw;
    }

    public function testHealthReturnsOkStatusCode(): void
    {
        $result = $this->get('health');

        $result->assertOK();
    }

    public function testHealthReturnsJsonContentType(): void
    {
        $result = $this->get('health');

        $result->assertHeader('Content-Type', 'application/json; charset=UTF-8');
    }

    /**
     * NOTE ON THE TEST HARNESS: CodeIgniter's FeatureTestTrait builds its
     * request without an output-format extension, so it negotiates the
     * `html` format and renders the JSON payload inside an HTML wrapper
     * in `getBody()`. That is a harness artefact, not application
     * behaviour — which is why payload assertions use `getJSON()`, the
     * exact string sent on the wire.
     *
     * The real wire format was asserted with `php spark serve` + an HTTP
     * request and returned `Content-Type: application/json; charset=UTF-8`
     * with an unwrapped JSON body. See `backend/docs/ARCHITECTURE.md`
     * ("Verification log") and `TASKS_COMPLETED.md`.
     */

    /**
     * The endpoint is unauthenticated so monitoring can reach it, and must
     * therefore never disclose a wildcard CORS origin (ADR-008).
     */
    public function testHealthNeverSendsWildcardCorsOrigin(): void
    {
        $result = $this->withHeaders(['Origin' => 'https://attacker.example'])->get('health');

        $origin = $result->getHeader('Access-Control-Allow-Origin');

        $this->assertNotSame(
            '*',
            $origin,
            'Health endpoint must never allow a wildcard CORS origin.'
        );
    }

    public function testHealthExposesRequiredFields(): void
    {
        $json = $this->jsonBody();

        $this->assertArrayHasKey('status', $json);
        $this->assertArrayHasKey('app', $json);
        $this->assertArrayHasKey('environment', $json);
        $this->assertArrayHasKey('version', $json);

        $this->assertSame('Zee Education', $json['app']);
        $this->assertSame('control-plane', $json['plane']);
        $this->assertSame('Asia/Karachi', $json['timezone']);
        $this->assertSame('PKR', $json['currency']);

        $this->assertContains(
            $json['status'],
            ['ok', 'degraded'],
            'Health status must be a known value.'
        );
    }

    /**
     * The endpoint must not grow new disclosure keys without review.
     */
    public function testHealthReturnsOnlyAllowedKeys(): void
    {
        $json = $this->jsonBody();

        $this->assertSame(
            [],
            array_diff(array_keys($json), self::ALLOWED_KEYS),
            'Health response contains unexpected keys.'
        );
    }

    /**
     * No database credential may leak (ADR-008 / M1.2 acceptance).
     */
    public function testHealthDoesNotExposeDatabaseCredentials(): void
    {
        $body = $this->rawPayload();

        $this->assertNotSame('', trim($body), 'Health response body must not be empty.');

        $db = config('Database');

        // Non-empty values only — a blank local password would otherwise
        // match at every position in the string.
        $secrets = [
            'database name'    => (string) $db->default['database'],
            'database host'    => (string) $db->default['hostname'],
            'database user'    => (string) $db->default['username'],
            'encryption key'   => (string) env('encryption.key', ''),
        ];

        foreach ($secrets as $label => $secret) {
            if ($secret === '') {
                continue;
            }

            $this->assertStringNotContainsString(
                $secret,
                $body,
                sprintf('Health response must not expose the %s.', $label)
            );
        }
    }

    /**
     * No detailed server information may leak.
     */
    public function testHealthDoesNotExposeServerDetail(): void
    {
        $body = $this->rawPayload();

        $this->assertNotSame('', trim($body), 'Health response body must not be empty.');

        $serverDetail = [
            'PHP version'     => PHP_VERSION,
            'document root'   => FCPATH,
            'app directory'   => APPPATH,
            'system root'     => ROOTPATH,
            'machine name'    => (string) gethostname(),
            'server software' => (string) ($_SERVER['SERVER_SOFTWARE'] ?? ''),
        ];

        foreach ($serverDetail as $label => $detail) {
            if ($detail === '') {
                continue;
            }

            $this->assertStringNotContainsString(
                $detail,
                $body,
                sprintf('Health response must not expose %s.', $label)
            );
        }
    }

    /**
     * The database field must be a bare state string, never a message
     * that could be used to fingerprint the server.
     */
    public function testHealthDatabaseFieldIsStateOnly(): void
    {
        $json = $this->jsonBody();

        $this->assertArrayHasKey('database', $json);
        $this->assertContains(
            $json['database'],
            ['connected', 'unreachable', 'not_configured'],
            'Database state must be one of the known state strings.'
        );
    }

    /**
     * /health must remain reachable without authentication, because
     * monitoring depends on it — but it must carry no tenant data.
     */
    public function testHealthCarriesNoTenantOrLearnerData(): void
    {
        $body = $this->rawPayload();

        $this->assertNotSame('', trim($body), 'Health response body must not be empty.');

        $body = strtolower($body);

        $forbidden = [
            'student', 'guardian', 'father', 'mother', 'bop', 'cnic',
            'school_id', 'schoolid', 'tenant_id', 'install_id',
            'password', 'email', 'phone',
        ];

        foreach ($forbidden as $term) {
            $this->assertStringNotContainsString(
                $term,
                $body,
                sprintf('Health response must not contain tenant or learner field "%s".', $term)
            );
        }
    }
}
