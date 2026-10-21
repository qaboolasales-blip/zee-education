# CHANGELOG

All notable changes to Zee Education are recorded here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses semantic versioning.

---

## [0.1.0] — 2026-10-19 — PRE-RELEASE

### Honesty note for this build

This is a **pre-release**. There is **no Git tag** for it, and the working
tree was **not fully committed** when the package was produced. Treat it as
an early build for a controlled pilot, not as a stable tagged release.

This package was **built and verified locally but has not yet been deployed.**
The 2026-10-18 package is superseded; see the sections below for what changed.

---

### Added since the 2026-10-18 package

**Licence and billing bookkeeping (control plane)**
- Six new control-plane migrations: licence plans, school licences, licence
  invoices, licence payments, school database credentials and school invites,
  plus a starter plan seeder.
- Super Admin billing API under `/api/admin/billing` — 9 routes to issue,
  record payment on, void, revoke and renew licence invoices, list what is
  up for renewal, and read a summary. Every action writes an audit row.
- Licence keys are shown **once** at issue; only a hash is stored afterwards.
- Quotes are never counted as revenue; only settled payments are.
- **No payment gateway is included.** Money still moves outside the product
  (bank transfer or cash); this feature only records it.
- New buyer guide **`documentation/11-billing-api.md`** — the provider-facing
  reference for that API, shipped so the feature is usable from the package.

**QR school invites**
- `POST /api/connect/invite` (signed-in school role required) and the
  scannable `GET /connect/qr`. The QR carries a short-lived token only —
  no user id, no school id, no credential — and is rendered as SVG so no
  GD/Imagick extension is required on shared hosting.

**Provisioning idempotency (database-level)**
- Migration `2026-10-20_000016` adds `provisioning_jobs.idempotency_key`
  (nullable VARCHAR(191)) with a UNIQUE index, so the database itself
  rejects a duplicated job key (MySQL error 1062). Repeated rows without a
  key remain possible, and `target_database` deliberately stays non-unique
  because one school database legitimately accumulates jobs over time.
  Behaviour is pinned by `ProvisioningIdempotencyTest` (5 tests): duplicate
  key rejected, duplicate school code refused with `409` and one row
  remaining, re-provision of a completed school reporting
  `Already provisioned` without touching its state.

**Security headers, CORS wiring and cookie hardening (build 4, 2026-10-20)**
- `secureheaders` filter enabled on every response: `X-Frame-Options:
  SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-Download-Options: noopen`,
  `X-Permitted-Cross-Domain-Policies: none`, `Referrer-Policy: same-origin`.
- The CORS filter existed only as an unused alias — it is now bound in
  `Filters.php` `$required['before']`, so allowlisted origins get an explicit
  `Access-Control-Allow-Origin`, `OPTIONS` preflights are answered even for
  paths without a matching route (previously a plain `404`), and an empty
  `app.corsAllowedOrigins` still emits no CORS header at all. A wildcard
  remains impossible (rejected in configuration; verified by a 32-check live
  runtime matrix and pinned by `SecurityHeadersRuntimeTest`).
- Session/CSRF cookies now take their `Secure` attribute from `cookie.secure`
  in `.env`; the shipped template sets `cookie.secure = true` for HTTPS
  production (set `false` only for plain-HTTP local development).
- Runtime evidence recorded in the repo (`quality/docs/security-runtime-review.md`,
  pre-bundle and post-bundle matrices). Not shipped in this package.

**Global CSRF enforcement + connect-flow repair (build 5, 2026-10-20)**
- The framework `csrf` filter is now enabled globally
  (`Filters.php` `$globals['before']`): every state-changing request - the
  installer wizard, Shield's sign-in/2FA/magic-link forms, and every API
  outside billing - is rejected with `403` when it carries no valid token.
  Every shipped form already rendered the token field, so no visible flow
  changed; the billing group is *excepted* so its route-level `api_csrf`
  filter keeps answering the documented JSON `403 {error: csrf_required}`
  contract (and to avoid double verification, which would consume the token).
  Verified live by a 39-check matrix including three new polarity checks
  (token-less API POST refused, token-carrying POST reaches the controller,
  token-less login POST refused).
