<?php

namespace App\Controllers;

/**
 * CSRF token hand-out for signed-in API clients.
 *
 * WHY THIS EXISTS
 * ---------------
 * CSRF verification needs the client to echo back the token that lives in its
 * OWN session. A browser gets that token from `csrf_field()` / `csrf_meta()`
 * rendered into a page, but the approved UI shells
 * (Views/portal/*.html) are byte-locked presentation surfaces that contain no
 * form and no fetch call - so after signing in there was nowhere to read a
 * token from, and every state-changing call was refused by the global `csrf`
 * filter with no way to succeed.
 *
 * This endpoint closes that gap for any client (the dashboard when it is
 * wired, the PWA, an operator's own tooling): it answers a GET with the
 * caller's own current token.
 *
 * WHY IT IS SAFE
 * --------------
 * A CSRF token is not a secret from its own session holder - it is a secret
 * from OTHER origins. An attacker's page can fire the GET, but the response is
 * unreadable to it: Config\Cors is deny-by-default (ADR-008), so no
 * `Access-Control-Allow-Origin` header is ever emitted for a foreign origin,
 * and the browser blocks the read. Holding the session cookie is exactly the
 * trust the token is meant to prove.
 *
 * GET is never itself CSRF-checked (verification only guards POST/PUT/PATCH/
 * DELETE), so reading a token cannot consume or rotate it.
 */
class CsrfApi extends BaseController
{
    /** GET /api/csrf */
    public function token()
    {
        try {
            return $this->response->setJSON([
                'ok'     => true,
                'name'   => csrf_token(),
                'hash'   => csrf_hash(),
                'header' => csrf_header(),
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'CsrfApi::token: ' . $e->getMessage());

            return $this->response
                ->setStatusCode(500)
                ->setJSON(['ok' => false, 'message' => 'Could not read the CSRF token']);
        }
    }
}
