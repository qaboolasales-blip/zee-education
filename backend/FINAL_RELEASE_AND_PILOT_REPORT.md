# FINAL RELEASE AND PILOT REPORT

## FINAL_RELEASE_STATUS: BLOCKED


## Verification evidence (real environment)
- Node: v24.17.0, npm 12.0.2
- Frontend UI lock: PASS (3/3 reference files unchanged)
- Frontend tests: PASS (816/816 — see "Frontend blocker resolution" below for the earlier failure)
- Backend phpunit: PASS (**169 tests, 687 assertions, 0 skipped, 0 failures** — current;
  earlier phases recorded 62/145, 69/175, 150/603, 155/621, 161/653 and 164/673 in their
  own sections below; +5 tests = `HomeLandingTest`, the regression guard for the
  post-login redirect loop found by the 2026-10-21 live smoke)
- Package (build 10, 2026-10-21): first shipped-code change since build 5 — the root-route
  redirect-loop fix (commit `77739b6b221b321502c9511adb36ecff8cde8366`; `git describe` =
  `v0.1.0-pre-2-g77739b6`, so the manifest records `git_tag: null` — the annotated tag
  `v0.1.0-pre` still points at build 9's commit `b1267df…`, and a scan of every shipped
  `.txt/.md/.html` found 0 "no Git tag" claims); build-package.ps1 verifier 35/35 clean on
  build tree and inside the extracted ZIP; ZIP SHA-256
  `c31ad281a916ae5728f4d36716c1aea2b5abc41b8075dd48696420f7d86dc5a8`
  (build 9's `46f5a4877618e3d0ae253781b1e34219d8dd67a02f0b2084d5e90d23db99186c` superseded,
  kept as `*.zip.bak-20261021-094201`; build 8 as `*.zip.bak-20261021-075532`;
  build 7 as `*.zip.bak-20261020-183756`; builds 6/5/4/3/2 as `*.zip.bak-20261020-093116` /
  `-085852` / `-083633` / `-052205` / `-025056`; build 1 as `*.zip.bak-20261019-224837`).
  Builds 6-9 were documentation/tag-only successors to build 5. **Build 10 is deployed to
  live Hostinger and passed the full live re-smoke** (see `PILOT_DEPLOYMENT_REPORT.md`:
  all five roles land on their approved surface, licence Active, student write verified
  with SQL cleanup, control plane untouched).

## Git commit hash
77739b6 (build-10 head; tag `v0.1.0-pre` at `b1267df`, 2 commits back)

## Test/build/migration commands and results
- php vendor/bin/phpunit --no-coverage: 62 tests, 145 assertions, 1 skipped, 0 failures
- composer audit: No security vulnerability advisories found
- Migration execution against synthetic DB: not performed (no DB configured); migration files present.

## Three approved UI HTML hash results
- No reference UI HTML files modified; hashes unchanged (no UI files touched during backend work).

## Backup/restore drill result
- Not executed in this environment; runbook exists at ops/backup-restore-runbook.md.

## Remaining blockers/warnings/deferred tasks
- Migration execution against synthetic DB not performed (environment blocker).
- 1 skipped test (environment-dependent).
- Frontend/UI binding and QA visual regression not performed by backend agent.



## Frontend blocker resolution
- Failing test: has no model layer for school-local data in the control plane (provisioning-gate.test.js & auth-contract-gate.test.js)
- Root cause: outdated test expectation; new school-local models added legitimately.
- Fix: updated expected SchoolLocal model list.
- Frontend tests: PASS (816/816)
- UI lock: PASS (3/3)

### Second frontend-gate round (2026-10-20, same session as build 2)
- After the licence/billing/connect work landed, 5 frontend gate tests went red —
  all of them stale Batch-C-era snapshots, not product defects:
  - two route-surface snapshots still asserted `['health','setup','/']` while
    Routes.php now legitimately declares the 39-route surface;
  - the SchoolLocal snapshot still expected `FeeModel.php` after the fees split
    into `FeeInvoiceModel` + `FeeReceiptModel`;
  - the control-plane migration scan false-positived on
    `create_user_school_access` (the ADR-003 access map, matched by the
    `create_user` substring);
  - `core/provisioning/contracts/pending-provisioning-contract.js` still claimed
    "no endpoint is published" for registry/provisioning/QR/connection-code.
