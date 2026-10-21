<?php

declare(strict_types=1);

namespace Tests\Support;

/**
 * Supplies a CSRF token that matches the shared Security service the feature
 * request will verify against (required now that the global `csrf` filter runs
 * in `$globals['before']`). Pattern proven by BillingApiTest::csrfToken().
 */
trait CsrfTokenTrait
{
    /**
     * Chain before a state-changing request so it carries X-CSRF-TOKEN:
     *   $this->withCsrf()->post('/route', $data);
     */
    protected function withCsrf(): static
    {
        return $this->withHeaders(['X-CSRF-TOKEN' => $this->csrfToken()]);
    }

    /**
     * The current CSRF token from the same shared Security service the request
     * will verify against, so the pair always matches.
     */
    private function csrfToken(): string
    {
        $security = service('security');
        $hash     = $security->getHash();

        if ($hash === null || $hash === '') {
            $hash = $security->generateHash();
        }

        return $hash;
    }
}
