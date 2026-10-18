# People: Access & Privacy Tests — Batch E

- Agent: Cline (QA/Security/Ops). Microtasks **E-C-01..E-C-04**. 2026-10-17.
- State check (2026-10-17): backend has **no** people schema (no students/guardians/staff tables), **no** auth, **no** enrollment/archive logic — Controllers=Health/Home/Setup, Models/Libraries/Filters empty, only 4 control-plane migrations. So "execute" tasks are BLOCKED; "review" tasks that can run on what exists were run.

## E-C-01 — Parent↔child & teacher↔assignment access negative tests — **BLOCKED (spec ready)**
- Cannot execute: no people/assignment schema, no auth. Exact evidence needed to unblock: provisioned school-local schema + auth + linked-child/assignment data.
- Spec: targeted cases below complement `role-policy-test-cases.md` (RP-P-01/02, RP-T-03/04) and `teacher-assignment-boundary-tests.md`.
  - P-NEG-01 Parent requests a non-linked child → **403/404**.
  - P-NEG-02 Parent enumerates other student ids in own school → **403/404**.
  - T-NEG-01 Teacher reads/edits an unassigned class's students → **403**.
  - T-NEG-02 Teacher reads another school's student → **403/404**.
  - X-NEG-01 Any role forges `child_id`/`teacher_id`/`school_id` → server ignores; scope from session.

## E-C-02 — Guessed student ID & cross-school DB denial — **BLOCKED (spec ready)**
- Cannot execute: no student records exist to guess. Evidence needed: two provisioned schools + synthetic students.
- Spec: IDOR/ enumeration cases → reuse `tenant-isolation-test-matrix.md` T-1..T-8 with a student record; expect **403/404**, never the other tenant's marker.

## E-C-03 — PII masking in logs/errors/exports — **PARTIALLY EXECUTED (real)**
- **Executed:** scanned `backend/writable/logs/*.log` for `password|secret|token|api_key|DSN|mysql://|cnic|@student|guardian` → **NO matches** (real).
- **Executed:** `/health` negative-asserts no tenant/learner/PII terms (HealthTest, part of **OK 27/27, 107 assertions**).
- **Executed:** `.env` is gitignored and not committed (real).
- **Blocked:** export PII masking — no export subsystem exists. Evidence needed: an implemented export path; then assert field minimisation + no PII in export logs (ties to `exports-tests.md` J-C-01/J-C-04).
- **Note:** error views are the framework defaults; once auth/500 paths exist, assert no stack/PII leaks (ties to `unauthorized-route-test-cases.md` UR-401-06/UR-403-08).

## E-C-04 — Archive/withdraw does not corrupt historical records — **BLOCKED (spec ready)**
- Cannot execute: no people/archive/withdraw logic. Evidence needed: an implemented archive/withdraw path.
- Spec: ARC-01 withdraw a student → prior attendance/marks/fees rows remain readable and unchanged (soft-delete/flag, not hard delete of history); ARC-02 withdrawn student excluded from active lists but present in historical reports; ARC-03 archive is audited; ARC-04 archive cannot hard-delete financial/academic history.

## Status
- Executed now: E-C-03 (logs/health/.env — clean). Blocked: E-C-01/02/04 (no people/auth implementation). Reference UI unchanged (3/3). Nothing unexecuted is claimed passing.
