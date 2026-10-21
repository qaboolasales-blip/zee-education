# PILOT DEPLOYMENT REPORT

## PILOT_DEPLOYMENT_STATUS: BLOCKED

Updated: 2026-10-19
Target: mediumaquamarine-grouse-335108.hostingersite.com (Hostinger, u121986687 @ 217.21.91.234:65002)

## NEW THIS PASS

### Approved UI is now live
- `/` no longer shows the CodeIgniter welcome page. It routes to the approved surface:
  signed-in platform owner -> `/portal`, everyone else -> `/login`.
- `/portal` serves the APPROVED Super Admin design with REAL control-plane data:
      [["Pilot School 001","-","-","-","Dedicated","Active","-","#3b82f6"]]
- UI LOCK RESPECTED. The three reference files were never modified; a separate runtime
  copy (app/Views/portal/superadmin.html) was created in which only the hard-coded demo
  school list was replaced by a token filled with real data. No colour, font, spacing,
  radius, icon, animation, breakpoint, DOM order, class, id or visible text was changed.
- Reference hashes re-verified after all changes: 3/3 unchanged.

### Security incident created and closed in this pass
A Super Admin password had been set during deployment and appeared in chat, which meant
it was effectively public. Actions taken:
1. `force_reset` flag was set, but Shield v1.4.1 has no change-password controller, so
   the flag only caused a redirect loop. That approach was abandoned and reverted.
2. The password was properly rotated: the email_password identity was rebuilt so Shield
   hashed the new value itself (same path the installer uses).
3. The random password was written ONLY to a server-local 0600 file outside the web root
   (~/superadmin_credentials.txt). It was never printed to the terminal or to chat.
4. Existing sessions were invalidated.
5. VERIFIED: the previously known password is now REJECTED at sign-in, and the new
   password successfully signs in and renders the approved portal.
An earlier misleading credentials file (produced by a call to a Shield method that does
not exist and therefore silently did nothing) was deleted.

### Real defects found and fixed in this pass
- `SuperAdminFilter` and `RoleFilter` called `auth()->check()`. In Shield v1.4 that method
  validates credentials and REQUIRES arguments. The correct call is `auth()->loggedIn()`.
  Both filters previously threw a fatal on every protected request.
- The Super Admin group name was mismatched: filters required `super_admin`, while the
  installer and AuthGroups config use `superadmin`. Both are now accepted.
- Shield's filter aliases were missing because app/Config/Filters.php replaces the
  framework defaults, so no Shield filter alias resolved.
- Server `.env` carried the broken line `session.savePath = null`, which made CodeIgniter
  write sessions to a literal "null" directory and produced HTTP 500s. Removed; the backup
  of the previous file is kept on the server.
- ZeeRotatePassword shipped a hard-coded vendor pilot host name. Removed; the sign-in URL
  is now derived from app.baseURL. Verified the package contains no deployment-specific
  host, account id or known password.

## DEPLOYMENT EVIDENCE (this pass)
Pre-deploy backup taken first:
  ~/zee_backups/control_predeploy_20261018-173558.sql  (19,307 B)
  ~/zee_backups/school_predeploy_20261018-173558.sql   (31,461 B)
  ~/env_predeploy_20261018-173558.bak
Migrations after deploy, fixed order, each reported "Migrations complete.":
  php spark migrate -n "CodeIgniter\Shield"
  php spark migrate -n "CodeIgniter\Settings"
  php spark migrate -n "App"
Control-plane tables: 14 (unchanged). Pilot school record: 1 (preserved).
School database untouched: 22 tables.

Live endpoints:
  /         302 -> /login        (anonymous visitor is never shown app content)
  /health   200 {"status":"ok","database":"connected","environment":"production"}
  /install  302 -> /login        (installer is locked)
  /login    200
  /portal   302 -> /login        (Super Admin only)

Sign-in verified end to end: known-old password REJECTED, new password from the
0600 server file accepted, approved portal rendered.

## STILL BLOCKED - exact remaining gates
1. Role smoke tests were never executed: no Super Admin / School Admin / Teacher / Parent /
   Student trial accounts exist, so attendance, results, manual fees, report/PDF export and
   role-restricted access remain unverified.
2. No Git tag exists. 98+ working-tree changes are uncommitted, so the deployment is not
   reproducible from a tagged commit.
3. The SSH password exposed earlier in chat and in the local backend/.env has still not
   been rotated by the owner. That credential is live.
4. No independent third-party Hostinger buyer account test has been done.
5. FINAL_RELEASE_STATUS in backend/FINAL_RELEASE_AND_PILOT_REPORT.md is still BLOCKED.

## OWNER ACTIONS NOW
1. Read ~/superadmin_credentials.txt through hPanel File Manager, sign in, change the
   password, then delete that file.
2. Rotate the SSH password (it is still exposed).
3. Delete the plain-text credential lines from the bottom of the local backend/.env.

