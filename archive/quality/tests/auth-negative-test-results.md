# Auth Negative Test — Execution Report — B-C-05

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **B-C-05** (Batch B — Execute actual auth negative tests and report only real results)
- Created: 2026-10-17
- Rule honoured: **only real, executed results are reported.** No auth test is claimed to pass that was not run. Where execution is impossible, the status is **BLOCKED** with the concrete reason and evidence.

## 1. Objective

Execute the negative authorization / auth-flow tests defined in B-C-01..B-C-03 and the auth-session checklist (B-C-02) and record the true outcomes.

## 2. What actually exists to test against (verified 2026-10-17)

- Controllers: `BaseController`, `Health`, `Home`, `Setup` only. **No** Auth/Login/Logout/Reset controller.
- `app/Filters/`, `app/Models/`, `app/Libraries/`, `app/Helpers/`: empty (`.gitkeep` only). **No** auth filter or User/Session model.
- `Config/Routes.php`: no auth/login/logout/reset routes (comments point to future ADR-003 auth).
- `backend/docs/api/`: only `openapi-v0.md`, which documents `/health` + `/setup` and explicitly defers auth endpoints.
- Test-class inventory: no `Auth*`/`Login*`/`Logout*`/`Role*`/`Permission*` class; only `ExampleSessionTest.php` (framework session sanity) matches the session keyword.

**Conclusion:** there is no server-side authentication/authorization to attack yet. A backend auth negative test cannot be executed — not because it passed, but because the target does not exist.

## 3. Executed checks and REAL results

### 3.1 Backend test suite (re-run, Laragon PHP 8.3.30) — PASS, but auth-free
- Command: `& 'C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe' vendor\bin\phpunit --no-coverage` (CI_ENVIRONMENT=testing).
- Result: **`OK (27 tests, 107 assertions)`** (up from 22 in Batch A as KiloCode added tests).
- **Real, important caveat:** these 27 tests cover health/setup/migration/framework-sanity only. A keyword scan (`auth|login|logout|password|role|permission|session_fixation|brute`) across `backend/tests` matched only comments/assertions **inside** `HealthTest` (e.g. "unauthenticated", forbidden-term list) and `SetupTest` (e.g. "never treated as authorization", no `type="password"` field). **Zero** tests exercise an actual login, logout, role check, session-fixation or brute-force path. So the green suite provides **no** auth-negative evidence.

### 3.2 Auth surface probe — nothing to send requests to
- Verified absence of auth controllers/filters/routes (§2). Sending a "protected route" request is impossible because no protected route is declared; the only routes (`/health`,`/setup`) are intentionally public and are already negative-tested for **information disclosure** by the passing `HealthTest`/`SetupTest`.
- **Real result:** the only auth-adjacent server assertions that execute today are `HealthTest` (no credentials/server/tenant/learner leak from `/health`) and `SetupTest` (no credential input, POST rejected). Both pass. These are **disclosure/route** checks, **not** authorization negative tests.

### 3.3 Frontend client-layer default-deny (real, executed, read-only)
- Command: `node --test "test/*.test.js"` in `frontend/` (OpenCode-owned; run read-only).
- Result: **`tests 401, suites 105, pass 401, fail 0`**. Auth-negative-relevant cases that genuinely executed and passed include:
  - **B-O-01 / B-O-03:** no authentication endpoint is published; no invented auth contract; the client fails closed if a schema/implementation claim appears.
  - **session-state:** "never grants access without a role, even on a 200"; "does not convert a transport failure into an authenticated session"; "defaults to unknown and denies."
  - **role-guard / config:** browser cannot self-assign a role; relative same-origin URLs only; no credential/refresh behaviour in the client.
- **Scope:** these prove the **frontend adapter denies by default and cannot self-assign a role/school at the client layer.** They do **not** prove backend authorization (there is none yet).

## 4. Outcome

| Area | Negative test | Status | Real evidence |
|------|---------------|--------|---------------|
| Backend authz (role/tenant/forbidden routes) | B-C-01/B-C-03 | **BLOCKED** | No auth implementation; no protected routes; 27/27 suite contains no auth test (§3.1/§3.2) |
| Login brute-force / reset / fixation / logout | B-C-02 | **BLOCKED** | No login/session/logout code (§2) |
| Session cookie/security headers (runtime) | B-C-04 runtime | **BLOCKED** | Auth/session middleware not wired; static review only (`security-config-review.md`) |
| Frontend default-deny / no role self-assignment | client layer | **PASS (real)** | `node --test` → 401/401, incl. session-state + role-guard deny cases (§3.3) |

## 5. Non-claims

- **No backend authentication or authorization is verified as working or secure** — none exists to test.
- The green backend suite (27/27) must **not** be read as auth coverage; it has none.
- Nothing in this report is a compliance certification.

## 6. What unblocks full execution (for a later batch, once KiloCode ships auth)

1. Auth + server-side role/school policy + protected routes exist and are bound to filters.
2. Then run, in order: `role-policy-test-cases.md` (B-C-01), `auth-session-test-checklist.md` (B-C-02), `unauthorized-route-test-cases.md` (B-C-03).
3. Re-run `security-config-review.md` §4 as a runtime review (B-C-04).
4. Replace the BLOCKED rows above with real statuses; keep §3.3 as the client-layer baseline.
Ties to `ops/release-gates.md` G5/G6 (never-waivable, currently NO-GO).
