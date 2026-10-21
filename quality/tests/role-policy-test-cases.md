# Role Policy Test Cases — B-C-01

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **B-C-01** (Batch B — Identity, Roles & Session Security)
- Created: 2026-10-17
- Source matrix: `quality/docs/role-permission-matrix.md` (§3 module×action, §4 enforcement).
- Status: **Executable-ready test spec, not yet runnable.** Backend auth does not exist yet (Controllers = Health/Home/Setup only; `app/Filters`, `app/Models`, `app/Libraries` empty — verified 2026-10-17). These cases are written so a later agent can turn them into PHPUnit feature tests the moment KiloCode ships auth + a role policy. No route is invented: each case names a **module + action** from the matrix and a **resource scope**, and the concrete endpoint is bound later from KiloCode's API contract.

## 0. How to implement these later (no ambiguity)

- Each case = one server-side policy assertion. Bind `<EP(module,action)>` to the real route once published; keep the module/action/scope identical.
- Sessions: create one authenticated session per role for **School A** and **School B** with synthetic data only (`TENANT-A-…`/`TENANT-B-…` markers). No real student/guardian data.
- A case **passes** only on the stated HTTP status. `401` = unauthenticated, `403` = authenticated but not permitted, `404` = resource not found/hidden. Never accept `200` with empty data as a deny.
- Deny-by-default: any role/action pair not explicitly allowed must return `403` (or `404` where hiding is preferred). The matrix marks unlisted cells as **N**.
- Browser-supplied `school_id`/`role`/`user_id`/IDs must never widen access; the server derives scope from the session/token.

## 1. Cross-cutting cases (apply to ALL roles) — prefix `RP-X`

| ID | Preconditions | Action | Expected |
|----|---------------|--------|----------|
| RP-X-01 | No session (anonymous) | Call any `<EP>` that is not `/health` or `/setup` | **401** |
| RP-X-02 | Valid session, but request forges `school_id`/`tenant_id` to School B | Any school-scoped `<EP>` | **403/404** — browser school id ignored; A's own DB used |
| RP-X-03 | Valid session with tampered/invalid token signature | Any `<EP>` | **401** — signature validation fails |
| RP-X-04 | Valid session, but role claim edited to a higher role | Any higher-privilege `<EP>` | **403** — role from server-side identity, not client claim |
| RP-X-05 | Session expired (idle/absolute) | Any `<EP>` | **401** |
| RP-X-06 | Valid School A session | Request a School B record by guessed id | **403/404** — never B data (ties to tenant matrix T-1/T-5) |
| RP-X-07 | Anonymous | Request `/health`, `/setup` | **200** (public by design; no tenant/learner data) |

## 2. Super Admin — prefix `RP-SU`

Default-deny on learner data (matrix §0.4). Super Admin operates the control plane only.

