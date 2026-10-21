<?php

namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

/**
 * GET /health
 *
 * Environment-safe health probe for the Super Admin control plane.
 *
 * SECURITY CONTRACT (M1.2 acceptance):
 *   This endpoint MUST NOT expose database credentials or detailed
 *   server information. Deliberately NOT returned:
 *     - database host, port, name, username, password, DSN
 *     - PHP version, loaded extensions
 *     - MySQL/MariaDB version or server status details
 *     - filesystem paths, document root, hostname
 *     - framework/environment internals beyond the environment name
 *
 *   Only values defined in Config\ZeeEducation are disclosed, so the
 *   response surface stays small and reviewable.
 *
 *   This endpoint is intentionally UNAUTHENTICATED so that monitoring
 *   and load balancers can call it. It therefore carries NO school data,
 *   NO user data and NO provisioning detail.
 */
class Health extends BaseController
{
    /**
     * Health payload.
     */
    public function index(): ResponseInterface
    {
        $zee = config('ZeeEducation');

        $database = $this->databaseState();

        $payload = [
            'status'      => $database === 'connected' ? 'ok' : 'degraded',
            'app'         => $zee->productName,
            'plane'       => $zee->plane,
            'environment' => env('CI_ENVIRONMENT', 'production'),
            'version'     => $zee->appVersion,
            'milestone'   => $zee->milestone,
            'database'    => $database,
            'time'        => date(DATE_ATOM),
            'timezone'    => $zee->timezone,
            'currency'    => $zee->currency,
        ];

        return $this->response
            ->setStatusCode(200)
            ->setJSON($payload);
    }

    /**
     * Report database reachability as a bare state string.
     *
     * No connection details, no driver message, no exception text.
     * Failures are swallowed deliberately so this endpoint cannot be
     * used to fingerprint the database.
     */
    private function databaseState(): string
    {
        try {
            $db = \Config\Database::connect();

            if ($db === null) {
                return 'not_configured';
            }

            // Connect lazily: merely obtaining the Connection object does NOT
            // authenticate. A real round-trip is required, otherwise this
            // endpoint reports "connected" for a database that rejects us.
            $db->query('SELECT 1');

            return 'connected';
        } catch (Throwable) {
            return 'unreachable';
        }
    }
}
