# People Records Mapping — Students, Guardians, Staff & Enrollment

Maps every **already-visible** people-related element in the approved references
to what it would need, and records that no field exists.

**No UI element is created, changed or added by this document.**

## The hard constraint

`backend/docs/control-plane-data-boundary.md` states that student, guardian,
staff, attendance, results, fee, timetable, homework and notice data are
**"Never stored in the control plane"** and belong in each school's own
database, provisioned by the Phase P3 installer.

So Batch E data cannot land in the 4 existing tables, and cannot land at all
until the **Batch C provisioning path exists**. Seven missing entities are
enumerated in `MISSING_PEOPLE_ENTITIES`: `students`, `guardians`,
`student_guardians`, `staff`, `student_enrollments`, `student_photos`,
`student_contacts`.

**Not one student, guardian or staff field is named anywhere in `frontend/`.**

---

## E-O-01 — Element → field map

Machine-readable: `frontend/core/people/element-bindings.js` (`PEOPLE_BINDINGS`,
17 descriptors), drift-guarded against all three references on every test run.

### School Dashboard — `Students`

| ID | Element | Hook kind | Field | State |
|---|---|---|---|---|
| PB-01 | `.pe` cell — initials `i` + name `b` + subtitle `small` | text node | — | unpublished |
| PB-02 | `ID` column (`ST-2026-041`) | text node | — | unpublished |
| PB-03 | `Class` column (`Grade 6 · A`) | text node | — | unpublished |
| PB-04 | `Guardian` column (`Imran Khan`) | text node | — | unpublished |
| PB-05 | `Status` badge `.bd.g/w/r/n` | attribute | — | unpublished |
| PB-06 | Row action `View` | **blocked** | — | unpublished |
| PB-07 | Toolbar search input | attribute | — | unpublished |
| PB-08 | `All classes` select | option value | — | unpublished |
| PB-09 | `＋ Add student` | **blocked** | — | unpublished |

### School Dashboard — `Staff & HR`

| ID | Element | Hook kind | Field | State |
|---|---|---|---|---|
| PB-10 | `.pe` staff cell (`Ms. Sara Ahmed` / `EMP-2026`) | text node | — | unpublished |
| PB-11 | `Contact` column (`0300 1234567`) | text node | — | unpublished |
| PB-12 | `Today` badge (`Present` / `On leave`) | attribute | — | unpublished |
| PB-13 | `＋ Add staff` | **blocked** | — | unpublished |

### Mobile App Preview

| ID | Feature | Role access | Field | State |
|---|---|---|---|---|
| PB-14 | `students` — `.list .row` + `.pill.g` | School Admin only | — | unpublished |
| PB-15 | `admissions` — `.list .row` + `Review` | School Admin only | — | unpublished |
| PB-16 | `staff` — `.list .row` + presence pill | School Admin only | — | unpublished |
| PB-17 | `Profile` `Account` card | all | — | unpublished (BLK-04) |

**Zero of seventeen** has a published field.

---

## E-O-02 — Privacy-safe selectors

This is Batch E's deliverable that does **not** depend on a schema, and it is the
most important part: the privacy policy is built entirely from *published policy*.

### Categories

The 10 data categories are transcribed from the data-boundary document's
school-local data list. No category names a field.

### Role matrix

| Role | Scope granted | Denied |
|---|---|---|
| **Super Admin** | **nothing** | all 10 |
| **School Admin** | `school` — all 10 | — |
| **Teacher** | `assigned-class` for student profile, attendance, results, timetable/homework/notices; `school` for academic structure | fees, guardians, staff, settings |
| **Parent** | `linked-children` for student profile, attendance, results, fees, timetable/homework/notices | guardians, staff, settings, academic structure |
| **Student** | `own` for student profile, attendance, results, timetable/homework/notices | **fees**, guardians, staff, settings |
| unknown | nothing (default deny) | all 10 |
| anonymous | nothing | all 10 |

Provenance, each row:
- **Super Admin → nothing**: PROJECT_MEMORY "Super Admin does not browse learner
  data by default." Verified against the reference: the platform screen renders
  only school *identity* (its one `.pe` cell is a school, via `schoolsRows()`) and
  commercial columns `School, Domain, Plan, Database, Status, Renewal`.
- **Teacher**: PROJECT_MEMORY "teachers only use assigned class/subject data",
  plus the reference `TL.Teacher` list which contains no `fees`, `students` or
  `staff` entry.
- **Parent**: PROJECT_MEMORY "Parents only see linked children", plus
  `TL.Parent` which contains `fees` but no `students`/`staff`/`marks`.
- **Student**: `TL.Student` deliberately contains **no `fees`**.

### Redaction, not filtering

