<?php

namespace App\Filters;

use App\Policies\RolePolicy;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * School role guard.
 *
 * Usage:  ['filter' => 'role:school_admin,teacher']
 *
 * Two rules are enforced:
 *  1. the user must hold one of the listed groups;
 *  2. a school role must ALSO be bound to a school installation
 *     (user_school_access). A role alone never grants reach into a school
 *     database - tenant resolution stays server-side (ADR-003).
 */
class RoleFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (! auth()->loggedIn()) {
            return redirect()->to('login');
        }

        $user = auth()->user();

        if (empty($arguments)) {
            return;
        }

        $required = is_array($arguments) ? $arguments : explode(',', (string) $arguments);

        if (! RolePolicy::hasAny($user, $required)) {
            return redirect()->to('/')->with('error', 'Access denied');
        }

        $needsSchool = false;

        foreach ($required as $role) {
            if (in_array(trim($role), RolePolicy::SCHOOL_STAFF, true)) {
                $needsSchool = true;
                break;
            }
        }

        if ($needsSchool) {
            $access = new \App\Libraries\SchoolAccessService();

            if ($access->schoolForUser((int) $user->id) === null) {
                return redirect()->to('/')->with('error', 'No school is linked to this account');
            }
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}