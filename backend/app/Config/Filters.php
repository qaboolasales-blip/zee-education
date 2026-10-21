<?php

namespace Config;

use CodeIgniter\Config\Filters as BaseFilters;
use CodeIgniter\Filters\Cors;
use CodeIgniter\Filters\CSRF;
use CodeIgniter\Filters\DebugToolbar;
use CodeIgniter\Filters\ForceHTTPS;
use CodeIgniter\Filters\Honeypot;
use CodeIgniter\Filters\InvalidChars;
use CodeIgniter\Filters\PageCache;
use CodeIgniter\Filters\PerformanceMetrics;
use CodeIgniter\Filters\SecureHeaders;

class Filters extends BaseFilters
{
    /**
     * Configures aliases for Filter classes to
     * make reading things nicer and simpler.
     *
     * @var array<string, class-string|list<class-string>>
     *
     * [filter_name => classname]
     * or [filter_name => [classname1, classname2, ...]]
     */
    public array $aliases = [
        'csrf'          => CSRF::class,
        'toolbar'       => DebugToolbar::class,
        'honeypot'      => Honeypot::class,
        'invalidchars'  => InvalidChars::class,
        'secureheaders' => SecureHeaders::class,
        'cors'          => Cors::class,
        'forcehttps'    => ForceHTTPS::class,
        'pagecache'     => PageCache::class,
        'performance'   => PerformanceMetrics::class,
        'role'          => \App\Filters\RoleFilter::class,
        'superadmin'    => \App\Filters\SuperAdminFilter::class,
        'installlock'   => \App\Filters\InstallLockFilter::class,
        'license'       => \App\Filters\LicenseFilter::class,
        'api_csrf'      => \App\Filters\ApiCsrfFilter::class,
        // Shield's own aliases are registered by its Registrar, but this file
        // replaces the framework defaults, so they are declared explicitly.
        'session'      => \CodeIgniter\Shield\Filters\SessionAuth::class,
        'tokens'       => \CodeIgniter\Shield\Filters\TokenAuth::class,
        'hmac'         => \CodeIgniter\Shield\Filters\HmacAuth::class,
        'chain'        => \CodeIgniter\Shield\Filters\ChainAuth::class,
        'auth-rates'   => \CodeIgniter\Shield\Filters\AuthRates::class,
        'group'        => \CodeIgniter\Shield\Filters\GroupFilter::class,
        'permission'   => \CodeIgniter\Shield\Filters\PermissionFilter::class,
        'force-reset'  => \CodeIgniter\Shield\Filters\ForcePasswordResetFilter::class,
    ];

    /**
     * List of special required filters.
     *
     * The filters listed here are special. They are applied before and after
     * other kinds of filters, and always applied even if a route does not exist.
     *
     * Filters set by default provide framework functionality. If removed,
     * those functions will no longer work.
     *
     * @see https://codeigniter.com/user_guide/incoming/filters.html#provided-filters
     *
     * @var array{before: list<string>, after: list<string>}
     */
    public array $required = [
        'before' => [
            'forcehttps', // Force Global Secure Requests
            // CORS must run in `required` so preflights (OPTIONS +
            // Access-Control-Request-Method) are answered even when no route
            // matches that method - required filters run before routing.
            // Deny-by-default + explicit allowlist only, never `*` (ADR-008,
            // G5); Config\Cors rejects wildcard entries outright.
            'cors',
            'pagecache',  // Web Page Caching
        ],
        'after' => [
            'pagecache',   // Web Page Caching
            'performance', // Performance Metrics
            'toolbar',     // Debug Toolbar
        ],
    ];

    /**
     * The debug toolbar collects the authenticated user on every request.
     * That query needs the control-plane `settings` table, which does not exist
     * before the first-run installer has created it. On a not-yet-installed
     * application the toolbar is therefore removed so the installer can boot.
     */
    public function __construct()
    {
        if (! is_file(WRITEPATH . 'install.lock')) {
            $this->required['after'] = array_values(array_diff($this->required['after'], ['toolbar']));
        }
    }

    /**
     * List of filter aliases that are always
     * applied before and after every request.
     *
     * @var array{
     *     before: array<string, array{except: list<string>|string}>|list<string>,
     *     after: array<string, array{except: list<string>|string}>|list<string>
     * }
     */
    public array $globals = [
        'before' => [
            // 'honeypot',
            // Global CSRF (RB-7 closed 2026-10-20): every live form already
            // carries csrf_field() (see quality/docs/csrf-client-audit.md).
            // Billing is EXCEPTED so its route-level api_csrf filter keeps
            // answering JSON 403 {error:csrf_required} instead of the
            // framework's HTML error page - and to avoid double-verification
            // (Security::verify() consumes the token).
            'csrf' => ['except' => ['api/admin/billing*']],
            // 'invalidchars',
        ],
        'after' => [
            // 'honeypot',
            'secureheaders', // X-Frame-Options / X-Content-Type-Options / ... (SC-3)
        ],
    ];

    /**
     * List of filter aliases that works on a
     * particular HTTP method (GET, POST, etc.).
     *
     * Example:
     * 'POST' => ['foo', 'bar']
     *
     * If you use this, you should disable auto-routing because auto-routing
     * permits any HTTP method to access a controller. Accessing the controller
     * with a method you don't expect could bypass the filter.
     *
     * @var array<string, list<string>>
     */
    public array $methods = [];

    /**
     * List of filter aliases that should run on any
     * before or after URI patterns.
     *
     * Example:
     * 'isLoggedIn' => ['before' => ['account/*', 'profiles/*']]
     *
     * @var array<string, array<string, list<string>>>
     */
    // NOTE: the `license` filter is deliberately NOT registered here as a URI
    // pattern. CodeIgniter collects pattern filters ahead of a route's own
    // filters, which would make the licence check run BEFORE `session` - and a
    // licence check with no signed-in user is a silent no-op. It is therefore
    // applied explicitly in Config/Routes.php, inside the school route groups,
    // after 'session' and 'role'. See Routes.php for the ordering comment.
    public array $filters = [];
}
