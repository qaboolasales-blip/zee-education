# Role & Permission Matrix — C-01.1

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-01.1** (Batch A)
- Created: 2026-10-17
- Status: **Planned authorisation model.** No authentication/authorization code exists yet in `backend/` (empty `app/Filters/`, `app/Models/` — see `quality/docs/current-state-audit.md` §2.2). This matrix is the spec the backend must implement and the checklist Batch B (C-10.2) will test. Nothing here is claimed as already enforced.

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

## 4. Server-side enforcement requirements (planned checks)

These are the checks Batch B (C-10.2) must execute once auth exists. Each is a **planned check**, not a claim of current enforcement.

- [ ] **Deny-by-default:** every authenticated route rejects an unknown/absent role with 403 (not 200-with-empty-data).
- [ ] **Role filter:** a server-side route filter maps role→permission per §3; removing/disabling the client-side UI does **not** grant access.
- [ ] **Server-side scope:** a Teacher requesting another teacher's class, or a Parent requesting a non-linked child, is rejected server-side by ID ownership check — not merely filtered in the UI.
- [ ] **Never trust browser IDs:** forging `school_id`, `role`, `user_id`, or child IDs in the request (body/query/session) does not widen access. Session/token claims are authoritative, signed, and validated server-side.
- [ ] **Cross-school denial:** any attempt to reach school B's data through school A's session is rejected (403/404) — see `quality/docs/tenant-isolation-test-matrix.md`.
- [ ] **Export scoping:** exports honour the same row-level scope as reads (a Parent export contains only linked children).
- [ ] **Super Admin learner-data denial:** Super Admin session cannot read learner/attendance/results/fee records by default (403), unless the audited break-glass path is used, which must write an audit log entry.
- [ ] **License expiry:** suspending/expiring a license does **not** revoke a school's own data access or export capability. **Planned check.**

## 5. Out of scope / V1 exclusions

SMS, online payment gateway, automated/unofficial WhatsApp API and native app packaging are excluded from V1 (`PROJECT_MEMORY.md`). No permission grants an in-V1 automated messaging channel beyond manual, user-initiated WhatsApp PDF sharing and role-scoped in-app messages.

