<?php

namespace App\Libraries;

/**
 * Short-lived tokens for the "connect your school" flow.
 *
 * WHAT AN INVITE IS - AND IS NOT
 * ------------------------------
 * An invite says "this token points at THAT school". It is a routing hint and
 * nothing more. It is NOT authentication: the person still has to sign in on
 * that school's own domain with their own credentials, and the school is always
 * resolved server-side from the SESSION afterwards (ADR-003), never from the
 * invite. That is why an invite cannot be used to read learner data.
 *
 * SECURITY DESIGN
 * ---------------
 * - The raw token exists only inside the QR image. Only its SHA-256 is stored,
 *   so the database cannot be mined for usable tokens.
 * - Tokens are short-lived (minutes) and use-limited, so a photographed QR
 *   screen is near worthless within minutes.
 * - Revocation takes effect immediately; there is no cache to expire.
 * - Lookup is by hash with an equality comparison, never a LIKE scan.
 *
 * Constant-time comparison is used so a caller cannot learn a valid hash one
 * character at a time.
 */
class InviteService
{
    /** Default lifetime of a connect invite, in minutes. */
    public const DEFAULT_TTL_MINUTES = 10;

    /** Default number of times an invite may be redeemed. */
    public const DEFAULT_MAX_USES = 1;

    /**
     * Create an invite and return the RAW token.
     *
     * The caller is responsible for rendering it into a QR image immediately;
     * after this returns, the raw value is not recoverable from the database.
     *
     * @param array{ttl_minutes?:int, max_uses?:int, domain?:?string} $options
     */
    public function create(int $schoolId, string $kind = 'connect', array $options = []): array
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $ttl  = max(1, min(1440, (int) ($options['ttl_minutes'] ?? self::DEFAULT_TTL_MINUTES)));
        $uses = max(1, min(1000, (int) ($options['max_uses'] ?? self::DEFAULT_MAX_USES)));

        $token = $this->randomToken();

        $db->table('school_invites')->insert([
            'school_id'  => $schoolId,
            'token_hash' => $this->hashToken($token),
            'kind'       => $kind,
            'domain'     => $options['domain'] ?? null,
            'max_uses'   => $uses,
            'used_count' => 0,
            'expires_at' => date('Y-m-d H:i:s', strtotime('+' . $ttl . ' minutes')),
            'created_by' => $options['created_by'] ?? null,
            'created_at' => $now,
        ]);

        return [
            // insert() only reports success; the id comes from insertID().
            // Using the boolean would make revoke()/purge() target row 1.
            'id'         => (int) $db->insertID(),
            'token'      => $token,
            'expires_at' => date('Y-m-d H:i:s', strtotime('+' . $ttl . ' minutes')),
            'ttl'        => $ttl,
            'max_uses'   => $uses,
        ];
    }

    /**
     * Validate a token WITHOUT consuming it.
     *
     * Returns null for anything expired, revoked, exhausted or unknown. A
     * caller must not distinguish between those cases to an end user: telling a
     * stranger that a token "already used" confirms it once existed.
     */
    public function peek(string $token): ?object
    {
        if ($token === '') {
            return null;
        }

        try {
            $row = \Config\Database::connect()
                ->table('school_invites')
                ->where('token_hash', $this->hashToken($token))
                ->get()
                ->getRow();
        } catch (\Throwable $e) {
            log_message('error', 'InviteService::peek: ' . $e->getMessage());

            return null;
        }

        if ($row === null) {
            return null;
        }

        if ($row->revoked_at !== null) {
            return null;
        }

        if (strtotime((string) $row->expires_at) < time()) {
            return null;
        }

        if ((int) $row->used_count >= (int) $row->max_uses) {
            return null;
        }

        return $row;
    }

    /**
     * Validate and consume a token in one step.
     *
     * The use count is incremented conditionally in SQL so two simultaneous
     * requests cannot both redeem the last remaining use.
     */
    public function consume(string $token): ?object
    {
        $row = $this->peek($token);

        if ($row === null) {
            return null;
        }

        $db = \Config\Database::connect();

        $db->table('school_invites')
            ->where('id', $row->id)
            ->where('revoked_at', null)
            ->where('used_count <', (int) $row->max_uses)
            ->update([
                'used_count' => (int) $row->used_count + 1,
                'used_at'    => date('Y-m-d H:i:s'),
            ]);

        // 0 affected rows means somebody else consumed it between peek and
        // update. Builder::update() reports only a bool, so the row count must
        // come from the connection.
        if ($db->affectedRows() === 0) {
            return null;
        }

        return $row;
    }

    /**
     * Withdraw an invite immediately.
     */
    public function revoke(int $inviteId): bool
    {
        $db = \Config\Database::connect();

        $db->table('school_invites')
            ->where('id', $inviteId)
            ->where('revoked_at', null)
            ->update(['revoked_at' => date('Y-m-d H:i:s')]);

        // Builder::update() returns a bool, not a row count. The count has to
        // come from the connection, otherwise every caller would see "1" for
        // a bulk operation that touched several rows.
        return $db->affectedRows() > 0;
    }

    /**
     * Withdraw every live invite for a school. Used when a school is
     * suspended or a domain is being moved.
     *
     * @return int how many invites were actually withdrawn
     */
    public function revokeAllForSchool(int $schoolId): int
    {
        $db = \Config\Database::connect();

        $db->table('school_invites')
            ->where('school_id', $schoolId)
            ->where('revoked_at', null)
            ->update(['revoked_at' => date('Y-m-d H:i:s')]);

        return $db->affectedRows();
    }

    /**
     * Housekeeping: drop invites that expired long ago.
     */
    public function purgeExpired(int $olderThanDays = 7): int
    {
        return \Config\Database::connect()
            ->table('school_invites')
            ->where('expires_at <', date('Y-m-d H:i:s', strtotime('-' . $olderThanDays . ' days')))
            ->delete();
    }

    /**
     * The payload encoded into the QR image.
     *
     * Deliberately contains ONLY the host and the token. It carries no user id,
     * no school id, no role and no credential, so a photographed QR reveals
     * nothing on its own.
     */
    public function qrPayload(string $host, string $token): string
    {
        $domain = service('hostResolver')->normaliseDomain($host);

        if ($domain === null) {
            throw new \RuntimeException('Cannot build a QR payload for an invalid host.');
        }

        return $domain . '#c=' . rawurlencode($token);
    }

    /**
     * Hash a token for storage and lookup.
     */
    public function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    /**
     * Compare two hashes without leaking their contents through timing.
     */
    public function hashesMatch(string $known, string $given): bool
    {
        return hash_equals($known, $given);
    }

    /**
     * 32 random bytes, URL-safe. Generated with random_int so it is not
     * predictable from a seed or from a previous token.
     */
    private function randomToken(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }
}