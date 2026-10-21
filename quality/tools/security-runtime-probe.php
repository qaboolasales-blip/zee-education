<?php
/**
 * Runtime security-header / CORS probe driver (local dev server).
 * Usage: php security-runtime-probe.php <pre|post> [baseUrl] [pathToEnv]
 *   phase: pre  = before the CORS/secureheaders/cookie bundle
 *          post = after the bundle
 * Emits markdown evidence to stdout and exits non-zero on expectation failures.
 * Reads probe_secrets.json ({superadmin, school_admin}) beside this file —
 * credentials are never committed; see quality/docs/security-runtime-review.md.
 */

declare(strict_types=1);

$BASE   = $argv[2] ?? 'http://127.0.0.1:8899';
$ENV    = $argv[3] ?? dirname(__DIR__, 2) . '/backend/.env';
$phase  = $argv[1] ?? 'pre';
$secretsFile = $argv[4] ?? __DIR__ . '/probe_secrets.json';
$secrets = is_file($secretsFile) ? json_decode(file_get_contents($secretsFile), true) : null;
if (! is_array($secrets)) {
    fwrite(STDERR, "Missing probe_secrets.json with keys superadmin + school_admin (not committed; see security-runtime-review.md)\n");
    exit(2);
}
$ALLOWED = 'https://app.example.edu';
$EVIL    = 'https://evil.example';
if (! is_file($ENV)) {
    fwrite(STDERR, "backend/.env not found at {$ENV}\n");
    exit(3);
}

$results = [];   // [check, expectation, observed, pass]
function rec(string $check, string $expect, string $observed, bool $pass): void
{
    global $results;
    $results[] = [$check, $expect, $observed, $pass];
}

function probe(string $method, string $url, ?string $origin = null, array $headers = [], ?string $body = null, array $jar = [], bool $follow = false): array
{
    $h = [];
    if ($origin !== null) {
        $h[] = 'Origin: ' . $origin;
    }
    foreach ($headers as $k => $v) {
        $h[] = $k . ': ' . $v;
    }
    if ($body !== null && ! array_key_exists('Content-Type', $headers)) {
        $h[] = 'Content-Type: application/x-www-form-urlencoded';
    }
    if ($jar !== []) {
        $parts = [];
        foreach ($jar as $n => $v) {
            $parts[] = $n . '=' . $v;
        }
        $h[] = 'Cookie: ' . implode('; ', $parts);
    }
    $ctx = stream_context_create(['http' => [
        'method'          => $method,
        'header'          => implode("\r\n", $h),
        'ignore_errors'   => true,
        'follow_location' => $follow ? 1 : 0,
        'timeout'         => 15,
        'content'         => $body ?? '',
    ]]);
    $respBody = @file_get_contents($url, false, $ctx);
    $raw      = $http_response_header ?? [];
    $status   = 0;
    $hdrs     = [];
    $cookies  = [];
    foreach ($raw as $line) {
        if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) {
            $status = (int) $m[1];
            continue;
        }
        $pos = strpos($line, ':');
        if ($pos === false) {
            continue;
        }
        $name  = trim(substr($line, 0, $pos));
        $value = trim(substr($line, $pos + 1));
        $hdrs[$name][] = $value;
        if (strtolower($name) === 'set-cookie') {
            $eq = strpos($value, '=');
            $cookies[trim(substr($value, 0, $eq))] = trim(explode(';', substr($value, $eq + 1))[0]);
        }
    }
    return ['status' => $status, 'hdrs' => $hdrs, 'body' => (string) $respBody, 'cookies' => $cookies];
}

function acao(array $r): ?string
{
    return $r['hdrs']['Access-Control-Allow-Origin'][0] ?? null;
}

function h(array $r, string $name): ?string
{
    return $r['hdrs'][$name][0] ?? null;
}

/**
 * Fetch a pre-auth session and its hidden CSRF token (global `csrf` filter):
 * GET /login returns a ci_session cookie plus csrf_test_name in the form.
 */
