<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

/**
 * Rotates a Super Admin password on the server.
 *
 * The password is generated on the server, written to a 0600 file OUTSIDE
 * the web root, and NEVER printed to stdout, logged or returned over HTTP.
 * The operator reads it once through the hosting File Manager.
 *
 * This rebuilds the email_password identity so the password hash is produced
 * by Shield itself - the same path the first-run installer uses.
 */
class ZeeRotatePassword extends BaseCommand
{
    protected $group = 'Zee';
    protected $name = 'zee:rotate-password';

    public function run(array $params)
    {
        $email = (string) ($params[0] ?? '');

        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            CLI::error('usage: php spark zee:rotate-password <email>');

            return 1;
        }

        $db = \Config\Database::connect();

        $identity = $db->table('auth_identities')
            ->where('type', 'email_password')
            ->where('secret', $email)
            ->get()
            ->getRow();

        if ($identity === null) {
            CLI::error('no email_password identity for that address');

            return 1;
        }

        $userId = (int) $identity->user_id;

        $model = new \CodeIgniter\Shield\Models\UserModel();
        $user  = $model->find($userId);

        if ($user === null) {
            CLI::error('user row missing');

            return 1;
        }

        $newPassword = $this->generatePassword();

        try {
            // Rebuild the identity: Shield hashes the password for us.
            $db->table('auth_identities')
                ->where('id', (int) $identity->id)
                ->delete();

            $user->createEmailIdentity([
                'email'    => $email,
                'password' => $newPassword,
            ]);

            if (! $user->saveEmailIdentity()) {
                CLI::error('could not save the new identity');

                return 1;
            }
        } catch (\Throwable $e) {
            log_message('error', 'ZeeRotatePassword failed: ' . $e->getMessage());
            CLI::error('rotation failed; see server log');

            return 1;
        }

        // Clear the force-reset flag: it is no longer needed and, with no
        // change-password page in this Shield version, it would loop.
        $db->table('auth_identities')
            ->where('user_id', $userId)
            ->where('type', 'email_password')
            ->update(['force_reset' => 0]);

        // Invalidate existing sessions for this account.
        $db->table('auth_logins')->where('user_id', $userId)->delete();

        $home = getenv('HOME');
        if ($home === false || $home === '') {
            $home = rtrim((string) $_SERVER['HOME'], '/');
        }

        $file = rtrim($home, '/') . '/superadmin_credentials.txt';

        // The sign-in URL is derived from the app's own configuration so no
        // deployment-specific host name is ever baked into the product.
        $loginUrl = rtrim((string) env('app.baseURL', 'http://localhost/'), '/') . '/login';

        $body = implode("\n", [
            'Zee Education - Super Admin credentials',
            'Generated: ' . date('c'),
            '',
            'URL      : ' . $loginUrl,
            'Email    : ' . $email,
            'Password : ' . $newPassword,
            '',
            'Sign in, change this password immediately, then delete this file.',
            '',
        ]);

        file_put_contents($file, $body);
        chmod($file, 0600);

        CLI::write('password rotated. written to ~/superadmin_credentials.txt (chmod 600)');
        CLI::write('the password was NOT printed to the terminal.');

        return 0;
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

        for ($i = 0; $i < 17; $i++) {
            $out .= $all[random_int(0, strlen($all) - 1)];
        }

        return $out;
    }
}