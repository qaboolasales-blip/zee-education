# Provisioning Retry & Idempotency Review — C-C-03

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-C-03** (Batch C — Test or review retry/idempotency behaviour with a synthetic failure scenario)
- Created: 2026-10-17
- Method: **design/schema review (real)** of `provisioning_jobs` + related migrations, plus a **synthetic-failure idempotency scenario** to execute once provisioning logic exists. Runtime test is blocked (no provisioning library/endpoint yet).

## 1. What exists (real, read 2026-10-17)

Retry-relevant columns in `provisioning_jobs` (migration 000003):

| Column | Type | Relevance |
|--------|------|-----------|
| `status` | ENUM `pending|running|completed|failed` (default `pending`) | Job lifecycle; supports failed→retry |
| `attempts` | INT unsigned, default 0 | Counts retries |
| `started_at`, `completed_at` | DATETIME nullable | Detect stuck/`running` jobs |
| `error_message` | TEXT nullable | Sanitized failure detail (no credential column) |
| `target_database` | VARCHAR(191) | The dedicated DB name |
| `school_id` | FK→`schools` (CASCADE) | Job is tied to a school |

## 2. Review findings (real, actionable for KiloCode)

- **R-1 (Retry substrate: present).** The schema can represent a retry lifecycle (`status=failed`, `attempts` counter, `started_at`/`completed_at`). Good foundation.
- **R-2 (Idempotency guard: MISSING at DB level).** There is **no unique constraint** on `(school_id, type)` nor on `target_database`, and no dedicated idempotency-key column. Consequence: nothing at the database layer prevents two `install` jobs for the same school, or two jobs pointing at the same `target_database`. **Duplicate-on-retry and duplicate-DB must therefore be enforced entirely in application logic.** This is the key risk (ties to abuse matrix PV-F-04 / PV-A-05).
- **R-3 (State-machine not enforced by schema).** `status` is a free ENUM; the DB does not forbid `completed→running` or illegal transitions. Transition rules must be enforced (and audited) in code (PV-A-08).
- **R-4 (Stuck-job recovery).** `started_at` + `status='running'` allows detecting jobs abandoned mid-flight (PV-F-03); a reaper/retry policy must be defined in code, and must be idempotent.
- **R-5 (No partial-provision marker).** The schema has no column recording "DB created but registry not finalized," so the code must make the multi-step provision atomic or reconcilable (PV-F-02/03).

## 3. Recommendations (for KiloCode; not implemented by me)

1. Add an **idempotency key** (e.g. unique `(school_id, type)` for active jobs, or a client-supplied `idempotency_key UNIQUE`) so a retried install no-ops instead of duplicating.
2. Add a **UNIQUE on `target_database`** (or a reserved-name allowlist) so two schools can never target the same DB.
3. Enforce a **status state-machine** in code; illegal transitions rejected + audited.
4. Make the DB-create → migrate → mark-active sequence **transactional/reconcilable**; never leave an orphan DB with no `schools` row.
5. Persist a **sanitized** `error_message` only (no DSN/user/password) — ties to C-C-04.

## 4. Synthetic failure scenario (planned test — run when provisioning logic exists)

Goal: prove a retry **cannot silently create inconsistent duplicate data** (Batch C exit gate). Use a synthetic school only.

```text
Setup:
  - Seed a synthetic School S (status=pending) with no DB yet.
  - Force the provisioning DB-create step to FAIL on the first attempt
    (e.g. inject a fault / point at an intentionally invalid target in a test double).

Steps & expected:
  SC-1  Trigger "install" for S                       -> job row created, status=failed, attempts=1,
                                                          error_message=SANITIZED (no creds/DSN),
                                                          schools.status NOT 'active', NO DB left behind
  SC-2  Re-trigger the SAME install (retry)           -> IDEMPOTENT: attempts increments, still at most
                                                          ONE logical install; NO second school row,
                                                          NO second target_database
  SC-3  Fix the fault; retry again                    -> completes: status=completed, exactly ONE school DB,
                                                          schools.status=active, one audit trail
  SC-4  Fire the same install twice concurrently      -> serialized/idempotent: ONE DB, ONE school;
                                                          the loser no-ops or waits — no interleaved state
  SC-5  Crash between DB-create and registry-finalize -> on recovery: either fully provisioned or fully
                                                          rolled back; NO dangling DB with no schools row
  SC-6  Inspect platform_audit_events                 -> attempts recorded; NO secrets in action/target/error
```

Pass criterion: after the sequence, exactly **one** school row and **one** dedicated DB for S, a monotonic `attempts` history, a sanitised error trail, and no orphan/partial artifacts. Any duplicate DB, duplicate school, or credential in `error_message`/audit is a **defect**.

## 5. Execution status vs exit gate

- **Schema/design review: DONE (real).** Findings R-1..R-5 are grounded in the actual `provisioning_jobs` migration. The most important, **R-2 (no DB-level idempotency guard)**, is a concrete risk KiloCode must close in logic.
- **Runtime synthetic-failure test: BLOCKED (planned).** No provisioning library/endpoint exists to run SC-1..SC-6. Ties to `ops/release-gates.md` G7 and the Batch C exit gate *"a retry cannot silently create inconsistent duplicate data."*
- Nothing in §4 is claimed as passing; it is the exact scenario to execute later.

## 6. R-2 closure (2026-10-20, later session)

R-2 is **closed at the schema level**. Migration
`2026-10-20_000016_add_provisioning_jobs_idempotency_key.php` adds a nullable
`idempotency_key VARCHAR(191)` with UNIQUE index
`uq_provisioning_jobs_idempotency_key`, applied via explicit `ALTER TABLE`
(the CREATE-TABLE-TIME unique-next-to-AUTO_INCREMENT quirk noted in
migrations 000009/000010 is avoided; 000007 proved ALTER-time unique works
on this MySQL build).

Design choices, deliberately departing from rec #2 as written:

- **`target_database` stays non-unique.** One school database legitimately
  accumulates many job rows over time (install today, migrate on every
  release), so a unique on the database name would forbid normal history.
  Uniqueness belongs to the caller-supplied key (rec #1's `idempotency_key`
  option), which is exactly what was implemented.
- **Multiple NULL keys remain possible** (MySQL permits repeated NULLs in a
  UNIQUE index), so keyless placeholder rows are not blocked while any
  duplicated key is rejected by the database itself (error 1062).

Behavioural evidence (`backend/tests/Feature/ProvisioningIdempotencyTest`,
5 tests / 18 assertions, green inside the full 155-test suite):

- column + unique index exist and report `Non_unique = 0`
- a second insert with the same key raises MySQL "Duplicate" and exactly one
  row survives
- two rows without a key both insert
- duplicate `school_code` POST returns `409 That school code is already in
  use` and exactly one school row remains (SC-2 at the entry point)
- re-provisioning a `completed` school returns `Already provisioned` without
  changing its state (SC-2 at the service level)

SC-1/SC-3..SC-6 (synthetic failure injection against a real school database)
remain **unexecuted** — they need a live dedicated-database environment and
are still tied to gate G7 / the Batch C exit gate.

