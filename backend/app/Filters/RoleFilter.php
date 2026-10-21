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
        $isApi = $this->isApiRequest($request);

        if (! auth()->loggedIn()) {
            if ($isApi) {
                return service('response')
                    ->setStatusCode(401)
                    ->setJSON([
                        'ok'      => false,
                        'error'   => 'unauthenticated',
                        'message' => 'Sign in to use this endpoint.',
                    ]);
            }

            return redirect()->to('login');
        }

        $user = auth()->user();

        if (empty($arguments)) {
            return;
        }

        $required = is_array($arguments) ? $arguments : explode(',', (string) $arguments);

        if (! RolePolicy::hasAny($user, $required)) {
            if ($isApi) {
                return service('response')
                    ->setStatusCode(403)
                    ->setJSON([
                        'ok'      => false,
                        'error'   => 'role_required',
                        'message' => 'Your role cannot access this endpoint.',
                    ]);
            }

            return redirect()->to('/')->with('error', 'Access denied');
        }

        $needsSchool = false;

        foreach ($required as $role) {
            if (in_array(trim($role), RolePolicy::SCHOOL_STAFF, true)) {
                $needsSchool = true;
                break;
            }
        }

        // A Super Admin reaches this point only when the route explicitly lists
        // `superadmin` in its role set (otherwise hasAny() already refused above).
        // Platform operators have no school by design, so the school-link rule
        // must not be applied to them - the route said which roles may proceed.
        if ($needsSchool && ! RolePolicy::isSuperAdmin($user)) {
            $access = new \App\Libraries\SchoolAccessService();

            if ($access->schoolForUser((int) $user->id) === null) {
                if ($isApi) {
                    return service('response')
                        ->setStatusCode(403)
                        ->setJSON([
                            'ok'      => false,
                            'error'   => 'school_not_linked',
                            'message' => 'No school is linked to this account.',
                        ]);
                }

                return redirect()->to('/')->with('error', 'No school is linked to this account');
            }
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }

    /**
     * API paths are answered with JSON 401/403; everything else gets the
     * browser's redirect. The ROUTE path is used (not the raw request path),
     * matching SuperAdminFilter, so front-controller prefixes cannot defeat it.
     */
    private function isApiRequest(RequestInterface $request): bool
    {
        $path = '/' . ltrim((string) $request->getUri()->getRoutePath(), '/');

        return str_starts_with($path, '/api/');
    }
}