<?php

namespace App\Libraries;

/**
 * Resolves which school an incoming request belongs to by its domain.
 *
 * WHY THIS EXISTS
 * ---------------
 * Each school runs on its own domain (school-a.example, school-b.example) while
 * the Super Admin console runs on the platform domain. Something has to map
 * "this hostname" to "that school", and it has to be done server-side from
 * configuration we control - never from a value the visitor sent.
 *
 * WHY THE HOST HEADER CANNOT BE TRUSTED BLINDLY
 * ---------------------------------------------
 * The HTTP Host header is attacker-controlled: anyone can send
 * `Host: some-other-school.example`. So this class does NOT look a school up
 * by whatever host was sent and then act on it. Instead:
 *
 *   - The configured admin host (ZEE_ADMIN_HOST) is the only host that gives
 *     access to the platform console.
 *   - A school host is only honoured when it exists in school_domains AND has
 *     been verified (verified_at set).
 *   - An unrecognised host resolves to null, and callers refuse to serve rather
 *     than falling back to a default school. A default fallback would let a
 *     stranger reach school data simply by sending an unknown Host header.
 *
 * This resolves IDENTITY for display and for choosing a provisioning context.
 * It is never used to decide which database a signed-in user may read - that
 * always comes from the session via SchoolAccessService (ADR-003).
 */
class HostResolver
{
    /**
     * The configured platform/admin host, lower-cased, or null when unset.
     */
    public function adminHost(): ?string
    {
        $host = $this->envValue('ZEE_ADMIN_HOST');

        return $host === '' ? null : strtolower($host);
    }

    /**
     * True when this request is for the platform console host.
     */
    public function isAdminRequest(?string $host = null): bool
    {
        $admin = $this->adminHost();

        if ($admin === null) {
            return false;
        }

        return strtolower($host ?? $this->currentHost()) === $admin;
    }

    /**
     * The school row for a host, but ONLY when the domain is on file and has
     * been verified. Returns null for anything else.
     */
    public function schoolForHost(?string $host = null): ?object
    {
        // Normalise the SAME way as the live request path. A caller that passes
        // "school.example:8080" or "School.Example" must get the same answer as
        // an HTTP request with that Host header - otherwise a school's domain
        // simply fails to resolve and the school cannot be found at all.
        $host = $this->normaliseHost($host ?? $this->currentHost());

        if ($host === '' || $this->isAdminRequest($host)) {
            return null;
        }

        try {
            $db = \Config\Database::connect();

            if (! $db->tableExists('school_domains')) {
                return null;
            }

            return $db->table('schools')
                ->select('schools.*')
                ->join('school_domains', 'school_domains.school_id = schools.id', 'inner')
                ->where('school_domains.domain', $host)
                ->where('school_domains.verified_at IS NOT NULL', null, false)
                ->get()
                ->getRow();
        } catch (\Throwable $e) {
            log_message('error', 'HostResolver::schoolForHost: ' . $e->getMessage());

            return null;
        }
    }

    /**
     * Whether a host is a verified school domain. Used by provisioning to
     * refuse to attach a licence to a domain we do not control.
     */
    public function isVerifiedSchoolHost(string $host): bool
    {
        return $this->schoolForHost($host) !== null;
    }

    /**
     * The host of the current request, without port, lower-cased.
     *
     * HTTP_HOST is user input. This method only normalises it; every decision
     * built on top treats the value as untrusted.
     */
    public function currentHost(): string
    {
        return $this->normaliseHost((string) ($_SERVER['HTTP_HOST'] ?? ''));
    }

    /**
     * Reduce a host string to a bare, comparable hostname.
     *
     * Drops the port, lower-cases, and REJECTS anything that is not a plain
     * hostname by returning an empty string. Rejecting is deliberate: silently
     * stripping suspicious characters would let a crafted header turn into a
     * value that matches a real domain.
     */
    private function normaliseHost(string $host): string
    {
        $host = trim($host);

        if ($host === '') {
            return '';
        }

        // Drop the port only when it is genuinely a trailing :digits group.
        if (preg_match('/^(\[[0-9a-fA-F:]+]|[^:]+)(:\d+)?$/', $host, $m) === 1) {
            $host = $m[1];
        }

        $host = strtolower($host);

        if ($host !== '' && ! preg_match('/^[a-z0-9.\-]+$/', $host)) {
            return '';
        }

        return $host;
    }

    /**
     * Record a domain for a school and mark it verified. Used by provisioning
     * once the operator confirms DNS points at the platform.
     */
    public function attachDomain(int $schoolId, string $domain, bool $isPrimary = true, ?bool $verified = true): int
    {
        $db = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $existing = $db->table('school_domains')
            ->where('school_id', $schoolId)
            ->where('domain', strtolower($domain))
            ->get()
            ->getRow();

        $row = [
            'school_id'   => $schoolId,
            'domain'      => strtolower($domain),
            'is_primary'  => $isPrimary ? 1 : 0,
            'verified_at' => $verified ? $now : null,
            'created_at'  => $now,
        ];

        if ($existing === null) {
            $db->table('school_domains')->insert($row);

            return (int) $db->insertID();
        }

        $db->table('school_domains')->where('id', $existing->id)->update([
            'is_primary'  => $row['is_primary'],
            'verified_at' => $row['verified_at'],
        ]);

        return (int) $existing->id;
    }

    /**
     * Normalise a domain a user typed into the connect screen. Returns null for
     * anything that is not a plain hostname, so rubbish never reaches a lookup.
     */
    public function normaliseDomain(string $domain): ?string
    {
        $domain = strtolower(trim($domain));

        // Accept "school.example.com" pasted with or without a scheme/path.
        if (str_contains($domain, '://')) {
            $domain = (string) parse_url($domain, PHP_URL_HOST);
        }

        $domain = trim(strtolower((string) $domain), '.');
        $slash  = strpos($domain, '/');

        if ($slash !== false) {
            $domain = substr($domain, 0, $slash);
        }

        $domain = explode(':', $domain)[0];

        if ($domain === '' || ! preg_match('/^[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]*[a-z0-9])?)+$/', $domain)) {
            return null;
        }

        return $domain;
    }

    /**
     * Env lookup that accepts both dotted and underscored spellings, because
     * CodeIgniter's env() maps dots onto the variable namespace differently
     * depending on how the value was defined.
     */
    private function envValue(string $name): string
    {
        $value = env($name);

        if ($value !== false && $value !== null) {
            return (string) $value;
        }

        $alt = env(str_replace('.', '_', $name));

        return ($alt === false || $alt === null) ? '' : (string) $alt;
    }
}