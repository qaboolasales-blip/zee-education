<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Security\Exceptions\SecurityException;

/**
 * CSRF guard for the JSON API.
 *
 * WHY THIS EXISTS INSTEAD OF THE FRAMEWORK'S csrf FILTER
 * -------------------------------------------------------
 * The framework's own CSRF filter REDIRECTS to the previous page when it
 * fails, and only in production. A JSON API has no previous page: a browser
 * would receive a 302 to an HTML screen instead of a machine-readable refusal,
 * and in development the failure would surface as an unhandled exception page.
 *
 * This filter therefore does the same verification (it calls the framework's own
 * Security service, so the rules are identical) but answers a failure with a
 * JSON 403 and a stable error code. The client's contract stays the same in
 * every environment.
 *
 * WHAT IS PROTECTED
 * -----------------
 * Only state-changing verbs are checked. GET, HEAD and OPTIONS are never
 * checked, because they must not change anything.
 *
 * WHERE IT IS APPLIED
 * -------------------
 * The framework's `csrf` filter is now enabled GLOBALLY (Filters.php
 * $globals['before'], build 5), and the billing route group is EXCEPTED from
 * it so THIS filter remains billing's only CSRF check: it preserves the JSON
 * 403 {error: csrf_required} contract documented for API clients, and it
 * avoids running Security::verify() twice per request (verification consumes
 * the token and regenerates it, so a second run would always fail). Every
 * other state-changing surface - installer, Shield auth forms, the remaining
 * APIs - is covered by the global filter.
 */
class ApiCsrfFilter implements FilterInterface
{
    /**
     * @param array|null $arguments
     *
     * @return mixed
     */
    public function before(RequestInterface $request, $arguments = null)
    {
        if (! $this->isStateChanging($request)) {
            return null;
        }

        try {
            service('security')->verify($request);
        } catch (SecurityException $e) {
            log_message('error', 'ApiCsrfFilter refused a request without a valid CSRF token: ' . $e->getMessage());

            return service('response')
                ->setStatusCode(403)
                ->setJSON([
                    'ok'      => false,
                    'error'   => 'csrf_required',
                    'message' => 'A valid CSRF token is required for this request.',
                ]);
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }

    private function isStateChanging(RequestInterface $request): bool
    {
        return in_array(strtoupper((string) $request->getMethod()), ['POST', 'PUT', 'PATCH', 'DELETE'], true);
    }
}
