<?php

namespace App\Controllers;

/**
 * Entry point.
 *
 * There is deliberately no invented landing page here. The approved visual
 * design is served by the Portal controller (Super Admin) and by the School
 * surfaces once they exist. Inventing new visible UI would break the approved
 * UI lock, so this controller only routes to the correct approved surface.
 *
 * INVARIANT: a signed-in user is NEVER redirected to /login from here. Shield
 * sends already-authenticated visitors of /login back to the configured
 * redirect (the site root), so bouncing authed users to /login from the root
 * is an infinite / <-> /login loop. The 2026-10-21 live smoke hit that exact
 * loop for every non-Super-Admin role; the branches below guarantee every
 * authenticated case ends on a real, stable page.
 */
class Home extends BaseController
{
    public function index()
    {
        if (auth()->loggedIn()) {
            $user = auth()->user();

            // Signed-in platform owner -> the approved Super Admin UI.
            if ($user->inGroup('superadmin') || $user->inGroup('super_admin')) {
                return redirect()->to('/portal');
            }

            // School staff with a bound school -> the approved school surface.
            if ($user->inGroup('school_admin') || $user->inGroup('teacher')) {
                $access = new \App\Libraries\SchoolAccessService();

                if ($access->schoolForUser((int) $user->id) !== null) {
                    return redirect()->to('/school');
                }
            }

            // Signed in, but no approved surface exists for this role yet
            // (parent/student accounts, or staff without a linked school).
            // /setup is the approved display-only placeholder, so the request
            // chain always terminates on a real page instead of ping-ponging
            // between / and /login.
            return redirect()->to('/setup');
        }

        // Not installed yet -> the first-run installer.
        if (! config('Installer')->isInstalled()) {
            return redirect()->to('/install');
        }

        // Everyone else signs in first.
        return redirect()->to('/login');
    }
}
