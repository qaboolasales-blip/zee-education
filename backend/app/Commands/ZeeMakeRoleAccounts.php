<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use App\Libraries\SchoolAccessService;

/**
 * Creates the five pilot role accounts and binds each school role to the
 * pilot school installation.
 *
 * SECURITY:
 *  - Passwords are generated ON THE SERVER and written to a 0600 file outside
 *    the web root. They are never printed, logged or returned over HTTP.
 *  - Account data comes from the command line of the person with server
 *    access, never from a browser payload.
 *  - Each school role is bound to exactly one school via
 *    user_school_access, so tenant resolution stays server-side.
 */
class ZeeMakeRoleAccounts extends BaseCommand
{
    protected $group = 'Zee';
    protected $name = 'zee:make-role-accounts';

    public function run(array $params)
    {
        $db = \Config\Database::connect();

        // 1) migration must have run
        if (! $db->tableExists('user_school_access')) {
            CLI::error('run the App migrations first (user_school_access is missing)');

            return 1;
        }

        // 2) pick the pilot school (installation metadata only)
        $school = $db->table('schools')->orderBy('id', 'ASC')->get()->getRow();

        if ($school === null) {
            CLI::error('no school record found in the control plane');

            return 1;
        }

        CLI::write('school: ' . $school->name . ' (id=' . $school->id . ', code=' . $school->school_code . ')');

        // 3) create one account per role
        $roles = [
            ['school_admin', 'School Admin'],
            ['teacher', 'Teacher'],
            ['parent', 'Parent'],
            ['student', 'Student'],
        ];

        $created = [];

        foreach ($roles as [$group, $label]) {
            $result = $this->ensureAccount($group, $label, $school->id, $created);

            CLI::write($group . ': ' . $result);
        }

        // 4) write credentials to a protected file
        if ($created !== []) {
            $home = getenv('HOME');

            if ($home === false || $home === '') {
                $home = $_SERVER['HOME'] ?? getenv('USERPROFILE') ?: sys_get_temp_dir();
            }

            $file = rtrim((string) $home, '/\\') . DIRECTORY_SEPARATOR . 'role_accounts_credentials.txt';

            $body = "Zee Education - pilot role accounts\n";
            $body .= 'Generated: ' . date('c') . "\n\n";

            foreach ($created as $row) {
                $body .= sprintf("Role    : %s\nEmail   : %s\nPassword: %s\n\n", $row['role'], $row['email'], $row['password']);
            }

            $body .= "Sign in as each account, change the password, then delete this file.\n";

            file_put_contents($file, $body);
            chmod($file, 0600);

            CLI::write('credentials written to ~/role_accounts_credentials.txt (chmod 600)');
            CLI::write('passwords were NOT printed to the terminal.');
        } else {
            CLI::write('all role accounts already exist - nothing changed');
        }

        return 0;
    }

    /**
     * @param list<array<string,string>> $created
     */
    private function ensureAccount(string $group, string $label, int $schoolId, array &$created): string
    {
        $db       = \Config\Database::connect();
        $username = strtolower($group);
        $email    = $username . '@pilot.local';

        // already exists?
        $existing = $db->table('users')->where('username', $username)->get()->getRow();

        if ($existing !== null) {
            $this->bindSchool((int) $existing->id, $schoolId);

            return 'already exists (id=' . $existing->id . ')';
        }

        $password = $this->generatePassword();

        $model = new \CodeIgniter\Shield\Models\UserModel();
        $user  = new \CodeIgniter\Shield\Entities\User();

        $user->username = $username;
        $user->status   = 'active';
        $user->last_active = date('Y-m-d H:i:s');

        $model->insert($user);

        $saved = $model->find($model->getInsertID());

        if ($saved === null) {
            return 'FAILED to create';
        }

        $saved->addGroup($group);
        $saved->createEmailIdentity(['email' => $email, 'password' => $password]);
        $saved->saveEmailIdentity();

        $this->bindSchool((int) $saved->id, $schoolId);

        $created[] = ['role' => $label, 'email' => $email, 'password' => $password];

        return 'created (id=' . $saved->id . ')';
    }

    private function bindSchool(int $userId, int $schoolId): void
    {
        $db = \Config\Database::connect();

        $already = $db->table('user_school_access')->where('user_id', $userId)->countAllResults();

        if ($already > 0) {
            return;
        }

        $db->table('user_school_access')->insert([
            'user_id'    => $userId,
            'school_id'  => $schoolId,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    private function generatePassword(): string
    {
        $upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        $lower = 'abcdefghijkmnpqrstuvwxyz';
        $digit = '23456789';
        $all   = $upper . $lower . $digit . '!@#$%^&*?';

        $out = $upper[random_int(0, strlen($upper) - 1)]
            . $lower[random_int(0, strlen($lower) - 1)]
            . $digit[random_int(0, strlen($digit) - 1)];

        for ($i = 0; $i < 13; $i++) {
            $out .= $all[random_int(0, strlen($all) - 1)];
        }

        return $out;
    }
}