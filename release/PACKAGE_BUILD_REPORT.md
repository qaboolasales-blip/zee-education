# PACKAGE BUILD REPORT — Zee Education v0.1.0

## PACKAGE_STATUS: BLOCKED

The package itself was built and passed every automated and manual check it is capable of.
It is **not** marked READY because the repository is **not** at
`FINAL_RELEASE_STATUS: GO`, and because one genuine release gate was never executed.

> Sections 1-14 below describe **BUILD 1 (2026-10-18)** and are retained as history.
> Section 15 describes **BUILD 2 (2026-10-19)**, now superseded.
> Section 16 describes **BUILD 3 (2026-10-20)**, now superseded.
> Section 17 describes **BUILD 4 (2026-10-20)**, now superseded.
> Section 17b describes **BUILD 5 (2026-10-20)**, now superseded.
> Section 17c describes **BUILD 6 (2026-10-20)**, now superseded.
> Section 17d describes **BUILD 7 (2026-10-20)**, now superseded.
> The current artefact is **BUILD 10 (2026-10-21)**; its figures are in section 17h.
> Section 17g describes **BUILD 9 (2026-10-21)**, now superseded.
> Section 17e describes **BUILD 8 (2026-10-20)**, now superseded.

---

## 17h. BUILD 10 — 2026-10-21 (current)

First shipped-code change since build 5: the post-login redirect-loop fix found by
the live smoke of build 9 on Hostinger. `Home::index` used to send every signed-in
non-Super-Admin user to `/login`, while Shield sends authenticated visitors of
`/login` back to the configured redirect (the site root) — an infinite
`/` ↔ `/login` loop that trapped School Admin, Teacher, Parent and Student after
sign-in. The fix lands each authenticated case on a real approved surface
(`/portal`, `/school`, or `/setup`) and never names `/login` as the destination for
an authenticated user; `tests/Feature/HomeLandingTest.php` locks the contract
(four role branches + no-login-for-authed + anonymous path).

| Item | Value |
|---|---|
| ZIP name | `Zee_Education_v0.1.0_Hostinger_Installer.zip` |
| Git commit | `77739b6b221b321502c9511adb36ecff8cde8366` (branch `main`, 2 commits past tag `v0.1.0-pre` — `git describe` = `v0.1.0-pre-2-g77739b6`; manifest records `git_tag: null` because no tag points AT HEAD, and the shipped text contains **0** "no Git tag" claims, verified by scan of every shipped `.txt/.md/.html`) |
| ZIP size | 4,107,754 bytes (3.92 MB) |
| ZIP files | 1,308 |
| **ZIP SHA-256** | `c31ad281a916ae5728f4d36716c1aea2b5abc41b8075dd48696420f7d86dc5a8` |
| Build 9 kept as | `Zee_Education_v0.1.0_Hostinger_Installer.zip.bak-20261021-094201` (`46f5a487…`) |
| Verification | build-package.ps1 verifier **35/0** on build tree and again inside the extracted ZIP; `SHA256SUMS.txt` matches live hash |
| Tests | backend `OK (169 tests, 687 assertions)` — 164 → 169 with the new `HomeLandingTest` (5 tests/14 assertions), re-validated from fresh empty `zee_ci`/`zee_ci_school` databases on the CI recipe; frontend `816/816` |
| Deployment | **Live on Hostinger 2026-10-21**: extracted to `Zee_Education_v0.1.0_b10/`, live `.env` + writable state carried over, migrations Shield/Settings/App all no-op (0 non-AppSchool pending), `public_html` symlink flipped from build 9's tree (kept on disk for instant rollback); full live re-smoke PASS — see `PILOT_DEPLOYMENT_REPORT.md` |

## 17g. BUILD 9 — 2026-10-21 (superseded by build 10)

Tagged rebuild cut **from the annotated tag `v0.1.0-pre`** (commit `b1267df…`): the
tag round changed no application code — only the shipped honesty statements about
Git tagging (`README_FIRST.txt`, `CHANGELOG.md`, `documentation/10`,
`documentation/index.html`), the `build-package.ps1` manifest logic (was a hardcoded
`git_tag = null`, now records the tag pointing at HEAD), and repo-side records.
Suites re-run green at the tag round: backend `OK (164 tests, 673 assertions)`,
frontend `816/816`. Inside this ZIP, `package-manifest.json` records
`"git_tag": "v0.1.0-pre"` and `git_commit` equal to the tag commit, and zero stale
"no Git tag" claims remain in the shipped text.

| Item | Value |
|---|---|
| ZIP name | `Zee_Education_v0.1.0_Hostinger_Installer.zip` |
| Git tag / commit | **`v0.1.0-pre`** (annotated) → `b1267dfba2ac22b8de2aec9ba913e4e8d9ad179f` |
| ZIP size | 4,107,274 bytes (3.92 MB) |
| ZIP files | 1,308 |
| **ZIP SHA-256** | `46f5a4877618e3d0ae253781b1e34219d8dd67a02f0b2084d5e90d23db99186c` |
| Build 8 kept as | `Zee_Education_v0.1.0_Hostinger_Installer.zip.bak-20261021-075532` (4,107,190 bytes, `b249281c…`) |
| Verification | build-package.ps1 verifier **35/0**; `SHA256SUMS.txt` matches live hash; clean extraction **byte-identical** to staging (recursive tree hash `16ace5caf52f6c8…`, 1,308 files both sides); shipped `tools/verify-package.php` re-run inside the extracted ZIP: **35/0**; manifest `git_tag=v0.1.0-pre`; tag text present in all 5 shipped spots; 0 stale "no Git tag" claims inside the package |
| Tests | backend `OK (164 tests, 673 assertions)`, frontend `816/816` (re-run at the tag round) |

## 17e. BUILD 8 — 2026-10-20 (superseded by build 9)

