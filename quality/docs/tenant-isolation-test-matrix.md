# Tenant Isolation Test Matrix — C-01.2

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-01.2** (Batch A)
- Created: 2026-10-17
- Status: **Partially executed.** The licence rows **T-25..T-27 (§3.8) were executed on the live Hostinger deployment on 2026-10-21** — record in §6; gate G8 flipped to GO on that evidence. The isolation rows **T-1..T-24 remain planned checks** (gate G7). The original 2026-10-17 dependency note below ("no school provisioning, no auth and no migrations") is obsolete as of 2026-10-20: Shield auth, role filters, migrations, provisioning and one provisioned school now exist — what has never run is this matrix, row by row, against two live schools.
- **Update 2026-10-20:** the original reason above is obsolete — provisioning, auth and
  migrations all exist now, and isolation was proven on a real Hostinger deployment at
  the **privilege layer** (0 school-local tables in the control plane, 0 control-plane
  tables in a school DB, `ERROR 1142` both directions) plus green automated cross-school
  tests (`backend/FINAL_RELEASE_AND_PILOT_REPORT.md`). **However, the T-1..T-24 rows in
  this matrix have still not been executed row-by-row and no execution record has been
  written.** Gate G7 in `ops/release-gates.md` therefore remains NO-GO until this matrix
  runs against live accounts and its results are recorded in a copy of §6-style checklist.

## 0. The isolation control being tested

- **Primary control — dedicated database per school (ADR-001).** Each school gets its own installation and its own database. This is the mandatory architectural control; a shared table with only a `tenant_id` column is **not** an equivalent and is forbidden without owner approval.
- **Secondary control — strict server-side access control.** Route filters + per-record ownership checks, never trusting browser-supplied school/user IDs.
- Because isolation is at the data-store level, the strongest test is: *can school A's authenticated session observe or affect any byte that belongs to school B?* Expected answer: **no, by construction and by enforcement.**

## 1. Test fixture (planned — use synthetic data only)

No real student/guardian data may be used. Create two throwaway schools with fake records:

- **School A** — dedicated DB `zee_test_school_a`; one admin, one teacher, one parent+linked child, one student. Synthetic marker string `TENANT-A-<uuid>` planted in a student name/note field.
- **School B** — dedicated DB `zee_test_school_b`; same shape. Marker `TENANT-B-<uuid>`.
- Sessions: obtain one authenticated session per role for each school (A-admin, A-teacher, A-parent, A-student, B-admin, …) plus one **Super Admin** session.
- The marker strings let any accidental leak be detected as a substring in a response, export or file.

## 2. Legend

| Symbol | Meaning |
|--------|---------|
| **DENY** | Expected: 403/404 or empty-by-construction; no B data returned |
| **ALLOW** | Expected: only that school's own data |
| **N/A-now** | Cannot run until the feature exists (planned for Batch B/later) |

Every row in §3 is a **planned check**. "Expected" is the required outcome; "How to test" is the concrete probe.

## 3. Isolation attack matrix

### 3.1 Guessed / forged IDs (IDOR)

| # | Vector | How to test | Expected |
|---|--------|-------------|----------|
| T-1 | Guess/enumerate a School B record ID with a School A session | Request `/…/<B_record_id>` with A session | DENY — 404/403, never B data |
| T-2 | Forge `school_id`/`tenant_id` in query/body/session to point at B | Send A-session request with `school_id=B` | DENY — server ignores browser-supplied school id; A's own DB used |
| T-3 | Sequential ID probing across the ID space | Iterate IDs, look for `TENANT-B-` substring | DENY — no cross-tenant row ever returned |
| T-4 | Tamper signed session/token claims (role, school, user) | Alter token subject/scope, replay | DENY — signature/validation failure |

### 3.2 Cross-school reads

