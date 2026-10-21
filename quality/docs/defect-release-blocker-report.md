# Prioritized Defects & Release-Blocker Report — M-C-05

- Agent: Cline (QA/Security/Ops). Microtask **M-C-05** (Batch M). 2026-10-17.
- Purpose: consolidated, prioritised defect and release-blocker list for non-blocking acceptance. All items carry evidence and a severity; nothing is claimed as passing beyond what was executed.

## Severity definitions

| Severity | Meaning |
|----------|---------|
| S1 — Critical | Security/isolation/data-loss defect; **never waivable**; blocks pilot. |
| S2 — High | Blocks a Batch exit gate item or a security/data boundary. |
| S3 — Medium | Works-around exist; fix before pilot but does not block it. |
| S4 — Low | Cosmetic/process; fix opportunistically. |

## Release-blockers (S1/S2) — pilot NOT approvable yet

| ID | Category | Item | Evidence | Priority / owner |
|----|----------|------|----------|------------------|
| RB-1 | S1 | No server-side authentication/authorization exists | Backends=Health/Home/Setup; Filters/Models/Libraries empty (2026-10-17) | Must fix before any auth endpoint exists |
| RB-2 | S1 | No server-side auth negative-tested | `role-policy-test-cases.md` spec only; suite has 0 auth tests (27/27 has none) | G6 gate |
| RB-3 | S1 | Tenant isolation untested at runtime | No provisioning; no 2nd school; T-1..T-27 + CN/ISO not run | G7 gate |
| RB-4 | S1 | Provisioning idempotency guard missing (R-2) | `provisioning_jobs` has no unique on (school_id,type)/target_database | Pre-pilot must close |
| RB-5 | S1 | No backup/restore drill executed | M-C-02 blocked (no school DB); runbook §5 open | G9 gate |
| RB-6 | S1 | No sales/retention/license expiry path | No licensing logic; T-25..T-27 unexecuted | G8 |
| RB-7 | S2 | CSRF/secure-headers/CSP configured but not enabled; `Cookie::$secure=false` | B-C-04 findings SC-2/3/6 | Hardening pre-prod |
| RB-8 | S2 | PATH PHP lacks `intl` | 22/22 failure → 27/27 with Laracon PHP | Env fix only |

## Medium / Low (S3/S4)

| ID | Category | Item | Evidence |
|----|----------|------|----------|
| MB-1 | S3 | `Composer audit`/dependency CVE scan not run | No network assumption; do in CI |
| MB-2 | S3 | `regenerateDestroy=false` (old session not destroyed on *auto*-rotation) | Login-time destroy already provided by Shield `regenerate(true)` (verified live 2026-10-20, probe H2/SF-02); residual = auto-rotation keeps the old record until GC — set `regenerateDestroy=true` if auto-rotation destroy is desired |
| MB-3 | S3 | No enforcement of `secure` on session/CSR cookies in prod | SC-3/4 |
| MB-4 | S3 | No frontend retention of school-local auth/session state | Client scaffolding present, no server session |
| MB-5 | S4 | Reference UI audit tooltip/format copy references `IB-04`, `INT-00` tracking IDs | To resolve with owners; reference byte-lock untouched |
| MB-6 | S4 | Test coverage of business modules absent until implementation lands | E–H,M test suites only exercise adapter/foundation |

## What is NOT a blocker (artifact of scope)

- No online payment/SMS/automated WhatsApp (V1 exclusion) — verified pass (G-C-04).
- No hard-coded public pricing — pass (K-C-01); sample UI strings are locked copy only.
- No SMS/payment/WhatsApp API in code — verified pass (G-C-04).
- No real data present anywhere in the workspace by design.

## Release go/no-go (current)

- **NO-GO** for pilot. S1/S2 blockers RB-1..RB-7 remain open; each requires KiloCode to ship implementation first (auth, provisioning idempotency, business modules, exports, backup restore). M-C-03/M-C-05 findings are controls-ready to carry into pilot approval once those implement.
- Evidence links: `quality/contracts/health-setup-contract-checklist.md`, `provisioning-retry-idempotency-review.md`, `dependency-security-review.md`, `ops/release-gates.md`, `ops/backup-restore-runbook.md`.

## Status
- Final verdict: **NO-GO for pilot** until RB-1..RB-8 are closed. All S1/S2 items have executed evidence (backend suite 27/27 + scan + schema review + reference lock) confirming they are real, and none were invented. Reference UI unchanged (3/3).

---

## Re-evaluation 2026-10-20 (supersedes the verdict wording above)

The 2026-10-17 table is history; this section states each blocker's current truth.
Evidence: `backend/FINAL_RELEASE_AND_PILOT_REPORT.md`, `ops/release-gates.md`
(re-evaluated same day), backend suite **164/673** (161/653 before the build-5
CSRF round), frontend **816/816**, package verifier **35/35** (current artifact:
**build 9**, `46f5a487…` — tagged `v0.1.0-pre`; builds 6-9 were doc/tag-only successors to build 5;
SHA/size/verification block in `release/PACKAGE_BUILD_REPORT.md` §17g).

