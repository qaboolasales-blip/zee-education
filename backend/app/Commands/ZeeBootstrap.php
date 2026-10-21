<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use App\Libraries\InstallerService;

class ZeeBootstrap extends BaseCommand
{
    protected $group = 'Zee';
    protected $name = 'zee:bootstrap';

    public function run(array $params)
    {
        $svc = new InstallerService();

        $email    = (string) ($params[0] ?? '');
        $username = (string) ($params[1] ?? '');
        $password = (string) ($params[2] ?? '');

        if ($email === '' || $username === '' || strlen($password) < 12) {
            CLI::error('usage: php spark zee:bootstrap <email> <username> <password-min-12>');

            return 1;
        }

        $result = $svc->createSuperAdmin($email, $username, $password);

        // never echo the password
        CLI::write('admin: ' . json_encode($result));

        if ($result['ok']) {
            $svc->lock();
            CLI::write('locked: ' . (config('Installer')->isInstalled() ? 'yes' : 'no'));
        }

        return $result['ok'] ? 0 : 1;
    }
}