## ROLLBACK
  Code:  rm -rf ~/domains/mediumaquamarine-grouse-335108.hostingersite.com
  Web:   restore public_html from public_html_default.php.bak
  Data:  mysql -u<u> -p<pw> u121986687_zee_control < ~/zee_backups/control_predeploy_20261018-173558.sql
         mysql -u<u> -p<pw> u121986687_zee_school_1  < ~/zee_backups/school_predeploy_20261018-173558.sql
  Env:   ~/env_predeploy_20261018-173558.bak
  netdeveloper.online / ILM Academy was never modified and needs no rollback.

## Deep scan fixes (2026-10-19)

All HIGH and MEDIUM findings from the deep scan are closed and verified on the live
deployment. See DEEP_CODE_SCAN.md at the project root for the full before/after table.

- Write endpoints added: /api/school/{students,staff,attendance,fees/invoices,fees/receipts}
  plus read endpoints. All writes go to the signed-in user's own school database.
- /api/health added so the frontend health check resolves.
- POST /admin/schools/provision now exists (Super Admin only) - it was documented but never routed.
- Provisioning now seeds 7 real safe defaults; idempotency proven (0 duplicates, 0 data loss).
- RolePolicy is now the single source of truth and is used by both filters.
- Added tests/Feature/RoleAccessTest.php (7 tests / 29 real assertions).
- Mobile PWA: manifest.json, sw.js and an approved-design mobile surface at /m.
- Docs: openapi-v0.md is now IMPLEMENTED with a table of all 21 routes.
- ALL demo data removed from every shipped surface and re-verified as absent.

Production evidence: role smoke 12/12, write API 5/5, mobile 6/6, seeding + idempotency,
one-school-one-database separation, UI lock 3/3 unchanged, backend 69 tests / 175 assertions.

Still open: no Git tag (the tree was committed and pushed to GitHub on 2026-10-21,
but no tag exists yet), phpunit test DB not migrated, and the previously exposed SSH
password still needs rotating by the owner.

## Package rebuild pass (2026-10-20, build 3) — PRODUCTION NOT TOUCHED

**No deployment action was taken in this pass.** The live Hostinger account was not
accessed, no file was uploaded, no migration was run, neither production database was
read or written. Everything below is local build evidence only.

### What was rebuilt
- The installer package was regenerated from source with `release/build-package.ps1`.
- New ZIP: `release/Zee_Education_v0.1.0_Hostinger_Installer.zip`
  **SHA-256 `b2fae3645c92e1c2c935b4fba46f42d70025dd8dd306f40ced32454e27a1efc0`** (3.91 MB,
  1,308 files). `release/SHA256SUMS.txt` matches. Previous packages are kept as
  `*.zip.bak-20261019-224837` (build 1) and `*.zip.bak-20261020-025056` (build 2).
- `verify-package.php`: **35 checks, 0 failures, 0 warnings**, on the build tree and on
  the extracted ZIP.
- Reference UI hashes: **3/3 unchanged**. No synthetic pilot data, no `.env`, no private
  keys, no hosting account id anywhere in the shipped code.
- Backend tests: **155 tests, 621 assertions, 0 skipped, 0 failures.**

### What the rebuild fixed (defects in the previously shipped package)
1. **Missing production dependencies.** The old package predated `endroid/qr-code`;
   a school invite QR code would have fataled with *Class not found*. Now installed.
2. **Stale optimized autoloader.** Its `autoload_classmap.php` did not know about
   `BillingApi`, `ApiCsrfFilter`, `LicenseService` or `QrRenderer`. Regenerated.
3. **Composer download leftovers** (`vendor/composer/tmp-*.zip`) were being shipped. Gone.

### What is new in this build (deployed surface changes to verify at the next live step)
- 9 new Super Admin billing routes under `/api/admin/billing`, filter chain
  `superadmin` → `api_csrf`; 6 new control-plane migrations
  (`2026-10-19_000010..000015`) plus `LicensePlansSeeder`.
- `sw.js` no longer caches `/m` (it cached a per-user authenticated page — an
  on-device learner-data leak between users of the same phone); cache bumped to
  `zee-shell-v2` so a previously cached v1 entry is purged.
- `ConnectApi` is **new in this build** (build 1 shipped without it): `/api/connect/invite`
  is behind `session` + `role:superadmin,school_admin,teacher` and a second
  `RolePolicy::isSuperAdmin`/`hasAny` check inside the controller; `resolve` and `verify`
  stay public but are throttled and return an identical shape whether or not a school
  exists, so they cannot be used to enumerate customers. `LicenseFilter` no longer calls a
  Shield method that does not exist (it would have fataled on every school route).

### CSRF posture recorded this pass
*(historical — superseded by the build-5 pass below, which enabled the global `csrf`
filter; this section records the build-1-era state.)*
- Verified: `/api/admin/billing/*` returns `403 csrf_required` without a token (tested).
- Open gap: the global `csrf` filter is still commented out in `Config/Filters.php`, so
  `/api/school/*` writes, `/admin/schools*` POSTs and Shield's own auth forms are not
  application-verified. They are covered only by `SameSite=Lax` + `httponly` session
  cookies. Not closed here: the school dashboard and PWA clients were not audited for
  sending tokens, and enabling verification blindly would break their writes.

### Package rebuild pass (2026-10-20, build 4) — PRODUCTION NOT TOUCHED

