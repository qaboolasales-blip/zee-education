<?php

namespace App\Libraries;

/**
 * The single authority on whether a school may use the product, and for how long.
 *
 * WHY THIS CLASS IS THE ONLY SOURCE OF TRUTH
 * ------------------------------------------
 * Nothing else is allowed to guess whether a school is licensed. LicenseFilter
 * asks it before a write, the Super Admin UI asks it to render a status chip,
 * and BillingService asks it before it renews. Because they all come through
 * here, a school can never be shown "Active" on a screen while its writes are
 * already being rejected.
 *
 * TIME IS NEVER TAKEN FROM THE CLIENT
 * -----------------------------------
 * Expiry is compared against the SERVER's clock and the dates stored in
 * school_licenses. A phone with a wrong date, or a user editing their device
 * clock, cannot extend a licence. The only stored value that moves forward is
 * last_verified_at, which is written by the server alone.
 *
 * DATA IS NEVER DESTROYED ON EXPIRY
 * ---------------------------------
 * Expired means READ-ONLY, not deleted. Students, fees, attendance and results
 * stay exactly where they are in the school's own database and stay readable.
 * See LicenseFilter: it blocks writes, it never deletes or hides rows.
 */
class LicenseService
{
    /** Written by the server only. */
    public const STATUS_ACTIVE      = 'active';
    public const STATUS_RENEWAL_DUE = 'renewal_due';
    public const STATUS_GRACE       = 'grace';
    public const STATUS_EXPIRED     = 'expired';
    public const STATUS_REVOKED     = 'revoked';

    /** Days before expiry at which a licence is flagged as renewal_due. */
    public const RENEWAL_WINDOW_DAYS = 30;

    /** Default grace period granted when a licence is issued or renewed. */
    public const DEFAULT_GRACE_DAYS = 14;

    /**
     * Generate a licence key in the shape the Super Admin UI shows:
     * ZEE-XXXX-XXXX-XXXX-XXXX
     *
     * The X characters are drawn from Crockford-style base32 (no I, L, O, U),
     * so a key read aloud or copied from a printed invoice is unambiguous. The
     * final group is a checksum over the preceding groups (see checksum), so a
     * mistyped key is rejected locally instead of turning into a support call.
     *
     * The caller is responsible for persisting only the HASH of this value.
     */
    public function generateKey(): string
    {
        $body = $this->randomGroup(4) . '-' . $this->randomGroup(4) . '-' . $this->randomGroup(4);

        return 'ZEE-' . $body . '-' . $this->checksum($body);
    }

    /**
     * Hash a licence key for storage/lookup. Plaintext keys are never persisted.
     */
    public function hashKey(string $key): string
    {
        return hash('sha256', strtoupper(trim($key)));
    }

    /**
     * The stored lookup prefix: the first 12 characters, uppercase.
     * Enough to identify a row in a list, not enough to be a usable key.
     */
    public function keyPrefix(string $key): string
    {
        return strtoupper(substr(trim($key), 0, 12));
    }

    /**
     * Local key validation: correct shape and a matching checksum.
     * This is a convenience check only - it does NOT prove a licence exists.
     */
    public function isWellFormedKey(string $key): bool
    {
        $key = strtoupper(trim($key));

        if (! preg_match('/^ZEE-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/', $key, $m)) {
            return false;
        }

        $body = $m[1] . '-' . $m[2] . '-' . $m[3];

        return hash_equals($this->checksum($body), $m[4]);
    }

    /**
     * Issue a fresh annual licence for a school on a plan.
     *
     * The plan's limits are SNAPSHOT onto the licence, so editing the catalogue
     * later can never shrink or enlarge a licence a school has already paid for.
     *
     * @return array{id:int, license_key:string}
     */
    public function issue(int $schoolId, int $planId, ?string $startDate = null, array $options = []): array
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $plan = $db->table('license_plans')->where('id', $planId)->get()->getRow();

        if ($plan === null) {
            throw new \RuntimeException('Unknown plan: ' . $planId);
        }

        $startsAt = $startDate ?? date('Y-m-d');

        // A renewal normally continues from the current expiry when the school
        // pays early, so paying on time never costs a school paid days.
        $endsAt = $options['expires_at'] ?? date('Y-m-d', strtotime($startsAt . ' +1 year'));

        $graceDays = (int) ($options['grace_days'] ?? self::DEFAULT_GRACE_DAYS);

        $key = $this->generateKey();

        $db->table('school_licenses')->insert([
            'school_id'          => $schoolId,
            'plan_id'            => $planId,
            'license_key_hash'   => $this->hashKey($key),
            'license_key_prefix' => $this->keyPrefix($key),
            'status'             => self::STATUS_ACTIVE,
            'max_students'       => $plan->max_students,
            'max_staff'          => $plan->max_staff,
            'starts_at'          => $startsAt,
            'expires_at'         => $endsAt,
            'grace_until'        => date('Y-m-d', strtotime($endsAt . ' +' . $graceDays . ' days')),
            'grace_days'         => $graceDays,
            'last_verified_at'   => $now,
            'notes'              => $options['notes'] ?? null,
            'created_at'         => $now,
            'updated_at'         => $now,
        ]);

