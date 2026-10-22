# Health / Setup API Contract Checklist — C-03.1

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-03.1** (Batch A)
- Created: 2026-10-17
- **Status: NOT BLOCKED.** KiloCode's Batch A API documentation is present and was reviewed. (It was absent at the very start of this session and was published concurrently by KiloCode; see `quality/docs/current-state-audit.md` §3.)

## 0. Document reviewed (source of truth — nothing invented here)

- `backend/docs/api/openapi-v0.md` — *OpenAPI v0 — Zee Education Control Plane*, Version 0.1.0, **Status: DRAFT — Batch A baseline**.
- Supporting docs cross-read: `backend/docs/control-plane-data-boundary.md`, `backend/docs/migration-plan.md`, `backend/README.md`.

This checklist verifies the **documented** Batch A contract against the **actual** implementation (`Health.php`, `Setup.php`, `Config/Cors.php`) and the **executed** test suite (`tests/Feature/HealthTest.php`, `tests/Feature/SetupTest.php`). Every "Verified" row cites a test that ran green (`OK (22 tests, 81 assertions)`, Laragon PHP, 2026-10-17). Nothing below asserts behaviour that is not in the doc or demonstrated by code/tests.

## 1. Documented Batch A surface

`openapi-v0.md` documents exactly **two** live endpoints (all future tenant/auth endpoints are explicitly deferred to later batches):

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/health` | Unauthenticated | `200`, JSON |
| GET | `/setup` | Unauthenticated | `200`, HTML |

## 2. `GET /health` — contract vs implementation

| # | Documented contract (`openapi-v0.md`) | Verification | Status |
|---|----------------------------------------|--------------|--------|
| H-1 | Returns `200` when reachable | `HealthTest::testHealthReturnsOkStatusCode` | **Verified (executed)** |
| H-2 | `Content-Type: application/json` | `HealthTest::testHealthReturnsJsonContentType` | **Verified (executed)** |
| H-3 | Only these keys: `status, app, plane, environment, version, milestone, database, time, timezone, currency` | `HealthTest::testHealthExposesRequiredFields` + `testHealthReturnsOnlyAllowedKeys`; matches `Health::index()` payload and `HealthTest::ALLOWED_KEYS` | **Verified (executed)** |
| H-4 | `status` ∈ {`ok`,`degraded`} | `Health::index()` derives `ok`/`degraded` from DB state | **Verified (code review)**; enum enforced implicitly by controller |
| H-5 | `database` ∈ {`connected`,`unreachable`,`not_configured`} | `HealthTest::testHealthDatabaseFieldIsStateOnly` | **Verified (executed)** |
| H-6 | No database credentials / DSN leaked | `HealthTest::testHealthDoesNotExposeDatabaseCredentials` | **Verified (executed)** |
| H-7 | No detailed server info (PHP/paths/hostname/software) | `HealthTest::testHealthDoesNotExposeServerDetail` | **Verified (executed)** |
| H-8 | No tenant or learner data | `HealthTest::testHealthCarriesNoTenantOrLearnerData` | **Verified (executed)** |
| H-9 | Unauthenticated by design (monitoring) | `Health` docblock + no auth filter on route | **Verified (code review)** |

## 3. `GET /setup` — contract vs implementation

| # | Documented contract (`openapi-v0.md`) | Verification | Status |
|---|----------------------------------------|--------------|--------|
| S-1 | Returns `200`, HTML placeholder | `SetupTest::testSetupShowsPlatformIdentity`; `Setup::index()` sets `text/html` | **Verified (executed)** |
| S-2 | Writes nothing to any database | `SetupTest::testSetupWritesNothingToTheDatabase` | **Verified (executed)** |
| S-3 | Accepts/stores no credentials | `SetupTest::testSetupExposesNoCredentialInputs` | **Verified (executed)** |
| S-4 | GET only — POST is not routed | `SetupTest::testSetupRejectsPost` | **Verified (executed)** |

## 4. Common headers / CORS (ADR-008)

| # | Documented contract | Verification | Status |
|---|---------------------|--------------|--------|
| C-1 | `Access-Control-Allow-Origin` = explicit origin only, **never `*`** on authenticated APIs | `Config/Cors.php` rejects `*`, defaults to `[]` (deny-by-default); `HealthTest::testHealthNeverSendsWildcardCorsOrigin` | **Verified (config + executed test)** |
| C-2 | No `Access-Control-Allow-Credentials` unless a specific credentialed flow needs it | `Cors.php` `supportsCredentials=false` by default | **Verified (code review)**; runtime assert across all routes is a **planned check** (C-10.2) |

## 5. Documented future conventions (not yet implemented — planned checks)

`openapi-v0.md` states these as **future** requirements. No code exists for them yet, so each is a **planned check** for Batch B, cross-referenced to the authored matrices:

| # | Documented convention | Planned check |
|---|-----------------------|---------------|
| F-1 | Tenant routes `/{domain}/{school_slug}/...`; slug resolved server-side from session, never trusted from browser (ADR-003) | `tenant-isolation-test-matrix.md` T-2/T-5/T-8 |
| F-2 | All authenticated endpoints require valid session/token + server-side tenant resolution + explicit CORS allowlist | `role-permission-matrix.md` §4; `tenant-isolation-test-matrix.md` |
| F-3 | Error codes 400/401/403/404/429/500 with no stack traces / paths / credentials / hostnames in production | `security-threat-model.md` §2; negative-authz tests C-10.2 |
| F-4 | Control plane never stores school-local data (`control-plane-data-boundary.md`) | Data-boundary assertion once migrations/models exist; `role-permission-matrix.md` §0.4 |

## 6. Contract-review findings (factual, for KiloCode)

These are observations from reviewing `openapi-v0.md` against the implementation — not defects in the running code.

- **CR-1 (Consistency — good):** The documented `/health` key set, `status`/`database` enums and `/setup` guarantees match `Health.php`/`Setup.php` and the passing tests exactly. No drift found.
- **CR-2 (Format):** `openapi-v0.md` is human-readable Markdown, not a machine-readable OpenAPI 3.x YAML/JSON artifact. A later batch may want a parseable spec so contract tests can be generated; noted, not required for Batch A.
- **CR-3 (Scope clarity — good):** The doc clearly scopes itself to Batch A (`/health`, `/setup`) and defers tenant/auth endpoints, which matches the current empty `app/Filters/`/`app/Models/` state.
- **CR-4 (Base URL):** Doc notes local `http://localhost:8080/`; `windows-laragon-preflight.md` §5 requires `app.baseURL` be environment-configured (no hard-coded localhost in browser code) — keep consistent when the frontend adapter binds.
- **CR-5 (DRAFT status):** Marked DRAFT; treat as provisional until KiloCode finalises. This checklist must be re-run if the contract changes.

## 7. Execution evidence

- Suite: `php vendor\bin\phpunit --no-coverage` with Laragon PHP 8.3.30 → **`OK (22 tests, 81 assertions)`** on 2026-10-17 (see `current-state-audit.md` §4.3 and `windows-laragon-preflight.md` §6).
- The named `HealthTest`/`SetupTest` cases above are part of that green run.

## 8. Limits

- This verifies the **documented** Batch A surface only (`/health`, `/setup`). It does not certify any future tenant/auth endpoint (none exist yet).
- No compliance certification is claimed; "Verified (executed)" means the named test passed in the run above, nothing more.
- No API behaviour beyond `openapi-v0.md` and the code/tests is asserted anywhere in this file.

