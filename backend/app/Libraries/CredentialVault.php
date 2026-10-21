<?php

namespace App\Libraries;

/**
 * Stores and retrieves each school's own MySQL credentials.
 *
 * WHY ENCRYPTION AND NOT HASHING
 * ------------------------------
 * A credential cannot be hashed: the application has to present the original
 * password to MySQL in order to connect. So the password is ENCRYPTED with
 * CodeIgniter's Encryption service (OpenSSL driver, AES-256-CTR with an
 * HMAC-SHA512 authentication tag), then base64-encoded for storage. The MAC
 * means a tampered ciphertext fails to decrypt rather than yielding garbage.
 *
 * The encryption key lives in `encryption_key` in .env and MUST NOT be
 * committed. A stolen database dump without that key is useless against the
 * school databases; a stolen .env is a compromise of everything, which is why
 * the key is never printed, logged, or returned by any endpoint.
 *
 * WHY EACH SCHOOL NEEDS ITS OWN USER
 * ----------------------------------
 * With one shared MySQL user, a single leaked credential or a wrong database
 * name would expose every tenant at once. Per-school credentials mean access
 * to one school can be revoked on its own, and MySQL itself enforces the
 * boundary rather than the application relying on its own string handling.
 *
 * NOTHING IN THIS CLASS RETURNS A PASSWORD TO A CALLER
 * -----------------------------------------------------
 * Credentials are used inside connect() and then discarded. There is no getter
 * that hands the plaintext back, so a controller cannot accidentally leak it
 * into a JSON response.
 */
class CredentialVault
{
    /**
     * Save (or replace) the credentials for a school.
     *
     * @param array{hostname?:string, port?:int, database:string, username:string, password:string} $creds
     */
    public function save(int $schoolId, array $creds): int
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $row = [
            'school_id'       => $schoolId,
            'db_hostname'     => $creds['hostname'] ?? 'localhost',
            'db_port'         => (int) ($creds['port'] ?? 3306),
            'db_name'         => $creds['database'],
            'db_username'     => $creds['username'],
            'db_password_enc' => $this->encrypt((string) $creds['password']),
            'status'          => 'pending',
            'last_error'      => null,
            'updated_at'      => $now,
        ];

        $existing = $db->table('school_db_credentials')->where('school_id', $schoolId)->get()->getRow();

        if ($existing === null) {
            $row['created_at'] = $now;
            $row['last_verified_at'] = null;

            $db->table('school_db_credentials')->insert($row);

            return (int) $db->insertID();
        }

        $db->table('school_db_credentials')->where('id', $existing->id)->update($row);