Third documentation-only pass over build 5's code: corrects stale control-plane
**table counts** in two shipped docs. The 2026-10-18 live drill recorded 14
control-plane tables; the licence migrations then added seven
(`license_plans`, `school_licenses`, `license_invoices`, `license_payments`,
`school_db_credentials`, `school_invites`, `user_school_access`) — the control
plane now has **21** tables (verified against the live local control DB:
`SHOW TABLES` → 21). The school database remains **22** tables, exactly as
already listed. Updated `database/README.md` (count + full table list) and
`documentation/03-first-run-setup.md` (count + namespace description);
`CHANGELOG.md` corrections section extended to builds 6-8. Tests/probe carry
over unchanged (164/671 with the global CSRF filter, probe 39/39, frontend
816/816).

| Item | Value |
|---|---|
| ZIP name | `Zee_Education_v0.1.0_Hostinger_Installer.zip` |
| Working tree at build | **dirty - 171 changed/untracked entries** |
| ZIP size | 4,107,190 bytes (3.92 MB) |
| ZIP files | 1,308 |
| **ZIP SHA-256** | `b249281c81269432950c644669ba3635f56e05b287366dc1835840db784098ab` |
| Build 7 kept as | `Zee_Education_v0.1.0_Hostinger_Installer.zip.bak-20261020-183756` (4,106,913 bytes, `11fb712e…`) |
| Verification | build-package.ps1 verifier **35/0**; `SHA256SUMS.txt` matches live hash; clean extraction **byte-identical** to staging (recursive tree hash `6e019bf96b0fb411…`, 1,308 files both sides); shipped `tools/verify-package.php` re-run inside the extracted ZIP: **35/0**; README/doc03/CHANGELOG fixes confirmed inside the package |
| Tests | unchanged from build 5: backend `OK (164 tests, 671 assertions)` (dev env + fresh-empty-harness CI recipe), frontend `816/816`, probe `39/39` |

## 17f. Repository push + first remote CI run (2026-10-21)

Not a rebuild — the build-8 ZIP is unchanged (no shipped file has been touched
since build 8; the files below are repo-side tests, CI and records only).

| Item | Value |
|---|---|
| Remote | `https://github.com/qaboolasales-blip/zee-education` (**public**), branch `main` |
| Commits | `8560225` "Batch security rounds + release build 8" (215 files — all security rounds, build-8 docs/records, root `.gitignore`); `379c7b7` "CI: fix first remote run failures" |
| Root `.gitignore` (new) | excludes `release/staging/`, `release/*.zip` (+ `.bak-*`), `.env` (keeps `.env.example`), `release/backups/*.sql` (local pilot dump — test user bcrypt hash — deliberately **not** committed), `backend/writable/install.lock`, `node_modules/` |
| Credentials | GitHub PAT (scopes `repo`, `workflow`) stored through git's credential helper (Windows Credential Manager) — never written to any tracked file; commit identity `Ghulam sabir <qaboolasales-blip@users.noreply.github.com>` (repo-local config) |
| First CI attempt | FAILED (run `39532864265`): fresh checkout has no `writable/install.lock` → portal routes unregistered (`AuthTest` ×2), and `ConnectTest` asserted `imagick` absent from the runner's php.ini; frontend contract gate used Windows-only backslash path literals. All three were CI-only — local suites were green throughout. |
| Fix + re-run | `379c7b7` (create `writable/install.lock` before the suite; make the QR test environment-independent; POSIX paths in the contract gate) → **run `39534195074`: SUCCESS — backend job green (164 tests, 0 failures), frontend job green (816/816)** |
| Gates impact | **G1 and G2 closed** (evidence in `ops/release-gates.md`); G3b/G6-G10 unchanged (owner/live-only) |

## 17d. BUILD 7 — 2026-10-20 (superseded by build 8)

Second and final documentation pass over build 5's code (no shipped code changed
since build 5): records the build-6 licence-limitation correction in the shipped
`CHANGELOG.md` (a "Documentation corrections (builds 6-7)" section — build 6 had
corrected the limitations text silently) and clarifies
`documentation/10-license-and-support.md`: "no online activation" means no
external licence server / key / phone-home, **not** an absence of licensing —
school licences are issued and activated through the control plane and gate
school access. Tests/probe results carry over unchanged (164/671 with the global
CSRF filter, probe 39/39, frontend 816/816).

| Item | Value |
|---|---|
| ZIP name | `Zee_Education_v0.1.0_Hostinger_Installer.zip` |
| Working tree at build | **dirty - 171 changed/untracked entries** (package-assets edits are inside already-dirty files) |
| ZIP size | 4,106,913 bytes (3.92 MB) |
| ZIP files | 1,308 |
| **ZIP SHA-256** | `11fb712e29afb937eb81d944c74e5b4f568ae854a0d0a33a0a23134e1484527f` |
| Build 6 kept as | `Zee_Education_v0.1.0_Hostinger_Installer.zip.bak-20261020-093116` (4,106,477 bytes, `d1f3df4f…`) |
| Verification | build-package.ps1 verifier **35/0**; `SHA256SUMS.txt` matches live hash; clean extraction **byte-identical** to staging (recursive tree hash `90e39ef0efa0474…`, 1,308 files both sides); shipped `tools/verify-package.php` re-run **inside the extracted ZIP** (buyer perspective): **35 checks, 0 failures, 0 warnings**; both doc fixes confirmed inside the package |
| Tests | unchanged from build 5: backend `OK (164 tests, 671 assertions)` (dev env + fresh-empty-harness CI recipe), frontend `816/816`, probe `39/39` |

## 17c. BUILD 6 — 2026-10-20 (superseded by build 7)

One-line shipped-doc correction over build 5: the shipped `CHANGELOG.md`
"Known limitations" bullet claimed "Licence handling is manual; there is no
activation mechanism" — false since the licensing system shipped (licence
plans, school licences, invoices, recorded payments, Super Admin billing API;
payment is manual because there is no gateway, but activation exists via
`LicenseService`). Rewritten to match `RELEASE_NOTES_v0.1.0.md`. No shipped
code changed; tests/probe results from build 5 carry over unchanged
(164/671 green with the global CSRF filter, probe 39/39, frontend 816/816).

