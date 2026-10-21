<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Guards the public first-run installer.
 *
 * The installer (and only the installer) is reachable while the application is
 * NOT installed. Once the lock file exists, /install stops answering and the
 * visitor is redirected to the authenticated login page.
 *
 * This is deliberately a *before* filter on the install route only, so that
 * the normal application routes keep working after installation.
 */
class InstallLockFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $installer = config('Installer');

        if (! $installer->isInstalled()) {
            return null; // installer still available
        }

        return redirect()->to('/login');
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}