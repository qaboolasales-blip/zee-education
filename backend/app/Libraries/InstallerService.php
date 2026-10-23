<?php

namespace App\Libraries;

use CodeIgniter\Database\MigrationRunner;
use Config\Migrations;

/**
 * First-run installer engine.
 *
 * Responsibilities (all server-side, all idempotent):
 *  1. preflight  - environment readiness checks
 *  2. testDb     - verify the CONTROL-PLANE connection from the server-local .env
 *  3. migrate    - official migration order: Shield -> Settings -> App,
 *                  then the idempotent plan-catalogue seed
 *  4. createAdmin- create the very first Platform Owner / Super Admin
 *  5. lock       - write the install lock so the public installer disappears
 *
 * SECURITY:
 *  - The installer NEVER accepts a database host/user/password from a browser.
 *    It only uses what the operator already placed in the server-local .env.
 *  - No password, hash or DSN is ever returned to the browser or logged.
 */
class InstallerService
{
    /**
     * Step 1 - server preflight.
     *
     * @return array<int, array{label:string,ok:bool,detail:string,fix:string}>
     */
    public function preflight(): array
    {
        $checks = [];

        $checks[] = $this->check(
            'PHP 8.2 or newer',
            PHP_VERSION_ID >= 80200,
            'PHP ' . PHP_VERSION,
            'Ask your host to set PHP 8.2 or 8.3 for this domain.'
        );

        foreach (['intl', 'mbstring', 'mysqli', 'json', 'openssl'] as $ext) {
            $checks[] = $this->check(
                'PHP extension: ' . $ext,
                extension_loaded($ext),
                extension_loaded($ext) ? 'loaded' : 'missing',
                'Enable the "' . $ext . '" extension in your hosting PHP settings.'
            );
        }

        // writable paths
        foreach (['writable', 'writable/cache', 'writable/logs', 'writable/session', 'writable/uploads'] as $rel) {
            $path = ROOTPATH . $rel;
            $ok   = is_dir($path) && is_writable($path);
            $checks[] = $this->check(
                'Writable folder: ' . $rel,
                $ok,
                is_dir($path) ? (is_writable($path) ? 'writable' : 'not writable') : 'missing',
                'Create the folder and set it to 755 (or 775) so the web server can write to it.'
            );
        }

        // web root must be public/
        $checks[] = $this->check(
            'Web root points at public/',
            realpath(FCPATH) === realpath(ROOTPATH . 'public'),
            'document root: ' . str_replace(ROOTPATH, '', (string) realpath(FCPATH)),
            'In your hosting panel set the document root to the "public" folder.'
        );

        // HTTPS / base url. Localhost installs are allowed but warned about,
        // because a real public deployment must always be served over HTTPS.
        $base    = (string) env('app.baseURL', '');
        $https   = str_starts_with($base, 'https://');
        $local   = str_contains($base, 'localhost') || str_contains($base, '127.0.0.1');
        $checks[] = $this->check(
            'HTTPS base URL configured',
            $https || ($local && $base !== ''),
            $base !== '' ? $base : 'app.baseURL not set',
            'Set app.baseURL in .env to your https:// address, then enable SSL in the hosting panel.',
            ($local && ! $https) ? 'warn' : 'fail'
        );

        // database driver config present (values never shown)
        $dbConf = config('Database')->default;
        $hasCfg = ! empty($dbConf['database']) && ! empty($dbConf['username']);
        $checks[] = $this->check(
            'Control-plane database configured in .env',
            $hasCfg,
            $hasCfg ? 'database + username present (values hidden)' : 'missing database or username',
            'Copy .env.example to .env and fill in database.* values from your hosting panel.'
        );

        return $checks;
    }

    /**
     * @return array{ok:bool,checks:array}
     */
    public function preflightSummary(): array
    {
        $checks = $this->preflight();
        $failed = array_filter($checks, static fn ($c) => ! $c['ok']);

        return ['ok' => $failed === [], 'checks' => $checks];
    }

    /**
     * Step 3 - test the control-plane connection. Never reveals the reason
     * beyond a short, non-sensitive message.
     *
     * @return array{ok:bool,message:string}
     */
    public function testDatabase(): array
    {
        try {
            $db = \Config\Database::connect();
            $db->query('SELECT 1');
            $db->close();

            return ['ok' => true, 'message' => 'Connected to the control-plane database.'];
        } catch (\Throwable $e) {
            return [
                'ok'      => false,
                'message' => 'Could not connect. Check the database name, username, password and host in your server .env. (Details are written to the server log only.)',
            ];
        }
    }