- Fix: snapshots updated to the current surface; the migration scan keeps its
  singular alternations and allowlists exactly that one file (asserted present so
  the exception cannot rot); the contract ledger now records those four
  capabilities as PUBLISHED with their real method/path, keeps `plan-catalogue`
  correctly uncontracted (table exists, no endpoint), pins request/response
  schemas to `null` forever, and keeps `PROVISIONING_INTEGRATION_AUTHORIZED`
  `false` — the frontend still binds none of it.
- Result: `npm run check` (UI lock + tests) **816 tests, 816 pass, 0 fail**;
  reference UI hashes 3/3 unchanged.


## Database migration attempt
- Shield version: v1.4.1
- Fixed root cause: App migration incorrectly inserted into nonexistent Shield table `auth_groups`; Shield stores groups in config, not DB. Registered `CodeIgniter\Shield` namespace and removed invalid insert; added platform groups to Config/AuthGroups.
- Commands: php spark migrate --all
- Result: Migrations complete (clean synthetic DB recreated; Shield migrations ran first, then App migrations)
- Changed files: app/Config/Autoload.php, app/Database/Migrations/2026-10-18_000005_create_platform_roles.php, app/Database/Migrations/school_local/2026-10-18_100003_create_people_enrollment.php, app/Config/AuthGroups.php
- Tests: php vendor/bin/phpunit --no-coverage => 62 tests, 145 assertions, 1 skipped, 0 failures
- Status: BLOCKED (provisioning/isolation/backup-restore still not evidenced)


