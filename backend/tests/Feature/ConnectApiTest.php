<?php

declare(strict_types=1);

namespace Tests\Feature;

use CodeIgniter\Security\Exceptions\SecurityException;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;
use Tests\Support\CsrfTokenTrait;

/**
 * Controller-level coverage for ConnectApi::resolve()/verify().
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * ConnectTest pins the InviteService guarantees, but nothing ever called the
 * CONTROLLER methods - so the `Throttler::checkTokens()` typo (the method does
 * not exist; the real API is `check()`) shipped as a 500 on both endpoints and
 * was only caught by probe check I2 (csrf-client-audit round, 2026-10-20).
 * These tests pin the wire contract so the throttle typo and any regression
 * fails the suite, not just the live probe.
 *
 * @internal
 */
final class ConnectApiTest extends CIUnitTestCase
{
    use FeatureTestTrait;
    use CsrfTokenTrait;

    private const SCHOOL = 999905;

    protected function setUp(): void
    {
        parent::setUp();

        // The throttle bucket is keyed by client IP; reset every plausible key
        // so this file never trips 429 from its own earlier calls (or vice
        // versa with other suites run in the same minute window). Keys mirror
        // ConnectApi::throttleKey() sanitisation.
        $throttler = service('throttler');
        foreach (['resolve-127.0.0.1', 'resolve---1', 'resolve-', 'verify-127.0.0.1', 'verify---1', 'verify-'] as $key) {
            $throttler->remove($key);
        }

        $db = \Config\Database::connect();
        $db->table('school_domains')->where('school_id', self::SCHOOL)->delete();
        $db->table('schools')->where('id', self::SCHOOL)->delete();
        $db->table('schools')->where('school_code', 'CONNAPI')->delete();
    }

    private function makeSchool(): void
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $db->table('schools')->insert([
            'id'            => self::SCHOOL,
            'name'          => 'Connect Api Test School',
            'status'        => 'active',
            'plan_code'     => 'starter',
            'school_code'   => 'CONNAPI',
            'timezone'      => 'Asia/Karachi',
            'currency'      => 'PKR',
            'locale'        => 'en',
            'contact_email' => 'connectapi@example.test',
            'contact_phone' => '0000000000',
            'address'       => '',
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);
    }

    public function testResolveWithoutCsrfTokenIsRefused(): void
    {
        $this->expectException(SecurityException::class);

        $this->withBodyFormat('json')->post('/api/connect/resolve', ['code' => 'CONNAPI']);
    }

    public function testResolveAnswersIdenticalShapeWhetherOrNotSchoolExists(): void
    {
        $this->makeSchool();

        $known = $this->withCsrf()->withBodyFormat('json')
            ->post('/api/connect/resolve', ['code' => 'CONNAPI']);

        // Snapshot before the next request: FeatureTest aliases the response
        // object across calls (service('response') is a singleton), so a later
        // POST overwrites an earlier TestResponse's body AND status.
        $knownStatus = $known->response()->getStatusCode();
        $knownBody   = json_decode($known->response()->getBody(), true);

        $unknown = $this->withCsrf()->withBodyFormat('json')
            ->post('/api/connect/resolve', ['code' => 'NOSUCHCODE']);
        $unknownStatus = $unknown->response()->getStatusCode();
        $unknownBody   = json_decode($unknown->response()->getBody(), true);

        $this->assertSame(200, $knownStatus);
        $this->assertSame(200, $unknownStatus);
        $this->assertIsArray($knownBody);
        $this->assertIsArray($unknownBody);

        // Identical keys either way - only the flag differs (anti-enumeration).
        $this->assertSame(array_keys($unknownBody), array_keys($knownBody));
        $this->assertArrayHasKey('found', $knownBody);
        $this->assertTrue($knownBody['found']);
        $this->assertFalse($unknownBody['found']);
        $this->assertNull($unknownBody['domain']);
        $this->assertNull($unknownBody['signin']);

        // And it must never echo a school id.
        $this->assertArrayNotHasKey('school_id', $knownBody);
    }

    public function testVerifyAnswersValidFlagWithoutThrottleTypo(): void
    {
        $result = $this->get('/api/connect/verify?t=definitely-not-a-real-token');

        // Before the fix this was a 500 (Throttler::checkTokens typo).
        $this->assertSame(200, $result->response()->getStatusCode());

        $body = $result->response()->getBody();
        $this->assertStringContainsString('"valid"', $body);

        $decoded = json_decode($body, true);
        $this->assertIsArray($decoded);
        $this->assertFalse($decoded['valid'] ?? null);

        // The response must not leak which school (if any) a token belongs to.
        $this->assertStringNotContainsString('school_id', $body);
        $this->assertStringNotContainsString('branding_reference', $body);
    }
}