| Item | Value |
|---|---|
| ZIP name | `Zee_Education_v0.1.0_Hostinger_Installer.zip` |
| Working tree at build | **dirty - 171 changed/untracked entries** (unchanged since build 5 — the CHANGELOG edit is inside the already-dirty `release/package-assets/`) |
| ZIP size | 4,106,477 bytes (3.92 MB) |
| ZIP files | 1,308 |
| **ZIP SHA-256** | `d1f3df4ff6fd44b3b43fee19a4c69c2f328db518f0ad1210b11c10090228361f` |
| Build 5 kept as | `Zee_Education_v0.1.0_Hostinger_Installer.zip.bak-20261020-085852` (4,106,381 bytes, `b0cd78a6…`) |
| Verification | build-package.ps1 verifier **35/0**; `SHA256SUMS.txt` matches live hash; clean extraction **byte-identical** to staging (recursive tree hash `7ee3f90586c1179…`, 1,308 files both sides); corrected CHANGELOG bullet confirmed inside the extracted package |
| Tests | unchanged from build 5: backend `OK (164 tests, 671 assertions)` (dev env + fresh-empty-harness CI recipe), frontend `816/816`, probe `39/39` |

## 17b. BUILD 5 — 2026-10-20 (superseded by build 6)

Rebuilt with `release/build-package.ps1` after the CSRF enabling round landed
(global `csrf` filter + `ConnectApi` throttle repair). Supersedes build 4's
`7099f7de…` artefact, which is kept as
`Zee_Education_v0.1.0_Hostinger_Installer.zip.bak-20261020-083633`.

### What changed since build 4

- **`application/app/Config/Filters.php`** — `$globals['before']` now carries
  `'csrf' => ['except' => ['api/admin/billing*']]`: every state-changing request
  (installer, Shield login/2FA/magic-link, all non-billing APIs) is refused
  `403` without a valid CSRF token. Billing stays excepted so its route-level
  `api_csrf` keeps the JSON `{error: csrf_required}` contract and
  `Security::verify()` never runs twice per request (verification consumes +
  regenerates the token, so a double run would always fail).
- **`application/app/Controllers/ConnectApi.php`** — repaired two latent
  always-`500`s: `resolve()`/`verify()` called `Throttler::checkTokens()`, a
  method that does not exist (real API: `check()`), and the `verify:` bucket-key
  prefix (plus IPv6 client addresses) carried `:` which PSR-6 cache keys reject.
  Bucket keys now go through `throttleKey()` (`:` → `-`). Found and forced into
  the open by the probe's new `I2` check; covered by new
  `backend/tests/Feature/ConnectApiTest.php` (3 tests — first time either
  controller method was exercised).
- **`application/app/Filters/ApiCsrfFilter.php`** — docblock rewritten to state
  where the filter is applied now (billing group only) and why.
- **Shipped `CHANGELOG.md`** — new "Global CSRF enforcement + connect-flow
  repair (build 5, 2026-10-20)" section; known-limitations counts updated to
  164/671 and the global-CSRF wording.
- **Shipped `documentation/09-security-and-privacy.md`** — CSRF bullet rewritten
  to global verification.
- **Repo-only (not shipped):** `backend/tests/_support/CsrfTokenTrait.php`,
  9 write-call retrofits (`LicenseEnforcementTest` ×6,
  `ProvisioningIdempotencyTest` ×2, `SetupTest` untouched — routing precedes
  filters), `ConnectApiTest`, probe `I` block + login-token carry
  (`csrfTokenFor()`), `quality/docs/csrf-client-audit.md` §4 (round executed),
  dated updates across security reviews/gates/defect report/env-audit
  (FeatureTest response-aliasing fact). Backend suite grew 161/653 →
  **164/671**, green **with the global filter enabled**, and re-validated from
  fresh empty harness DBs on the CI recipe (`zee_ci` + `zee_ci_school`,
  migrations + `LicensePlansSeeder`).

### Build identity

| Item | Value |
|---|---|
| Product version | 0.1.0 (from `app/Config/ZeeEducation.php`) |
| Release type | **pre-release** (no Git tag) |
| Commit recorded in manifest | `0ee7a233b493921c54795f6441acbaeb4537d281` (branch `main`, uncommitted tree) |
| Build script | `release/build-package.ps1` (PHP zip extension preloaded) |
| Built at | 2026-10-20 |
| ZIP name | `Zee_Education_v0.1.0_Hostinger_Installer.zip` |
| Working tree at build | **dirty - 171 changed/untracked entries** (raw `git status --porcelain`; grew 169 → 171 with `CsrfTokenTrait.php` + `ConnectApiTest.php`) |
| PHP used | 8.3.33 CLI (`php.exe`, `-d extension=php_zip` for the packer) |
| Composer used | composer.phar (Temp dir) |
| ZIP size | 4,106,381 bytes (3.92 MB) |
| ZIP files | 1,308 |
| **ZIP SHA-256** | `b0cd78a658dc5a8b125ecbbe1017b8ae7f62401bdc7a61ae78a0201dc4a849f0` |

### Verification - build 5

- `release/build-package.ps1` verifier: **35 checks, 0 failures, 0 warnings** on
  the build tree.
- `release/SHA256SUMS.txt` written; live hash of the ZIP matches the sum file.
- Clean extraction to `%TEMP%\zee_pkg_verify_b5`: recursive SHA-256 tree hash of
  the extracted tree is **byte-identical** to the staging tree (1,308 files
  both sides; `4d83021519b582b…`).
- Spot checks inside the extracted package: global `csrf` except-billing entry
  present in `application/app/Config/Filters.php`; `throttleKey()` +
  `Throttler::check()` present in `application/app/Controllers/ConnectApi.php`
  (no `checkTokens` call remains); build-5 `CHANGELOG.md` section present;
  global-CSRF wording present in `documentation/09-security-and-privacy.md`.

