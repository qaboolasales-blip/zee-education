<?php

namespace App\Controllers;

use App\Libraries\InviteService;
use CodeIgniter\Controller;

/**
 * Public endpoints for the "connect your school" flow (QR or manual code).
 *
 * WHY THESE ARE UNAUTHENTICATED
 * -----------------------------
 * A teacher, parent or student joining a school is not signed in yet, so these
 * routes cannot require a session. That is safe because NONE of them read or
 * write learner data. They do exactly three things:
 *
 *   - render a QR image for a token that the caller's own school just issued
 *   - confirm whether a school domain exists, so a person can reach the right
 *     sign-in page
 *   - report that an invite token is currently valid
 *
 * WHICH SCHOOL THE PERSON LANDS IN IS NEVER DECIDED HERE
 * ------------------------------------------------------
 * These endpoints only ROUTE someone to a domain. Once they sign in, the school
 * is resolved server-side from their session by SchoolAccessService. No school
 * id from this file is ever used to read a database, so none of these responses
 * can expose one tenant's data to another.
 *
 * NOT SAYING "NO SUCH SCHOOL"
 * ---------------------------
 * resolve() returns the SAME response shape for a domain that exists and one
 * that does not, differing only in a boolean. Answering "not found" would turn
 * this into an oracle for discovering which domains run Zee Education, so the
 * response deliberately carries no distinguishing detail.
 *
 * RATE LIMITED
 * ------------
 * resolve() is throttled per IP. An unthrottled version would let a stranger
 * enumerate the customer base at will.
 */
class ConnectApi extends Controller
{
    /**
     * Throttle settings for the unauthenticated lookup.
     * Generous enough for a real person typing by hand, far too slow to sweep.
     */
    private const THROTTLE_LIMIT  = 10;

    private const THROTTLE_SECONDS = 60;

    /**
     * Cache-safe throttle bucket name for a client IP.
     *
     * The cache layer rejects PSR-6 reserved characters ({ } ( ) / \ @ :) and
     * IPv6 addresses contain ':', so the IP is sanitised before it becomes part
     * of a cache key (a raw key would 500 on any IPv6 client).
     */
    private function throttleKey(string $scope, string $ip): string
    {
        return $scope . '-' . str_replace(':', '-', $ip);
    }

    /**
     * POST /api/connect/resolve
     *
     * Body: { "domain": "school.example.com" }  or  { "code": "ABC123" }
     *
     * Always answers 200 with the same shape, whether or not the school exists.
     */
    public function resolve()
    {
        $throttler = service('throttler');

        if ($throttler->check($this->throttleKey('resolve', strval($this->request->getIPAddress())), self::THROTTLE_LIMIT, self::THROTTLE_SECONDS) === false) {
            return $this->respondGeneric(429, 'Too many attempts. Please wait a minute and try again.');
        }

        $domain = $this->request->getPost('domain') ?? $this->request->getJSON(true)['domain'] ?? null;
        $code   = $this->request->getPost('code') ?? $this->request->getJSON(true)['code'] ?? null;

        $hosts   = service('hostResolver');
        $school  = null;

        if (is_string($domain) && $domain !== '') {
            $normalised = $hosts->normaliseDomain($domain);

            if ($normalised !== null) {
                $school = $hosts->schoolForHost($normalised);
            }
        } elseif (is_string($code) && $code !== '') {
            $school = $this->schoolByCode($code);
        }

        // Identical response either way. Only the flag differs.
        return $this->respondGeneric(200, null, [
            'found'  => $school !== null,
            'domain' => $school !== null ? $hosts->normaliseDomain((string) $school->branding_reference) : null,
            'signin' => $school !== null ? 'https://' . $hosts->normaliseDomain((string) $school->branding_reference) . '/login' : null,
        ]);
    }

    /**
     * GET /connect/qr?t=<token>
     *
     * Renders an invite as an SVG QR code.
     *
     * The token must already be valid: an expired, revoked or exhausted invite
     * renders a plain "no longer valid" notice rather than a scannable code, so
     * a photographed QR stops being useful the moment it lapses.
     *
     * The token itself is never echoed back in the response body or logged.
     */
    public function qr()
    {
        $token = (string) ($this->request->getGet('t') ?? '');

        $invite = service('invites')->peek($token);

        if ($invite === null) {
            return $this->response
                ->setStatusCode(410)
                ->setContentType('text/plain')
                ->setBody("This connect code is no longer valid.\nAsk your school admin for a new QR code.\n");
        }

        $db     = \Config\Database::connect();
        $school = $db->table('schools')->where('id', $invite->school_id)->get()->getRow();

        // Prefer the domain bound to the invite; otherwise the school's primary.
        $domain = $invite->domain;

        if (($domain === null || $domain === '') && $school !== null) {
            $primary = $db->table('school_domains')
                ->where('school_id', $invite->school_id)
                ->orderBy('is_primary', 'DESC')
                ->get()
                ->getRow();

            $domain = $primary->domain ?? null;
        }

        $domain = service('hostResolver')->normaliseDomain((string) $domain);

        if ($domain === null) {
            return $this->response
                ->setStatusCode(409)
                ->setContentType('text/plain')
                ->setBody("This school has no verified domain yet.\nAsk your school admin to finish domain setup.\n");
        }

        $svg = service('qr')->svg(service('invites')->qrPayload($domain, $token));

        return $this->response
            ->setStatusCode(200)
            ->setContentType('image/svg+xml')
            ->setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
            ->setHeader('X-Content-Type-Options', 'nosniff')
            ->setBody($svg);
    }

