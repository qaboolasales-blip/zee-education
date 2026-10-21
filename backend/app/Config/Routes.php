<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */

// --- Zee Education: control-plane platform endpoints -------------------
// Phase P1 / Milestone M1.2.
// /health  : environment-safe health probe. No credentials, no detailed
//            server information, no school or user data.
// /setup   : display-only placeholder for the future per-school installer
//            wizard (Phase P3). Writes nothing.
//
// Both are intentionally unauthenticated so monitoring can reach them.
// Any future endpoint carrying tenant or learner data MUST sit behind
// authentication and server-side tenant resolution (ADR-003).
$routes->get('health', 'Health::index');
$routes->get('setup', 'Setup::index');

// ---------------------------------------------------------------------------
// First-run installer (public ONLY while the application is not installed).
// Once writable/install.lock exists, InstallLockFilter redirects /install to
// /login, so the installer never reappears after a completed installation.
// ---------------------------------------------------------------------------
$routes->group('install', ['filter' => 'installlock'], static function ($routes): void {
    $routes->get('/', 'Install::index');
    $routes->post('preflight', 'Install::stepPreflight');
    $routes->get('database', 'Install::stepDatabase');
    $routes->post('database', 'Install::runMigrations');
    $routes->get('admin', 'Install::stepAdmin');
    $routes->post('admin', 'Install::createAdmin');
});
$routes->get('install/done', 'Install::done');

// ---------------------------------------------------------------------------
// School JSON API - the write endpoints.
// Session + school role required. The school is resolved server-side from the
// signed-in session; no school id is accepted from any request (ADR-003).
//
// FILTER ORDER IS SIGNIFICANT: session -> role -> license. The licence check
// needs to know who is signed in and which school they belong to, so it must
// run after authentication. LicenseFilter only inspects write methods, so a
// school whose licence has expired can still READ everything it owns.
// ---------------------------------------------------------------------------
$routes->group('api/school', ['filter' => ['session', 'role:school_admin', 'license']], static function ($routes): void {
    $routes->get('students', 'SchoolApi::students');
    $routes->post('students', 'SchoolApi::createStudent');
    $routes->get('invoices', 'SchoolApi::invoices');
    // Staff and fees are School-Admin-only per quality/docs/role-permission-matrix.md
    // section 3 (rows "School users", "Fees - create/receipt": teacher = N).
    $routes->post('staff', 'SchoolApi::createStaff');
    $routes->post('fees/invoices', 'SchoolApi::createInvoice');
    $routes->post('fees/receipts', 'SchoolApi::recordReceipt');
});

// Attendance is available to school admin AND teacher (matrix row: teacher = C,
// assigned scope - class/subject assignment lands with the academic structure).
$routes->group('api/school', ['filter' => ['session', 'role:school_admin,teacher', 'license']], static function ($routes): void {
    $routes->post('attendance', 'SchoolApi::markAttendance');
});

// Unauthenticated monitoring probe the frontend health check already calls.
$routes->get('api/health', 'Health::index');

// ---------------------------------------------------------------------------
// Connect-your-school (QR / manual).
//
// These are UNAUTHENTICATED on purpose: the person scanning a QR is not signed
// in yet. They are safe because none of them read or write learner data - they
// only route someone to a domain. Which school the person lands in is decided
// server-side from their session afterwards, never from anything in this group.
//
// resolve() is throttled per IP and returns an identical response shape whether
// or not a school exists, so it cannot be used to discover the customer list.
// See ConnectApi for the full reasoning.
// ---------------------------------------------------------------------------
$routes->group('api/connect', static function ($routes): void {
    $routes->post('resolve', 'ConnectApi::resolve');
    $routes->get('verify', 'ConnectApi::verify');
});

// Minting an invite DOES need a signed-in school role.
$routes->group('api/connect', ['filter' => ['session', 'role:superadmin,school_admin,teacher']], static function ($routes): void {
    $routes->post('invite', 'ConnectApi::create');
});

// Renders the scannable image. Public because the scanning phone has no session
// yet; an expired or revoked token simply renders a "no longer valid" notice.
$routes->get('connect/qr', 'ConnectApi::qr');

// ---------------------------------------------------------------------------
// Super Admin platform API.
// Super Admin only. This implements the endpoint that docs/api/provisioning-api.md
// documents, which previously existed in the documentation but had no route.
// No database credentials are accepted from these requests.
// ---------------------------------------------------------------------------
$routes->group('admin/schools', ['filter' => 'superadmin'], static function ($routes): void {
    $routes->get('/', 'AdminApi::schools');
    $routes->post('/', 'AdminApi::provision');
    $routes->post('provision', 'AdminApi::provision');
});

$routes->group('api/admin', ['filter' => 'superadmin'], static function ($routes): void {
    $routes->get('schools', 'AdminApi::schools');
    $routes->post('schools', 'AdminApi::provision');
});

$routes->get('/', 'Home::index');

// Approved Super Admin UI. Super Admin only.
$routes->get('portal', 'Portal::index', ['filter' => 'superadmin']);

// Commercial billing: Super Admin only. Every state-changing route carries
// ApiCsrfFilter so a cross-site form post without a valid X-CSRF-TOKEN header
// is rejected with a JSON 403 rather than redirected to an HTML error page. See
// App/Filters/ApiCsrfFilter.php.
$routes->group('api/admin/billing', ['filter' => ['superadmin', 'api_csrf']], static function ($routes): void {
    $routes->get('summary',          'BillingApi::summary');
    $routes->get('upcomings',         'BillingApi::upcomings');
    $routes->get('invoices/(:num)',   'BillingApi::invoices/$1');
    $routes->post('issue',            'BillingApi::issue');
    $routes->post('invoice',          'BillingApi::invoice');
    $routes->post('pay',              'BillingApi::pay');
    $routes->post('void',             'BillingApi::voidInvoice');
    $routes->post('revoke',           'BillingApi::revoke');
    $routes->post('renew',            'BillingApi::renew');
});

// Approved School Dashboard UI.
// Requires an authenticated session AND a school role bound to a school.
// Tenant (school) resolution happens SERVER-SIDE from the signed-in user's
// user_school_access row - never from a browser-supplied school id (ADR-003).
$routes->get('school', 'SchoolDashboard::index', ['filter' => ['session', 'role:school_admin,teacher', 'license']]);

// Approved Mobile surface (PWA shell). Same school role as the desktop
// school surface; the school is resolved server-side. Licence is last here for
// the same ordering reason as the API groups above.
$routes->get('m', 'MobileApp::index', ['filter' => ['session', 'role:school_admin,teacher', 'license']]);

// Shield authentication routes.
//
// Shield (and the Settings module it depends on) requires the control-plane
// `settings` table to exist. Before the first-run installer has created it,
// registering those routes would crash the whole application, so they are
// registered only once the application reports itself installed.
if (config('Installer')->isInstalled()) {
    service('auth')->routes($routes);
}
