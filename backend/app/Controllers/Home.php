<?php

namespace App\Controllers;

/**
 * Entry point.
 *
 * There is deliberately no invented landing page here. The approved visual
 * design is served by the Portal controller (Super Admin) and by the School
 * surfaces once they exist. Inventing new visible UI would break the approved
 * UI lock, so this controller only routes to the correct approved surface.
 */
class Home extends BaseController
{
    public function index()
    {
        // Signed-in platform owner -> the approved Super Admin UI.
        if (auth()->loggedIn()) {
            $user = auth()->user();

            if ($user->inGroup('superadmin') || $user->inGroup('super_admin')) {
                return redirect()->to('/portal');
            }
        }

        // Not installed yet -> the first-run installer.
        if (! config('Installer')->isInstalled()) {
            return redirect()->to('/install');
        }

        // Everyone else signs in first.
        return redirect()->to('/login');
    }
}