- Fixed `ConnectApi` throttle calls that referenced a non-existent
  `Throttler::checkTokens()` method: `POST /api/connect/resolve` and
  `GET /api/connect/verify` returned `500` on every request. The real API is
  `Throttler::check()`; throttle bucket keys are also sanitised because
  PSR-6 cache keys reject `:` (which IPv6 client addresses and the previous
  `verify:` prefix contain) - that would have 500'd any IPv6 client.
  Pinned by the new `ConnectApiTest` (3 tests) - neither controller method
  had ever been exercised by the suite.

**Documentation corrections (builds 6-8, 2026-10-20) - no code changes**
- Build 6 corrected a false "Known limitations" line: "Licence handling is
  manual; there is no activation mechanism" predated the licensing system.
  Licence plans, school licences, invoices, recorded payments and the
  Super Admin billing API all ship; payment is manual because there is no
  online payment gateway, not because activation is missing.
- Build 7 recorded that correction in this changelog and clarified
  `documentation/10-license-and-support.md`: "no online activation" means no
  external licence server, no key to type in and no phone-home call -
  school licences are still issued and activated through the control plane,
  and a school's licence state gates its access.
- Build 8 (this package) corrected stale table counts: the control plane now
  has about **21** tables (14 at the 2026-10-18 live drill; the licence
  migrations added seven - `license_plans`, `school_licenses`,
  `license_invoices`, `license_payments`, `school_db_credentials`,
  `school_invites`, `user_school_access`). Updated `database/README.md` and
  `documentation/03-first-run-setup.md`; the school database remains 22
  tables, as already listed.
- Backend suite unchanged across builds 5-8: 164 tests / 671 assertions
  (green with the global CSRF filter enabled); frontend 816/816; live probe
  39/39.

### Fixed since the 2026-10-18 package

**Packaging defects**
- The previous package predated `endroid/qr-code`, which invite rendering
  needs; the first QR would have fataled with *Class not found*. The library
  and its dependencies are now installed and shipped.
- Its optimized autoloader did not know about the newer classes; every build
  now regenerates it from the current source.
- Composer download leftovers (`vendor/composer/tmp-*.zip`) were being
  shipped. They are removed.
- The framework's own test suite is no longer shipped inside `vendor/`.

**Mobile PWA service worker**
- `public/sw.js` cached `/m`, which is rendered per signed-in user. Because
  the browser cache is one shared store per device, a cached copy could be
  shown to the **next** person who opened the app on the same phone. It was
  also simply broken: the unauthenticated install-time fetch was redirected
  to the sign-in page, so the cache held that page and served it in place of
  the app. The service worker now caches only `/manifest.json`, never any
  authenticated page or API response, and the cache version was bumped so
  any old cached entry is discarded on activation.

**Auth correctness**
- The connect invite endpoint's role check called a Shield method that does
  not exist; the call was silently swallowed and the check passed for every
  signed-in user. Role checks now go through the single role policy.
- The licence filter carried the same broken call on the school routes.
- Super Admin API routes now answer with JSON `401`/`403` instead of an HTML
  redirect when a request is refused.
- The billing API refuses a request without a CSRF token with a JSON
  `403 csrf_required` rather than an HTML error page.

**Documentation honesty**
- The security guide no longer claims CSRF protects "every form" — it now states
  the real posture (token check on the billing API; `SameSite=Lax` +
  `HttpOnly` cookie defence elsewhere).
- The troubleshooting guide's health-endpoint example now matches the real
  response, which includes version and milestone fields.
- `LICENSE.txt` and `README_FIRST.txt` no longer say the control plane holds
  *only* school and installation records; licence-billing records (plans,
  invoices, payments, invitations) are listed, and the ban on learner tables is
  unchanged.

---

### Added in the original 0.1.0 build

### Added

**First-run installer (real, not a placeholder)**
- `/install` three-step browser installer: server preflight, control-plane
  database test + migrations, first Super Admin creation.
- Server preflight checks: PHP >= 8.2, `intl` / `mbstring` / `mysqli` /
  `json` / `openssl`, writable folders, document root is `public/`,
  HTTPS base URL, database configured.