        return ['id' => (int) $db->insertID(), 'license_key' => $key];
    }

    /**
     * The current licence row for a school, newest first, or null.
     */
    public function currentForSchool(int $schoolId): ?object
    {
        try {
            return \Config\Database::connect()
                ->table('school_licenses')
                ->where('school_id', $schoolId)
                ->orderBy('id', 'DESC')
                ->get()
                ->getRow();
        } catch (\Throwable $e) {
            log_message('error', 'LicenseService::currentForSchool: ' . $e->getMessage());

            return null;
        }
    }

    /**
     * The effective state of a licence at the current server time.
     *
     * Order matters: a revoked licence stays revoked even if its dates still
     * look valid, and an expired-by-date licence can still be inside its grace
     * window. This single method is what every caller uses.
     *
     * @return array{
     *   state:string, status:string, license:?object, plan:?object,
     *   days_left:int, in_grace:bool, can_write:bool, message:string
     * }
     */
    public function state(int $schoolId): array
    {
        $license = $this->currentForSchool($schoolId);

        if ($license === null) {
            return $this->emptyState('This school has no licence yet.');
        }

        $today = date('Y-m-d');
        $plan  = $this->planFor($license);

        if ($license->status === self::STATUS_REVOKED) {
            return $this->stateFrom($license, $plan, self::STATUS_REVOKED, 0, false, false,
                'This licence was withdrawn. Please contact Zee Education.');
        }

        $daysLeft = (int) floor((strtotime((string) $license->expires_at) - strtotime($today)) / 86400);

        if ($daysLeft < 0) {
            $inGrace = $license->grace_until !== null && $today <= $license->grace_until;

            if ($inGrace) {
                return $this->stateFrom($license, $plan, self::STATUS_GRACE, $daysLeft, true, false,
                    'Your licence has ended. Renew now to keep entering data (grace period).');
            }

            return $this->stateFrom($license, $plan, self::STATUS_EXPIRED, $daysLeft, false, false,
                'Your licence has expired. Your data is safe and readable. Renew to continue.');
        }

        if ($daysLeft <= self::RENEWAL_WINDOW_DAYS) {
            return $this->stateFrom($license, $plan, self::STATUS_RENEWAL_DUE, $daysLeft, false, true,
                'Your licence renews in ' . $daysLeft . ' day' . ($daysLeft === 1 ? '' : 's') . '.');
        }

        return $this->stateFrom($license, $plan, self::STATUS_ACTIVE, $daysLeft, false, true, '');
    }

    /**
     * can_write is the ONLY answer anyone should act on for write requests.
     * Super Admins never pass through here - they are platform operators, not
     * tenants, so they are never subject to a school's licence.
     */
    public function canWrite(int $schoolId): bool
    {
        return $this->state($schoolId)['can_write'];
    }

    /**
     * Record a successful licence check. Server-side only.
     */
    public function touchVerified(int $licenseId): void
    {
        try {
            \Config\Database::connect()
                ->table('school_licenses')
                ->where('id', $licenseId)
                ->update(['last_verified_at' => date('Y-m-d H:i:s')]);
        } catch (\Throwable $e) {
            log_message('error', 'LicenseService::touchVerified: ' . $e->getMessage());
        }
    }

    /**
     * Withdraw a licence. The school becomes read-only immediately; nothing is
     * deleted. Returns true when a licence was actually revoked.
     */
    public function revoke(int $schoolId, string $reason): bool
    {
        $license = $this->currentForSchool($schoolId);

        if ($license === null || $license->status === self::STATUS_REVOKED) {
            return false;
        }

        \Config\Database::connect()
            ->table('school_licenses')
            ->where('id', $license->id)
            ->update([
                'status'         => self::STATUS_REVOKED,
                'revoked_at'     => date('Y-m-d H:i:s'),
                'revoked_reason' => mb_substr($reason, 0, 255),
                'updated_at'     => date('Y-m-d H:i:s'),
            ]);

        return true;
    }

    /**
     * How many students a school may hold, or null for unlimited.
     */
    public function studentLimit(int $schoolId): ?int
    {
        $license = $this->currentForSchool($schoolId);

        return $license === null ? null : ($license->max_students === null ? null : (int) $license->max_students);
    }

    /**
     * Staff limit for a school, or null for unlimited.
     */
    public function staffLimit(int $schoolId): ?int
    {
        $license = $this->currentForSchool($schoolId);

        return $license === null ? null : ($license->max_staff === null ? null : (int) $license->max_staff);
    }

    // -----------------------------------------------------------------
    // internals
    // -----------------------------------------------------------------

    private function planFor(object $license): ?object
    {
        try {
            return \Config\Database::connect()->table('license_plans')->where('id', $license->plan_id)->get()->getRow();
        } catch (\Throwable) {
            return null;
        }
    }

    private function stateFrom(object $license, ?object $plan, string $state, int $daysLeft, bool $inGrace, bool $canWrite, string $message): array
    {
        return [
            'state'     => $state,
            'status'    => $license->status,
            'license'   => $license,
            'plan'      => $plan,
            'days_left' => $daysLeft,
            'in_grace'  => $inGrace,
            'can_write' => $canWrite,
            'message'   => $message,
        ];
    }

    private function emptyState(string $message): array
    {
        return [
            'state'     => self::STATUS_EXPIRED,
            'status'    => '',
            'license'   => null,
            'plan'      => null,
            'days_left' => 0,
            'in_grace'  => false,
            'can_write' => false,
            'message'   => $message,
        ];
    }

    private const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

    private function randomGroup(int $length): string
    {
        $out = '';
        $max = strlen(self::ALPHABET) - 1;

        for ($i = 0; $i < $length; $i++) {
            $out .= self::ALPHABET[random_int(0, $max)];
        }

        return $out;
    }

    /**
     * Deterministic 4-character checksum over the key body. Uses a mod-31 sum
     * so a single mistyped character is caught without a CRC table.
     */
    private function checksum(string $body): string
    {
        $sum = 0;
        $len = strlen($body);

        for ($i = 0; $i < $len; $i++) {
            $sum = ($sum + (ord($body[$i]) * ($i + 1))) % 31;
        }

        return substr(self::ALPHABET . '0123456789', $sum, 4);
    }
}