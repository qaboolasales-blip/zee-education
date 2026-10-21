<?php

namespace App\Libraries;

/**
 * Resolves which school installation a signed-in user belongs to, and gives
 * back a connection to THAT school's dedicated database.
 *
 * SECURITY CONTRACT (ADR-001 / ADR-003):
 *  - The school is resolved from the control-plane mapping for the CURRENT
 *    session user. It is never read from a route parameter, query string or
 *    request body.
 *  - Data is only ever read through the dedicated school connection, so one
 *    school can never observe another school's data.
 *  - Super Admins are platform operators and deliberately have NO school,
 *    because they must not browse learner data by default.
 */
class SchoolAccessService
{
    /**
     * Control-plane school row for the signed-in user, or null.
     */
    public function schoolForUser(?int $userId): ?object
    {
        if ($userId === null) {
            return null;
        }

        try {
            $db = \Config\Database::connect();

            if (! $db->tableExists('user_school_access') || ! $db->tableExists('schools')) {
                return null;
            }

            return $db->table('schools')
                ->select('schools.*')
                ->join('user_school_access', 'user_school_access.school_id = schools.id', 'inner')
                ->where('user_school_access.user_id', $userId)
                ->get()
                ->getRow();
        } catch (\Throwable $e) {
            log_message('error', 'SchoolAccessService::schoolForUser: ' . $e->getMessage());

            return null;
        }
    }

    /**
     * School id for the signed-in user, or null when the user has no school.
     */
    public function schoolIdForUser(?int $userId): ?int
    {
        $school = $this->schoolForUser($userId);

        return $school === null ? null : (int) $school->id;
    }

    /**
     * Dedicated connection to the given school's own database.
     *
     * Returns null when school-local database access is not configured.
     */
    public function connectionForSchoolId(int $schoolId)
    {
        $user = (string) env('schooldb.default.username', '');

        if ($user === '') {
            return null;
        }

        $default = config('Database')->default;

        $dbName = (string) env('schooldb.default.database', '');

        // When a mapping is present use it, so several schools can each have
        // their own database instead of sharing one configured name.
        $dbName = $this->databaseForSchoolCode($schoolId) ?? $dbName;

        try {
            $conn = \CodeIgniter\Database\Config::connect([
                'hostname' => $default['hostname'] ?? 'localhost',
                'username' => $user,
                'password' => (string) env('schooldb.default.password', ''),
                'database' => $dbName,
                'DBDriver' => 'MySQLi',
                'charset'  => 'utf8mb4',
                'DBCollat' => 'utf8mb4_unicode_ci',
                'port'     => $default['port'] ?? 3306,
            ], false);

            $conn->query('SELECT 1');

            return $conn;
        } catch (\Throwable $e) {
            log_message('error', 'SchoolAccessService::connectionForSchoolId: ' . $e->getMessage());

            return null;
        }
    }

    /**
     * Dedicated connection for the SIGNED-IN user's own school.
     */
    public function connectionForCurrentUser(?int $userId)
    {
        $schoolId = $this->schoolIdForUser($userId);

        return $schoolId === null ? null : $this->connectionForSchoolId($schoolId);
    }

    /**
     * Look up a school's dedicated database name from the server-side map.
     */
    private function databaseForSchoolCode(int $schoolId): ?string
    {
        try {
            $db     = \Config\Database::connect();
            $school = $db->table('schools')->where('id', $schoolId)->get()->getRow();

            if ($school === null || empty($school->school_code)) {
                return null;
            }

            $map = (string) (env('ZEE_SCHOOL_DB_MAP') ?? env('ZEE_SCHOOL_DB_MAP', ''));

            if ($map === '') {
                return null;
            }

            foreach (explode(',', $map) as $pair) {
                $parts = explode('=', trim($pair), 2);

                if (count($parts) === 2 && strtolower(trim($parts[0])) === strtolower((string) $school->school_code)) {
                    return trim($parts[1]);
                }
            }
        } catch (\Throwable) {
            return null;
        }

        return null;
    }
}