<?php

namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\FeatureTestTrait;
use CodeIgniter\Test\TestResponse;

/**
 * Runtime assertions for the security-header and CORS bundle.
 *
 * Pins G5 / SC-3 / SC-7 post-bundle behaviour so "alias defined but filter
 * not applied" (pre-bundle RT-2/RT-3 in quality/docs/security-runtime-review.md)
 * cannot silently regress:
 *   - the five SecureHeaders are actually emitted on responses,
 *   - no Access-Control-Allow-Origin for a non-allowlisted origin,
 *   - never a wildcard origin, including on preflight.
 *
 * The positive polarity (allowlisted origin DOES get an explicit echo, and
 * cookie.secure=true adds the Secure flag) is asserted against a real server
 * by quality/tools/security-runtime-probe.php phase=post, because those two
 * depend on .env values that are fixed for the whole phpunit bootstrap.
 */
class SecurityHeadersRuntimeTest extends CIUnitTestCase
{
    use FeatureTestTrait;

    /**
     * Headers emitted by the framework SecureHeaders filter (SC-3).
     */
    private const SECURE_HEADERS = [
        'X-Frame-Options'                   => 'SAMEORIGIN',
        'X-Content-Type-Options'            => 'nosniff',
        'X-Download-Options'                => 'noopen',
        'X-Permitted-Cross-Domain-Policies' => 'none',
        'Referrer-Policy'                   => 'same-origin',
    ];

    public function testSecureHeadersAreEmittedOnHealth(): void
    {
        $result = $this->get('health');

        foreach (self::SECURE_HEADERS as $name => $value) {
            $result->assertHeader($name, $value);
        }
    }

    public function testSecureHeadersAreEmittedOnUnauthenticatedApiRoute(): void
    {
        $result = $this->get('api/admin/billing/summary');

        foreach (self::SECURE_HEADERS as $name => $value) {
            $result->assertHeader($name, $value);
        }
    }

    /**
     * The value this request may legitimately receive in
     * Access-Control-Allow-Origin under the deployed allowlist:
     *   - allowlist empty  -> null (deny-by-default)
     *   - single entry     -> that entry (framework single-origin mode echoes
     *                          it without matching the request origin; the
     *                          browser then fails origin-mismatch)
     *   - multiple entries -> the request origin only if it is allowlisted
     * In every case: never `*`, never the origin of a non-allowlisted caller.
     */
    private function expectedAcao(string $requestOrigin): ?string
    {
        $allowed = config('Cors')->default['allowedOrigins'];

        if ($allowed === []) {
            return null;
        }

        if (count($allowed) === 1) {
            return $allowed[0];
        }

        return in_array($requestOrigin, $allowed, true) ? $requestOrigin : null;
    }

    /**
     * Read ACAO from the actual response object.
     *
     * NOTE: TestResponse::__call forwards unknown methods to the DOM parser
     * and returns null when it has no such method, so `$result->getHeader()`
     * is silently null - use the response itself (CI4 4.7.5).
     */
    private function acao(TestResponse $result): ?string
    {
        $response = $result->response();

        return $response->hasHeader('Access-Control-Allow-Origin')
            ? $response->getHeaderLine('Access-Control-Allow-Origin')
            : null;
    }

    public function testNonAllowlistedOriginReceivesNoCorsHeaderOnHealth(): void
    {
        $evil   = 'https://evil.example';
        $result = $this->withHeaders(['Origin' => $evil])->get('health');
        $origin = $this->acao($result);

        $this->assertNotSame('*', $origin, 'Health must never answer with a wildcard origin.');
        $this->assertNotSame($evil, $origin, 'A non-allowlisted origin must never be echoed back.');
        $this->assertSame($this->expectedAcao($evil), $origin, 'Health must answer exactly per the deny-by-default allowlist rules.');
    }

    public function testNonAllowlistedOriginReceivesNoCorsHeaderOnApiRoute(): void
    {
        $evil   = 'https://evil.example';
        $result = $this->withHeaders(['Origin' => $evil])->get('api/admin/billing/summary');
        $origin = $this->acao($result);

        $this->assertNotSame('*', $origin, 'API must never answer with a wildcard origin.');
        $this->assertNotSame($evil, $origin, 'A non-allowlisted origin must never be echoed back on API routes.');
        $this->assertSame($this->expectedAcao($evil), $origin, 'API must answer exactly per the deny-by-default allowlist rules.');
    }

    public function testPreflightNeverAllowsWildcardOrigin(): void
    {
        $evil   = 'https://evil.example';
        $result = $this->withHeaders([
            'Origin'                        => $evil,
            'Access-Control-Request-Method' => 'GET',
        ])->options('api/school/students');

        $origin = $this->acao($result);

        $this->assertNotSame('*', $origin, 'Preflight must never answer with a wildcard origin.');
        $this->assertNotSame($evil, $origin, 'Preflight must never echo a non-allowlisted origin.');
        $this->assertSame($this->expectedAcao($evil), $origin, 'Preflight must answer exactly per the deny-by-default allowlist rules.');
    }

    public function testSameEvilOriginOnPortalRouteReceivesNoCorsHeader(): void
    {
        $evil   = 'https://evil.example';
        $result = $this->withHeaders(['Origin' => $evil])->get('portal');
        $origin = $this->acao($result);

        $this->assertNotSame('*', $origin, 'Page routes must never answer with a wildcard origin.');
        $this->assertNotSame($evil, $origin, 'A non-allowlisted origin must never be echoed back on page routes.');

        // Page routes answer with redirects (302), and CI4's redirect()
        // builds a fresh RedirectResponse that does not carry the header
        // the cors before-filter set on service('response') - the real
        // probe observed the same (probe_post.md row C: /portal 302,
        // no ACAO). "No header" is still deny-by-default, so the page
        // route may answer with nothing or with the configured origin,
        // never anything else.
        $allowed = $this->expectedAcao($evil);
        $this->assertTrue(
            $origin === null || $origin === $allowed,
            'Page routes must answer with no ACAO or exactly the configured origin.',
        );
    }
}
