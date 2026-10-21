<?php

namespace App\Libraries;

use App\Models\SchoolsModel;
use CodeIgniter\Database\MigrationRunner;
use Config\Migrations;

/**
 * Dedicated-school provisioning (ADR-003 / ADR-005).
 *
 * Hard rule: a school NEVER shares a table with the control plane.
 * School-local data lives in its own database and is reached only through
 * the school-specific connection built in schoolConnection().
 */
class SchoolProvisioningService
{
    public const STATE_REQUESTED  = 'requested';
    public const STATE_VALIDATING = 'validating';
    public const STATE_CREATING   = 'creating';
    public const STATE_MIGRATING  = 'migrated';
    public const STATE_SEEDING    = 'seeded';
    public const STATE_READY      = 'completed';
    public const STATE_FAILED     = 'failed';

    protected SchoolsModel $schoolsModel;

    public function __construct()
    {
        $this->schoolsModel = new SchoolsModel();
    }

/**
     * School database name for a validated school code.
     *
     * The prefix is server-side configuration, never request input.
     */
    public function schoolDatabaseName(string $schoolCode): string
    {
        if (!preg_match('/^[a-z0-9]{3,20}$/i', $schoolCode)) {
            throw new \RuntimeException('Invalid school code');
        }

        $key = strtolower($schoolCode);

        // Server-side mapping for host-pre-created databases.
        // Format: ZEE_SCHOOL_DB_MAP = "code1=db_one,code2=db_two"
        // This is server-local configuration only; it is never taken from a request.
        $map = (string) $this->envValue('ZEE_SCHOOL_DB_MAP');

        if ($map !== '') {
            foreach (explode(',', $map) as $pair) {
                $parts = explode('=', trim($pair), 2);

                if (count($parts) === 2 && strtolower(trim($parts[0])) === $key) {
                    $mapped = trim($parts[1]);

                    if (!preg_match('/^[a-z0-9_]+$/', $mapped)) {
                        throw new \RuntimeException('Invalid mapped school database name');
                    }

                    return $mapped;
                }
            }
        }

// No host-specific default: the prefix must come from server-local
        // configuration. A hard-coded value would leak one host's account
        // identifier into every distributed copy of the product.
        $prefix = (string) $this->envValue('ZEE_SCHOOL_DB_PREFIX');

        if ($prefix === '') {
            throw new \RuntimeException('School database prefix is not configured (ZEE_SCHOOL_DB_PREFIX in .env)');
        }

        if (! preg_match('/^[a-z0-9_]+$/', $prefix)) {
            throw new \RuntimeException('Invalid school database prefix configuration');
        }

        return $prefix . $key;
    }

    /**
     * Read a server-local environment value.
     *
     * CodeIgniter's dotenv loader normalises dots in variable names to
     * underscores, so a key written as `schooldb.default.username` may be
     * exposed either way depending on the loader path. Both forms are
     * accepted so the server `.env` can use whichever the admin finds
     * readable.
     */
    private function envValue(string $name, string $default = ''): string
    {
        $flat = str_replace('.', '_', $name);

        $value = env($name, null);

        if ($value === null || $value === '') {
            $value = env($flat, null);
        }

        if ($value === null || $value === '') {
            return $default;
        }

        return (string) $value;
    }

    /**
     * Dedicated school-database credentials.
     *
     * These are SERVER-LOCAL configuration only (schooldb.* in .env).
     * They are never accepted from a browser or API payload, and are
     * never returned in any response.
     */
    private function schoolDbConfig(): array
    {
        return [
            'hostname' => $this->envValue('schooldb.default.hostname', 'localhost'),
            'database' => $this->envValue('schooldb.default.database'),
            'username' => $this->envValue('schooldb.default.username'),
            'password' => $this->envValue('schooldb.default.password'),
            'port'     => (int) ($this->envValue('schooldb.default.port', '3306')),
        ];
    }

    /**
     * Build a dedicated connection for the school database using the
     * dedicated school-database credentials (NOT the control-plane ones).
     */
    public function schoolConnection(string $dbName)
    {
        $cfg = $this->schoolDbConfig();

        if ($cfg['username'] === '') {
            throw new \RuntimeException('School database credentials are not configured (schooldb.* in .env)');
        }

        return \CodeIgniter\Database\Config::connect([
            'hostname' => $cfg['hostname'],
            'username' => $cfg['username'],
            'password' => $cfg['password'],
            'database' => $dbName,
            'DBDriver' => 'MySQLi',
            'charset'  => 'utf8mb4',
            'DBCollat' => 'utf8mb4_unicode_ci',
            'port'     => $cfg['port'],
        ], false);
    }