### Tests - build 5

```
backend:  php vendor/bin/phpunit --no-coverage   OK (164 tests, 671 assertions, 0 skipped, 0 failures)
backend (CI-recipe, fresh empty zee_ci + zee_ci_school):   OK (164 tests, 671 assertions)
frontend: npm run check                          816/816 green
live probe: quality/tools/security-runtime-probe.php post    39/39 PASS (env restored byte-identical)
```

## 17. BUILD 4 — 2026-10-20 (superseded by build 5)

Rebuilt with `release/build-package.ps1` after the G5/RB-7 security hardening
bundle landed (CORS filter wiring, secure headers, env-driven cookie `Secure`).
Supersedes build 3's `b2fae364…` artefact, which is kept as
`Zee_Education_v0.1.0_Hostinger_Installer.zip.bak-20261020-052205`.

### What changed since build 3

- **`application/app/Config/Filters.php`** — the `cors` filter is now actually
  **applied** in `$required['before']` (it existed only as an unused alias).
  Required filters run before routing, so `OPTIONS` preflights are answered
  (`204`, explicit origin when allowlisted) even for paths with no matching
  route — previously a plain `404` with no CORS handling. An empty
  `app.corsAllowedOrigins` still emits no CORS header at all; a wildcard value
  remains impossible (rejected in `Config\Cors`). `secureheaders` is now
  enabled in `$globals['after']` (was commented out): every response carries
  `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`,
  `X-Download-Options: noopen`, `X-Permitted-Cross-Domain-Policies: none`,
  `Referrer-Policy: same-origin`.
- **`application/app/Config/Cookie.php`** — `$secure` now reads the
  `cookie.secure` environment variable (default `false` for plain-HTTP local
  development; the shipped `.env.example` sets `cookie.secure = true` for
  HTTPS production). Session and CSRF cookies both inherit it.
- **Shipped `.env.example`** — new COOKIE SECURITY block documenting
  `cookie.secure = true`.
- **Shipped `CHANGELOG.md`** — new "Security headers, CORS wiring and cookie
  hardening (build 4, 2026-10-20)" bullet; known-limitations test counts
  corrected to 161/653 and the missing-CSP limitation added.
- **Shipped `documentation/09-security-and-privacy.md`** — CORS bullet expanded
  to the real emission behaviour; new security-headers bullet (and an honest
  note that CSP is not emitted in this build); cookie-flags bullet now names
  `cookie.secure`.
- **Repo-only (not shipped):** `backend/tests/Feature/SecurityHeadersRuntimeTest.php`
  (6 tests), `quality/docs/security-runtime-review.md` (pre/post runtime
  matrices, 28 → 32/32 checks), `quality/tools/security-runtime-probe.php`,
  dated updates to the security config/threat/dependency reviews, defect RB-7
  reduction, and release-gate G5 evidence. Backend suite grew 155/621 →
  **161/653** (0 skipped both before and after).

### Build identity

| Item | Value |
|---|---|
| Product version | 0.1.0 (from `app/Config/ZeeEducation.php`) |
| Release type | **pre-release** (no Git tag) |
| Commit recorded in manifest | `0ee7a233b493921c54795f6441acbaeb4537d281` (branch `main`) |
| Git tag | **none** |
| Working tree at build | **dirty — 168 changed/untracked entries** (raw `git status --porcelain` at build; the earlier 167 figure was a filtered count that dropped the `?? .github/` line — no path changed between the build and that recount; the repo has since grown to 169 with `quality/docs/csrf-client-audit.md`, a repo-only doc) |
| Build date | 2026-10-20 |
| Build command | `powershell -ExecutionPolicy Bypass -File release\build-package.ps1 -Composer <composer.phar>` |

### Artefacts

| Item | Value |
|---|---|
| ZIP | `release/Zee_Education_v0.1.0_Hostinger_Installer.zip` |
| ZIP size | 4,105,230 bytes (3.91 MB) |
| **ZIP SHA-256** | `7099f7deb40c514c69e895f711462d4e10d0f441ffefd1d03536d73128ea605b` |
| Files | 1,308 (the manifest reports exactly this; verified against a tree count) |
| Uncompressed | 13,016,654 bytes (includes `package-manifest.json` itself) |
| Checksums | `release/SHA256SUMS.txt` (regenerated, matches) |
| Build 1 kept as | `Zee_Education_v0.1.0_Hostinger_Installer.zip.bak-20261019-224837` |
| Build 2 kept as | `Zee_Education_v0.1.0_Hostinger_Installer.zip.bak-20261020-025056` |
| Build 3 kept as | `Zee_Education_v0.1.0_Hostinger_Installer.zip.bak-20261020-052205` |

### Verification — build 4

Checked by `tools/verify-package.php` on **both** the build tree and the extracted ZIP:

| Run | Result |
|---|---|
| build tree | **35 checks, 0 failures, 0 warnings — PACKAGE VERIFIED OK** |
| extracted ZIP | **35 checks, 0 failures, 0 warnings — PACKAGE VERIFIED OK** |

Additional checks against the staged/extracted tree:

| Check | Result |
|---|---|
| staged `application/app/Config/Filters.php` | `cors` in `$required['before']` + `secureheaders` in `$globals['after']` **present** |
| staged `.env.example` | `cookie.secure = true` **present** |
| shipped `documentation/09-security-and-privacy.md` | security-headers + expanded CORS bullets **present** (CSP honestly noted as not emitted) |
| shipped `CHANGELOG.md` | build-4 security bullet present; limitations corrected to 35/35 + 161/653 |
| reference UI hashes | **3/3 unchanged** (`deec1fceb…` Mobile, `56d82bef…` School, `df876fbc…` Super Admin) |
| synthetic pilot data / real `.env` / private keys | **0 hits / absent / none** |
| runtime probe driver + evidence docs | **absent** (repo-only, as intended — they are not package furniture) |

### Tests — build 4