        return (int) $existing->id;
    }

    /**
     * Open a verified connection to one school's dedicated database.
     *
     * Falls back to the single shared schooldb.* configuration when a school has
     * no stored credentials. That fallback exists ONLY for the original
     * single-school pilot; a commercial install is expected to have per-school
     * credentials for every school.
     *
     * @return \CodeIgniter\Database\ConnectionInterface|null null when the school has no reachable database
     */
    public function connect(int $schoolId)
    {
        $row = $this->rowFor($schoolId);

        if ($row === null) {
            return $this->connectWithSharedConfig();
        }

        try {
            $conn = \CodeIgniter\Database\Config::connect([
                'hostname' => $row->db_hostname,
                'username' => $row->db_username,
                'password' => $this->decrypt($row->db_password_enc),
                'database' => $row->db_name,
                'DBDriver' => 'MySQLi',
                'charset'  => 'utf8mb4',
                'DBCollat' => 'utf8mb4_unicode_ci',
                'port'     => (int) $row->db_port,
            ], false);

            $conn->query('SELECT 1');

            $this->markVerified($schoolId, null);

            return $conn;
        } catch (\Throwable $e) {
            // The message can contain a hostname or user name; it must never be
            // echoed to a browser. It is logged for the operator only.
            log_message('error', 'CredentialVault::connect school=' . $schoolId . ': ' . $e->getMessage());

            $this->markVerified($schoolId, 'Connection failed');

            return null;
        }
    }

    /**
     * Test stored credentials and record the outcome. Used by provisioning so
     * the owner can confirm a hPanel-created user actually works.
     */
    public function verify(int $schoolId): bool
    {
        $conn = $this->connect($schoolId);

        return $conn !== null;
    }

    /**
     * Safe-to-display facts about a school's credentials. Deliberately returns
     * NO password and no ciphertext.
     */
    public function describe(int $schoolId): ?array
    {
        $row = $this->rowFor($schoolId);

        if ($row === null) {
            return null;
        }

        return [
            'database'         => $row->db_name,
            'username'         => $row->db_username,
            'hostname'         => $row->db_hostname,
            'port'             => (int) $row->db_port,
            'status'           => $row->status,
            'last_verified_at' => $row->last_verified_at,
            'last_error'       => $row->last_error,
        ];
    }

    public function delete(int $schoolId): bool
    {
        return \Config\Database::connect()
            ->table('school_db_credentials')
            ->where('school_id', $schoolId)
            ->delete() > 0;
    }

    // -----------------------------------------------------------------
    // internals
    // -----------------------------------------------------------------

    private function rowFor(int $schoolId): ?object
    {
        try {
            return \Config\Database::connect()
                ->table('school_db_credentials')
                ->where('school_id', $schoolId)
                ->get()
                ->getRow();
        } catch (\Throwable $e) {
            log_message('error', 'CredentialVault::rowFor: ' . $e->getMessage());

            return null;
        }
    }

    private function markVerified(int $schoolId, ?string $error): void
    {
        try {
            \Config\Database::connect()
                ->table('school_db_credentials')
                ->where('school_id', $schoolId)
                ->update([
                    'status'           => $error === null ? 'verified' : 'failed',
                    'last_error'       => $error,
                    'last_verified_at' => date('Y-m-d H:i:s'),
                    'updated_at'       => date('Y-m-d H:i:s'),
                ]);
        } catch (\Throwable $e) {
            log_message('error', 'CredentialVault::markVerified: ' . $e->getMessage());
        }
    }

    /**
     * Original single-school configuration from .env. Used only when a school
     * has no stored credentials of its own.
     */
    private function connectWithSharedConfig()
    {
        $user = (string) env('schooldb.default.username', '');

        if ($user === '') {
            return null;
        }

        $default = config('Database')->default;

        try {
            $conn = \CodeIgniter\Database\Config::connect([
                'hostname' => $default['hostname'] ?? 'localhost',
                'username' => $user,
                'password' => (string) env('schooldb.default.password', ''),
                'database' => (string) env('schooldb.default.database', ''),
                'DBDriver' => 'MySQLi',
                'charset'  => 'utf8mb4',
                'DBCollat' => 'utf8mb4_unicode_ci',
                'port'     => $default['port'] ?? 3306,
            ], false);

            $conn->query('SELECT 1');

            return $conn;
        } catch (\Throwable $e) {
            log_message('error', 'CredentialVault::connectWithSharedConfig: ' . $e->getMessage());

            return null;
        }
    }

    private function encrypt(string $plain): string
    {
        $enc = service('encrypter');

        $cipher = $enc->encrypt($plain);

        if ($cipher === false) {
            // Raised rather than swallowed: silently storing plaintext because
            // encryption was unavailable would be a severe data-handling fault.
            throw new \RuntimeException(
                'Cannot encrypt school database credentials. Check that encryption_key is set in .env.'
            );
        }

        // CodeIgniter's Encryption defaults to $rawData = true, which returns the
        // raw AES/HMAC bytes. Those bytes are not valid UTF-8 and MySQL refuses
        // them in a TEXT column on a utf8mb4 connection ("Incorrect string
        // value"). The cipher text is therefore base64-encoded for storage. This
        // is transport encoding only - it does not weaken the encryption, which
        // is still authenticated by CI4's HMAC before it leaves this class.
        return base64_encode($cipher);
    }

    private function decrypt(string $encoded): string
    {
        $raw = base64_decode($encoded, true);

        // Values written before the base64 transport encoding was introduced
        // were stored raw. Accept either form rather than locking an operator
        // out of their own databases.
        $candidate = ($raw === false) ? $encoded : $raw;

        $plain = service('encrypter')->decrypt($candidate);

        if ($plain === false) {
            throw new \RuntimeException(
                'Stored school database credentials could not be decrypted. The encryption_key may have changed.'
            );
        }

        return $plain;
    }
}