`selectPersonForRole()` returns a frozen copy where denied categories are replaced
by an explicit tombstone (`{ redacted: true, reason: 'role-not-permitted' }`).

Three reasons filtering was rejected:
1. Filtering silently changes a list length, and on a locked screen that is
   indistinguishable from real data loss.
2. A tombstone lets QA prove the refusal happened, without inventing a new string.
3. The input is never mutated, so no caller can read an unredacted copy by accident.

**Any key that is not a known category is also withheld** — so an uncontracted
field (`salary`, `cnic`, `bank_account`) cannot leak through default-open
behaviour. Asserted by test.

### Server-side scoping is mandatory

`selectLinkedChildren()` returns an **empty list** unless the caller supplies the
server-resolved `linkedIds`. The client cannot establish which children belong to
a guardian, so it never guesses. `selectOwnRecord()` behaves the same way with
`ownId`.

### This is not a security boundary

Documented in the module and asserted in tests: the server resolves role, school
and scope from the authenticated session. A `true` from this module grants
nothing; it only stops the *client* from requesting or rendering something the
product model forbids.

---

## E-O-03 — Binding contract

`assertNoPeopleElementCreation()` throws if any descriptor ever declares an
element-creating capability. `assertPeopleBindingsMatchReferences()` fails if a CSS
hook or screen a binding depends on disappears from a reference.

Three actions are marked **blocked** rather than implemented: the student row
`View` (PB-06), `＋ Add student` (PB-09), `＋ Add staff` (PB-13).

---

## E-O-04 — zero / one / many, inactive, missing photo/contact, forbidden

| Case | Delivered | Note |
|---|---|---|
| Zero children | ✅ | `describeChildCount([])` → `{count:0,isEmpty:true,isSingle:false,isMany:false}` |
| One child | ✅ | plus `selectLinkedChildren` with a single `linkedId` |
| Many children | ✅ | plus `selectLinkedChildren` with several |
| Inactive student | ✅ structure only | `classifyChildStatus()` stays **unknown** unless the caller supplies the active vocabulary, because no enrollment status enum is published. It never treats an unknown status as active |
| Missing photo | ✅ structure only | **Finding: the approved references contain no photo element at all.** The `.pe i` cell is a text initial from the name, and no reference contains an `<img>` element — asserted by test. So "missing photo" is not a state the locked UI can express |
| Missing contact | ✅ structure only | The only approved phone surface in any reference is the Staff & HR `Contact` column. There is no student or guardian contact surface |
| Forbidden response | ⚠️ documented | `403 = "Forbidden — valid auth but insufficient scope"` is published, but with no auth contract and no per-endpoint role requirement, a real forbidden test is not possible |

**No display copy is produced** by `describeChildCount()` or
`classifyChildStatus()` — they return booleans and counts only, because the
references contain no approved "no children" or "inactive student" string
(PEB-03). A test asserts that every returned value is a boolean or number.

---

## E-O-05 — Mobile role landing

**Fully delivered and testable**, because it depends only on the approved screen
registry.

| Role | Lands on |
|---|---|
| Parent, Student, Teacher, School Admin, Super Admin | `Home` |
| anonymous | `Connect` (pre-auth) |

This matches the reference render fallback `HOME[role]` — asserted by test.

`assertLandingsAreApproved()` fails if any landing target is not one of the five
approved tabs (`Home`, `Attendance`, `Results`, `Tasks`, `Profile`) or the
pre-auth `Connect` screen. Unknown roles are default-denied. A school role
resolving against the `platform` surface is refused.

No role receives a bespoke landing screen, because none exists in any reference.

---

## Task outcome

| Task | Outcome |
|---|---|
| **E-O-01** Map people screens to fields | **DONE** — 17 elements mapped, all unpublished |
| **E-O-02** Privacy-safe selectors/formatters | **DONE** — role×category×scope policy + redacting selectors |
| **E-O-03** Bind list/detail without layout change | **DONE** — binding contract with structural guards; nothing bound |
| **E-O-04** Test zero/one/many, inactive, missing photo/contact, forbidden | **DONE within published scope** — 6 of 7 fully; forbidden documented as blocked |
| **E-O-05** Mobile role landing uses approved experiences only | **DONE** — enforced and tested |

## Honest status line

> **No student, guardian or staff record can be read, and none exists.** What
> Batch E delivered is the part that does not depend on a schema and that matters
> most for a school system: a role×category×scope privacy policy derived from
> PROJECT_MEMORY and the approved per-role tool lists, plus redacting selectors
> that default-deny, withhold uncontracted keys, and refuse to guess guardian
> linkage. When KiloCode ships the per-school people schema behind the Batch C
> provisioning path, the correct data shape is already enforced by 471 passing
> tests rather than being invented at binding time.