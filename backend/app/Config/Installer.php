<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

/**
 * Installer configuration and installation-lock helpers.
 *
 * The lock lives in WRITEPATH (outside the web root and outside Git) so that
 * a deployed copy can detect whether it has already been installed without
 * touching the database first (the database may not exist yet).
 *
 * SECURITY RULES enforced here:
 *  - The installer is public ONLY while the application is not installed.
 *  - Once locked, /install is refused with 404 and the visitor is sent to login.
 *  - Database credentials are NEVER read from a browser payload. The installer
 *    only tests the connection that is already defined in the server-local .env.
 */
class Installer extends BaseConfig
{
    /**
     * Absolute path of the lock file.
     */
    public function lockFile(): string
    {
        return WRITEPATH . 'install.lock';
    }

    /**
     * Is the application already installed?
     */
    public function isInstalled(): bool
    {
        return is_file($this->lockFile());
    }

    /**
     * Create the lock file. Idempotent.
     */
    public function lock(): bool
    {
        if ($this->isInstalled()) {
            return true;
        }

        $payload = [
            'installed_at' => date('c'),
            'product'      => 'Zee Education',
            'version'      => '0.1.0',
            'installer'    => 'web',
        ];

        return file_put_contents(
            $this->lockFile(),
            json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
            LOCK_EX
        ) !== false;
    }

    /**
     * Read the lock file safely (never fatal on malformed JSON).
     */
    public function lockData(): array
    {
        if (! $this->isInstalled()) {
            return [];
        }

        $raw = @file_get_contents($this->lockFile());
        $data = $raw === false ? null : json_decode($raw, true);

        return is_array($data) ? $data : [];
    }
}