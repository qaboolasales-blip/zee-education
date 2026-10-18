# Unauthorized / Forbidden Route Test Cases — B-C-03

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **B-C-03** (Batch B)
- Created: 2026-10-17
- Status: **Executable-ready spec; execution BLOCKED until routes+auth exist.** Today the only routes are the two public ones (`/health`, `/setup`) — verified by reading `Config/Routes.php` (no auth/login/logout routes) and the controller list on 2026-10-17. These cases define the deny behaviour every future protected route must satisfy.

## 0. Model: classify every route, then test each class

Every route in the app must belong to exactly one class. Deny is the default; a route is public only by explicit allowlist.

| Class | Definition | Expected when unauthenticated | Expected when authenticated-but-unauthorised |
|-------|-----------|------------------------------|----------------------------------------------|
| **PUBLIC** | Explicitly public: `/health`, `/setup` (and any future explicitly public read) | **200** | **200** |
| **AUTH** | Requires any valid login (any role) | **401** | **200** if role also permitted, else **403** |
| **ROLE** | Requires a specific role/scope | **401** | **403** if wrong role/scope |
| **TENANT** | Requires school-scoped access | **401** | **403/404** if wrong school |
| **DEFAULT** | Anything not classified | **401** (deny-by-default) | **403** |

## 1. Public-route safety (must stay safe) — prefix `UR-P`

| ID | Case | Expected |
|----|------|----------|
| UR-P-01 | `GET /health` unauthenticated | **200**; body = only the 10 allowed keys; no credentials/server/tenant/learner data (already enforced by `HealthTest`) |
| UR-P-02 | `GET /setup` unauthenticated | **200**, HTML; writes nothing, accepts no credentials (already enforced by `SetupTest`) |
| UR-P-03 | Public routes never widen access | A public route must not return any record tied to a school/user |

## 2. Unauthenticated access to protected routes — prefix `UR-401`

For **every** route in classes AUTH/ROLE/TENANT:

| ID | Case | Expected |
|----|------|----------|
| UR-401-01 | `GET <protected>` with no session/cookie/token | **401** |
| UR-401-02 | `POST/PUT/DELETE <protected>` with no session | **401** (not 403, not 200, not a redirect that leaks) |
| UR-401-03 | Present an **expired** session id | **401** |
| UR-401-04 | Present a **tampered/invalid-signature** token | **401** |
| UR-401-05 | Present a **logged-out** (server-side destroyed) session id | **401** |
| UR-401-06 | Response body of any 401 | Generic; no stack trace, path, hostname, DB detail, or whether the resource exists |

## 3. Authenticated but forbidden (wrong role/scope) — prefix `UR-403`

| ID | Case | Expected |
|----|------|----------|
| UR-403-01 | Valid session, wrong role for a ROLE route | **403** |
| UR-403-02 | Student hits a Teacher-only route | **403** |
| UR-403-03 | Parent hits a School-Admin-only route | **403** |
| UR-403-04 | Teacher hits an unassigned class/subject route | **403** |
| UR-403-05 | Parent requests a non-linked child's record | **403/404** |
| UR-403-06 | Any school user attempts a Super-Admin control-plane route | **403** |
| UR-403-07 | Super Admin attempts a learner-data route by default | **403** (learner data not browsable; ties to role matrix §0.4) |
| UR-403-08 | Response body of any 403 | Generic; no existence leak beyond necessity |

## 4. Cross-tenant denial — prefix `UR-T`

| ID | Case | Expected |
|----|------|----------|
| UR-T-01 | School A session requests a School B record by id | **403/404**, never B data |
| UR-T-02 | School A session forges `school_id`/`tenant_id`/`school_slug` to B | **403/404** — browser-supplied school ignored (ADR-003) |
| UR-T-03 | School A session enumerates ids and hits a B row | **403/404**, no cross-tenant row ever returned |
| UR-T-04 | Super Admin with break-glass for A attempts B | **403** — elevation scoped to one school |

## 5. Method / route hardening — prefix `UR-M`

| ID | Case | Expected |
|----|------|----------|
| UR-M-01 | Unsupported HTTP method on a route | **405** (method not allowed), not a silent allow |
| UR-M-02 | Unknown/undeclared route | **404**; never auto-routed to an unintended controller |
| UR-M-03 | Auto-routing cannot bypass a method-scoped filter | Filter bound to a method is enforced for the actual method used |
| UR-M-04 | `/setup` accepts only GET | POST/PUT/DELETE to `/setup` **404/405** (already asserted by `SetupTest::testSetupRejectsPost`) |
| UR-M-05 | Directory/asset traversal to reach internals | **404**; no internal path disclosure |

## 6. Deny-by-default guarantee — prefix `UR-D`

| ID | Case | Expected |
|----|------|----------|
| UR-D-01 | A brand-new protected route added without a role binding | Unauthenticated → **401**; wrong role → **403** (fails closed, not open) |
| UR-D-02 | Route with no matching policy | Denied, and the gap is visible (error/log), not silently public |

## 7. Generic harness (how to run once routes exist)

```text
1. Build the route inventory (e.g. `php spark routes`).
2. Classify each route: PUBLIC / AUTH / ROLE / TENANT (§0). PUBLIC must be an explicit, reviewed allowlist.
3. For each non-PUBLIC route, run the matrix:
     sessions = {anon, schoolA-{admin,teacher,parent,student}, schoolB-admin, expired, tampered}
     for each session -> assert the expected status from §1–§6.
4. Assert every 401/403 body is generic (no stack/path/host/DB) and leaks no existence signal.
5. Fail the build on any route that returns 200 to anon or to an out-of-scope role/school.
```

Automatable as a single parameterized feature test over the route table; each row maps to a `UR-*` case.

## 8. Coverage vs exit gate & execution status

- UR-401/403/T/M/D cover *"browser cannot self-assign a role/school"* and provide the unauthorised/forbidden route suite for the exit gate.
- **Execution status: BLOCKED (planned).** Only `/health` and `/setup` exist today; there are no protected routes to probe. The two public-route cases (UR-P-01/02) are already independently enforced by the **passing** `HealthTest`/`SetupTest` (part of `OK (22 tests, 81 assertions)`). Every other case is a **planned check** pending KiloCode's auth + routes (ties to `ops/release-gates.md` G5/G6). Nothing beyond UR-P is claimed as executed.

