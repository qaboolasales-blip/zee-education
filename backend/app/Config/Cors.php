<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

/**
 * Cross-Origin Resource Sharing (CORS) Configuration
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 */
class Cors extends BaseConfig
{
    /**
     * Zee Education CORS allowlist (ADR-008).
     *
     * HARD RULE: `Access-Control-Allow-Origin: *` is FORBIDDEN on
     * authenticated school, parent, student, staff and Super Admin APIs.
     * A wildcard origin combined with credentials is also rejected by
     * every browser and would be a security failure.
     *
     * Only explicit, real origins may be listed here. Local development
     * origins must be added explicitly and removed before production.
     *
     * @var list<string>
     */
    private array $configuredOrigins = [];

    /**
     * @return list<string>
     */
    private function allowedOrigins(): array
    {
        if ($this->configuredOrigins !== []) {
            return $this->configuredOrigins;
        }

        $raw = env('app.corsAllowedOrigins', '');

        if (! is_string($raw) || trim($raw) === '') {
            return [];
        }

        $origins = [];

        foreach (explode(',', $raw) as $origin) {
            $origin = trim($origin);

            // Reject a wildcard outright rather than silently allowing it.
            if ($origin === '' || $origin === '*') {
                continue;
            }

            $origins[] = $origin;
        }

        $this->configuredOrigins = $origins;

        return $this->configuredOrigins;
    }

    /**
     * The default CORS configuration.
     *
     * @var array{
     *      allowedOrigins: list<string>,
     *      allowedOriginsPatterns: list<string>,
     *      supportsCredentials: bool,
     *      allowedHeaders: list<string>,
     *      exposedHeaders: list<string>,
     *      allowedMethods: list<string>,
     *      maxAge: int,
     *  }
     */
    public array $default = [
        /**
         * Origins for the `Access-Control-Allow-Origin` header.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
         *
         * E.g.:
         *   - ['http://localhost:8080']
         *   - ['https://www.example.com']
         *
         * Resolved from the `app.corsAllowedOrigins` environment variable.
         * Defaults to an empty list, i.e. cross-origin access is denied
         * until an explicit allowlist is configured.
         */
        'allowedOrigins' => [],

        /**
         * Origin regex patterns for the `Access-Control-Allow-Origin` header.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin
         *
         * NOTE: A pattern specified here is part of a regular expression. It
         *       will be actually `#\A<pattern>\z#`.
         *
         * E.g.:
         *   - ['https://\w+\.example\.com']
         */
        'allowedOriginsPatterns' => [],

        /**
         * Weather to send the `Access-Control-Allow-Credentials` header.
         *
         * The `Access-Control-Allow-Credentials` response header tells browsers whether
         * the server allows cross-origin HTTP requests to include credentials.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Credentials
         */
        'supportsCredentials' => false,

        /**
         * Set headers to allow.
         *
         * The `Access-Control-Allow-Headers` response header is used in response to
         * a preflight request which includes the `Access-Control-Request-Headers` to
         * indicate which HTTP headers can be used during the actual request.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Headers
         */
        'allowedHeaders' => [],

        /**
         * Set headers to expose.
         *
         * The `Access-Control-Expose-Headers` response header allows a server to
         * indicate which response headers should be made available to scripts running
         * in the browser, in response to a cross-origin request.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Expose-Headers
         */
        'exposedHeaders' => [],

        /**
         * Set methods to allow.
         *
         * The `Access-Control-Allow-Methods` response header specifies the methods
         * allowed when accessing a resource in response to a preflight request.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Methods
         *
         * E.g.:
         *   - ['GET', 'POST', 'PUT', 'DELETE']
         */
        'allowedMethods' => [],

        /**
         * Set how many seconds the results of a preflight request can be cached.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age
         */
        'maxAge' => 7200,
    ];

    public function __construct()
    {
        parent::__construct();

        $rawMethods = env('app.corsAllowedMethods', '');
        $rawHeaders = env('app.corsAllowedHeaders', '');
        $rawCreds  = env('app.corsSupportsCredentials', 'false');

        $methods = [];

        foreach (explode(',', (string) $rawMethods) as $method) {
            $method = strtoupper(trim($method));

            if ($method === '' || $method === '*') {
                continue;
            }

            $methods[] = $method;
        }

        $headers = [];

        foreach (explode(',', (string) $rawHeaders) as $header) {
            $header = trim($header);

            if ($header === '' || $header === '*') {
                continue;
            }

            $headers[] = $header;
        }

        $this->default['allowedOrigins']       = $this->allowedOrigins();
        $this->default['allowedMethods']       = $methods;
        $this->default['allowedHeaders']       = $headers;
        $this->default['supportsCredentials']  = filter_var($rawCreds, FILTER_VALIDATE_BOOL);
    }
}