| ID | State 2026-10-20 | Evidence |
|----|-------------------|----------|
| RB-1 | **CLOSED** — auth exists | Shield auth (throttling, identity sync); `session`/`role:*`/`superadmin`/`license` filters on every authenticated route; `RolePolicy` centralised checks |
| RB-2 | **NARROWED — still open** | Automated negatives green (billing non-superadmin JSON 401/403, licence enforcement, write-API roles) but the `role-permission-matrix.md` live row-by-row run has never executed (gate G6) |
| RB-3 | **NARROWED — still open** | Provisioning exists; isolation proven live at the privilege layer (`ERROR 1142` both directions) + automated cross-school tests; **T-1..T-27 matrix rows still have no execution record** (gate G7) |
| RB-4 | **CLOSED (schema + behaviour)** | Migration `2026-10-20_000016` adds `provisioning_jobs.idempotency_key` + UNIQUE `uq_provisioning_jobs_idempotency_key` (DB rejects duplicate keys, error 1062; multiple NULLs stay allowed for keyless rows). Chosen over UNIQUE `(school_id,type)`/`target_database` because one target legitimately accumulates many jobs over time (install today, migrate each release) — uniqueness belongs to the caller-supplied key, per C-C-03 rec #1. Behaviour pinned in `ProvisioningIdempotencyTest` (5 tests/18 assertions): index+column exist, duplicate key rejected by the DB, NULL keys allowed, duplicate `school_code` refused 409 with one row remaining, re-provision of a completed school returns `Already provisioned` without state change |
| RB-5 | **CLOSED (execution)** — owner sign-off open | Backup/restore drill executed on live Hostinger across both databases; owner RPO/RTO/retention placeholders still unfilled (gates G9/G10) |
| RB-6 | **CLOSED as a defect** | Licensing path exists: `LicenseService`/`LicenseFilter`/`BillingApi`, six migrations, `LicenseEnforcementTest` (11) + `BillingApiTest` (20) green; T-25..T-27 live rows remain (gate G8) |
| RB-7 | **CLOSED (2026-10-20, build-5 CSRF round) — two recorded hardening limitations remain open as separate items** | All five sub-items closed locally. **CORS** — `cors` filter in `Filters.php` `$required['before']` (preflights answered before routing), live matrix pre/post (28 → **36/36** → **39/39 PASS**) + `SecurityHeadersRuntimeTest`: deny-by-default when unset, explicit origin echo when set, never `*`; **secure headers** — `secureheaders` in `$globals['after']`, five headers live-observed; **`Cookie::$secure`** — env-driven (`cookie.secure`), polarity live-verified both ways (prod must set `true`); **login-time session regeneration (SC-5 / SF-01 / SF-02)** — Shield `startLogin()` → `regenerate(true)` live-verified by probe `H1`/`H2`/`H3` (SF-04 auto-rotation destroy remains MB-2); **global CSRF** — `$globals['before']` now `'csrf' => ['except' => ['api/admin/billing*']]`: installer, Shield login/2FA/magic-link, and every non-billing API refuse token-less mutations (`SecurityException::forDisallowedAction`); billing keeps route-level `api_csrf` (JSON `{error: csrf_required}` contract preserved; global filter excepted because `Security::verify()` consumes + regenerates the token, so a double run would always fail). Enabling round executed same day per the client audit (`quality/docs/csrf-client-audit.md` §4): only **9** real HTTP write calls needed retrofitting (not ~53 — the rest were Query Builder cleanup), via new `Tests\Support\CsrfTokenTrait`; probe extended with `I1`/`I2`/`I3` polarity checks (**39/39 PASS**); suite green with the filter on (**164/671**), and the CI empty-DB recipe re-validated at 164/671. Collateral repair (forced by `I2`): `ConnectApi` resolve/verify were dead `500`s (non-existent `Throttler::checkTokens()` + PSR-6-colon-hostile bucket keys) — fixed (`Throttler::check()` + `throttleKey()`), covered by new `ConnectApiTest` (3 tests), probe `A` row for `/api/connect/verify` now 200 (RT-10). Residuals now tracked only as SC-2 (`tokenRandomize=false` — defense-in-depth; session-mode tokens are not cookie-readable) and SC-6 (CSP — needs per-view nonces); both shipped-documented, neither blocks a pilot |
| RB-8 | **CLOSED for the dev CLI** | Suite green on PHP 8.3.33 with required extensions; buyer hosts covered by `documentation/01-requirements.md` |
| MB-1 | **CLOSED** | `composer audit` clean, recorded in `PROJECT_STATUS_FOR_OWNER.md` |
| MB-6 | **CLOSED** | 164 backend + 816 frontend tests covering the business modules (backend evolved 155 → 161 → 164 through the 2026-10-20 security + CSRF rounds) |
| MB-2/3/4/5 | unchanged — open | not re-verified this round |

**Current verdict: still NO-GO for pilot** — remaining open blockers: RB-2, RB-3,
RB-7, plus the owner-decision gates (G9/G10) and CI pin (G1/G2) tracked in
`ops/release-gates.md`. Nothing above is marked closed without evidence.

### RB-4 closure record (2026-10-20, second round)

- Schema: `backend/app/Database/Migrations/2026-10-20_000016_add_provisioning_jobs_idempotency_key.php`
  (column `VARCHAR(191) NULL` + explicit `ALTER TABLE ... ADD UNIQUE` — the
  CREATE-TABLE-TIME unique-next-to-AUTO_INCREMENT quirk noted in migrations
  000009/000010 is avoided by applying it as an ALTER, proven safe by 000007).
- Applied to `zee_education_control` via `php spark migrate` and to
  `zee_education_control_test` (the DB phpunit uses under
  `ENVIRONMENT=testing`) with identical schema + history rows.
- Behaviour: `backend/tests/Feature/ProvisioningIdempotencyTest.php` — green
  in the full suite run of **161 tests / 653 assertions / 0 skipped** (155/621
  at the time of the RB-4 closure; re-verified green after the 2026-10-20
  security round and again after the build-5 CSRF round — suite now
  **164/671**, with the write calls carrying CSRF tokens via
  `CsrfTokenTrait::withCsrf()`).