| # | Vector | How to test | Expected |
|---|--------|-------------|----------|
| T-5 | A-admin reads B's student list | Call B's list endpoint with A session | DENY / empty-by-construction (A cannot reach B's DB) |
| T-6 | A-parent requests a B child by ID | Request B child record | DENY |
| T-7 | A-teacher requests B class/subject data | Request B assignment data | DENY |
| T-8 | Search/report spanning all schools | Query with no school filter | Only A's rows for A session; never `TENANT-B-` |

### 3.3 Cross-school writes

| # | Vector | How to test | Expected |
|---|--------|-------------|----------|
| T-9 | A-admin creates/edits a B student | Write to B record id | DENY — no write occurs in B's DB |
| T-10 | A-teacher marks attendance for a B class | Attendance write scoped to B | DENY |
| T-11 | A-admin changes B fee/result | Update B row | DENY |
| T-12 | Destructive op (delete) aimed at B | Delete B record | DENY — B row unchanged (verify in B DB) |

### 3.4 Cross-school exports

| # | Vector | How to test | Expected |
|---|--------|-------------|----------|
| T-13 | A-admin exports students/fees/results | Generate PDF/Excel/CSV with A session | Contains only `TENANT-A-`; no `TENANT-B-` |
| T-14 | A-parent exports "my children" | Parent export | Only linked child; no other tenant |
| T-15 | Forged export filter for B | Export with `school_id=B` | DENY / only A data |

### 3.5 Files / uploads / attachments

| # | Vector | How to test | Expected |
|---|--------|-------------|----------|
| T-16 | A uploads a file; B fetches it by guessed path/ID | Request A's object key with B session | DENY — per-tenant path/ownership enforced |
| T-17 | Guess/enumerate another tenant's file URL | Direct object fetch | DENY — unguessable/expiring + ownership check |
| T-18 | Upload path traversal (`../`) to escape tenant dir | Upload crafted filename | DENY — sanitized, stays within tenant boundary |

### 3.6 Background jobs / cache / queues

| # | Vector | How to test | Expected |
|---|--------|-------------|----------|
| T-19 | Job/queue for A reads/writes B | Inspect job payload + execution | DENY — job bound to one tenant's DB |
| T-20 | Cache key collision across tenants | Seed A cache, read via B | Isolated — namespaced keys; B never reads A's cached values |
| T-21 | Report/export job leaks cross-tenant rows | Run async export, inspect artifact | Only requesting tenant's rows |

### 3.7 Support access / Super Admin break-glass

| # | Vector | How to test | Expected |
|---|--------|-------------|----------|
| T-22 | Super Admin reads learner data by default | Super Admin session → school learner endpoint | DENY by default (control plane holds no learner data) |
| T-23 | Support access to a school's data | If break-glass exists | Only via explicit, logged, time-boxed elevation; audit-log entry written; never routine |
| T-24 | Support action cannot cross into another school | Break-glass for A, attempt B | DENY — elevation scoped to one school |

### 3.8 License expiry does not break isolation or access

| # | Vector | How to test | Expected |
|---|--------|-------------|----------|
| T-25 | License expired for A; A admin logs in and reads data | Expire A's license, read records | ALLOW — A still reads its own data (expiry must not hide/delete it) |
| T-26 | License expired for A; A exports its data | Export after expiry | ALLOW — export still works (never export-blocked) |
| T-27 | Expiry mechanism attempts to lock/encrypt/delete rows | Inspect expiry action's effect on A's DB | DENY of harm — no delete/encrypt/hide of school data; only update/support/feature gating per business rules |

## 4. Pass/fail criteria

- A row **passes** only if the probe returns the "Expected" outcome with evidence (HTTP status, response body proving absence of the other tenant's marker, and DB state where relevant).
- Any response containing the other tenant's marker (`TENANT-A-`/`TENANT-B-`), any successful cross-tenant write, or any cross-tenant file/job/cache read is an **isolation defect** — block pilot, do not waive.
- Because isolation is the dedicated-database architecture, a "pass" for T-5/T-8/T-19/T-20 also confirms the primary ADR-001 control is intact (the A session literally cannot open B's database).

## 5. Dependencies to run these checks (Batch B)

- [ ] School provisioning that creates a **dedicated database per school** (not `tenant_id` in a shared DB).
- [ ] Authentication + server-side role filters (for sessions in §1).
- [ ] At least two provisioned test schools with synthetic data.
- [ ] Export, upload, job-queue and cache subsystems implemented (else their rows stay `N/A-now`).
- [x] License expiry behaviour that preserves data access/export (T-25..T-27) — **executed live 2026-10-21, see §6** (owner still decides retention/RPO/RTO in G9/G10; the behavioural contract itself now has an execution record).

The first four dependencies still gate T-1..T-24; **until those are executed, no isolation claim is made or certified** for the isolation rows.

## 6. Execution record — T-25..T-27 (gate G8), live 2026-10-21

Executed against the live Hostinger deployment (build 10, commit `77739b6`, artefact
`c31ad281…`), pilot school **id 3** (starter plan), control DB `u121986687_zee_control`,
school DB `u121986687_zee_school_1`. Raw transcript: `~/g8_v2_evidence.txt` on the
deployment host (script `/tmp/g8_license_matrix_v2.sh`). All SQL was run with fully
qualified table names on a single connection per phase to avoid connection-burst noise.

Procedure and results:

| Step | Action | Result |
|------|--------|--------|
| Baseline | Licence row `1\|active\|2026-10-21\|2027-10-21\|2027-11-04\|14`; snapshot = `CHECKSUM TABLE` of all **22** school tables + per-table row counts + control counts (schools/users/licenses/invoices) in one connection | Captured (44-line snapshot) |
| Flip | `UPDATE school_licenses SET expires_at='2026-10-01', grace_until='2026-10-15'` (past both dates → `LicenseService::state()` = `expired`) | Asserted applied before any probe (`EXPIRE_APPLIED_OK`) |
| **T-25** | Fresh School-Admin login while expired, then reads: `GET /school` **200**, `GET /api/school/students` **200** with all rows (`id 2` present in body), `GET /api/school/invoices` **200**, `GET /m` **200**, login redirect chain `200 -> /school` | **ALLOW — PASS.** Expiry does not hide/delete own data; login and reads unaffected |
| **T-27a** | Re-run the full snapshot (checksums + row counts + control counts) while expired | **`SNAPSHOT_IDENTICAL` — PASS.** Zero delete/encrypt/hide; expiry is a pure date comparison, no school-data mutation |
| **T-27b** | `POST /api/school/students` (fresh CSRF token, expired licence) | **402** `{"error":"license_expired","message":"Your licence has expired. Your data is safe and readable. Renew to continue.","state":"expired","can_write":false,…}` — **write gated, reads never; PASS.** Zero G8 rows written (integrity also proves refusal did not touch the DB) |
| **T-26** | `GET /api/school/students/export`, `/api/school/export`, `/api/school/reports`, `/api/school/fees/export` | All **404** — export subsystem not implemented → row recorded **N/A-now** (cannot be export-blocked when no export exists). Closest live egress (students list) still returned every row while expired, so nothing in the implemented read path is licence-gated |
| Restore | `UPDATE` back to `2027-10-21`/`2027-11-04`; licence row compared to baseline | **`LICENCE_ROW_RESTORED_OK`** (byte-identical to baseline) |
| Restore verification | `POST /api/school/students` → **200** `{ok:true, id:5}`; row deleted; final snapshot re-run | Write works again; **`FINAL_SNAPSHOT_MATCHES_BASELINE_OK`**; students = 2, zero `G8%` leftovers |

Notes for the record:

- **Super-Admin portal does not render licence-state text**: while expired, grepping the
  rendered `/portal` HTML for `expired|grace|renewal due` matched nothing (a 2026-10-21
  v1 run saw a stray "Renewal due" label, not reproducible — likely static UI copy).
  Licence state is surfaced only at the write path (402 JSON) and in the control DB.
  Recorded as a UX observation, **not** a gate defect: T-25/27 assert behaviour, not UI.
- **v1 of this run is void**: the first script issued unqualified SQL
  (`FROM school_licenses` with no DB selected → `ERROR 1046`, so the licence never
  actually flipped) and burst ~100 short-lived `mysql` CLI connections, which triggered
  a transient Hostinger connection refusal (`Operation not permitted`) surfacing as an
  unrelated 500. v2 above (qualified SQL, one connection per phase, assert-before-probe)
  is the evidence of record; the licence row and both databases were verified back to
  baseline after v1.
- T-1..T-24 are **not** covered by this record; they remain the G7 gate.