```
backend:  php vendor/bin/phpunit --no-coverage   → 161 tests, 653 assertions, 0 skipped, 0 failures
frontend: npm run check                          → 816 tests, 816 pass, 0 fail (+ UI lock 3/3)
```

Runtime evidence for this build's security claims: pre-bundle probe 28 checks
(26 PASS + 2 deliberate dormancy findings) and post-bundle probe **32/32 PASS at
build time** (`quality/docs/security-runtime-review.md`, repo-only).

**Post-build extension (same day, evidence-only):** the probe gained the `H`
session-fixation block — Shield's login-time `regenerate(true)` live-verified
(SC-5 / SF-01 / SF-02 closed) + **36/36 PASS** — and the backend suite was
re-validated from fresh empty CI-harness databases (`zee_ci` / `zee_ci_school`)
at **161 tests / 653 assertions**. Shipped code did not change after build 4,
so build 4's ZIP SHA-256 above described the then-current artefact (point-in-time
statement — superseded by builds 5-7; current figures in §17d).

### Quality gate — unchanged, still blocking READY

Same five blockers as builds 2/3: `FINAL_RELEASE_STATUS: BLOCKED`, no role
smoke tests, no Git tag, no third-party buyer test, no live smoke of the
current build. **Nothing about build 4 changes them.**

---

## 16. BUILD 3 — 2026-10-20 (superseded)

Rebuilt with `release/build-package.ps1` after RB-4 (provisioning idempotency)
and the documentation-honesty corrections landed. Supersedes build 2's
`43ee1dae…` artefact, which is kept as
`Zee_Education_v0.1.0_Hostinger_Installer.zip.bak-20261020-025056`.

### What changed since build 2

- **New migration** `2026-10-20_000016_add_provisioning_jobs_idempotency_key.php`
  — `provisioning_jobs.idempotency_key VARCHAR(191) NULL` + UNIQUE index
  `uq_provisioning_jobs_idempotency_key` (closes release blocker RB-4 at
  schema level).
- **New test file** `ProvisioningIdempotencyTest` (5 tests / 18 assertions)
  pinning DB rejection of duplicate keys, duplicate school-code refusal
  (409, one row remains) and the completed-school re-provision no-op.
- **Shipped `CHANGELOG.md`**: new "Provisioning idempotency (database-level)"
  bullet under Added; the stale "package verifier 34/34 + 150 backend tests"
  limitation corrected to 35/35 + 155/621.
- Backend suite grew 150/603 → **155/621** (0 skipped both before and after).

### Build identity

| Item | Value |
|---|---|
| Product version | 0.1.0 (from `app/Config/ZeeEducation.php`) |
| Release type | **pre-release** (no Git tag) |
| Commit recorded in manifest | `0ee7a233b493921c54795f6441acbaeb4537d281` (branch `main`) |
| Git tag | **none** |
| Working tree at build | **dirty — 156 changed/untracked entries** |
| Build date | 2026-10-20 |
| Build command | `powershell -ExecutionPolicy Bypass -File release\build-package.ps1 -Composer <composer.phar>` |

### Artefacts

| Item | Value |
|---|---|
| ZIP | `release/Zee_Education_v0.1.0_Hostinger_Installer.zip` |
| ZIP size | 4,103,548 bytes (3.91 MB) |
| **ZIP SHA-256** | `b2fae3645c92e1c2c935b4fba46f42d70025dd8dd306f40ced32454e27a1efc0` |
| Files | 1,308 (the manifest reports exactly this; verified against a tree count) |
| Uncompressed | 13,012,841 bytes (includes `package-manifest.json` itself) |
| Checksums | `release/SHA256SUMS.txt` (regenerated, matches) |
| Build 1 kept as | `Zee_Education_v0.1.0_Hostinger_Installer.zip.bak-20261019-224837` |
| Build 2 kept as | `Zee_Education_v0.1.0_Hostinger_Installer.zip.bak-20261020-025056` |

### Verification — build 3

Checked by `tools/verify-package.php` on **both** the build tree and the extracted ZIP:

| Run | Result |
|---|---|
| build tree | **35 checks, 0 failures, 0 warnings — PACKAGE VERIFIED OK** |
| extracted ZIP | **35 checks, 0 failures, 0 warnings — PACKAGE VERIFIED OK** |

Additional checks against the extracted ZIP:

| Check | Result |
|---|---|
| migration `2026-10-20_000016_…idempotency_key.php` | **present** in `application/app/Database/Migrations/` |
| shipped `documentation/11-billing-api.md` | byte-identical to `backend/docs/api/billing-api.md` (SHA-256 `ac9123e9…`) |
| shipped `CHANGELOG.md` | build-3 additions present (RB-4 bullet, 35/35 + 155/621 limitation) |
| reference UI hashes | **3/3 unchanged** (`deec1fceb…` Mobile, `56d82bef…` School, `df876fbc…` Super Admin) |
| synthetic pilot data / real `.env` / private keys | **0 hits / absent / none** (as in build 2) |

### Tests — build 3

```
backend:  php vendor/bin/phpunit --no-coverage   → 155 tests, 621 assertions, 0 skipped, 0 failures
frontend: npm run check                          → 816 tests, 816 pass, 0 fail (+ UI lock 3/3)
```

### Quality gate — unchanged, still blocking READY

Same five blockers as build 2 (section 15): `FINAL_RELEASE_STATUS: BLOCKED`,
no role smoke tests, no Git tag, no third-party buyer test, no live smoke of
the current build. **Nothing about build 3 changes them.**

---

## 15. BUILD 2 — 2026-10-19 (superseded)

Rebuilt with `release/build-package.ps1` after the licence/billing work landed.
Build 1's source had drifted from what the package claimed to ship; see
`PACKAGING_DECISIONS.md` section 9 for the full list of decisions.

### Build identity

