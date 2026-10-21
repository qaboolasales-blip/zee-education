<?php

namespace App\Filters;

use App\Policies\RolePolicy;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Super Admin (platform operator) guard.
 *
 * Answers come from RolePolicy so the rule lives in exactly one place.
 *
 * HTML AND JSON ARE ANSWERED DIFFERENTLY, ON PURPOSE
 * --------------------------------------------------
 * The same guard protects the Super Admin console (an HTML page) and the
 * platform API (machine-to-machine). A browser that is not signed in must be
 * SENT to the sign-in page; an API client that is not signed in must be TOLD
 * that it is not signed in. Answering a JSON call with a 302 to an HTML screen
 * leaves the caller guessing, so API paths are answered with a JSON 401/403 and
 * a stable error code instead.
 */
class SuperAdminFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // Shield's check() validates credentials and requires arguments.
        // "Am I signed in?" is loggedIn().
        if (! auth()->loggedIn()) {
            if ($this->isApiRequest($request)) {
                return service('response')
                    ->setStatusCode(401)
                    ->setJSON([
                        'ok'      => false,
                        'error'   => 'unauthenticated',
                        'message' => 'Sign in to use the platform API.',
                    ]);
            }

            return redirect()->to('login');
        }

        if (! RolePolicy::canUsePlatformSurface(auth()->user())) {
            if ($this->isApiRequest($request)) {
                return service('response')
                    ->setStatusCode(403)
                    ->setJSON([
                        'ok'      => false,
                        'error'   => 'super_admin_required',
                        'message' => 'Super Admin access is required for this endpoint.',
                    ]);
            }

            return redirect()->to('/')->with('error', 'Super Admin access required');
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }

    /**
     * API paths answer with JSON; everything else answers with a redirect.
     *
     * The ROUTE path is used, not the raw request path: the raw path still
     * carries the front controller's file name (index.php), so a naive
     * "starts with /api/" test would never match on a normal installation.
     */
    private function isApiRequest(RequestInterface $request): bool
    {
        $path = '/' . ltrim((string) $request->getUri()->getRoutePath(), '/');

        return str_starts_with($path, '/api/');
    }
}
