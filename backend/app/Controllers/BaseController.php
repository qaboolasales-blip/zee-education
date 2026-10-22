<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\CLIRequest;
use CodeIgniter\HTTP\IncomingRequest;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Psr\Log\LoggerInterface;

/**
 * BaseController provides a convenient place for loading components
 * and performing functions that are needed by all your controllers.
 *
 * Extend this class in any new controllers:
 * ```
 *     class Home extends BaseController
 * ```
 *
 * For security, be sure to declare any new methods as protected or private.
 */
abstract class BaseController extends Controller
{
    /**
     * Be sure to declare properties for any property fetch you initialized.
     * The creation of dynamic property is deprecated in PHP 8.2.
     */

    // protected $session;

    /**
     * @param CLIRequest|IncomingRequest $request
     *
     * @return void
     */
    public function initController(RequestInterface $request, ResponseInterface $response, LoggerInterface $logger)
    {
        // Load here all helpers you want to be available in your controllers that extend BaseController.
        // Caution: Do not put the this below the parent::initController() call below.
        // $this->helpers = ['form', 'url'];

        // Caution: Do not edit this line.
        parent::initController($request, $response, $logger);

        // Preload any models, libraries, etc, here.
        // $this->session = service('session');
    }

    /**
     * Appends the shared write client to an approved UI shell.
     *
     * The shells are presentation surfaces: they carry no <form> and no fetch,
     * so their action buttons previously ended in a preview notice and could
     * never reach an endpoint. The client in app/Views/portal/zee-api.js holds
     * everything the shells must not carry themselves - it reads a fresh CSRF
     * token from GET /api/csrf before every write (verification consumes the
     * token, so one token cannot be reused) and posts JSON with the
     * X-CSRF-TOKEN header the session expects.
     *
     * It is injected here rather than edited into the template so the approved
     * markup stays exactly as it was approved.
     *
     * @return string
     */
    protected function withWriteClient(string $html): string
    {
        $path = APPPATH . 'Views/portal/zee-api.js';

        if (! is_file($path)) {
            throw new \RuntimeException('Write client missing: app/Views/portal/zee-api.js');
        }

        $script = '<script>' . (string) file_get_contents($path) . '</script>';

        if (stripos($html, '</body>') !== false) {
            return str_ireplace('</body>', $script . '</body>', $html);
        }

        return $html . $script;
    }
}