| Item | Value |
|---|---|
| Product version | 0.1.0 (from `app/Config/ZeeEducation.php`) |
| Release type | **pre-release** (no Git tag) |
| Commit recorded in manifest | `0ee7a233b493921c54795f6441acbaeb4537d281` (branch `main`) |
| Git tag | **none** |
| Working tree at build | **dirty — 146 changed/untracked entries** |
| Build date | 2026-10-19 |
| Build command | `powershell -ExecutionPolicy Bypass -File release\build-package.ps1 -Composer <composer.phar>` |

### Artefacts

| Item | Value |
|---|---|
| ZIP | `release/Zee_Education_v0.1.0_Hostinger_Installer.zip` |
| ZIP size | 4,102,121 bytes (3.91 MB) |
| **ZIP SHA-256** | `43ee1daee45fdce6d1567d52f278910e84c2299001f0ff4c7ab98ba82805cbf8` |
| Files | 1,307 (the manifest reports exactly this; verified against a tree count) |
| Uncompressed | 13,010,431 bytes (includes `package-manifest.json` itself) |
| Checksums | `release/SHA256SUMS.txt` (regenerated, matches) |
| Build 1 kept as | `Zee_Education_v0.1.0_Hostinger_Installer.zip.bak-20261019-224837` |

### Verification — build 2

Checked by `tools/verify-package.php` on **both** the build tree and the extracted ZIP:

| Run | Result |
|---|---|
| build tree | **35 checks, 0 failures, 0 warnings — PACKAGE VERIFIED OK** |
| extracted ZIP | **35 checks, 0 failures, 0 warnings — PACKAGE VERIFIED OK** |

Additional checks run against the extracted ZIP:

| Check | Result |
|---|---|
| reference UI hashes | **3/3 unchanged** (`deec1fceb…` Mobile, `56d82bef…` School, `df876fbc…` Super Admin) |
| reference UI files shipped | absent; only tokenised runtime copies in `app/Views/portal/` |
| synthetic pilot data (`Test Student`, `pilot_marker`, `ALPHA_ONLY`, `zi_*`, `owner@school.test`) | **0 hits** |
| real `.env` | **absent** (only `.env.example`, 11 `CHANGE_ME` placeholders) |
| private keys / hosting account ids in app code | **none** |
| `mediumaquamarine` | CSS colour name in Kint's colour table — not the hostname (false positive, as in build 1) |
| dev packages in `installed.json` | `dev: false`, 8 production packages only |
| framework test suite | absent (stripped) |
| qr-code label fonts | absent (stripped, unused) |
| `sw.js` caching `/m` | **fixed** — shell is `/manifest.json` only, cache bumped to `zee-shell-v2` |
| new classes in shipped autoloader | `BillingApi`, `ConnectApi`, `ApiCsrfFilter`, `LicenseService`, `QrRenderer` all present |
| `endroid/qr-code` + transitive deps | present (missing from build 1 — would have fataled) |
| shipped `CHANGELOG.md` | build-2 sections present in the extracted ZIP (licence/billing, QR invites, `sw.js`, auth fixes, packaging fixes, documentation-honesty fixes, "not deployed" limitation) |
| shipped `documentation/10-license-and-support.md` | states invoices are recorded through the internal billing API; no screen, no activation, no gateway, no phone-home |
| shipped `documentation/11-billing-api.md` | **new guide 11** — copied at build time from `backend/docs/api/billing-api.md` (single source); verifier now checks guides 1-11 |
| shipped `documentation/09` / `08` | CSRF posture and health-endpoint example corrected to match the code |
| shipped `LICENSE.txt` / `README_FIRST.txt` | control-plane description now includes licence-billing records; learner-table ban unchanged |
| shipped `README_FIRST.txt` guide list / `documentation/index.html` | updated for guide 11 |

Repo-only documentation (not shipped in the ZIP, lives in the working tree):
`backend/docs/api/openapi-v0.md` route table rebuilt — all 39 application routes with
guards and plane, plus a CSRF-coverage table for state-changing routes.

### Backend tests — build 2

```
php vendor/bin/phpunit --no-coverage
Tests: 150, Assertions: 603, Skipped: 0, Failures: 0
```

Build 1 shipped with 62 tests / 145 assertions / 1 skipped. The suite now includes the
`BillingApiTest` contract (20 tests), `LicenseEnforcementTest` (11 tests, auth-isolation
fixed), role, write-API, provisioning and PWA tests.

### Quality gate — unchanged, still blocking READY

| Gate | State |
|---|---|
| `FINAL_RELEASE_STATUS: GO` | **NO** — still `BLOCKED` |
| Role smoke tests | **NOT EXECUTED** — no owner-approved role accounts exist |
| Git tag | **none**; 146 dirty working-tree entries |
| Independent third-party Hostinger buyer test | not done |
| Live smoke of the rebuilt package | **not executed** — local build only, this session had no live deployment access |

**Nothing about build 2 changes these blockers.** The package is verified for what it is;
it is still a pre-release that has not been deployed or smoke-tested end to end.

## 1. Quality gate

| Gate | State | Evidence |
|---|---|---|
| `FINAL_RELEASE_STATUS: GO` | **NO** | `backend/FINAL_RELEASE_AND_PILOT_REPORT.md` reads `FINAL_RELEASE_STATUS: BLOCKED` |
| Role smoke tests | **NOT EXECUTED** | no owner-approved Super Admin / School Admin / Teacher / Parent / Student accounts exist |
| Clean control-plane migration | PASS | real, in a live Hostinger database and again locally |
| Dedicated-school provisioning | PASS | two synthetic schools, two separate databases |
| Cross-school isolation | PASS | denied at the database privilege layer |
| Backup / restore | PASS | control + both schools dumped, restored, verified |
| Backend tests | PASS | 62 tests, 145 assertions, 1 skipped, 0 failures |
| UI hashes | PASS | 3/3 unchanged |

**Exact blockers for READY status:**

1. `FINAL_RELEASE_STATUS` is `BLOCKED`, not `GO`. The product has never been released.
2. Role smoke tests were never run. Without accounts for Super Admin, School Admin,
   Teacher, Parent and Student there is no evidence that attendance, results, manual fees,
   report/PDF export or role-restricted access work end to end.
