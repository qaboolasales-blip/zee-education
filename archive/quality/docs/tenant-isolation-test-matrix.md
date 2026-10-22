# Tenant Isolation Test Matrix — C-01.2

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-01.2** (Batch A)
- Created: 2026-10-17
- Status: **Partially executed live.** The licence rows **T-25..T-27 (§3.8) executed on the live Hostinger deployment 2026-10-21** — record in §6; gate G8 flipped GO. **2026-10-21: the B-independent isolation rows (T-2, T-4, T-22 + the N/A-now/absent-surface rows) were executed live on build 11 — record in §7.** The rows that need a real second school (T-1, T-3, T-5, T-8, T-9, T-10, T-11, T-12's B-DB verification) are **blocked at the fixture step**: the host's per-DB MySQL users cannot `CREATE DATABASE` (ERROR 1044, both app users verified) and the app connects every school with one server-local user (`schooldb.default.username`), so school B needs a second database **plus a grant for `u121986687_zee_school_1`** — an hPanel (owner) action. Gate G7 stays **NO-GO** until those rows run (§7). The original 2026-10-17 dependency note below ("no school provisioning, no auth and no migrations") is obsolete as of 2026-10-20: Shield auth, role filters, migrations, provisioning and one provisioned school exist.
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

- [x] School provisioning that creates a **dedicated database per school** (not `tenant_id` in a shared DB) — one school proven live (`pilot1` → `u121986687_zee_school_1`, state `completed`); the second school needs the host-side DB+grant, see §7.
- [x] Authentication + server-side role filters (for sessions in §1) — live since 2026-10-20 (G6 used these sessions).
- [ ] At least two provisioned test schools with synthetic data — **1/2**; blocked on a host grant, §7.
- [x] Export, upload, job-queue and cache subsystems implemented — **confirmed absent** on build 11 (source: zero upload/queue/cache/export code in `backend/app`; live probes 404), so those rows are executed as **N/A-now**, §7.
- [x] License expiry behaviour that preserves data access/export (T-25..T-27) — **executed live 2026-10-21, see §6** (owner still decides retention/RPO/RTO in G9/G10; the behavioural contract itself now has an execution record).

The second-school dependency is the only one still gating T-1/T-3/T-5/T-8..T-12; **until those are executed, no isolation claim is made or certified** for those rows, and gate G7 stays NO-GO.

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

## 7. Execution record — G7 partial: B-independent rows, live 2026-10-21 (build 11)

Executed against the live Hostinger deployment on **build 11** (commit `c9b7685`, symlink
`Zee_Education_v0.1.0_b11`), school **A = pilot school id 3** (code `pilot1`, DB
`u121986687_zee_school_1`), control DB `u121986687_zee_control`. Raw transcripts on the
deployment host: `~/g7_partial_evidence.txt` (probes), `~/g7_p0_env.txt` + `~/g7_p0v3.txt`
(fixture reconnaissance, passwords redacted).

### 7.1 Fixture blocker for the B-dependent rows (why half the matrix is still open)

School B could not be provisioned — a **host capability**, not a product defect:

- Both app database users were probed directly: schooldb user `u121986687_zee_school_1`
  and control user `u121986687_zee_school_001` each return **`ERROR 1044` on
  `CREATE DATABASE`** (Hostinger per-database users; `SHOW GRANTS` = `ALL` on their own
  DB only, `USAGE` on `*.*`). The app provisions a school by connecting to an
  **already-created** database (`SchoolProvisioningService::createDedicatedDatabase`
  verifies, never creates — deliberate), with the name resolved from
  `ZEE_SCHOOL_DB_PREFIX = u121986687_zee_school_` + school code.
- Server → `api.hostinger.com` is Cloudflare-blocked (`error code: 1016`); the stored
  `~/.api_token` answers **401** against `developers.hostinger.com` from the trusted
  workstation, so it is expired/revoked.
- Required host action (one step): create DB `u121986687_zee_school_g7probe` and grant
  **ALL PRIVILEGES to existing user `u121986687_zee_school_1`** on it (same password —
  then `.env` needs no change). The reserved fixture: school code `g7probe`.

### 7.2 Rows executed (PASS), all with live evidence

| Row | Probe (build 11) | Result |
|------|------------------|--------|
| **T-2** (partial — B-marker absence check waits for B) | A-admin session + forged `school_id=9999&tenant_id=9999&user_id=9999`: `GET /api/school/students` → **200 with exactly the baseline ids `2,1`** (A's own rows, forge ignored); `POST /api/school/students` with forged ids in body → **200 `{ok:true,id:10}`**, row **physically in A's DB** (`10\|G7Forge\|G7-T2-FORGE-001`), control `schools` still **1** (nothing created/linked); row deleted after | **PASS** — browser-supplied school/tenant/user ids never switch tenant; server resolves school server-side |
| **T-4** | Valid session cookie → 200; same cookie + 1 appended char → **302 anonymous**; random 64-hex cookie → **302 anonymous**, response body contains **0** learner fields | **PASS** — tampered/unknown session claims die at the session layer; no data served |
| **T-22** | Super-admin session: `GET /api/school/students` → **403 `role_required` JSON** (`admission_number` absent from body), `GET /api/school/invoices` → 403, `GET /school` → **302** (not a school role), `GET /portal` → 200 (session sanity) | **PASS** — super-admin denied learner reads by default; control plane holds no learner bytes |
| **T-12 (route half)** | `backend/app/Config/Routes.php` registers **GET/POST literals only** — no `delete`/`put`/`patch` route exists for any tenant (route-surface snapshot: `frontend/test/provisioning-gate.test.js`), so the destructive-op attack surface is absent | **Partial PASS** — no destructive endpoint to aim at B; B-row checksum verification still waits for the B fixture |
| **T-13/14/15** | A-session `GET /api/school/students/export`, `/api/school/export`, `/api/school/reports`, `/api/school/fees/export` → all **404** | **N/A-now** — no export subsystem exists (matches T-26 in §6); cannot leak what is not built |
| **T-6 / T-7** | `GET /api/school/children` → **404** (no parent/child route in the published surface); `GET /api/school/attendance` → **404** (attendance is POST-only; no class/subject read routes exist at all) | **N/A-now** — no parent surface and no academic structure yet |
| **T-16/17/18** | Source scan: the only `upload` hit in `backend/app` is `InstallerService.php:51` creating an empty `writable/uploads` directory; no `move_uploaded_file`/`->file()` handling anywhere | **N/A-now** — no file subsystem to traverse |
| **T-19/20/21** | Source scan: `Queue\|queue(\|cache()\|->download` → **0 hits** in `backend/app/Controllers` and app-wide; no report/export job code | **N/A-now** — no job/cache subsystem carries tenant data |
| **T-23/24** | Source scan: `break.glass\|elevat` → **0 hits** in `backend/app`; no support-elevation feature, so there is no elevation path to scope — and the super-admin denial it would need is proven in the T-22 row above | **N/A-now (deny by construction)** — nothing exists to misuse; if break-glass is ever built, these rows must be re-run |

### 7.3 Rows BLOCKED on the school-B fixture

**T-1** (guess a real B record id), **T-3** (probe the id space for `TENANT-B-`), **T-5**
(A reads B's student list), **T-8** (cross-school search must never surface `TENANT-B-`),
**T-9**, **T-10**, **T-11** (cross-school writes — B DB checksums must stay unchanged),
**T-12's B-DB verification**. These need a provisioned school B with a planted
`TENANT-B-` marker row, which needs the host grant in §7.1. **No pass is claimed for
these rows**; gate G7 remains **NO-GO**.

### 7.4 Integrity

Baseline `A ids=1,2 | control schools/users/licenses=1/5/1` → after all probes
`A ids=1,2 (RESTORED_OK) | control 1/5/1 (RESTORED_OK) | G7 rows left: 0`.


