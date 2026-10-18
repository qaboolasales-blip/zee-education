# Dedicated Database Verification Checklist — C-C-02

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-C-02** (Batch C)
- Created: 2026-10-17
- Purpose: prove that a newly provisioned school truly gets its **own dedicated database** (ADR-001) — separate credentials, separate migration history, separate backups, and **no cross-school schema/data reuse** — rather than a shared `tenant_id` store.
- Status: **Checklist (planned execution).** No provisioning logic/second school exists yet, so these are run in the batch where a synthetic school can actually be provisioned. Each step names an objective, query-able check.

## 1. Separate database & credentials

| ID | Check | How to verify (objective) | Pass criterion |
|----|-------|---------------------------|----------------|
| DB-01 | Distinct database per school | List schemas: `SHOW DATABASES;` after provisioning A and B | Two separate DBs (e.g. `zee_school_a`, `zee_school_b`), not one shared DB |
| DB-02 | No shared connection for school data | Inspect the per-school connection config used at request time | Each school's requests open **its own** DB; control-plane connection never reads school rows |
| DB-03 | Least-privilege per-school credentials | Inspect grants for each school's DB user | Each school's user can access **only its own** DB, not the other school's or all DBs |
| DB-04 | Credentials encrypted at rest, not in these tables | Inspect `provisioning_jobs` / control-plane tables | **No** plaintext host/user/password columns (ADR-108); `provisioning_jobs` has no credential column (verified in migration 000003) |
| DB-05 | Control-plane DB is separate from school DBs | Identify the control-plane schema | Control plane (`zee_education_control`) ≠ any school schema |

## 2. Separate migration history

| ID | Check | How to verify | Pass criterion |
|----|-------|---------------|----------------|
| DB-06 | Each school DB has its own migration history | Query each school DB's `migrations` table | Independent per-DB history; migrating A does not advance B |
| DB-07 | Control-plane migrations ≠ school migrations | Compare control-plane `migrations` vs a school's | Control-plane history contains only control-plane tables (`schools`,`school_domains`,`provisioning_jobs`,`platform_audit_events`); school DB has its own academic schema |
| DB-08 | Migrating one school is isolated | Run a school migration in A | Only A changes; B's schema/version unchanged |

## 3. No cross-school schema/data reuse

| ID | Check | How to verify | Pass criterion |
|----|-------|---------------|----------------|
| DB-09 | No `tenant_id`-only shared table | Inspect control-plane schema | No shared students/attendance/fees table holding many schools via `tenant_id` (forbidden substitute) |
| DB-10 | No school-local table in control plane | `SHOW TABLES` in control plane | Only control-plane tables; **no** students/attendance/results/fees |
| DB-11 | Row counts are per-DB | Insert a synthetic student in A; count in A and B | A increments; **B unchanged** |
| DB-12 | Marker isolation | Plant `TENANT-A-…` in A; search across B + control plane | Marker appears **only** in A |
| DB-13 | Cross-DB query impossible from a school session | School A session → B record | **403/404**, no B data (ties to tenant matrix) |

## 4. Separate backups

| ID | Check | How to verify | Pass criterion |
|----|-------|---------------|----------------|
| DB-14 | Per-school backup granularity | Inspect backup artifacts/config | Backups are per school DB (not one monolithic dump of every tenant by default); ties to `ops/backup-restore-runbook.md` §2 |
| DB-15 | Restore scope is one school | Restore a backup into a clean target | Only that school's data restored; no other tenant's rows present |
| DB-16 | Backup excludes secrets | Inspect a backup | No `.env`/plaintext DB credentials embedded |

## 5. Lifecycle / decommission safety

| ID | Check | How to verify | Pass criterion |
|----|-------|---------------|----------------|
| DB-17 | Decommission removes only that school | Decommission B | B's DB/data removed; **A and control-plane records for A untouched** |
| DB-18 | Decommission is audited | Read `platform_audit_events` | A decommission event recorded (actor/action/target/time), no secrets |

## 6. Ready-to-run verification script (for the batch where a 2nd school exists)

```text
1. Provision synthetic School A and School B (no real data).
2. SHOW DATABASES                       -> two distinct school schemas + control plane
3. For each school DB: SHOW TABLES + query migrations -> independent histories
4. Plant TENANT-A-<uuid> in A; SELECT across B and control plane -> absent everywhere except A
5. Insert a row in A; count in B        -> B unchanged
6. Inspect DB grants per school user    -> each limited to its own schema
7. Inspect control-plane tables         -> no student/attendance/fee/tenant_id-shared table
8. Take a per-school backup; restore into a clean DB -> only that school's rows
```

## 7. Grounded schema facts (real, from migrations read 2026-10-17)

- Control-plane schema is **metadata only**: `schools` (identity/lifecycle/branding/timezone/currency/locale — no learner data), `school_domains`, `provisioning_jobs`, `platform_audit_events`. No student/attendance/fee/`tenant_id` shared table exists → **DB-09/DB-10 already satisfied at schema level**.
- `provisioning_jobs.target_database` (VARCHAR) is where the dedicated DB name is recorded; `error_message` holds sanitized failure detail (no credential column).
- The actual **creation** of a distinct DB + separate credentials is application logic that does not exist yet (no provisioning library). So DB-01..DB-08, DB-11..DB-18 are **planned** checks.

## 8. Execution status vs exit gate

- **Runtime execution: BLOCKED (planned)** — no provisioning logic / second school to provision yet (ties to `ops/release-gates.md` G7, and the Batch C exit gate *"a synthetic school can be provisioned into a separate local database safely"*).
- **Schema-level checks already verified (real):** DB-09 and DB-10 hold — the control plane contains **no** school-local/`tenant_id`-shared table, satisfying the exit-gate item *"no school-local student table exists in the control-plane database."*
- Nothing else is claimed as passing.

