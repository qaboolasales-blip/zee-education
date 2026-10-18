# Teacher Assignment-Boundary Tests — D-C-03

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **D-C-03** (Batch D — Test teacher cannot edit unassigned academic records)
- Created: 2026-10-17
- Source matrix: `role-permission-matrix.md` §4 (`RP-T-03`, `RP-T-04`) and `role-policy-test-cases.md` §4.
- Status: **Executable-ready spec; runtime BLOCKED.** No academic schema (classes/sections/subjects/assignments), no auth, and no teacher-assignment model exist yet (Controllers = Health/Home/Setup; Models/Libraries/Filters empty; only 4 control-plane migrations — verified 2026-10-17). Authored so a later agent can implement/run unambiguously.

## 0. Model: assignment scope is the authorization boundary

A Teacher's write scope is exactly the set of (class, section, subject) tuples they are **assigned** to, resolved **server-side** from the teacher's identity — never from a request parameter. Anything outside that set is **403**, even within the same school.

## 1. Write-scope cases — prefix `TB` (all with a Teacher session, School A)

| ID | Target record | Action | Expected |
|----|---------------|--------|----------|
| TB-01 | Assigned class/section — attendance | Mark Present/Absent/Leave | **200** |
| TB-02 | Assigned class/section — marks | Enter/edit marks | **200** |
| TB-03 | Assigned subject — homework | Create/edit homework | **200** |
| TB-04 | Assigned subject — timetable slot | Manage own slot | **200** |
| TB-05 | **Unassigned** class/section — attendance | Mark attendance | **403** |
| TB-06 | **Unassigned** subject — marks | Enter marks | **403** |
| TB-07 | **Another teacher's** assigned class | Edit attendance/marks | **403** |
| TB-08 | A class/section that exists but has **no** teacher | Edit | **403** (not implicitly claimable) |
| TB-09 | Published result | Edit/unpublish | **403** (results are School Admin–published; teacher may not alter post-publish) |
| TB-10 | Another school's assigned class | Any write | **403/404** (cross-tenant) |

## 2. Scope-forgery cases — prefix `TBF` (must not widen scope)

| ID | Case | Expected |
|----|------|----------|
| TBF-01 | Teacher sends `teacher_id`/`assignment_id` of another teacher | Ignored; scope still resolved from the session's own identity |
| TBF-02 | Teacher fabricates an assignment row linking themselves to a class | Rejected — assignment rows are created only by School Admin |
| TBF-03 | Teacher forges `school_id` to B | **403/404**; browser school ignored |
| TBF-04 | Teacher edits the assignment table directly (if reachable) | **403** — teachers cannot self-assign |
| TBF-05 | Teacher widens scope by adding `class_id`/`subject_id` params | Ignored; only server-resolved assignments count |

## 3. Read-scope cases — prefix `TBR`

| ID | Case | Expected |
|----|------|----------|
| TBR-01 | View own assigned class list | **200**, only assigned tuples |
| TBR-02 | View an unassigned class's students/marks | **403/404** |
| TBR-03 | Export own assigned data | **200**, scoped to assignments |
| TBR-04 | Export unassigned/other-teacher/other-school data | **403/404** |

## 4. Execution status vs exit gate

- **Runtime execution: BLOCKED (planned).** Requires an academic schema (classes/sections/subjects/teacher-assignments), a server-side assignment resolver, and auth — none exist yet. Ties to `ops/release-gates.md` G6/G7 and Batch D exit gate *"teacher assignment scope is enforceable server-side."*
- **Client-layer note (real):** OpenCode's non-visual frontend already carries assignment/curriculum/assessment guards and its suite passes **675/675**. But client guards are **not** authorization — the server-side cases above (TB-05..TB-10, TBF-*) are the enforceable half and remain unimplemented.
- **Exit-gate item served (as spec):** TB-05..TB-10 + TBF-01..05 directly implement *"teacher cannot edit unassigned academic records"* and *"assignment scope enforceable server-side."*
- Nothing here is claimed as passing.

## 5. Implementation guidance (for KiloCode; not written by me)

- Resolve the teacher's assignment set server-side from the authenticated user id on every write; **ignore** all client-supplied teacher/assignment/scope ids.
- Deny by default: a write with no matching assignment row → **403**.
- Assignment rows are created/edited only by School Admin (RP-SA); teachers cannot self-assign (TBF-04).
- Enforce the same scope on reads **and** exports (TBR-*).

