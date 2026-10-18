# School-Local DB Connection & Isolation Verification — D-C-02

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **D-C-02** (Batch D)
- Created: 2026-10-17
- Purpose: verify that each school's **own database** is reached through a correctly-scoped, isolated connection — and that a school's session/connection can never reach another school's data. Complements `dedicated-database-verification-checklist.md` (C-C-02) by focusing on the **runtime connection/tenant resolution**, not just the schema.
- Status: **Executable-ready spec; runtime BLOCKED** (no school-local schema, no tenant resolution, no auth, no request-scoped DB switching yet — verified 2026-10-17).

## 1. Connection binding — prefix `CN`

| ID | Case | Expected |
|----|------|----------|
| CN-01 | Request for School A resolves to A's DB | The active connection's database = A's dedicated DB (assert connection target, not just results) |
| CN-02 | Request for School B resolves to B's DB | Active connection = B's DB; never A's |
| CN-03 | Tenant resolved server-side from session/token | The school is derived from the authenticated session — **not** from a browser-supplied `school_id`/`slug` (ADR-003) |
| CN-04 | Forged school in request ignored | Sending `school_id=B` on an A session still uses A's DB |
| CN-05 | Control-plane connection never reads school data | The control-plane DB group cannot SELECT school-local rows (separate schemas) |
| CN-06 | Per-school credentials | Each school's connection uses its own least-privilege DB user, scoped to its schema |
| CN-07 | No shared connection pool across tenants | A pooled/reused connection is fully reset between tenants; no residual schema/ temp state leaks across a switch |

## 2. Cross-tenant isolation at query time — prefix `ISO`

| ID | Case | Expected |
|----|------|----------|
| ISO-01 | School A session queries A data | Only `TENANT-A-…` rows returned |
| ISO-02 | Same session attempts B data by id | **403/404**; no `TENANT-B-…` row |
| ISO-03 | Search with no school filter | Returns only the session's school rows; never all-tenant |
| ISO-04 | Raw query/ORM tamper to add `WHERE school_id=B` | Denied/ignored — the school scope is not client-influenceable |
| ISO-05 | Cache keyed across tenants | Namespaced per school; B never reads A's cached values (ties to tenant matrix T-20) |
| ISO-06 | Background job bound to a school | Job runs against that school's DB only; cannot touch another |
| ISO-07 | Migration run for one school | Only that school's schema migrates; other schools unchanged |

## 3. Failure / misconfiguration safety — prefix `MF`

| ID | Case | Expected |
|----|------|----------|
| MF-01 | School's DB unreachable | Scoped error (no stack/DSN/creds); **no** fallback to another school's DB or the control plane |
| MF-02 | Unknown school slug | **404**; no partial data; no cross-tenant hint |
| MF-03 | School decommissioned | Requests to its DB fail cleanly; other schools unaffected |
| MF-04 | Connection error details | Never leak host/user/password/DSN into responses or logs (mirrors `/health` behaviour) |

## 4. How to run (harness)

```text
1. Provision two synthetic schools A and B, each with its own DB; plant TENANT-A-…/TENANT-B-… markers.
2. Obtain an authenticated session for each (once auth exists).
3. For CN-*: instrument/log the resolved DB name on each request and assert it equals the session's school.
4. For ISO-*: issue cross-tenant reads/queries and assert absence of the other tenant's marker + correct 401/403/404.
5. For MF-*: break one school's connection and assert scoped errors and no cross-DB fallback.
6. Fail the build on any query that returns a row whose school != the session's school.
```

## 5. Execution status vs exit gate

- **Runtime execution: BLOCKED (planned).** Requires a provisioned school-local schema + server-side tenant resolution + auth — none exist yet (only the 4 control-plane migrations are present). Ties to `ops/release-gates.md` G7 and Batch D exit gate *"teacher assignment scope is enforceable server-side"* / *"a school can configure … in its own database."*
- **Design intent verified (real, schema-level):** the control plane is metadata-only with **no** shared `tenant_id` table, so the intended isolation is a dedicated DB per school (ADR-001). The cases above define how to prove the runtime honours that.
- Nothing here is claimed as passing. Overlaps deliberately with `tenant-isolation-test-matrix.md` (§3) and C-C-02; those cover schema/registry, this covers the **live connection**.