function csrfTokenFor(array $jar = []): array
{
    $r = probe('GET', BASE_URL() . '/login', null, [], null, $jar);
    $jar2 = $jar;
    foreach ($r['cookies'] as $n => $v) {
        $jar2[$n] = $v;
    }
    $token = '';
    if (preg_match('/name="csrf_test_name"[^>]*value="([^"]*)"/', $r['body'], $m) === 1) {
        $token = $m[1];
    } elseif (preg_match('/value="([^"]*)"[^>]*name="csrf_test_name"/', $r['body'], $m) === 1) {
        $token = $m[1];
    }
    return ['token' => $token, 'jar' => $jar2];
}

function login(string $email, string $password): array
{
    // Global csrf: carry the token minted for this pre-auth session (A).
    $t = csrfTokenFor();
    $r = probe('POST', BASE_URL() . '/login', null, ['X-CSRF-TOKEN' => $t['token']],
        http_build_query(['email' => $email, 'password' => $password]), $t['jar']);
    $jar = $t['jar'];
    foreach ($r['cookies'] as $n => $v) {
        $jar[$n] = $v;
    }
    return ['resp' => $r, 'jar' => $jar];
}

function BASE_URL(): string
{
    global $BASE;
    return $BASE;
}

function setEnvLine(string $file, string $key, ?string $value): void
{
    $lines   = file($file, FILE_IGNORE_NEW_LINES);
    $out     = [];
    $found   = false;
    foreach ($lines as $line) {
        if (preg_match('/^\s*' . preg_quote($key, '/') . '\s*=/', $line)) {
            $found = true;
            if ($value !== null) {
                $out[] = $key . ' = ' . $value;
            }
            continue;
        }
        $out[] = $line;
    }
    if (! $found && $value !== null) {
        $out[] = $key . ' = ' . $value;
    }
    file_put_contents($file, implode(PHP_EOL, $out) . PHP_EOL);
}

$SECURITY_HEADERS = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-Download-Options',
    'X-Permitted-Cross-Domain-Policies',
    'Referrer-Policy',
];
$UNAUTH_ROUTES = [
    '/health', '/api/health', '/api/school/students', '/api/school/invoices',
    '/api/admin/billing/summary', '/api/connect/verify', '/admin/schools',
    '/portal', '/school', '/m',
];

$envBackup = file_get_contents($ENV);

