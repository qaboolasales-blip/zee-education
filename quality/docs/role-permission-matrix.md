# Role & Permission Matrix — C-01.1

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-01.1** (Batch A)
- Created: 2026-10-17
- Status: **Spec executed live (gate G6).** The model below is implemented (Shield auth + route-level `session`/`role:*`/`superadmin`/`license` filters; builds 9-11) and the row-by-row matrix plus the §4 checks were executed against the pilot deployment on **2026-10-21 (build 11, commit `c9b7685`)** with the five owner-approved accounts plus an absent-role account — **see §6** for the execution record, deviations and open defects. §4 boxes are ticked only where executed; unchecked boxes remain planned (their notes say what covers them).

## 0. Non-negotiable principles

1. **Least privilege.** Every role gets the minimum needed; default is **deny**.
2. **Server-side enforcement.** Every rule below must be enforced by server-side checks (route filter + per-record authorisation), never by hiding UI. Browser-supplied school/role/IDs are **never** trusted for authorization.
3. **Dedicated database per school (ADR-001).** School-scoped data physically lives in that school's own database. A shared `tenant_id` column is **not** an equivalent control. Cross-school access is denied by isolation of the data store, not by a filter alone.
4. **Super Admin does not browse learner data by default.** Super Admin operates the control plane (installations, commercial, support, templates). Reading a school's learner/attendance/results/fee records is out of scope for routine operation and, if ever required for support, must be an explicit, logged, time-boxed break-glass action — a **planned check**, not a default capability.
5. **Parents only see linked children; teachers only assigned class/subject; school users only their school.**
6. **License expiry never blocks a school's access to or export of its own data** (see `ops/backup-restore-runbook.md` and `quality/docs/security-threat-model.md`).

## 1. Roles

| Role | Scope | Data plane |
|------|-------|------------|
| **Super Admin** | Platform-wide control plane only | Control-plane DB (installations, commercial, support, templates). **No** learner data by default. |
| **School Admin** | Their own school (single dedicated DB) | Full operational data of that school |
| **Teacher** | Assigned classes/subjects only, within their school | Attendance, marks, homework, timetable for assigned scope |
| **Parent/Guardian** | Linked children only, within their school | Their children's attendance, results, fees, notices, homework |
| **Student** | Self only, within their school | Their own attendance, results, homework, timetable, notices |

## 2. Legend

| Symbol | Meaning |
|--------|---------|
| **Y** | Allowed (server-side permitted) |
| **N** | Denied (server-side rejected, 403/404) |
| **C** | Conditional — allowed only for the scoped subset defined in §0 (e.g. teacher's assigned classes, parent's linked children) |
| **L** | Logged break-glass — allowed only via explicit, audited, time-boxed elevation; **planned check** |

## 3. Module × action matrix

Actions are illustrative CRUD/publish/export operations. **Deny is the default**; any cell not marked is **N**.

| Module / action | Super Admin | School Admin | Teacher | Parent | Student |
|-----------------|:-----------:|:------------:|:-------:|:------:|:-------:|
| Platform installations (create/renew/suspend) | Y | N | N | N | N |
| Platform commercial records & invoices | Y | N | N | N | N |
| Platform support tickets | Y | C* | N | N | N |
| Platform print-template design (charged) | Y | N | N | N | N |
| School branding/config | N† | Y | N | N | N |
| School users (create/disable staff, admins) | N† | Y | N | N | N |
| Students/guardians — create/edit | N | Y | N | N | N |
| Students/guardians — view | L† | Y | C | C (linked) | C (self) |
| Staff/teacher profiles & assignments | N | Y | N | N | N |
| Attendance — mark (Present/Absent/Leave) | N | Y | C (assigned) | N | N |
| Attendance — view | L† | Y | C | C (linked) | C (self) |
| Marks — enter (teacher) | N | Y | C (assigned) | N | N |
| Marks — review/approve | N | Y | N | N | N |
| Results — publish | N | Y | N | N | N |
| Results — view | L† | Y | C | C (linked) | C (self) |
| Fees — create manual record | N | Y | N | N | N |
| Fees — approve discount/fine | N | Y | N | N | N |
| Fees — view/receipt | L† | Y | N | C (linked) | C (self) |
| Timetable — manage | N | Y | C | N | N |
| Timetable — view | L† | Y | C | C (linked) | C (self) |
| Homework — create | N | Y | C (assigned) | N | N |
| Homework — view | L† | Y | C | C (linked) | C (self) |
| Notices — publish | N | Y | C | N | N |
| Notices — view | L† | Y | C (school) | C (school) | C (school) |
| Messages — send (role-scoped) | N | Y | C (scoped) | C (scoped) | C (scoped) |
| Reports — run | L† | Y | C (assigned) | C (linked) | C (self) |
| Exports — PDF/Excel/CSV | L† | Y | C (assigned) | C (linked) | C (self) |
| Print templates (school, free built-in) | N | Y | C | N | N |