    /**
     * The dedicated database must already exist. On shared hosting the
     * host pre-creates it; we never run CREATE DATABASE against production.
     */
public function createDedicatedDatabase(string $schoolCode, array $config = []): array
    {
        try {
            $dbName = $this->schoolDatabaseName($schoolCode);
        } catch (\RuntimeException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }

        // Verify using the DEDICATED school credentials.
        // The control-plane user has no rights on a school database, so checking
        // through it would always report "missing".
        try {
            $school = $this->schoolConnection($dbName);
            $school->query('SELECT 1');

            $found = $school->query(
                'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
                [$dbName]
            )->getRow();

            if ($found === null) {
                return [
                    'success' => false,
                    'error'   => 'Dedicated school database is not reachable: ' . $dbName,
                ];
            }
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'error'   => 'Dedicated school database is not usable (' . $dbName . '): ' . $e->getMessage(),
            ];
        }

        return ['success' => true, 'database' => $dbName, 'existed' => true];
    }

    /**
     * Apply ONLY the school-local namespace to the dedicated database.
     * Control-plane and Shield migrations must never reach a school DB.
     */
    public function applySchoolMigrations(string $dbName): array
    {
        try {
            $conn = $this->schoolConnection($dbName);
            $conn->query('SELECT 1');

$runner = new MigrationRunner(new Migrations(), $conn);
            $runner->setNamespace('AppSchool');
            $runner->latest();
            $runner->setNamespace(null);
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'School migration failed: ' . $e->getMessage()];
        }

        return ['success' => true, 'database' => $dbName];
    }

/**
     * Seed ONLY safe structural defaults into the school's own database.
     *
     * Never seeds people and never invents money records. Idempotent: a
     * retry updates nothing and duplicates nothing.
     */
    public function seedSchoolDefaults(string $dbName): array
    {
        try {
            $conn = $this->schoolConnection($dbName);
            $conn->query('SELECT 1');

            $result = \App\Database\Seeds\SchoolLocal\SafeDefaultsSeeder::run($conn);

            return [
                'success'  => true,
                'database' => $dbName,
                'inserted' => $result['inserted'],
                'skipped'  => $result['skipped'],
            ];
        } catch (\Throwable $e) {
            log_message('error', 'SchoolProvisioningService::seedSchoolDefaults: ' . $e->getMessage());

return ['success' => false, 'error' => 'School seed failed: ' . $e->getMessage()];
        }
    }

    /**
     * Idempotent state-machine provisioning.
     */
    public function provisionSchool(int $schoolId, array $dbConfig = []): array
    {
        $school = $this->schoolsModel->find($schoolId);

        if ($school === null) {
            return ['success' => false, 'error' => 'School not found'];
        }

        if (($school->installation_state ?? '') === self::STATE_READY) {
            return ['success' => true, 'state' => self::STATE_READY, 'message' => 'Already provisioned'];
        }

        $code = $school->school_code ?: ('school' . $schoolId);

        $this->setState($schoolId, self::STATE_VALIDATING);

        $create = $this->createDedicatedDatabase($code, $dbConfig);
        if (! $create['success']) {
            $this->setState($schoolId, self::STATE_FAILED);

            return $create;
        }

        $dbName = $create['database'];
        $this->setState($schoolId, self::STATE_MIGRATING);

        $migrate = $this->applySchoolMigrations($dbName);
        if (! $migrate['success']) {
            $this->setState($schoolId, self::STATE_FAILED);

            return $migrate;
        }

        $this->setState($schoolId, self::STATE_SEEDING);

        $seed = $this->seedSchoolDefaults($dbName);
        if (! $seed['success']) {
            $this->setState($schoolId, self::STATE_FAILED);

            return $seed;
        }

        $this->setState($schoolId, self::STATE_READY);

        return ['success' => true, 'state' => self::STATE_READY, 'database' => $dbName];
    }

    protected function setState(int $schoolId, string $state): void
    {
        $this->schoolsModel->update($schoolId, [
            'installation_state'  => $state,
            'installation_status' => $state,
        ]);
    }
}