try {
    // ---------- A: deny-by-default, evil origin, unauthenticated ----------
    foreach ($UNAUTH_ROUTES as $route) {
        $r = probe('GET', $BASE . $route, $EVIL);
        $a = acao($r);
        rec("A unauth+evil {$route}", 'no ACAO header', $a === null ? 'absent (status ' . $r['status'] . ')' : (string) $a, $a === null && $a !== '*');
    }

    // ---------- B: preflight ----------
    $r = probe('OPTIONS', $BASE . '/api/school/students', $EVIL, [
        'Access-Control-Request-Method' => 'GET',
        'Access-Control-Request-Headers' => 'content-type',
    ]);
    $a = acao($r);
    rec('B preflight OPTIONS evil', 'no ACAO header', $a === null ? 'absent (status ' . $r['status'] . ')' : (string) $a, $a === null);

    // ---------- E: security headers absent (pre) / present (post) ----------
    $rE = probe('GET', $BASE . '/health', $null = null);
    foreach ($SECURITY_HEADERS as $sh) {
        $v = h($rE, $sh);
        if ($phase === 'pre') {
            rec("E {$sh} (on /health)", 'absent (filter not enabled)', $v ?? 'absent', $v === null);
        } else {
            rec("E {$sh} (on /health)", 'present', $v ?? 'ABSENT', $v !== null);
        }
    }
    $csp = h($rE, 'Content-Security-Policy');
    rec("E Content-Security-Policy", $phase === 'pre' ? 'absent (CSP off, SC-6 open)' : 'absent (deliberately still off)', $csp ?? 'absent', $csp === null);

    // ---------- C: school_admin login + authed probes ----------
    $pwSchool = $secrets['school_admin'];
    $login = login('school_admin@pilot.local', $pwSchool);
    $jar = $login['jar'];
    $st  = $login['resp']['status'];
    rec('C school_admin POST /login', '302/303 + ci_session cookie', 'status ' . $st . ' | ' . implode(' || ', $login['resp']['hdrs']['Set-Cookie'] ?? []), ($st === 302 || $st === 303) && isset($login['resp']['cookies']['ci_session']));
    $authed = ['/api/school/students', '/school', '/m', '/portal'];
    foreach ($authed as $route) {
        $r = probe('GET', $BASE . $route, $EVIL, [], null, $jar);
        $a = acao($r);
        $who = h($r, 'X-Frame-Options') !== null ? 'headers-on' : 'headers-off';
        rec("C authed(school_admin)+evil {$route}", 'no ACAO header', $a === null ? 'absent (status ' . $r['status'] . ', ' . $who . ')' : (string) $a, $a === null);
    }

    // ---------- D: superadmin CSRF negative ----------
    $s = $secrets['superadmin'];
    $loginS = login('ops@local.test', $s);
    $jarS   = $loginS['jar'];
    rec('D superadmin POST /login', '302/303 + ci_session cookie', 'status ' . $loginS['resp']['status'] . ' | ' . implode(' || ', $loginS['resp']['hdrs']['Set-Cookie'] ?? []), ($loginS['resp']['status'] === 302 || $loginS['resp']['status'] === 303) && isset($loginS['resp']['cookies']['ci_session']));
    $r = probe('POST', $BASE . '/api/admin/billing/issue', null, ['Content-Type' => 'application/json'], json_encode(['school_id' => 1]), $jarS);
    $csrfOk = $r['status'] === 403 && str_contains($r['body'], 'csrf_required');
    rec('D billing POST w/o CSRF token', '403 csrf_required', 'status ' . $r['status'] . ' body ' . substr(preg_replace('/\s+/', ' ', $r['body']), 0, 90), $csrfOk);

    // ---------- F: allowlist polarity ----------
    setEnvLine($ENV, 'app.corsAllowedOrigins', "'" . $ALLOWED . "'");
    $rHealthAllowed = probe('GET', $BASE . '/health', $ALLOWED);
    $rHealthEvil    = probe('GET', $BASE . '/health', $EVIL);
    $rAuthedAllowed = probe('GET', $BASE . '/api/admin/billing/summary', $ALLOWED, [], null, $jarS);
    $rAuthedEvil    = probe('GET', $BASE . '/api/admin/billing/summary', $EVIL, [], null, $jarS);
    $aHA = acao($rHealthAllowed);
    $aHE = acao($rHealthEvil);
    $aAA = acao($rAuthedAllowed);
    $aAE = acao($rAuthedEvil);
    if ($phase === 'pre') {
        rec('F allowlisted origin on /health', 'ACAO echoes ' . $ALLOWED . ' (filter wired)', $aHA === null ? 'ABSENT (cors filter not applied)' : (string) $aHA, false);
        rec('F allowlisted origin on authed billing', 'ACAO echoes ' . $ALLOWED, $aAA === null ? 'ABSENT (cors filter not applied)' : (string) $aAA, false);
        rec('F evil origin on /health (allowlist set)', 'no ACAO header', $aHE ?? 'absent', $aHE === null);
        rec('F evil origin on authed billing (allowlist set)', 'no ACAO header', $aAE ?? 'absent', $aAE === null);
    } else {
        rec('F allowlisted origin on /health', 'ACAO = ' . $ALLOWED, $aHA ?? 'ABSENT', $aHA === $ALLOWED);
        rec('F allowlisted origin on authed billing', 'ACAO = ' . $ALLOWED, $aAA ?? 'ABSENT', $aAA === $ALLOWED);
        // Framework single-origin mode echoes allowedOrigins[0] without
        // matching the request Origin; browsers then fail origin-mismatch.
        // The invariant: the request origin is never echoed, `*` never appears.
        rec('F evil origin on /health (allowlist set)', 'absent or configured origin only (never ' . $EVIL . ', never *)', $aHE ?? 'absent', $aHE === null || $aHE === $ALLOWED);
        rec('F evil origin on authed billing (allowlist set)', 'absent or configured origin only (never ' . $EVIL . ', never *)', $aAE ?? 'absent', $aAE === null || $aAE === $ALLOWED);

        // Preflight with the allowlist set (post only - pre has no filter to answer OPTIONS)
        $rPFallowed = probe('OPTIONS', $BASE . '/api/school/students', $ALLOWED, ['Access-Control-Request-Method' => 'GET']);
        $rPFevil    = probe('OPTIONS', $BASE . '/api/school/students', $EVIL, ['Access-Control-Request-Method' => 'GET']);
        $aPFA = acao($rPFallowed);
        $aPFE = acao($rPFevil);
        rec('F preflight allowlisted origin', '204 + ACAO = ' . $ALLOWED, 'status ' . $rPFallowed['status'] . ' ACAO=' . ($aPFA ?? 'absent'), $rPFallowed['status'] === 204 && $aPFA === $ALLOWED);
        rec('F preflight evil origin (allowlist set)', 'absent or configured origin only (never ' . $EVIL . ', never *)', 'status ' . $rPFevil['status'] . ' ACAO=' . ($aPFE ?? 'absent'), $aPFE === null || $aPFE === $ALLOWED);
    }

    // ---------- G: cookie.secure env polarity ----------
    if ($phase === 'post') {
        setEnvLine($ENV, 'cookie.secure', 'true');
        $loginG = login('school_admin@pilot.local', $secrets['school_admin']);
        $sc = $loginG['resp']['hdrs']['Set-Cookie'] ?? [];
        $sessionCookie = '';
        foreach ($sc as $line) {
            if (str_starts_with($line, 'ci_session=')) {
                $sessionCookie = $line;
            }
        }
        // CI4 renders the attribute lowercase (`; secure;`) - match case-insensitively.
        $hasSecure = static fn (string $line): bool => (bool) preg_match('/;\s*secure\s*(;|$)/i', $line);
        rec('G cookie.secure=true -> session cookie has secure attr', 'secure attribute present (rendered lowercase)', $sessionCookie !== '' ? ($hasSecure($sessionCookie) ? 'secure present: ' . substr($sessionCookie, 60) : 'NO secure attr: ' . $sessionCookie) : 'no ci_session set-cookie (status ' . $loginG['resp']['status'] . ')', $hasSecure($sessionCookie));
        setEnvLine($ENV, 'cookie.secure', 'false');
        $loginG2 = login('school_admin@pilot.local', $secrets['school_admin']);
        $sc2 = $loginG2['resp']['hdrs']['Set-Cookie'] ?? [];
        $sess2 = '';
        foreach ($sc2 as $line) {
            if (str_starts_with($line, 'ci_session=')) {
                $sess2 = $line;
            }
        }
        rec('G cookie.secure=false -> session cookie has no secure attr (dev default)', 'no secure attribute', $sess2 !== '' && ! $hasSecure($sess2) ? 'no secure attr (dev default): ' . substr($sess2, 60) : substr($sess2, 0, 90), $sess2 !== '' && ! $hasSecure($sess2));
    }

    // ---------- H: session fixation (SC-5 / SF-01 / SF-02) ----------
    // Shield SessionAuth::startLogin() calls session()->regenerate(true) on
    // login (vendor/codeigniter4/shield/src/Authentication/Authenticators/
    // Session.php:719-721), but ONLY when ENVIRONMENT !== 'testing' - phpunit
    // forces `testing`, so this cannot be pinned by the feature suite and is
    // asserted against the real dev server here (ENVIRONMENT=development):
            //   H1  login must issue a NEW session id (regenerate),
            //   H2  the pre-auth id must be DEAD afterwards (destroy = old id
            //       rejected, fixation impossible),
            //   H3  the new id must be the authenticated one (sanity).
    if ($phase === 'post') {
        $rH1 = probe('GET', $BASE . '/login');
        $preId = $rH1['cookies']['ci_session'] ?? '';
        rec('H GET /login issues pre-auth session id A', 'ci_session set before login',
            $preId !== '' ? 'A=' . substr($preId, 0, 8) . '...' : 'none (status ' . $rH1['status'] . ')',
            $preId !== '');

        if ($preId !== '') {
            // The token for session A is in this very response - carry it so
            // the login POST passes the global csrf filter (verify runs before
            // Shield's regenerate).
            $tokH = '';
            if (preg_match('/name="csrf_test_name"[^>]*value="([^"]*)"/', $rH1['body'], $mH) === 1) {
                $tokH = $mH[1];
            } elseif (preg_match('/value="([^"]*)"[^>]*name="csrf_test_name"/', $rH1['body'], $mH) === 1) {
                $tokH = $mH[1];
            }
            $rH2 = probe('POST', $BASE . '/login', null, ['X-CSRF-TOKEN' => $tokH], http_build_query([
                'email'    => 'school_admin@pilot.local',
                'password' => $secrets['school_admin'],
            ]), ['ci_session' => $preId]);
            $newId = $rH2['cookies']['ci_session'] ?? '';
            $okH2  = ($rH2['status'] === 302 || $rH2['status'] === 303)
                && $newId !== '' && $newId !== $preId;
            rec('H1 login with pre-auth id A -> Set-Cookie id B != A (SF-01 regenerate)',
                '303 + new ci_session different from A (Shield Session.php:720-721)',
                'status ' . $rH2['status'] . ' | A=' . substr($preId, 0, 8)
                    . '... B=' . ($newId !== '' ? substr($newId, 0, 8) . '...' : 'none'),
                $okH2);

            if ($okH2) {
                $rH3 = probe('GET', $BASE . '/school', null, [], null, ['ci_session' => $preId]);
                rec('H2 old id A rejected after login (SF-02 pre-login replay / destroy=true)',
                    'not authenticated (302/303 redirect to login, never 200)',
                    'status ' . $rH3['status'],
                    $rH3['status'] !== 200);

                $rH4 = probe('GET', $BASE . '/school', null, [], null, ['ci_session' => $newId]);
                rec('H3 new id B is the authenticated session (sanity)',
                    '200 on authed route',
                    'status ' . $rH4['status'],
                    $rH4['status'] === 200);
            }
        }

        // ---------- I: global csrf filter (RB-7) polarity ----------
        // Non-billing surfaces now reject token-less state-changing requests.
        $rI1 = probe('POST', $BASE . '/api/connect/resolve', null, ['Content-Type' => 'application/json'],
            json_encode(['code' => 'GLOBALCSRF']));
        $csrfDenied = $rI1['status'] === 403
            && (stripos($rI1['body'], 'not allowed') !== false || stripos($rI1['body'], 'disallowed') !== false
                || stripos($rI1['body'], 'CSRF') !== false || stripos($rI1['body'], 'csrf') !== false);
        rec('I1 token-less POST outside billing (/api/connect/resolve) refused',
            '403 CSRF refusal (SecurityException::forDisallowedAction)',
            'status ' . $rI1['status'] . ' body ' . substr(preg_replace('/\s+/', ' ', strip_tags($rI1['body'])), 0, 90),
            $csrfDenied);

        $tI = csrfTokenFor();
        $rI2 = probe('POST', $BASE . '/api/connect/resolve', null,
            ['Content-Type' => 'application/json', 'X-CSRF-TOKEN' => $tI['token']],
            json_encode(['code' => 'GLOBALCSRF']), $tI['jar']);
        rec('I2 same POST with a valid X-CSRF-TOKEN reaches the controller',
            '200 + {found:false,...} identical-shape contract (this call was a 500 before the Throttler::checkTokens fix)',
            'status ' . $rI2['status'] . ' body ' . substr(preg_replace('/\s+/', ' ', $rI2['body']), 0, 90),
            $rI2['status'] === 200 && str_contains($rI2['body'], '"found"'));

        $rI3 = probe('POST', $BASE . '/login', null, [], http_build_query([
            'email'    => 'school_admin@pilot.local',
            'password' => $secrets['school_admin'],
        ]));
        rec('I3 login POST without token refused (login-CSRF enforced)',
            '403 (dev: $redirect=false, no silent redirect)',
            'status ' . $rI3['status'],
            $rI3['status'] === 403);
    }
} finally {
    file_put_contents($ENV, $envBackup);
}

// ---------- emit ----------
$fail = 0;
echo "| Check | Expected | Observed | Result |\n|---|---|---|---|\n";
foreach ($results as [$c, $e, $o, $p]) {
    $fail += $p ? 0 : 1;
    echo '| ' . str_replace('|', '\|', $c) . ' | ' . str_replace('|', '\|', $e) . ' | ' . str_replace('|', '\|', $o) . ' | ' . ($p ? 'PASS' : 'FAIL') . " |\n";
}
echo "\nphase=$phase failed=" . $fail . " total=" . count($results) . "\n";
exit($fail > 0 ? 1 : 0);
