# Provisioning Abuse & Failure Test Matrix — C-C-01

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-C-01** (Batch C — Super Admin School Registry & Dedicated Provisioning)
- Created: 2026-10-17
- Grounding (read 2026-10-17): control-plane schema exists — `schools`, `school_domains`, `provisioning_jobs`, `platform_audit_events` migrations. **Provisioning logic does not exist yet** (Controllers = Health/Home/Setup; `app/Libraries`/`Models` empty). So this is an **executable-ready spec + design review**; runtime rows are **planned** until KiloCode ships the provisioning library/endpoint.
- Invariants preserved: dedicated database per school (ADR-001); no school-local student table in the control plane; connection credentials encrypted & stored separately (ADR-108), never in these tables.

## 0. Threat model summary

Provisioning is a **privileged, state-changing, cross-database** operation — high value. Abuse falls into three buckets: (1) unauthorised/forged provisioning, (2) duplicate/inconsistent state under retry or concurrency, (3) input that escapes the intended dedicated-DB boundary. Failure handling must never leave an orphan DB, leak credentials, or corrupt the registry.

## 1. Abuse vectors — prefix `PV-A` (expected DENY / safe-handling)

| ID | Vector | How to test | Expected |
|----|--------|-------------|----------|
| PV-A-01 | Unauthenticated provisioning request | Call the provisioning endpoint with no session | **401** — provisioning is Super Admin only |
| PV-A-02 | Non-Super-Admin (School Admin/Teacher) triggers provisioning | School A admin session → provisioning endpoint | **403** |
| PV-A-03 | Forged/tampered `school_id` or target in the request | Alter `school_id`/target DB in body/session | Server ignores browser-supplied target; **403/400**; no effect on another school |
| PV-A-04 | Direct DB-name manipulation (traversal/injection) | Submit `target_database` = `../x`, `a;DROP…`, `school_b` | Sanitised/allowlisted; rejected (**400**); never touches another DB |
| PV-A-05 | Provisioning into an existing school's DB | Aim an "install" at an already-provisioned DB | Rejected or idempotent; **no overwrite** of existing school data |
| PV-A-06 | Privilege escalation via provisioning request | Claim role/school in payload | Role from server-side session only; payload role ignored |
| PV-A-07 | Enumerate schools via provisioning responses | Iterate school ids in provisioning/status calls | Only Super Admin; no cross-school leak; ids not guessable into data |
| PV-A-08 | Tamper `provisioning_jobs.status` to force success | Write `status='completed'` out-of-band | Append-only/status transitions enforced in code; illegal transition rejected |
| PV-A-09 | Oversized/malicious school metadata (branding/name) | Huge string / XSS payload in `schools.name` | Validated/sanitised; no stored XSS; length limits enforced |
| PV-A-10 | Resource exhaustion (mass provisioning) | Fire many provisioning requests | Rate-limited/serialized; no unbounded DB creation (**429/backoff**) |

## 2. Failure scenarios — prefix `PV-F` (synthetic; expected SAFE recovery)

Each simulates a fault during provisioning. The invariant: **no partial/orphan school database, no inconsistent registry row, no credential leak, and a clean retry path.**

| ID | Injected failure | Expected behaviour |
|----|------------------|--------------------|
| PV-F-01 | DB-creation step fails (bad creds / no permission) | Job → `failed` with **sanitised** `error_message` (no DSN/creds); no school marked `active`; no orphan DB |
| PV-F-02 | Migration fails mid-way on the new school DB | Transaction/rollback or marked `failed`; **no half-migrated school** reachable; retry can re-run cleanly |
| PV-F-03 | Timeout / crash between "create DB" and "write registry" | On recovery, either fully provisioned or fully rolled back; **no dangling DB with no `schools` row** |
| PV-F-04 | Duplicate submit of the same install (client retry / double-click) | **Idempotent** — second attempt does not create a second DB/second school (see C-C-03; schema has no unique guard, so code must) |
| PV-F-05 | Concurrent provisioning of the same school | Serialized; one wins; the other no-ops or waits; **no interleaved partial state** |
| PV-F-06 | Disk-full / quota during migration | Job → `failed`, sanitised error, cleanup of partial artifacts |
| PV-F-07 | Interrupted after some tables created | Retry/rollback leaves **consistent** schema or none; never a mix |

## 3. Isolation during/after provisioning — prefix `PV-I` (ties to ADR-001)

| ID | Vector | Expected |
|----|--------|----------|
| PV-I-01 | New school B provisioned; query B's student-ish table from control plane | Impossible — **no school-local table exists in the control plane** (`schools` holds metadata only; no students/attendance/fees columns — verified in migration 000001) |
| PV-I-02 | School A session reads the newly provisioned School B | **403/404** — A's connection is bound to A's DB only |
| PV-I-03 | Control-plane DB connection reaches into a school DB | Control plane holds only **connection metadata** (encrypted), not a shared data store; app must open the target school's DB explicitly, never a shared `tenant_id` table |
| PV-I-04 | Decommission school B; verify A unaffected | B's data/DB removed per policy; **A untouched** |

## 4. Audit-record verification (links to C-C-04)

| ID | Check | Expected |
|----|-------|----------|
| PV-AUD-01 | Every provisioning attempt (success + failure) writes a `platform_audit_events` row | Actor, action, target, timestamp present |
| PV-AUD-02 | Audit/`error_message` never contain credentials, DSN, connection string or secrets | See C-C-04 — schema has no secret column; **code** must not embed secrets in `action`/`target_type`/`error_message` |
| PV-AUD-03 | `platform_audit_events` is append-only | No UPDATE/DELETE reachable from app code |

## 5. Schema observations (real, from the migrations read 2026-10-17)

- `provisioning_jobs` is **retry-aware**: `status` enum (`pending|running|completed|failed`), `attempts` (INT default 0), `started_at`, `completed_at`. Good substrate for PV-F handling.
- **No idempotency guard at the DB level:** `provisioning_jobs` has no unique constraint on `(school_id, type)` or on `target_database`; `schools` has no unique on identity beyond `id`. So **duplicate-on-retry (PV-F-04) and duplicate-DB (PV-A-05) must be enforced in application logic**, not assumed from the schema. Detailed in C-C-03.
- `schools.status` lifecycle (`pending|active|suspended|decommissioned`) supports safe state transitions; illegal transitions must be rejected in code (PV-A-08).
- `school_domains` has `UNIQUE(school_id, domain)` and FK→`schools` (CASCADE). Good; domain uniqueness is enforced.
- No school-local/student table exists in the control plane (PV-I-01) — ADR-001 respected at schema level.

## 6. Execution status vs exit gate

- **Runtime execution: BLOCKED (planned).** No provisioning library/endpoint exists to run PV-A/PV-F/PV-I against; ties to `ops/release-gates.md` G7 and the Batch C exit gate (*"a synthetic school can be provisioned into a separate local database safely"*, *"a retry cannot silently create inconsistent duplicate data"*).
- **Design review: DONE (real).** §5 records verified schema facts; the absence of an idempotency guard is a concrete, actionable finding for KiloCode.
- **Exit-gate items served:** PV-F-04/§5 → "a retry cannot silently create inconsistent duplicate data"; PV-I-01/§5 → "no school-local student table exists in the control-plane database."
- Nothing in this matrix is claimed as passing; it is a spec + design review only.

