# Release Gates — Pilot Go/No-Go — C-02.3

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-02.3** (Batch A)
- Created: 2026-10-17
- **Last re-evaluated: 2026-10-20** (gates doc rule: re-evaluate at every pilot review)
- Purpose: objective, binary conditions that must all be **GO** before a pilot is approved. Each gate names its pass criterion and its current status with evidence. A gate that cannot be evaluated yet is **NO-GO (blocked)**, not "assumed OK."

## How to use

- Every gate is **GO** or **NO-GO**. No partial credit, no "mostly done."
- "GO" requires objective evidence (a green test run, a matching hash, a signed drill record) — not a claim.
- Any single **NO-GO** blocks pilot. Security/data-loss gates (G6, G7, G8) are **never** waivable.

## Gates

### G1 — Environment / toolchain ready
- **Pass criterion:** Backend suite runs green using a pinned PHP with `intl`, `mysqli`, `pdo_mysql`, `mbstring`, `openssl`, `curl`, `dom`, `xml`, `fileinfo`, `gd`, `zip`; MySQL/MariaDB starts; `.env` present locally with an explicit/empty CORS allowlist (no `*`).
- **Evidence:** `ops/windows-laragon-preflight.md` checklist; `phpunit` → `OK`; a CI/runner record pinning the runtime.
- **Current status (2026-10-20):** **NO-GO (runner definition now exists; remote run pending).** Suite green on PHP 8.3.33 CLI: `OK (161 tests, 653 assertions)` at the security round — **after the build-5 CSRF round: `OK (164 tests, 671 assertions)`** (recorded in `backend/FINAL_RELEASE_AND_PILOT_REPORT.md`); frontend green on Node via `npm run check` → 816/816. The pin is now formalised as code: `.github/workflows/ci.yml` pins PHP `8.3` with exactly the extension list in the pass criterion, a MySQL 8.0 service, and a Node 24 frontend job. Its complete backend recipe was **validated locally from empty databases on 2026-10-20**: Shield+Settings+App (20 migrations) into `zee_ci`, `LicensePlansSeeder`, 8 `AppSchool` migrations into a separate `zee_ci_school`, then `OK (155 tests, 621 assertions)` with the control/test histories confirmed untouched (20/20 rows); **re-run from fresh empty `zee_ci`/`zee_ci_school` after the security round (same day): `OK (161 tests, 653 assertions)`** on the identical recipe — **and re-run again in the build-5 CSRF round: `OK (164 tests, 671 assertions)`** from fresh empty harness DBs. → **NO-GO until the workflow produces its first remote run log** (the repository currently has no git remote; needs the owner to push).

### G2 — Automated test suite green
- **Pass criterion:** The backend test suite passes (0 failures/errors) on the pinned runtime, and grows to cover implemented features.
- **Evidence:** CI/test log.
- **Current status (2026-10-20):** **NO-GO (coverage criterion met; pinned run outstanding).** Backend `164/671, 0 skipped, 0 failures` (161/653 before the build-5 CSRF round) covering authz, tenant isolation, migrations, licence enforcement (11 tests), billing API contract (20 tests), provisioning idempotency (5 tests), security headers/CORS runtime (6 tests), connect API contract (3 tests) and PWA; frontend `816/816` incl. role-guard and contract gates. The remaining gap to GO is now only the remote log: `.github/workflows/ci.yml` runs the exact same commands on the pinned runtime and its recipe passes locally from a clean schema (2026-10-20), but no run has executed on a runner yet.

### G3 — Reference UI lock intact
- **Pass criterion:** `node frontend/tools/verify-reference-ui.mjs` → `UI LOCK OK — 3/3` (exit 0); no unauthorised change to the three approved files.
- **Evidence:** verifier output + `quality/ui/reference-hashes.sha256`.
- **Current status (2026-10-20):** **GO (byte-level).** PASS 3/3, re-verified 2026-10-20 as part of `npm run check`. Note: byte-level only; full pixel regression (G3b) is a separate sub-gate.

### G3b — UI pixel regression after data binding
- **Pass criterion:** Runtime screens pixel-identical to reference at all viewports/colour passes (threshold 0) per `quality/docs/ui-regression-checklist.md`.
- **Evidence:** baseline vs candidate PNG diffs, 0 differing pixels.
- **Current status (2026-10-20):** **NO-GO (never executed).** Runtime pages now exist (`/portal`, `/school`, `/m`) but the pixel comparison has never been run. The release strategy ships byte-locked references with deliberately tokenised runtime copies, so a threshold-0 pixel match may no longer be the right criterion — but this gate is only redefined by an owner decision, never assumed. Remains NO-GO.