**No deployment action was taken in this pass either.** Local build evidence only.

- Trigger: the G5/RB-7 security hardening bundle (CORS filter actually applied in
  `$required['before']` including preflight answering, `secureheaders` enabled in
  `$globals['after']`, `Cookie::$secure` env-driven via `cookie.secure`) plus the new
  `SecurityHeadersRuntimeTest` — all shipped-code changes, so the artefact was rebuilt.
- Runtime evidence before/after: `quality/docs/security-runtime-review.md`
  (pre-bundle 28 checks with 2 deliberate dormancy findings; post-bundle **32/32 PASS
  at build time**, extended post-build the same day to **36/36 PASS** with the
  session-fixation `H` block — login issues a new session id, pre-auth id destroyed,
  SF-01/SF-02 live-verified; evidence-only, shipped code unchanged).
- New ZIP SHA-256 **`7099f7deb40c514c69e895f711462d4e10d0f441ffefd1d03536d73128ea605b`**
  (4,105,230 bytes, 1,308 files, 13,016,654 bytes uncompressed). Build 3 kept as
  `*.zip.bak-20261020-052205`; earlier baks unchanged. `release/SHA256SUMS.txt` matches.
- `verify-package.php`: **35 checks, 0 failures, 0 warnings** (build tree + extracted ZIP).
- Backend tests at build-4 time: **161 tests, 653 assertions, 0 skipped, 0 failures.**
- Deployed-surface changes to verify at the next live step (in addition to the list below):
  every response now carries the five security headers; an `OPTIONS` preflight answers
  `204` instead of `404`; set `cookie.secure = true` (already in the shipped template) and
  confirm `Set-Cookie` shows the `secure` attribute over HTTPS; with
  `app.corsAllowedOrigins` set to the real origin, confirm the explicit ACAO header.

### Package rebuild pass 2 (2026-10-20, build 5) — PRODUCTION NOT TOUCHED

**No deployment action was taken in this pass either.** Local build evidence only.

- Trigger: the CSRF enabling round — global `csrf` filter in `$globals['before']`
  (except `api/admin/billing*`, which keeps its route-level `api_csrf` JSON contract)
  plus the repair of `ConnectApi`'s always-`500` throttle calls (non-existent
  `Throttler::checkTokens()` → `check()`, colon-safe bucket keys) — shipped-code
  changes, so the artefact was rebuilt.
- Runtime evidence: probe extended with the global-CSRF `I` block → **39/39 PASS**
  (token-less non-billing POST → 403 `SecurityException`; token-carrying POST → 200
  with the endpoint's own contract; token-less login POST → 403 — login CSRF now
  enforced; normal logins still 303 with the hidden field). Backend suite with the
  global filter on: **164 tests / 671 assertions**, re-validated from fresh empty
  CI-harness databases on the identical recipe.
- New ZIP SHA-256 **`b0cd78a658dc5a8b125ecbbe1017b8ae7f62401bdc7a61ae78a0201dc4a849f0`**
  (4,106,381 bytes, 1,308 files) — superseded the same day by documentation-only
  builds 6-8; the current artefact is **build 8**
  `b249281c81269432950c644669ba3635f56e05b287366dc1835840db784098ab`
  (4,107,190 bytes; changelog/doc10 clarifications + control-plane table-count fix
  14 → 21; all intermediate builds kept as
  `*.zip.bak-20261020-183756` / `-093116` / `-085852` / `-083633`). Build 4 kept as
  `*.zip.bak-20261020-083633`; earlier baks unchanged. `release/SHA256SUMS.txt`
  matches; clean extraction byte-identical to the staging tree; shipped
  `tools/verify-package.php` re-run inside the extracted ZIP: **35/35**.
- `build-package.ps1` verifier: **35 checks, 0 failures, 0 warnings** (build tree);
  extracted tree proven identical by hash.
- RB-7 closed. Residual hardening limitations carried into the package docs:
  `tokenRandomize=false` (SC-2) and no CSP (SC-6, needs per-view nonces).
- Deployed-surface changes to verify at the next live step (in addition to all
  previous lists): **every mutating request now requires a CSRF token** — confirm a
  token-less `POST /login` and a token-less non-billing API write both return `403`,
  and that a normal browser sign-in still works (Shield forms carry the hidden field);
  confirm `/api/connect/resolve` and `/api/connect/verify` return JSON (they were `500`
  before this build).

### NEXT LIVE STEP (required before any READY status)
1. Deploy the rebuilt ZIP to a **staging** database first, not directly to production.
2. Run the three migration namespaces in fixed order and confirm all 6 new licence
   tables exist in the control plane **and that the school database still contains 0
   control-plane tables** (ADR-001 re-check after the new migrations).
3. Smoke: `/`, `/health`, `/login`, `/portal`, `/m`, sign in, provision a test school,
   issue + pay + void an invoice, confirm `403 csrf_required` without a token, and
   confirm a fresh PWA install does not serve a cached sign-in page for `/m`.
4. Re-run backup/restore on both databases, then verify them clean of pilot data.
5. Only then may `FINAL_RELEASE_STATUS` be moved to `GO`.