| ID | Scope | Action | Expected |
|----|-------|--------|----------|
| RP-SU-01 | Control plane | Create/renew/suspend an installation | **200** (allowed) |
| RP-SU-02 | Control plane | Read platform commercial records | **200** (allowed) |
| RP-SU-03 | School A learner data | Read students/attendance/results/fees via any school `<EP>` | **403** by default (learner data not browsable) |
| RP-SU-04 | School A learner data | Same as SU-03 via an audited break-glass path | **200 only if** break-glass granted **and** an audit-log entry is written; else **403** (planned: no break-glass exists yet) |
| RP-SU-05 | School A config | Edit school branding/config | **403** (School Admin's job, not routine Super Admin) |
| RP-SU-06 | Cross-school | With break-glass for A, attempt School B learner data | **403** — elevation scoped to one school |

## 3. School Admin — prefix `RP-SA`

Full operational control of their own school only.

| ID | Scope | Action | Expected |
|----|-------|--------|----------|
| RP-SA-01 | School A | Create/edit a student/guardian | **200** |
| RP-SA-02 | School A | Mark attendance | **200** |
| RP-SA-03 | School A | Enter then review/approve marks; publish results | **200** (own school) |
| RP-SA-04 | School A | Create manual fee; approve discount/fine | **200** |
| RP-SA-05 | School A | Export students/fees/results | **200**, export contains **only** `TENANT-A-` |
| RP-SA-06 | School B | Any of SA-01..SA-05 against School B | **403/404** — no cross-school write/read |
| RP-SA-07 | School A | Disable another School Admin / create users | **200** (own school) |
| RP-SA-08 | Platform | Create/renew installations, commercial records | **403** (Super Admin only) |

## 4. Teacher — prefix `RP-T`

Assigned classes/subjects only; read-only outside assignment.

| ID | Scope | Action | Expected |
|----|-------|--------|----------|
| RP-T-01 | School A, assigned class | Mark attendance | **200** |
| RP-T-02 | School A, assigned class | Enter marks | **200** |
| RP-T-03 | School A, **unassigned** class | Mark attendance / enter marks | **403** — server-side assignment check |
| RP-T-04 | School A, **another teacher's** class | Edit that teacher's records | **403** |
| RP-T-05 | School A | Publish results / approve marks | **403** (School Admin only) |
| RP-T-06 | School A, assigned class | Create homework / manage timetable for assigned class | **200** |
| RP-T-07 | School A | Edit student profile / fees | **403** (not a teacher action) |
| RP-T-08 | School B | Any teacher action against School B | **403/404** |

## 5. Parent/Guardian — prefix `RP-P`

Linked children only; read-only.

| ID | Scope | Action | Expected |
|----|-------|--------|----------|
| RP-P-01 | School A, **linked** child | View attendance/results/fees | **200** |
| RP-P-02 | School A, **non-linked** child | View that child's data | **403/404** — ownership check |
| RP-P-03 | School A, linked child | Export "my children" | **200**, only the linked child; no other tenant |
| RP-P-04 | School A | Mark attendance / enter marks / edit records | **403** (read-only) |
| RP-P-05 | School A | Publish results / manage users | **403** |
| RP-P-06 | School B | Any parent action against School B | **403/404** |

## 6. Student — prefix `RP-ST`

Self only; read-only.

| ID | Scope | Action | Expected |
|----|-------|--------|----------|
| RP-ST-01 | School A, self | View own attendance/results/timetable | **200** |
| RP-ST-02 | School A, another student | View that student's data | **403/404** — self-scope only |
| RP-ST-03 | School A | Edit any record / mark attendance / enter marks | **403** |
| RP-ST-04 | School A | Publish results / manage users / export others | **403** |
| RP-ST-05 | School B | Any student action against School B | **403/404** |

## 7. Coverage vs exit gate

- Every role (Super Admin, School Admin, Teacher, Parent, Student) has server-side policy cases above → satisfies the Batch B exit-gate item *"Every role has server-side policy tests"* once these are bound to real routes and executed.
- RP-X-02/03/04 + RP-*-cross-school cases jointly prove *"browser cannot self-assign a role/school."*
- **Execution status: partially executed 2026-10-21 (update supersedes the BLOCKED line above).** Auth/role policy now exists in `backend/`, and the **G6 live role matrix executed row-by-row against build 11** with all five roles plus an absent-role account — deny-by-default, forged-ID probes, superadmin learner denial and write denials all live-verified (record: `quality/docs/role-permission-matrix.md` §6; gate G6 → GO). Cases above that depend on per-record scoping (linked children, assigned classes — the "C" cells) remain **unexecuted spec**: those routes blanket-deny today (stricter), so route-level denial covered them without the row-level check existing. Cross-school cases (RP-*-cross-school, RP-ST-05) are executed under `quality/docs/tenant-isolation-test-matrix.md` (gate G7, still pending T-1..T-24). Nothing is claimed passing beyond what matrix §6 records.

