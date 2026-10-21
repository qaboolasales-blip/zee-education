<?php

namespace App\Controllers;

use App\Libraries\InstallerService;

/**
 * Public first-run installer.
 *
 * Available ONLY while the application is not installed. Once the lock file
 * exists, Config\Filters::$filters routes /install through InstallLockFilter,
 * which redirects to /login.
 *
 * SECURITY CONTRACT:
 *  - No database credential is ever read from a browser payload. The installer
 *    only tests the connection already present in the server-local .env.
 *  - Every mutating step is POST + CSRF protected.
 *  - Errors are shown as short, actionable, non-sensitive messages.
 */
class Install extends BaseController
{
    private InstallerService $installer;

    public function __construct()
    {
        $this->installer = new InstallerService();
    }

    /** GET /install */
    public function index(): string
    {
        if (config('Installer')->isInstalled()) {
            return redirect()->to('/login');
        }

        $summary = $this->installer->preflightSummary();

        return view('install/index', [
            'appName'    => config('ZeeEducation')->productName,
            'appVersion' => config('ZeeEducation')->appVersion,
            'preflight'  => $summary,
        ]);
    }

    /** POST /install/preflight - go to next step */
    public function stepPreflight()
    {
        if (config('Installer')->isInstalled()) {
            return redirect()->to('/login');
        }

        $summary = $this->installer->preflightSummary();

        if (! $summary['ok']) {
            return redirect()->to('/install')
                ->with('error', 'Some server requirements are still missing. Please fix the red items first.');
        }

        return redirect()->to('/install/database');
    }

    /** GET /install/database */
    public function stepDatabase(): string
    {
        if (config('Installer')->isInstalled()) {
            return redirect()->to('/login');
        }

        return view('install/database', [
            'appName'    => config('ZeeEducation')->productName,
            'connection' => $this->installer->testDatabase(),
        ]);
    }

    /** POST /install/database - run the migration sequence */
    public function runMigrations()
    {
        if (config('Installer')->isInstalled()) {
            return redirect()->to('/login');
        }

        $connection = $this->installer->testDatabase();

        if (! $connection['ok']) {
            return redirect()->to('/install/database')
                ->with('error', $connection['message']);
        }

        $result = $this->installer->migrate();

        if (! $result['ok']) {
            return redirect()->to('/install/database')
                ->with('error', $result['message']);
        }

        return redirect()->to('/install/admin');
    }

    /** GET /install/admin */
    public function stepAdmin(): string
    {
        if (config('Installer')->isInstalled()) {
            return redirect()->to('/login');
        }

        return view('install/admin', [
            'appName'    => config('ZeeEducation')->productName,
            'connection' => $this->installer->testDatabase(),
        ]);
    }

    /**
     * POST /install/admin - create the first Super Admin and finish.
     */
    public function createAdmin()
    {
        if (config('Installer')->isInstalled()) {
            return redirect()->to('/login');
        }

        $email    = trim((string) $this->request->getPost('email'));
        $username = trim((string) $this->request->getPost('username'));
        $password = (string) $this->request->getPost('password');
        $confirm  = (string) $this->request->getPost('password_confirm');

        $errors = $this->validateAdmin($email, $username, $password, $confirm);

        if ($errors !== []) {
            return redirect()->to('/install/admin')
                ->withInput()
                ->with('error', implode(' ', $errors));
        }

        $result = $this->installer->createSuperAdmin($email, $username, $password);

        if (! $result['ok']) {
            return redirect()->to('/install/admin')
                ->withInput()
                ->with('error', $result['message']);
        }

        $this->installer->lock();

        return redirect()->to('/install/done');
    }

    /** GET /install/done */
    public function done(): string
    {
        return view('install/done', [
            'appName' => config('ZeeEducation')->productName,
        ]);
    }

    /**
     * @return list<string>
     */
    private function validateAdmin(string $email, string $username, string $password, string $confirm): array
    {
        $errors = [];

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Please enter a valid email address.';
        }

        if (preg_match('/^[a-zA-Z0-9._-]{3,32}$/', $username) !== 1) {
            $errors[] = 'Username may use letters, numbers, dot, underscore and dash (3-32 characters).';
        }

        if (strlen($password) < 12) {
            $errors[] = 'The password must be at least 12 characters long.';
        }

        if (! preg_match('/[A-Z]/', $password) || ! preg_match('/[a-z]/', $password) || ! preg_match('/\d/', $password)) {
            $errors[] = 'The password must contain an uppercase letter, a lowercase letter and a number.';
        }

        if ($password !== $confirm) {
            $errors[] = 'The two passwords do not match.';
        }

        return $errors;
    }
}