3. ~~**No Git tag exists.**~~ **Closed 2026-10-21:** tree committed + pushed, annotated
   tag `v0.1.0-pre` created (commit `b1267df…`), and build 9 rebuilt from that tag —
   `package-manifest.json` now records `"git_tag": "v0.1.0-pre"` (build 3, whose
   figures this list accompanied, had 98 dirty entries and `"git_tag": null`).
4. No independent third-party Hostinger account test. Compatibility was validated against
   the vendor's own live hosting account and locally — not against a fresh buyer purchase.

---

## 2. Build identity

| Item | Value |
|---|---|
| Product version | 0.1.0 (from `app/Config/ZeeEducation.php`) |
| Release type | **pre-release** |
| Commit | `0ee7a233b493921c54795f6441acbaeb4537d281` (branch `main`) |
| Git tag | **none** |
| Working tree at build | **dirty — 98 entries** |
| Build date | 2026-10-18 |

---

## 3. Package artefacts

| Artefact | Path |
|---|---|
| ZIP | `release/Zee_Education_v0.1.0_Hostinger_Installer.zip` |
| ZIP size | 3.75 MB (3,936,105 bytes approx.) |
| **ZIP SHA-256** | `3bcece595463917a5d03cdf7fd2720c7934f0572170988f561c0c1557eff3406` |
| Checksums | `release/SHA256SUMS.txt` |
| Release notes | `release/RELEASE_NOTES_v0.1.0.md` |
| Packaging decisions | `release/PACKAGING_DECISIONS.md` |
| Source manifest | `release/source-manifest.json` |
| Build report | `release/PACKAGE_BUILD_REPORT.md` (this file) |

Verify the download before use:

```bash
sha256sum Zee_Education_v0.1.0_Hostinger_Installer.zip
# compare with SHA256SUMS.txt
```

---

## 4. Package structure

```
Zee_Education_v0.1.0/
  README_FIRST.txt            5-minute start path
  LICENSE.txt                 commercial licence (not the CI4 starter licence)
  CHANGELOG.md
  .env.example                placeholders only
  package-manifest.json
  application/                deployable product; web root = application/public
    app/                      Config, Controllers, Libraries, Models, Views,
                              SchoolLocal/Database/Migrations (school namespace)
    public/                   document root
    vendor/                   production dependencies only
    writable/                 empty skeleton with index.html guards
    spark, composer.json, composer.lock, preload.php
  documentation/
    index.html                self-contained offline home
    01..10-*.md
  database/README.md          no dump is shipped, and why
  tools/verify-package.php
```

1,139 files · 12,407,095 bytes uncompressed.

---

## 5. Sensitive-material exclusion — verified

Checked by `tools/verify-package.php` on the **extracted ZIP**, not on the build folder.

| Excluded | Verified |
|---|---|
| `.env` (real server environment file) | absent |
| `.env.*` variants | absent |
| `writable/install.lock` | absent |
| `writable` cache / logs / session / uploads contents | absent (only `index.html` guards) |
| `tests/`, `phpunit.dist.xml` | absent |
| `.git/`, `.gitignore` | absent |
| `node_modules/` | absent |
| `*.log` | absent |
| `*.sql` (any database dump) | absent |
| dev dependencies (phpunit, faker, vfsstream + 27 transitive) | absent |
| `vendor/codeigniter4/framework/tests` | absent |
| `vendor/bin` test binaries | absent |
| agent handoff folders, internal reports | absent |
| the three approved reference UI HTML files | absent (never shipped) |

### Credential scan

The verifier flags any `u<7+ digits>_<name>` pattern, which is a hosting account
identifier. It found **one real leak** during the build:

> `application/app/Libraries/SchoolProvisioningService.php` contained a hardcoded
> hosting account prefix belonging to the vendor's own host.

That was a genuine defect: it would have shipped a real hosting identifier to every
buyer. The service now requires `ZEE_SCHOOL_DB_PREFIX` from server configuration and has
**no** host-specific default.

The re-scan of the extracted ZIP reports **no hosting credentials and no private keys**.

Two additional false-positive notes: `mediumaquamarine` appears inside the framework's
debug library as a **CSS colour name**, and it also matched the vendor's pilot hostname in
an earlier scan pattern. Neither is a secret; the hostname is not present in the package.

---

## 6. Installer test result — PASSED

Executed against the **extracted ZIP** on a fresh synthetic database (`zi_control`), not
against the development tree.

| Step | Result |
|---|---|
| `GET /install` | HTTP 200, **14 PASS / 0 FAIL / 0 CHECK** |
| Step 1 preflight → continue | redirected to `/install/database` |
| Step 2 connection test | "Connection successful" |
| Step 2 migrations | redirected to `/install/admin`, **"Migrations complete"** |
| Step 3 Super Admin | redirected to `/install/done`, completion page shown |
| Install lock | `writable/install.lock` created |
| Installer after install | `/install` → **`/login`** (locked) |
| Sign-in | **succeeded**, `auth_logins` row written |

### Migration order actually recorded in the database

```
2020-12-28-223112   CodeIgniter\Shield
2021-07-04-041948   CodeIgniter\Settings
2021-11-14-143905   CodeIgniter\Settings
2026-07-20-181246   CodeIgniter\Settings
2026-10-18_000001   App   ... through ... 2026-10-18_000008
```

Shield first, then Settings, then the Zee control plane. Correct.

### Super Admin record created by the installer

```
users                : id=1, username=owner, status=active
auth_groups_users    : user_id=1, group=superadmin
auth_identities      : user_id=1, type=email_password, secret=owner@school.test
```

---

## 7. Provisioning and isolation test — PASSED

Run from the extracted ZIP against three fresh synthetic databases.

| Database | Tables | Role |
|---|---|---|
| `zi_control` | 14 | control plane |
| `zi_school_a` | 22 | school A |
| `zi_school_b` | 22 | school B |

Both schools were provisioned through `SchoolProvisioningService::provisionSchool()`:

```json
{"code":"alpha","result":{"success":true,"state":"completed","database":"zi_school_a"}}
{"code":"beta","result":{"success":true,"state":"completed","database":"zi_school_b"}}
```

### Separation checks

| Check | Result |
|---|---|
| school-local tables inside control plane | **0** |
| control-plane tables inside school A | **0** |
| control-plane tables inside school B | **0** |
| marker row `ALPHA_ONLY` readable in school A | yes |
| same marker in school B | **0 rows** |
| `school_settings` table present in control plane | **0** |

Earlier, against the live Hostinger deployment, cross-database access was additionally
denied at the privilege layer:

```
control user -> school DB  : ERROR 1142 (INSERT command denied)
school user  -> control DB : ERROR 1142 (INSERT command denied)
```

---

## 8. Backup / restore drill — PASSED

| Database | Dump size | Restored tables | Restored data verified |
|---|---|---|---|
| control plane | 40 KB | 14 | 2 school records |
| school A | 60.9 KB | 22 | marker `ALPHA_ONLY` readable |
| school B | 60.6 KB | 22 | marker correctly absent |

Isolation survived the restore: the restored control plane contains **0** school-local
tables.

On the live Hostinger deployment the same drill was run and both databases were restored
and verified after a first attempt that emptied them by mistake; both were recovered from
the correct dumps with no data loss.

---

## 9. Backend tests

```
php vendor/bin/phpunit --no-coverage
Tests: 62, Assertions: 145, Skipped: 1, Failures: 0
```

Run after every code change made during packaging. The one skipped test is
environment-dependent and was skipped before this work began.

Composer autoload generation is clean (607 classes, no PSR-4 violations). Two models that
shared a single file were split so they can actually autoload.

---

## 10. UI hash result — 3/3 UNCHANGED

```
deec1fceb15cdf4af44d174a65ff27261b1ad87d7418087f3783fa8bbbb73d9f  Zee Education - Mobile App Preview.html
56d82bef4b1ef5ede1811fc12da0f643b1db0c328926b24de4f10f5d78a6948d  Zee Education - School Dashboard.html
df876fbc699389c5e1128d99678ead93c3ac1e4340a4a805948e8d5ba606cb30  Zee Education - Super Admin.html
```

All three match `REFERENCE_UI_LOCK.md` exactly. No approved UI file was created, modified,
moved or shipped at any point during packaging.

---

## 11. Documentation inventory

| File | Covers |
|---|---|
| `documentation/index.html` | offline home, works with no internet |
| `01-requirements.md` | PHP, extensions, database, limits |
| `02-hostinger-installation.md` | domain, document root, upload, permissions, `.env`, the no-`CREATE DATABASE` fallback |
| `03-first-run-setup.md` | the three installer steps explained |
| `04-super-admin-school-provisioning.md` | creating and provisioning a school |
| `05-school-admin-onboarding.md` | what a School Admin configures |
| `06-backup-restore.md` | per-database backup, scheduling, restore, verification |
| `07-update-guide.md` | backup-first update, migration order, rollback |
| `08-troubleshooting.md` | database, intl, writable paths, Shield migrations, provisioning permissions, 500s |
| `09-security-and-privacy.md` | separate databases, secrets, HTTPS, least privilege, data ownership |
| `10-license-and-support.md` | commercial terms, no activation, support boundaries |

Simple English, with short Roman Urdu notes where genuinely helpful. No CDN fonts, no
external scripts — every file opens offline.

---

## 12. Hostinger compatibility limits and fallback

Verified against a live account:

| Item | Result |
|---|---|
| PHP 8.3.35 | works |
| `intl`, `mbstring`, `mysqli`, `openssl` | present |
| Composer 2.9.8, MariaDB 11.8.9 | present |
| Document root must be `public/` | enforced by installer preflight |
| `CREATE DATABASE` from PHP | **denied** (`ERROR 1044`) |
| `CREATE USER` from PHP | **denied** (`ERROR 1227`) |
| `GRANT` from PHP | **denied** (`ERROR 1044`) |

**Fallback (shipped and documented):** the host creates one database and one MySQL user per
school; the mapping is supplied through server-local `.env` using
`ZEE_SCHOOL_DB_MAP = code=database_name`. Provenance of the code is unchanged, and
provisioning worked end to end this way in the package test. The one-school-one-database
rule is preserved in both paths.

A warning worth repeating: on some Hostinger accounts the domain's document root is a
**symlink to another live application**. Overwriting it destroys that other site. The
package tells buyers to check first.

---

## 13. Remaining known limitations and owner actions

**Owner actions, in order:**

1. ~~Commit the working tree and create a Git tag. Rebuild so the manifest is not `null`.~~
   **Done 2026-10-21:** tree committed + pushed, annotated tag `v0.1.0-pre` created,
   build 9 rebuilt from it — the manifest now records the tag (`§17g`).
2. Create the five role accounts and run the smoke tests. This is the real remaining
   release gate.
3. Rotate the SSH password that was exposed earlier in chat, and delete the plain-text
   credential lines from the local `backend/.env`.
4. Have a second person verify the received ZIP against `SHA256SUMS.txt` and run
   `php tools/verify-package.php`.

**Known limitations of 0.1.0:**

- role smoke tests unverified
- still a **pre-release**: the source is tagged `v0.1.0-pre` (a pre-release tag, not a
  stable-release tag)
- manual or cron backups only, no scheduler UI
- manual licence handling, no activation
- no automated update path
- `ZEE_SCHOOL_DB_PREFIX` must be configured; there is deliberately no default
- shared hosting cannot auto-create databases, by host policy
- not tested on an independent buyer account

---

## 14. What was NOT claimed

- No claim of CodeCanyon approval, review, or acceptance.
- No claim that this is a stable, tagged release. It is a pre-release.
- No claim of a completed pilot: the pilot smoke tests were never executed.
- No invented test, migration or verification result appears anywhere in this report; every
  figure above came from a command that was actually run.