## Production pilot deployment (2026-10-18)
- Domain: mediumaquamarine-grouse-335108.hostingersite.com (Hostinger). HTTP 200, /health ok.
- Shield version: v1.4.1. Control-plane migration order proven on production: CodeIgniter\Shield -> CodeIgniter\Settings -> App. "Migrations complete."
- Changed files this session: app/Config/Autoload.php (CodeIgniter\Shield + AppSchool namespaces), app/Controllers/Health.php (real DB round-trip), app/Libraries/SchoolProvisioningService.php (real implementation), app/SchoolLocal/Database/Migrations/* (moved out of control-plane folder), app/Database/Migrations/2026-10-18_000005_create_platform_roles.php, app/Database/Migrations/school_local -> removed, tests/Feature/*.php (path updates).
- Critical fix: ADR-001 violation - control-plane DB had school-local tables because `migrate --all` recursed into app/Database/Migrations/school_local. School-local migrations now live in their own AppSchool namespace. Production control plane now contains 0 school-local tables.
- Tests: php vendor/bin/phpunit --no-coverage => 62 tests, 145 assertions, 1 skipped, 0 failures.
- UI hashes: 3/3 unchanged.
- Backups: ~/zee_backups/control_20261018-120930.sql (outside web root).
- BLOCKER: dedicated school database has no usable credentials. Available MySQL user holds rights only on u121986687_zee_control; CREATE DATABASE yields no grant (shared-hosting limitation). Pilot school provisioning, isolation tests and role smoke tests therefore not executed.
- See PILOT_DEPLOYMENT_REPORT.md at project root for full evidence.

## Production pilot deployment - ACHIEVED (2026-10-18)
- Domain: mediumaquamarine-grouse-335108.hostingersite.com - /, /health, /setup, /login all HTTP 200
- Shield version v1.4.1; control-plane migration order proven: CodeIgniter\Shield -> CodeIgniter\Settings -> App
- Control-plane DB u121986687_zee_control: 14 tables, 0 school-local tables (ADR-001 satisfied)
- Pilot school provisioned through the REAL SchoolProvisioningService:
  control record id=3 "Pilot School 001" code=pilot1 state=completed
  dedicated DB u121986687_zee_school_1: 22 school-local tables, separate credentials
- Isolation proven: both directions denied with ERROR 1142; 0 schema overlap; school data readable only
  through the school connection
- Backup + restore drill executed on both databases; dumps in ~/zee_backups/ (outside web root);
  both restored and verified (14 / 22 tables, pilot record and marker data intact, isolation preserved)
- Tests: 62 tests, 145 assertions, 1 skipped, 0 failures
- UI hashes: 3/3 unchanged
- Remaining blocker: no owner-approved pilot school identity and no role accounts exist yet, so
  Super Admin / School Admin / Teacher / Parent / Student smoke tests are UNVERIFIED.
- Full evidence: PILOT_DEPLOYMENT_REPORT.md at project root

## Approved UI live + credential rotation (2026-10-19)
- `/` now routes to the approved Super Admin surface instead of the CodeIgniter welcome page.
- `/portal` serves the approved design with real control-plane data. Reference UI files were
  never modified; only a separate runtime copy was created. UI hashes 3/3 unchanged.
- Fixed: filters used auth()->check() (requires args in Shield v1.4) - now loggedIn().
- Fixed: Super Admin group name mismatch (superadmin vs super_admin).
- Fixed: missing Shield filter aliases in Config/Filters.php.
- Fixed: server .env carried `session.savePath = null`, causing HTTP 500s.
- A Super Admin password that had been exposed in chat was rotated. The old password is now
  rejected; the new one was written only to a 0600 server file and never printed.
- Tests: 62 tests, 146 assertions, 1 skipped, 0 failures.
- Still BLOCKED: role smoke tests never executed; SSH password still exposed.
  (Git tag: closed 2026-10-21 — annotated tag `v0.1.0-pre` pushed, build 9 rebuilt
  from it.)

## Deep scan fixes (2026-10-19)
- Write endpoints added under /api/school (students, staff, attendance, fees, receipts).
- /api/health added; POST /admin/schools/provision now routed (was documented only).
- Provisioning seeds 7 safe defaults; idempotency proven.
- RolePolicy wired into both filters; RoleAccessTest added (7 tests / 29 assertions).
- Mobile PWA shipped (manifest.json, sw.js, /m surface).
- Docs corrected; openapi-v0.md now lists all 21 implemented routes.
- All demo data removed from every shipped surface.
- Verification: role 12/12, write API 5/5, mobile 6/6, UI lock 3/3, tests 69/175.
- Package rebuilt: release/Zee_Education_v0.1.0_Hostinger_Installer.zip
  SHA256 06fe531f61f64079d7a11bb1564d6c3a81e40976b37bf6de4f8c930a16d21de5
  (this build is superseded; the current package is the 2026-10-19 build in the
  "Licence, billing and package rebuild" section below)

## Licence, billing and package rebuild (2026-10-19) — Phase 6

### Licence enforcement test isolation (fixed)
- `LicenseEnforcementTest` had 2 failing tests. Root cause: CodeIgniter's `auth()` shared
  service caches the resolved user across PHPUnit methods, so a `school_admin` identity set
  in one test was still visible in the next.
- Fixed in `tearDown()` with `Services::resetSingle('auth')` + `$_SESSION = []`, and the
  tests now sign in with `actingAs()` instead of `withSession()`.
- Result: 11/11 licence tests pass (was 9/11).

### Super Admin billing API (new)
- `app/Controllers/BillingApi.php` — 9 routes under `/api/admin/billing`
  (summary, upcomings, invoices, issue, invoice, pay, void, revoke, renew).
- Route group filter chain: `superadmin` → `api_csrf`. No request reaches controller code
  without a signed-in platform operator AND a valid CSRF token.
- `app/Filters/ApiCsrfFilter.php` — verifies through the framework's own `Security` service
  (identical rules) but answers a failure with JSON `403 {"error":"csrf_required"}`
  instead of an HTML redirect, because a JSON API has no previous page.
- Defence-in-depth on every endpoint, not just the filter: super admin check in the filter,
  re-checked in the controller; invoice state machine refuses paying a void invoice,
  voiding a paid one, revoking without a reason, renewing an unsettled invoice;
  licence keys are returned exactly once at issue with only the hash stored;
  quotes are never counted as revenue; every action writes an audit row.
- Contract: `backend/docs/api/billing-api.md` (repository only, not shipped in the package).

### Auth correctness fixes
- `LicenseFilter.php` and `ConnectApi.php` called `Auth::getUserGroups()`, a method that
  does not exist in Shield v1.4 — it would have fataled on the school route chain. Both now
  use `RolePolicy::isSuperAdmin(auth()->user())`.
- `SuperAdminFilter` returns JSON 401/403 for API requests (detected via `is_api_request()`
  + `getRoutePath()`) instead of an HTML redirect.
- **Silent auth bypass fixed in `ConnectApi::create`:** the role check called
  `auth()->getUserGroups()`, a method Shield v1.4 does not have. `Auth::__call()` swallows
  unknown calls and returns null, so the check passed for **every** signed-in user. It now
  goes through `RolePolicy::hasAny()` / `RolePolicy::isSuperAdmin()` — the single source of
  truth — with `ConnectTest` covering it (15 tests). `LicenseFilter.php` had the same broken
  call on the school route chain.

### CSRF posture — evidence
| Surface | State-changing routes | Protection |
|---|---|---|
| `/api/admin/billing/*` (9) | 6 POST | **`api_csrf` filter verified** — tested: no token → `403 csrf_required` (kept as the route's only check; JSON contract; global filter excepts this group) |
| `/api/school/*` writes | 5 POST | **global `csrf` filter** (build 5) — token-less write → `403 SecurityException::forDisallowedAction` (probe `I1`) |
| `/admin/schools`, `/admin/schools/provision` | 2 POST | **global `csrf` filter** (build 5) + session + `superadmin` filter |
| Shield login/register/magic-link forms | POST | **global `csrf` filter** (build 5) — views already render `csrf_field()`; token-less `POST /login` → `403` (probe `I3`); normal logins still `303` |
Defence in depth on top: the session cookie is `httponly` and `SameSite=Lax`
(`Config/Cookie.php`), so browsers do not attach it to cross-site POSTs at all.
**Gap closed 2026-10-20 (build-5 CSRF round):** the earlier "enable `api_csrf` (or the
global `csrf` filter) before calling the CSRF story complete" action was executed —
client audit (`quality/docs/csrf-client-audit.md`) proved no runtime client breaks
(portal/PWA shells have zero mutating client code), the global filter went in with the
billing `except`, the suite was retrofitted (9 HTTP write calls via `CsrfTokenTrait`)
and is green at 164/671 with the filter on, and the live probe verifies polarity
(`I1`/`I2`/`I3`, 39/39). Remaining CSRF-adjacent hardening is only SC-2
(`tokenRandomize=false`) and SC-6 (CSP nonces) — both recorded limitations.

### PWA service worker (fixed)
- `public/sw.js` cached `/m`, which is rendered per signed-in user. The Cache API is a
  single shared store per device, so a cached copy would be served to the next person who
  opened the app on the same phone — one school's learners shown to another school. It was
  also broken: the install-time fetch of `/m` is unauthenticated, so the cache held the
  sign-in page and then served it in place of the app.
- Shell is now `/manifest.json` only; cache version bumped `zee-shell-v1` → `zee-shell-v2`
  so any v1 cache holding a sign-in page is purged on activation. No authenticated page and
  no API response is ever cached.

### Package rebuilt (build 2)
- Produced by `release/build-package.ps1`; previous ZIP kept as `*.zip.bak-20261019-224837`.
- **ZIP SHA-256 `43ee1daee45fdce6d1567d52f278910e84c2299001f0ff4c7ab98ba82805cbf8`** (3.91 MB,
  1,307 files). `release/SHA256SUMS.txt` regenerated and matches.
- Two real defects in the previous package found and fixed by this rebuild: it was missing
  the production packages `endroid/qr-code` + transitive (would have fataled on the first
  invite QR code), and its optimized autoloader did not know about the new classes
  (`BillingApi`, `ApiCsrfFilter`, `LicenseService`, `QrRenderer`).
- `verify-package.php`: **35 checks, 0 failures, 0 warnings**, run on the build tree and
  again on the extracted ZIP.
- Reference UI hashes 3/3 unchanged; no synthetic pilot data, no `.env`, no private keys,
  no hosting account ids in the shipped code.
- Backend tests at build-2 time: **150 tests, 603 assertions, 0 skipped, 0 failures**
  (build 3 below: 155/621, after RB-4 landed).

### Release blocker RB-4 closed (2026-10-20, second round)
- **Schema:** migration `2026-10-20_000016_add_provisioning_jobs_idempotency_key.php`
  adds `provisioning_jobs.idempotency_key VARCHAR(191) NULL` with UNIQUE index
  `uq_provisioning_jobs_idempotency_key`, applied via explicit `ALTER TABLE`
  (avoids the CREATE-TIME unique-next-to-AUTO_INCREMENT quirk this MySQL build
  rejects; migrations 000009/000010 document it, 000007 proves ALTER-time unique
  works). Applied to `zee_education_control` via `php spark migrate` and to
  `zee_education_control_test` (the phpunit `ENVIRONMENT=testing` database) with
  identical schema and history rows.
- **Design note:** uniqueness went on the caller-supplied key, NOT on
  `(school_id, type)` or `target_database` — one school database legitimately
  accumulates many jobs over time (install today, migrate every release), so a
  database-name unique would forbid normal history. Multiple NULL keys remain
  allowed (MySQL unique-index semantics); duplicate keys are rejected with
  error 1062.
- **Behaviour:** new `ProvisioningIdempotencyTest` (5 tests / 18 assertions):
  index exists with `Non_unique=0`; duplicate key insert raises MySQL "Duplicate"
  and exactly one row survives; NULL-key rows are not blocked; duplicate
  `school_code` POST returns `409 That school code is already in use` with one
  school row remaining; re-provisioning a `completed` school returns
  `Already provisioned` without changing its state.
- Records updated: `quality/docs/defect-release-blocker-report.md` (RB-4 →
  CLOSED with evidence), `PROJECT_STATUS_FOR_OWNER.md` (blocker 7 removed),
  `quality/tests/provisioning-retry-idempotency-review.md` §6 (R-2 closure +
  deliberate departure from rec #2), `quality/tests/provisioning-abuse-failure-matrix.md`
  §5 (dated correction), `backend/docs/provisioning-state-machine.md`,
  `backend/docs/control-plane-data-boundary.md`.
- Suite after the change: **155 tests, 621 assertions, 0 skipped** (was 150/603).

### Package rebuilt again (build 3, 2026-10-20)
- Produced by the same `release/build-package.ps1`; build 2's ZIP kept as
  `*.zip.bak-20261020-025056`, build 1 as `*.zip.bak-20261019-224837`.
- **ZIP SHA-256 `b2fae3645c92e1c2c935b4fba46f42d70025dd8dd306f40ced32454e27a1efc0`**
  (4,103,548 bytes / 3.91 MB, **1,308 files**, 13,012,841 bytes uncompressed).
  `release/SHA256SUMS.txt` regenerated and matches.
- Carries migration 000016 and the corrected shipped `CHANGELOG.md` (new RB-4
  bullet; stale "verifier 34/34 + 150 backend tests" limitation corrected to
  35/35 + 155/621).
- `verify-package.php`: **35 checks, 0 failures, 0 warnings**, build tree and
  extracted ZIP. Shipped `documentation/11-billing-api.md` byte-identical to its
  source (SHA-256 `ac9123e9…`). Reference UI hashes 3/3 unchanged.

### Release gates re-evaluated (ops/release-gates.md, 2026-10-20)
- All eleven pilot gates re-read against current evidence. **GO:** G3 (byte-level UI
  lock, 3/3) and G4 (no secrets/real data, repo + package scope, verifier 35/35).
  The stale 2026-10-17 reasons on G6–G9 ("no auth / no provisioning / no licensing /
  no drill exists") were corrected — the implementation now exists and is locally
  tested — but each still fails its evidence bar: live T-matrix execution (G6, G7),
  owner RPO/RTO sign-off (G9, G10), CI runtime pin (G1, G2), runtime CORS asserts (G5),
  pixel gate (G3b). *(Update 2026-10-21: G1, G2, G5 already GO with remote runs/runtime
  matrix; G8 cleared the same day by a live T-25..T-27 execution — see the status
  section at the end of this file.)*
- Overall pilot verdict in that document: **NO-GO**, consistent with
  `FINAL_RELEASE_STATUS: BLOCKED`.
- Follow-up later the same day: `.github/workflows/ci.yml` was authored (PHP 8.3
  extension-pinned, MySQL 8.0 service, Node 24 job) and its full backend recipe was
  validated locally from empty databases (`zee_ci` + separate `zee_ci_school`:
  20 control migrations, plan seed, 8 AppSchool migrations, `OK (155 tests, 621
  assertions)`, control/test histories untouched). Update 2026-10-21: the repository
  was pushed to `github.com/qaboolasales-blip/zee-education` (branch `main`, content
  commit `8560225` + CI fixes `379c7b7`) and the workflow's **first remote run was
  green** — GitHub Actions run `39534195074`, both jobs SUCCESS (backend suite 164
  tests / 0 failures on the pinned runtime; frontend 816/816). **G1/G2 are closed**;
  evidence recorded in `ops/release-gates.md`. The first remote attempt exposed two
  CI-only issues (missing `writable/install.lock` in a fresh checkout; a Windows-only
  path-literal contract test) — both fixed in `379c7b7`, re-run green.
- Consistency fixes made alongside: `ops/backup-restore-runbook.md` §5 (drill was in
  fact executed on live Hostinger; owner RPO/RTO still open), the tenant-isolation
  matrix header (T-1..T-24 still has no execution record), and
  `quality/tests/commercial-license-tests.md` (K-C-02 reminders still blocked — no
  notification channel exists; K-C-03 now has unit-level runtime evidence).

### Security hardening round + package rebuilt (build 4, 2026-10-20)
- **G5/RB-7 runtime round.** Pre-bundle probe (`quality/tools/security-runtime-probe.php`
  against a real `php spark serve`) ran 28 checks and exposed that the `cors` filter was
  only aliased, never applied — the allowlist was dormant. Bundle then landed:
  - `app/Config/Filters.php`: `cors` added to `$required['before']` (required filters run
    before routing, so `OPTIONS` preflights get answered — previously plain `404`);
    `secureheaders` enabled in `$globals['after']`.
  - `app/Config/Cookie.php`: `$secure` now driven by `cookie.secure` env (default false;
    shipped `.env.example` sets `true` for HTTPS production).
  - New `SecurityHeadersRuntimeTest` (6 tests, allowlist-aware for CI's
    `app.corsAllowedOrigins=https://ci.invalid`).
- Evidence: `quality/docs/security-runtime-review.md` — pre 26/28 + 2 deliberate findings;
  post **36/36 PASS** (deny-by-default on 10 unauth + 4 authed routes, explicit origin echo,
  preflight 204, never `*`, five security headers present, `cookie.secure` polarity both
  ways, CSRF `403 csrf_required` intact, and session-fixation `H1/H2/H3`: login issues a
  new session id, the pre-auth id is dead afterwards, the new id is authenticated —
  SC-5 / SF-01 / SF-02 closed, live-verified because Shield skips regeneration under
  phpunit's `testing` environment). Suite after: **161 tests / 653 assertions**,
  re-validated from fresh empty CI-harness databases the same day.
  Framework quirk recorded honestly: a single-entry allowlist is echoed without matching
  the request origin (browser mismatch still blocks; the caller's origin is never echoed).
- Shipped files touched: `CHANGELOG.md` (build-4 bullet + limitation counts 161/653 + CSP
  limitation), `.env.example` (cookie.secure block), `documentation/09-security-and-privacy.md`
  (real CORS/headers/cookie posture; CSP honestly listed as not emitted).
- Package rebuilt: **build 4**, ZIP SHA-256 `7099f7deb40c514c69e895f711462d4e10d0f441ffefd1d03536d73128ea605b`
  (4,105,230 bytes, 1,308 files, 13,016,654 bytes uncompressed); build 3 kept as
  `*.zip.bak-20261020-052205`; verifier **35/35, 0 failures** on build tree and extracted
  ZIP; reference UI hashes 3/3 unchanged; no `.env`/keys/pilot data shipped.
- Records updated: `ops/release-gates.md` (G5 evidence complete), `quality/docs/defect-release-blocker-report.md`
  (RB-7 further reduced), `security-config-review.md` §4 runtime re-review executed,
  `security-threat-model.md` CORS rows, `dependency-security-review.md`, this report,
  `PROJECT_STATUS_FOR_OWNER.md`, `PILOT_DEPLOYMENT_REPORT.md`, `release/*` records.
- **Post-build evidence round (same day, no shipped-code change → build 4 still current):**
  - CI workflow recipe re-validated from **fresh empty** `zee_ci`/`zee_ci_school` databases
    at the full **161/653** suite (and again green on the normal dev env). The run exposed
    a test bug, not a runtime bug: `TestResponse::getHeader()` forwards unknown methods to
    the DOM parser and silently returns `null` — fixed to read
    `$result->response()->getHeaderLine()` (`SecurityHeadersRuntimeTest`, plus a documented
    redirect quirk for the portal route; trap recorded in `backend/docs/environment-audit.md` §3).
  - Probe extended with the session-fixation `H` block → **36/36 PASS**: Shield's
    login-time `session()->regenerate(true)` live-verified (new id on login, pre-auth id
    dead, new id authenticated) — **SC-5 / SF-01 / SF-02 closed**; SF-04 auto-rotation
    destroy remains MB-2. Caveat recorded: Shield skips regeneration when
    `ENVIRONMENT === 'testing'`, hence the live probe instead of phpunit.
  - New `quality/docs/csrf-client-audit.md`: every live HTML form already carries
    `csrf_field()`; the global-`csrf` residual is precisely a ~53-call write-test retrofit
    + future-client token duty + rebuild (defined enabling round, not executed).
  - Dirty-tree figure corrected 167 → **169** (raw `git status --porcelain`; the earlier
    filtered count dropped the `?? .github/` line; +1 for the new CSRF audit doc).

### Global CSRF enforcement + connect-flow repair (build 5, 2026-10-20)

- RB-7's last locally-closable sub-item (global CSRF) executed the same day, per the
  client audit's defined round: `Filters.php` `$globals['before']` now carries
  `'csrf' => ['except' => ['api/admin/billing*']]`. Every state-changing request
  (installer, Shield login/2FA/magic-link, non-billing APIs) refuses token-less
  mutations with `403 SecurityException::forDisallowedAction`; billing keeps route-level
  `api_csrf` so its JSON `{error: csrf_required}` contract survives and
  `Security::verify()` never runs twice per request (verification consumes + regenerates
  the token — a double run would always fail). Rescoping note: the audit's "~53 write
  calls" overcounted Query Builder cleanup; only **9 real HTTP write calls** needed
  retrofitting (6 in `LicenseEnforcementTest`, 2 in `ProvisioningIdempotencyTest`; the
  3rd `SetupTest` case is untouched — `PageNotFoundException` at routing precedes
  filters), via new shared `backend/tests/_support/CsrfTokenTrait.php`.
- **Collateral shipped-code repair (found by probe `I2`):** `ConnectApi::resolve()` /
  `verify()` had been returning `500` on every call — they invoked
  `Throttler::checkTokens()`, a method that does not exist (real API: `check()`), and
  the `verify:` bucket-key prefix (plus IPv6 client addresses) carried `:` which PSR-6
  cache keys reject. Fixed (`Throttler::check()` + colon-safe `throttleKey()`); the
  probe's original A-block had been reporting the `verify` 500 as a passing
  *informational* observation the whole time — lesson recorded in RT-10: header-absence
  checks cannot detect dead controllers. Covered by new
  `backend/tests/Feature/ConnectApiTest.php` (3 tests — first exercise of either method,
  including the identical-shape `found:false` contract and the token-less `403`).
- Probe extended with the `I` block (token-less non-billing POST → 403; token-carrying
  POST → 200 with the endpoint contract; token-less login POST → 403 — login CSRF now
  enforced server-side) and the login helper taught to carry the hidden token
  (`csrfTokenFor()`): **39/39 PASS**. Suite green with the global filter on:
  **164 tests / 671 assertions**, and re-validated from fresh empty CI-harness databases
  on the identical recipe (`OK (164 tests, 671 assertions)`; control-school history still
  1 row; `backend/.env` restored byte-identical).
- FeatureTest trap recorded (environment-audit fact #4): `service('response')` is a
  singleton — a later request overwrites an earlier `TestResponse`'s wrapped response
  (body *and* status), so contracts must be snapshotted immediately after each call.
- Shipped files touched: `CHANGELOG.md` (build-5 section + 164/671 limitations),
  `documentation/09-security-and-privacy.md` (global-CSRF bullet),
  `application/app/Config/Filters.php`, `application/app/Controllers/ConnectApi.php`,
  `application/app/Filters/ApiCsrfFilter.php` (docblock).
- Package rebuilt: **build 5**, ZIP SHA-256
  `b0cd78a658dc5a8b125ecbbe1017b8ae7f62401bdc7a61ae78a0201dc4a849f0`
  (4,106,381 bytes, 1,308 files); build 4 kept as `*.zip.bak-20261020-083633`;
  verifier **35/35, 0 failures** on build tree; clean extraction byte-identical to
  staging (matching recursive tree hash); `SHA256SUMS.txt` matches; reference UI
  hashes 3/3 unchanged; no `.env`/keys/pilot data shipped.
  Superseded the same day by **build 6** (`d1f3df4ff6fd44b3b43fee19a4c69c2f328db518f0ad1210b11c10090228361f`,
  4,106,477 bytes) — a shipped-`CHANGELOG.md`-only correction (the "no activation
  mechanism" limitation line was false since the licensing system shipped; rewritten
   to "payment is manual, no gateway, no phone-home"), by **build 7**
   (`11fb712e29afb937eb81d944c74e5b4f568ae854a0d0a33a0a23134e1484527f`, 4,106,913 bytes)
   which records that correction in the changelog and clarifies
   `documentation/10-license-and-support.md` ("no online activation" != no licensing),
   by **build 9**
   (`46f5a4877618e3d0ae253781b1e34219d8dd67a02f0b2084d5e90d23db99186c`, 4,107,274 bytes)
   which records the new annotated tag `v0.1.0-pre` in `package-manifest.json` (was
   hardcoded `null`) and updates the shipped tag-honesty statements (README_FIRST,
   CHANGELOG, doc10, index.html), and finally by the current **build 10**
   (`c31ad281a916ae5728f4d36716c1aea2b5abc41b8075dd48696420f7d86dc5a8`, 4,107,754 bytes,
   commit `77739b6`) — the first shipped-code change since build 5: the root-route
   post-login redirect-loop fix (LB-1), deployed to live Hostinger the same day.
   Build 8 (`b249281c…`, 4,107,190 bytes) had fixed the
   stale control-plane table count (14 → 21) in `database/README.md`
   and `documentation/03-first-run-setup.md` (verified against the live control DB:
   21 tables; school DB remains 22). No shipped code changed across builds 5-9; all
   build-5 test/probe results carry over (build 10 adds its own suite results:
   backend 169/687). Builds 6/7/8/9 kept as
   `*.zip.bak-20261020-093116` / `*.zip.bak-20261020-183756` / `*.zip.bak-20261021-075532` /
   `*.zip.bak-20261021-094201`.
- RB-7 **closed** (residuals tracked only as SC-2 `tokenRandomize` + SC-6 CSP — both
  shipped-documented hardening limitations, neither pilot-blocking); records updated
  across `quality/docs/*`, `ops/release-gates.md` (G5 evidence now 39/39, ships in
  build 5), `release/*`, `PROJECT_STATUS_FOR_OWNER.md`, `PILOT_DEPLOYMENT_REPORT.md`,
  `.github/workflows/ci.yml` (counts 164/671), `backend/kilocode-status.md`.

### Still BLOCKED — what did not happen this phase
- ~~**No live smoke test of the rebuilt package.**~~ **Closed 2026-10-21:** build 9 was
  deployed to live Hostinger (backups first), the smoke found the S1 post-login redirect
  loop (LB-1), and **build 10 with the fix is deployed and passed the full live smoke**
  (all five roles land correctly, licence Active, student write verified with SQL cleanup,
  control plane untouched). Evidence: `PILOT_DEPLOYMENT_REPORT.md`. `FINAL_RELEASE_STATUS`
  stays `BLOCKED` for the remaining reasons below.
- ~~Role smoke tests still never executed.~~ **Closed 2026-10-21 (live):** all five roles
  signed in on production and their landings/denials were verified. What remains open is
  the row-by-row role-permission matrix run (G6) and attendance write (defect LB-2, open).
- QA matrices: **T-25..T-27 (licence expiry) executed live 2026-10-21** — expired
  licence kept reads 200 with full rows, gated writes with 402 `license_expired`, left
  a byte-identical 22-table checksum snapshot, restored cleanly (gate **G8 GO**; record:
  `quality/docs/tenant-isolation-test-matrix.md` §6). T-1..T-24 (isolation behaviour)
  never executed row-by-row — the evidence bar for gate **G7** (G6 role matrix likewise
  open).
- ~~No Git tag~~ — **closed 2026-10-21**: the tree was committed and pushed to
  `github.com/qaboolasales-blip/zee-education`, annotated tag **`v0.1.0-pre`** (commit
  `b1267df…`) was pushed, and build 9 was rebuilt from that tag so
  `package-manifest.json` records `"git_tag": "v0.1.0-pre"` (build 8 recorded `null`).
  The tag is a pre-release tag, not a stable-release tag. (Build 10 was cut 2 commits
  later, so its manifest records `git_tag: null` again — the tag still exists, and a
  shipped-text scan found 0 "no Git tag" claims.)
- Exposed SSH password still not rotated by the owner.