### G4 — No secrets / no real personal data in repo
- **Pass criterion:** No credentials, `.env` secrets, or real student/guardian data in source, tests, logs or docs; `.env` not committed with real values.
- **Evidence:** repo scan; package verifier.
- **Current status (2026-10-20):** **GO (repo + package scope).** Full scans executed repeatedly on 2026-10-19/20: no `.env` shipped (only `.env.example` with 11 `CHANGE_ME` placeholders), no private keys, no hosting account id, no synthetic pilot data (`Test Student`, `pilot_marker`, `ALPHA_ONLY`, `zi_*`, `owner@school.test` → 0 hits), no real learner data (none exists yet); `tools/verify-package.php` enforces this on every build — **35 checks, 0 failures** on build tree and extracted ZIP. Live-server log scope starts at deployment.

### G5 — CORS locked down
- **Pass criterion:** No `Access-Control-Allow-Origin: *` on any authenticated school/Super Admin API; explicit allowlist only; deny-by-default when unset.
- **Evidence:** `Config\Cors.php` review + runtime header assertions across authed routes.
- **Current status (2026-10-20):** **GO.** Static config verified deny-by-default/wildcard-rejected, **and** the runtime matrix executed the same day: pre-bundle probe (28 checks, found the `cors` alias never applied), bundle wired `cors` into `Filters.php` `$required['before']` (preflights answered before routing) + `secureheaders` in `$globals['after']` + env-driven `Cookie::$secure`, post-bundle probe **36/36 PASS** (10 unauth + 4 authed routes + preflights: no ACAO when unset, explicit origin echo when set, never `*`, never the caller's non-allowlisted origin; 5 security headers present; `secure` cookie polarity both ways; CSRF 403 intact; session-fixation `H1/H2/H3`: login issues a new session id, the pre-auth id is dead afterwards, the new id is authenticated — SF-01/SF-02, SC-5 closed), feature tests added. Extended the same day in the **build-5 CSRF round** to **39/39 PASS** (new `I` block: token-less non-billing API → 403 SecurityException, token-carrying POST → 200, token-less login POST → 403) with suite **164/671 green** (global `csrf` filter on, billing excepted to its JSON-contract `api_csrf`). Evidence: `quality/docs/security-runtime-review.md`, `quality/tools/security-runtime-probe.php`, `backend/tests/Feature/SecurityHeadersRuntimeTest.php`, `backend/tests/Feature/ConnectApiTest.php`. The header/CORS/fixation wiring ships in **build 4** (`7099f7de…`); the CSRF + `ConnectApi` repair ships in **build 5** (`b0cd78a6…`), carried unchanged into the current **build 8** (`b249281c81269432950c644669ba3635f56e05b287366dc1835840db784098ab` — builds 6-8 were doc-only; verifier 35/35 on build tree and re-run inside the extracted ZIP + byte-identical extraction), so the gate holds for repo *and* package scope.

### G6 — Authentication & server-side authorization enforced
- **Pass criterion:** Deny-by-default; every authenticated route has a server-side role check; browser-supplied school/role/IDs are never trusted; negative authz tests pass (`role-permission-matrix.md` §4).
- **Evidence:** negative-authz test results + live role matrix.
- **Current status (2026-10-20):** **NO-GO (partial — implementation exists, matrix not run).** This gate's 2026-10-17 reason ("no auth exists") is obsolete: Shield auth with login throttling, `session`/`role:*`/`superadmin`/`license` filters on every authenticated route, `RolePolicy` centralised checks, JSON 401/403 on API refusals, and automated negative tests are in place and green (billing non-superadmin refusals, licence enforcement, write-API role tests — part of the 155). What has **not** run is the full `role-permission-matrix.md` §4 row-by-row matrix against live accounts (no owner-approved accounts exist yet). **Never waivable.** → NO-GO until the matrix executes.

### G7 — Tenant isolation proven (dedicated DB per school)
- **Pass criterion:** All rows in `quality/docs/tenant-isolation-test-matrix.md` (T-1..T-24) return DENY/ALLOW as specified; dedicated database per school (ADR-001) actually provisioned; no cross-tenant read/write/export/file/job/cache leak.
- **Evidence:** matrix execution record with synthetic markers.
- **Current status (2026-10-20):** **NO-GO (partial — architecture proven, matrix rows not recorded).** This gate's 2026-10-17 reason ("no provisioning/second school") is obsolete: one-school-one-database was executed on a real Hostinger deployment — 0 school-local tables in the control plane, 0 control-plane tables in a school database, both directions denied at the privilege layer (`ERROR 1142`), plus green automated cross-school isolation, provisioning state-machine and idempotency tests (evidence: `backend/FINAL_RELEASE_AND_PILOT_REPORT.md`, `PILOT_DEPLOYMENT_REPORT.md`). The **T-1..T-24 matrix has still not been executed row-by-row** and no execution record exists in `quality/docs/tenant-isolation-test-matrix.md` (its header still reads "Planned checks"). **Never waivable.** → NO-GO until the matrix is executed and recorded.

### G8 — License expiry preserves data access/export
- **Pass criterion:** Expiring/suspending a license never deletes, hides, encrypts or export-blocks a school's own data (T-25..T-27).
- **Evidence:** executed T-25..T-27 record / owner-confirmed behaviour.
- **Current status (2026-10-20):** **NO-GO (partial — implemented and unit-tested, rows not executed).** This gate's 2026-10-17 reason ("not implemented") is obsolete: `LicenseService`/`LicenseFilter` are implemented — expiry blocks **writes only**, never deletes or hides data, licence keys stored hashed, renewals rotate keys — and `LicenseEnforcementTest` (11 tests) passes. What has not been executed is the T-25..T-27 behavioural record on a live school. **Never waivable** (owner decision preserved). → NO-GO until the rows are executed and recorded.

### G9 — Backup + proven restore drill
- **Pass criterion:** Per-school backups exist; a **non-production restore drill** passes with objective verification (row counts, marker, file checksum, login) and meets `<<OWNER_RTO>>`/`<<OWNER_RPO>>`; retention/RPO/RTO owner-approved (`ops/backup-restore-runbook.md` §1,§5).
- **Evidence:** signed drill record (runbook §6) + owner sign-off.
- **Current status (2026-10-20):** **NO-GO (drill executed; owner sign-off open).** The drill was run on the real Hostinger deployment across both databases (evidence: `backend/FINAL_RELEASE_AND_PILOT_REPORT.md` / `PILOT_DEPLOYMENT_REPORT.md`; the runbook's own §5 status line still says "not performed" as of 2026-10-17 and is superseded by those records). Owner RPO/RTO/retention placeholders in the runbook remain **unfilled** — an owner decision this agent must not invent. → NO-GO on owner approval.

### G10 — Owner decisions resolved
- **Pass criterion:** Outstanding owner decisions are closed: RPO/RTO/retention (`backup-restore-runbook.md` §1), Node runtime pin (`windows-laragon-preflight.md` A4), brand/legal clearance (noted in `Config\ZeeEducation.php`), pixel-gate redefinition (G3b), SSH credential rotation.
- **Evidence:** owner sign-off.
- **Current status (2026-10-20):** **NO-GO (open).** Multiple owner decisions outstanding, including rotation of the SSH password exposed earlier in chat.

## Pilot go/no-go summary (as of 2026-10-20)

| Gate | Topic | Status |
|------|-------|--------|
| G1 | Environment/toolchain | NO-GO (workflow authored + recipe validated from empty DBs; first remote run pending) |
| G2 | Test suite coverage | NO-GO (coverage met: 161 + 816; pinned runner ready — remote log pending) |
| G3 | UI lock (byte) | **GO** (3/3 verified 2026-10-20) |
| G3b | UI pixel regression | NO-GO (never executed; criterion may be redefined by owner) |
| G4 | No secrets/real data (repo + package) | **GO** (scans executed 2026-10-19/20; verifier 35/35) |
| G5 | CORS + runtime security headers + session fixation | **GO** (runtime matrix **39/39**, final run incl. SF-01/SF-02 + global-CSRF `I` block + feature tests; ships in build 5 — CSRF/`ConnectApi` half; header/CORS half shipped build 4) |
| G6 | AuthN/AuthZ | NO-GO (implemented + automated negatives green; live matrix pending accounts) |
| G7 | Tenant isolation | NO-GO (proven at privilege layer + tests; T-matrix rows not executed) |
| G8 | License data-access | NO-GO (implemented + 11 tests green; T-25..T-27 not executed live) |
| G9 | Backup + restore drill | NO-GO (drill executed; owner RPO/RTO sign-off open) |
| G10 | Owner decisions | NO-GO (open, incl. SSH rotation) |

**Overall: NO-GO for pilot.** G3, G4 and G5 are GO. The 2026-10-17 reasons for G6–G9 ("implementation does not exist") are all obsolete — the implementation now exists and is locally tested — but each still fails its evidence bar: live matrix execution (G6, G7, G8), owner sign-off (G9, G10), CI pin remote log (G1, G2), pixel gate (G3b). This matches `FINAL_RELEASE_STATUS: BLOCKED`.

## Rules

- Gates are binary and evidence-based; never mark GO without the stated evidence.
- Security and data-loss gates (G6, G7, G8, G9) cannot be waived by schedule pressure.
- This document does not certify compliance and does not claim any check that was not executed.
- Re-evaluate all gates at every pilot review; record results in the agent tracker.