\* Parent/Teacher/School-Admin "support ticket" interactions, if offered, are scoped to their own school and never expose another tenant. **Planned check.**
† Super Admin learner-data actions are **N by default**; the only path is the logged, time-boxed break-glass **L**, which is a **planned check** (no such mechanism exists yet). See §0.4.

## 4. Server-side enforcement requirements (executed 2026-10-21 unless noted)

Each box is ticked only where a live or automated check actually executed it (record: §6).

- [x] **Deny-by-default:** every authenticated route rejects an unknown/absent role with 403 (not 200-with-empty-data). — executed live: absent-role account → API reads/writes **403 `role_required` JSON** (incl. POSTs carrying a valid CSRF token); browser routes → 302.
- [x] **Role filter:** a server-side route filter maps role→permission per §3; removing/disabling the client-side UI does **not** grant access. — executed live row-by-row (§6); route groups tightened in build 11 to match §3.
- [ ] **Server-side scope:** a Teacher requesting another teacher's class, or a Parent requesting a non-linked child, is rejected server-side by ID ownership check — not merely filtered in the UI. — **not implemented as ID-ownership scoping**; today these routes blanket-deny parent/teacher reads (stricter than the §3 "C" cells — deviation D-3, §6). Row-level/parent-linked scoping remains planned; cross-tenant row ownership is executed under G7 (`tenant-isolation-test-matrix.md`).
- [x] **Never trust browser IDs:** forging `school_id`, `role`, `user_id`, or child IDs in the request (body/query/session) does not widen access. — executed live with query- and body-forgery probes (§6); forged values ignored, forged *role claims* still refused by the session's real group.
- [ ] **Cross-school denial:** any attempt to reach school B's data through school A's session is rejected (403/404) — see `quality/docs/tenant-isolation-test-matrix.md` (gate **G7**, T-1..T-24; pending).
- [ ] **Export scoping:** exports honour the same row-level scope as reads (a Parent export contains only linked children). — **N/A-now**: no export endpoints exist (all four 404, recorded under G8 T-26); re-check when exports ship.
- [x] **Super Admin learner-data denial:** Super Admin session cannot read learner/attendance/results/fee records by default (403), unless the audited break-glass path is used, which must write an audit log entry. — executed live: students/invoices → **403 `role_required` JSON**, `/school`,`/m` → 302; no break-glass path exists (none needed for V1; §0.4 keeps it planned).
- [x] **License expiry:** suspending/expiring a license does **not** revoke a school's own data access or export capability. — executed live under G8 (T-25..T-27, `tenant-isolation-test-matrix.md` §6).

## 5. Out of scope / V1 exclusions

SMS, online payment gateway, automated/unofficial WhatsApp API and native app packaging are excluded from V1 (`PROJECT_MEMORY.md`). No permission grants an in-V1 automated messaging channel beyond manual, user-initiated WhatsApp PDF sharing and role-scoped in-app messages.

## 6. Execution record (gate G6)

