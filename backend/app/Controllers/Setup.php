<?php

namespace App\Controllers;

/**
 * GET /setup
 *
 * Placeholder page for the future per-school installer wizard.
 *
 * SCOPE (M1.2 acceptance):
 *   This is a DISPLAY-ONLY placeholder. It must NOT write any database
 *   data, must NOT create a school, must NOT create a database and must
 *   NOT accept or store credentials.
 *
 *   The real wizard is Phase P3. It will collect school branding and
 *   per-school database connection details, provision a dedicated
 *   database for that school (ADR-001), run the school migrations and
 *   write only installation metadata into the control plane.
 *
 *   Per-school credentials will be encrypted at rest and never stored
 *   in plaintext in the control plane (ADR-108).
 */
class Setup extends BaseController
{
    /**
     * Render the installer placeholder page.
     *
     * Returns the rendered HTML. This endpoint performs no database
     * write of any kind.
     */
    public function index(): string
    {
        $zee = config('ZeeEducation');

        $this->response->setContentType('text/html');

        return view('setup/index', [
            'appName'          => $zee->productName,
            'appVersion'       => $zee->appVersion,
            'timezone'         => $zee->timezone,
            'currency'         => $zee->currency,
            'supportedLocales' => $zee->supportedLanguages,
            'baseThemes'       => $zee->baseThemes,
        ]);
    }
}