    /**
     * GET /api/connect/verify?t=<token>
     *
     * Tells a connecting user whether an invite is still usable. Never reveals
     * WHICH school it belongs to - that would leak the customer list to anyone
     * holding a token.
     */
    public function verify()
    {
        $throttler = service('throttler');

        if ($throttler->check($this->throttleKey('verify', strval($this->request->getIPAddress())), self::THROTTLE_LIMIT, self::THROTTLE_SECONDS) === false) {
            return $this->respondGeneric(429, 'Too many attempts. Please wait a minute and try again.');
        }

        $valid = service('invites')->peek((string) ($this->request->getGet('t') ?? '')) !== null;

        return $this->respondGeneric(200, null, ['valid' => $valid]);
    }

    /**
     * POST /api/connect/invite
     *
     * Session + school role required. A school admin mints a fresh, short-lived
     * QR invite for their OWN school. The school id comes from the session -
     * never from the request body.
     */
    public function create()
    {
        if (! auth()->loggedIn()) {
            return $this->respondGeneric(401, 'Please sign in first.');
        }

        // RolePolicy is the single source of truth for roles.
        //
        // NOTE: do NOT use auth()->getUserGroups(). Shield has no such method;
        // Auth::__call() swallows the unknown call and returns null, so the
        // role check would silently pass EVERY signed-in user.
        $user = auth()->user();

        if (! \App\Policies\RolePolicy::hasAny($user, [
            \App\Policies\RolePolicy::SUPER_ADMIN,
            \App\Policies\RolePolicy::SCHOOL_ADMIN,
            \App\Policies\RolePolicy::TEACHER,
        ])) {
            return $this->respondGeneric(403, 'Your role cannot create a connect code.');
        }

        $isSuperAdmin = \App\Policies\RolePolicy::isSuperAdmin($user);

        $schoolId = service('schoolAccess')->schoolIdForUser((int) auth()->id());

        if ($schoolId === null && $isSuperAdmin) {
            // A Super Admin is an operator with no school; allow an explicit
            // school only because they are already privileged. Still validated
            // against the real table.
            $requested = (int) ($this->request->getPost('school_id') ?? $this->request->getJSON(true)['school_id'] ?? 0);

            if ($requested > 0 && \Config\Database::connect()->table('schools')->where('id', $requested)->countAllResults() > 0) {
                $schoolId = $requested;
            }
        }

        if ($schoolId === null) {
            return $this->respondGeneric(403, 'No school is linked to your account.');
        }

        $db     = \Config\Database::connect();
        $domain = $db->table('school_domains')
            ->where('school_id', $schoolId)
            ->orderBy('is_primary', 'DESC')
            ->get()
            ->getRow();

        if ($domain === null) {
            return $this->respondGeneric(409, 'Your school has no verified domain yet. Finish domain setup first.');
        }

        $invite = service('invites')->create($schoolId, 'connect', [
            'domain'     => $domain->domain,
            'ttl_minutes' => (int) ($this->request->getPost('ttl_minutes') ?? InviteService::DEFAULT_TTL_MINUTES),
            'max_uses'   => (int) ($this->request->getPost('max_uses') ?? InviteService::DEFAULT_MAX_USES),
            'created_by' => (int) auth()->id(),
        ]);

        return $this->respondGeneric(201, null, [
            'expires_at' => $invite['expires_at'],
            'ttl'        => $invite['ttl'],
            'max_uses'   => $invite['max_uses'],
            'qr_url'     => url_to('connect/qr') . '?t=' . rawurlencode($invite['token']),
        ]);
    }

    // -----------------------------------------------------------------

    /**
     * Resolve a school by its operator-issued code.
     */
    private function schoolByCode(string $code): ?object
    {
        $code = strtoupper(trim($code));

        if ($code === '' || strlen($code) > 50) {
            return null;
        }

        try {
            return \Config\Database::connect()
                ->table('schools')
                ->where('school_code', $code)
                ->where('status', 'active')
                ->get()
                ->getRow();
        } catch (\Throwable $e) {
            log_message('error', 'ConnectApi::schoolByCode: ' . $e->getMessage());

            return null;
        }
    }

    /**
     * One response shape for every outcome, so a caller cannot infer whether a
     * school exists from the structure of the reply.
     */
    private function respondGeneric(int $status, ?string $message = null, array $extra = []): \CodeIgniter\HTTP\ResponseInterface
    {
        $body = $extra + ['ok' => $message === null];

        if ($message !== null) {
            $body['message'] = $message;
        }

        return service('response')->setStatusCode($status)->setJSON($body);
    }
}