- **Executed:** 2026-10-21 (pre-fix baseline run + post-fix confirmation run), pilot deployment `mediumaquamarine-grouse-335108.hostingersite.com`.
- **Build:** pre-fix = build 10 (commit `77739b6`); post-fix = **build 11 (commit `c9b7685`**, package SHA `f4e9e1dab40775fe90e0329b201a79dfa46c732e75d0afbd87ae448d89bf15b2`), deployed same day; migrations no-op; `public_html` flipped b10 → b11 (rollback = re-point to `Zee_Education_v0.1.0_b10`).
- **Subjects:** the five owner-approved accounts (superadmin, school_admin b2, teacher b3, parent b4, student b5 — credentials file on the host), plus an **absent-role account** (Shield group `user`, SQL-seeded after public registration was disabled), plus anonymous requests.
- **Transcripts (deployment host `~`):** `g6_evidence_a_b11.txt` (part A: logins, anonymous, superadmin denials, platform + surface reads), `g6_evidence_b_b11.txt` (part B: writes, forgery, invites, registration block, cleanup), `g6_evidence_r3_b11.txt` (registration + absent-role reads, corrected identity seed), `g6_evidence_r4_b11.txt` (absent-role writes with valid CSRF), `g6_evidence_final_b11.txt` (final state), `g6_evidence_identity_dump.txt` (Shield 1.4 identity schema), pre-fix baselines `g6_evidence_{a,b,u}_pre_b11.txt`.
- **Local:** `backend/tests/Feature/RoleFilterApiDenialTest.php` (10 tests) — JSON denial contract, tightened route groups, superadmin invite exemption, registration disabled; suite `OK (179 tests, 715 assertions)` from fresh `zee_ci`/`zee_ci_school` harness databases.

### §4 check dispositions

| §4 check | Verdict | Live evidence (build 11) |
|----------|---------|--------------------------|
| Deny-by-default (absent role) | **PASS** | group `user`: `GET/POST /api/school/students`, invoices, staff, invite → **403 `role_required` JSON** (writes carried a valid CSRF token); `/school`,`/portal` → 302; billing → 403 `super_admin_required` |
| Role filter per §3 | **PASS** (after build-11 tightening) | row-by-row as in §6 table below |
| Never trust browser IDs | **PASS** | `?school_id=999&role=superadmin&user_id=1` and body-forged equivalents on students write → 200 **only for own school's rows**, forged role claim ignored; `?role=superadmin` on billing → 403 |
| Super Admin learner-data denial | **PASS** | superadmin: students/invoices → **403 `role_required` JSON**; `/school`,`/m` → 302; platform routes (billing, `/admin/schools`, `/portal`) → 200 while every other role → 403 JSON / 302 |
| License expiry (G8) | **PASS (G8)** | T-25..T-27 record in `tenant-isolation-test-matrix.md` §6 |
| Server-side ID-ownership scope | **NOT EXECUTED — deviation D-3** | parent/teacher blanket-denied instead of linked-children/assigned-class scoping (stricter); planned |
| Cross-school denial (G7) | **PENDING G7** | T-1..T-24 in `tenant-isolation-test-matrix.md` |
| Export scoping | **N/A-now** | export endpoints 404 (G8 T-26) |

### §3 row dispositions (live)