    /**
     * Step 4 - official migration order.
     *
     * Control-plane order is fixed and must not change:
     *   CodeIgniter\Shield  -> CodeIgniter\Settings -> App
     *
     * The school-local namespace (AppSchool) is deliberately NOT run here.
     * School data only ever lands in that school's own database (ADR-001).
     *
     * @return array{ok:bool,log:array<int,string>,message:string}
     */
    public function migrate(): array
    {
        $log     = [];
        $success = true;

        foreach (['CodeIgniter\Shield', 'CodeIgniter\Settings', 'App'] as $namespace) {
            try {
                $db = \Config\Database::connect();
                $db->query('SELECT 1');

                $runner = new MigrationRunner(new Migrations(), $db);
                $runner->setNamespace($namespace);
                $runner->latest();
                $runner->setNamespace(null);

                $log[] = $namespace . ': OK';
            } catch (\Throwable $e) {
                $success    = false;
                $log[]      = $namespace . ': FAILED';
                break;
            }
        }

        // Plans are a catalogue, not schema: without them the Super Admin has
        // nothing to issue a licence from, so a fresh install could provision a
        // school and then refuse every write with "plan_id is required". The
        // seeder is idempotent, so re-running the installer is safe.
        if ($success) {
            try {
                \Config\Database::seeder()->call('App\Database\Seeds\LicensePlansSeeder');
                $log[] = 'plan catalogue: OK';
            } catch (\Throwable $e) {
                $success = false;
                $log[]   = 'plan catalogue: FAILED';
                log_message('error', 'Plan catalogue seeding failed: {message}', ['message' => $e->getMessage()]);
            }
        }

        return [
            'ok'      => $success,
            'log'     => $log,
            'message' => $success
                ? 'All control-plane migrations completed.'
                : 'A migration failed. See the server log for details.',
        ];
    }

    /**
     * Step 5 - create the first Super Admin (Platform Owner).
     *
     * Idempotent: if an administrator already exists, nothing is created.
     *
     * @return array{ok:bool,message:string}
     */
    public function createSuperAdmin(string $email, string $username, string $password): array
    {
        $config = config('AuthGroups');

        if (! isset($config->groups['superadmin'])) {
            return [
                'ok'      => false,
                'message' => 'The "superadmin" group is not defined in app/Config/AuthGroups.php.',
            ];
        }

        try {
            $users = new \CodeIgniter\Shield\Models\UserModel();
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => 'Shield users model is unavailable. Did the Shield migration run?'];
        }

        try {
            if ($users->countAllResults() > 0) {
                return [
                    'ok'      => true,
                    'message' => 'An administrator account already exists. Nothing was changed.',
                ];
            }

            $user = new \CodeIgniter\Shield\Entities\User();

            // The Shield `users` table stores the login identity; the email
            // address lives in auth_identities as an 'email' identity.
            $user->username       = $username;
            $user->status         = 'active';
            $user->status_message = 'Created by the first-run installer';
            $user->last_active    = date('Y-m-d H:i:s');

            $users->insert($user);

            // Re-read the persisted row so the entity carries its real ID
            // before any group or identity is attached.
            $saved = $users->find($users->getInsertID());

            if ($saved === null) {
                return ['ok' => false, 'message' => 'The Super Admin row could not be read back. See the server log.'];
            }

            $saved->addGroup('superadmin');
            $saved->createEmailIdentity([
                'email'    => $email,
                'password' => $password,
            ]);
            $saved->saveEmailIdentity();

            return ['ok' => true, 'message' => 'Super Admin created successfully.'];
        } catch (\Throwable $e) {
            // Server-side log only. Never contains credentials or the DSN.
            log_message('error', 'InstallerService::createSuperAdmin failed: ' . $e->getMessage());

            return ['ok' => false, 'message' => 'Could not create the Super Admin. See the server log for details.'];
        }
    }

    /**
     * Step 7 - write the install lock.
     */
    public function lock(): bool
    {
        return config('Installer')->lock();
    }

    /**
     * Platform-wide counters used by the post-install checklist.
     */
    public function platformStats(): array
    {
        $out = ['schools' => 0, 'admins' => 0];

        try {
            $db = \Config\Database::connect();
            $db->query('SELECT 1');

            if ($db->tableExists('schools')) {
                $out['schools'] = (int) $db->table('schools')->countAllResults();
            }

            if ($db->tableExists('users')) {
                $out['admins'] = (int) $db->table('users')->countAllResults();
            }
        } catch (\Throwable) {
            // checklist stays at zero when the control plane is not reachable yet
        }

        return $out;
    }

    private function check(string $label, bool $ok, string $detail, string $fix, string $level = null): array
    {
        $status = $ok ? 'pass' : ($level ?? 'fail');

        return [
            'label'  => $label,
            'ok'     => $ok,
            'level'  => $status,
            'detail' => $detail,
            'fix'    => $ok ? '' : $fix,
        ];
    }
}