- Actionable, non-sensitive failure messages; technical detail goes to the
  server log only.
- Installer **never** accepts database credentials from a browser.
- Install lock (`writable/install.lock`); once written, `/install`
  redirects to sign-in via `InstallLockFilter`.
- Idempotent: re-running never duplicates tables or the admin account.

**Platform**
- `SchoolProvisioningService` — real implementation replacing earlier stubs.
  - verified dedicated-database reachability
  - school-local migrations applied to the school database only
  - explicit state machine: requested → validating → creating → migrated →
    seeded → completed / failed
  - retry-safe; a retry never duplicates a database or corrupts a partly
    provisioned school
- `Config\Installer` — installation-lock state stored outside the web root.
- `App\Filters\InstallLockFilter` — closes the public installer after setup.

**Security**
- CORS allow-list restricted to the real production origin (placeholder
  `example.edu` origins removed).
- `session.savePath` expression removed from the environment template; it
  broke the dotenv parser.
- Production `.env` template no longer carries the test database block, so a
  test run can never truncate production data.
- Installer protected by CSRF; no open redirect; database identifiers are
  validated against a strict allow-list and never concatenated from input.
- Every mutation attempt is logged server-side without credentials.

**Correctness fixes**
- `/health` no longer reports the database as connected when it is not. The
  framework connection is lazy, so a real query is now performed.
- Control-plane / school-database separation enforced structurally: the
  school-local migrations were moved into their own `AppSchool` namespace so
  they can never be picked up by a control-plane migration run.
- `SchoolProvisioningService` now uses `setNamespace()` before `latest()`;
  `latest()` silently ignored the namespace argument.
- School-database existence is verified through the dedicated school
  connection, not the control-plane connection.
- `SchoolsModel` now allows the `school_code` field, which was being
  silently dropped.
- Provisioning states aligned with the `installation_state` column type.
- Duplicate unique index removed on `students.admission_number` and
  `staff.employee_id`, which crashed the school migrations.
- Debug toolbar disabled while the application is not yet installed, so the
  installer can boot before the settings table exists.

### Verified on a live Hostinger deployment

- Control-plane migrations in fixed order: `CodeIgniter\Shield` →
  `CodeIgniter\Settings` → `App`.
- Control-plane database: 14 tables, **0** school-local tables.
- Pilot school provisioned into its own database: 22 school tables,
  **0** control-plane tables.
- Cross-database reads and writes denied in both directions
  (`ERROR 1142`) at the database privilege level.
- Backup and restore of both databases completed and verified.
- Installer verified end-to-end locally: preflight 14/14, migrations,
  Super Admin created, installer locked, sign-in successful.

### Known limitations in 0.1.0

- **This build has not been deployed.** It was built and verified locally
  (package verifier 35/35 clean on the build tree and on the extracted ZIP;
  164 backend tests, 671 assertions, 0 skipped). Run the smoke checklist
  before using it with real users.
- No role smoke tests were executed on the pilot deployment, because no
  owner-approved pilot accounts existed yet.
- CSRF verification is active on **every state-changing request** (global
  filter), including the sign-in form; the Super Admin billing API keeps its
  dedicated `api_csrf` filter so API clients get a JSON
  `403 {error: csrf_required}` instead of an HTML error page. Cross-site
  requests are refused at the application layer, with `SameSite=Lax` and
  `HttpOnly` session cookies as defence in depth.
- No `Content-Security-Policy` header is emitted; the views rely on inline
  scripts, so enabling CSP requires per-view nonces first.
- No Git tag; the deployment is not reproducible from a tagged commit.
- Backups are manual or cron-based; no built-in scheduled backup UI.
- Licence activation and billing are **implemented** (licence plans, school
  licences, invoices, recorded payments, Super Admin billing API) but
  **payment is manual** — there is no online payment gateway; the owner
  records payments as they are received. There is no third-party licence
  server, no activation-key entry and no phone-home call.
- No automated update mechanism.

### Not in scope (deliberately excluded)

- SMS
- Online payment gateway
- Unofficial / QR WhatsApp Web automation
- Automated WhatsApp Business API
- Native app-store packaging

[0.1.0]: https://example.invalid/zee-education/0.1.0