| Module | School Admin | Teacher | Others | Note |
|--------|:-----------:|:-------:|:------:|------|
| Platform routes (`/api/admin/billing/*`, `/api/admin/schools`, `/admin/schools`, `/portal`) | N (403 JSON / 302) | N | Y only for superadmin (200) | matches §3 rows 1-3 |
| Students read/create | **Y** (200, rows returned / create 200) | **N** (403) — stricter than §3 "C" | N (403 JSON; superadmin 403) | deviation **D-1**: teacher reads denied wholesale (no class-scope filter exists) |
| Invoices read | **Y** (200) | N (403) | N (403 incl. superadmin) | superadmin denial per §0.4 (learner-data) overrides any row reading "Y" for platform operator |
| Staff create | **Y** (200) | **N (403)** — fixed in build 11 | N (403 JSON) | pre-fix teacher create was 200 = deviation F2, route now `role:school_admin` |
| Attendance mark | Y (reaches controller → **500, defect LB-2**) | Y (500, LB-2) | N (403 JSON) | filter passes per §3 row 10; body fails on unset academic FKs (academic-structure scope, owner decision) |
| Fees invoice create | Y (reaches controller → **500, defect LB-4**) | **N (403)** — fixed in build 11 | N (403 JSON) | pre-fix teacher invoice was 500-visible; route now `role:school_admin`; LB-4 = `fee_invoices.academic_session_id`/`due_date` NOT NULL vs nulls sent (same family as LB-2) |
| Fees receipt create | Y (200 `ok:false` — no invoice exists because LB-4) | N (403) | N (403) | |
| `/school`, `/m` surfaces | 200 | 200 | 302 (parent/student/anon) | rows 20-21 |
| Connect invite (`/api/connect/invite`) | 409 (controller: no verified domain) | 409 | N (403 JSON) | superadmin now **409** — pre-fix the school-link rule 302/303-blocked the platform operator on routes listing `superadmin` (F3, fixed in build 11) |
| Registration (`/register`) | closed to everyone | — | GET **302** (form absent), POST with valid CSRF → **303, zero users created** | disabled in `Config\Auth::$allowRegistration` (build 11); pre-fix GET was 200 with a live form |

### Findings → build 11

| ID | Finding (pre-fix, build 10) | Resolution |
|----|------------------------------|------------|
| F1 | Role/permission refusals on `/api/*` answered **302/303 redirects** (even with `Accept: application/json`) — no JSON denial contract | `RoleFilter` now answers **401 `unauthenticated` / 403 `role_required` / 403 `school_not_linked` JSON** on API paths (route-path check mirroring `SuperAdminFilter`) |
| F2 | Teacher could `POST /api/school/staff` and reach fees routes (200 / LB-4 500) — wrong per §3 rows 6,17,18 | `Routes.php`: staff + fees/invoices + fees/receipts → `role:school_admin` only; attendance keeps `role:school_admin,teacher` |
| F3 | Superadmin minting invites was blocked by the school-link rule (302/303 → `/`) on routes listing `superadmin` | school-link rule now **exempts superadmin**; invite reaches controller (business-rule 409 when no domain) |
| F5 | Public self-registration open (GET `/register` 200 with form; auto-login `user`-group account) | `Config\Auth::$allowRegistration = false` — GET 302, POST creates nothing (live-proven) |
| D-1 | Teacher students-read denied wholesale (403) vs §3 "C" | accepted-stricter (no class-scope data exists yet); re-evaluate with academic structure |
| D-2 | Superadmin invoices-read 403 vs any row reading "Y" | intended: §0.4 learner-data denial for the platform operator |
| D-3 | Parent/teacher "C" cells not implemented as ID-ownership scope | planned (see §4 box); blanket deny today |
| LB-2 | Attendance mark → **500** for allowed roles (`attendance.academic_session_id` NOT NULL FK unset) | open — academic-structure scope, owner decision; no fake-seeding |
| LB-4 | Fees invoice create → **500** for school_admin (`fee_invoices.academic_session_id`/`due_date` NOT NULL vs `SchoolRecordService::createFeeInvoice` sending null) | open — same family as LB-2; roles now correct (teacher 403), body defect remains |

### Observations (environment, not defects)

- Anonymous requests are answered by Shield's `session` filter **before** the role filter: `302` to login for school routes *even with `Accept: application/json`*; platform billing API is the exception (401 JSON from `SuperAdminFilter`). Authenticated denials are the JSON contract this gate requires.
- CI4 answers **303** to POST redirects and **302** to GET redirects (registration-blocked POST shows this).
- Shield 1.4 identity layout on the live DB: `auth_identities.secret` holds the **email**, `secret2` the bcrypt hash (`name` is unused/NULL) — probing scripts must seed accordingly.
- Final state after the whole run: control `schools=1 users=5 identities=5 groups=5 invites=0 licenses=1`, school `students=2 staff=0 invoices=0 receipts=0`, zero probe rows (school DB) — equals baseline.

