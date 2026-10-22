# People Blockers — E-O-06 (Batch E)

Gaps Batch E found. None resolved by adding UI.

Evidence: `docs/people-ui-map.md`, `core/people/**`,
`backend/docs/control-plane-data-boundary.md`. Reference UI 3/3 SHA-256 MATCH.

---

## PEB-01 — No student detail screen exists

**UI shows:** a `View` action on every Students row whose behaviour is
`notice('Profile: <name>')` — a toast.

There is no student detail, guardian detail or staff detail layout anywhere in
the approved references. A detail view would be a **new screen**, which is a
visible change I am not permitted to make.

**Consequence.** Batch E's "bind existing list/detail areas" can bind the
**list**, but the detail half has nothing to bind to. PB-06 is marked `blocked`
for exactly this reason.

**Owner.** Approve a detail screen (layout, fields per role, edit affordances) or
confirm the detail view stays a placeholder.

---

## PEB-02 — No photo and no contact surface for students or guardians

Two E-O-04 cases cannot be expressed by the locked UI at all:

| Need | Reality |
|---|---|
| Student photo | **No photo element exists in any reference.** The `.pe i` cell is a text initial computed from the name: `const ini=n=>n.split(' ').map(x=>x[0]).join('').slice(0,2)`. No reference contains an `<img>` element — asserted by test |
| Student/guardian contact | The only approved phone surface is the Staff & HR `Contact` column (`0300 1234567`). Nothing exists for a parent to see a child's contact |

So "missing photo" and "missing contact" are **not renderable states** in the
approved design. `describeOptionalMedia()` and `describeContact()` return
structured `{ present, kind: 'unsupported-by-locked-ui' }` /
`{ present, renderable: false }` rather than markup or copy.

**Owner.** Decide whether photos and student/guardian contact are in V1. If yes,
approve the presentation.

---

## PEB-03 — No approved copy for empty or inactive people states

`describeChildCount()` and `classifyChildStatus()` deliberately return **only
booleans and counts**. No approved string exists for:

- "no children yet" / an empty linked-children list
- an inactive or withdrawn student
- a search with no results
- a class filter with no classes

The references show only populated states (`842`, `4 new admissions`, `47
invoices pending`, `7 open`). Producing an empty-state sentence would introduce a
**new locked string**.

**Owner.** Approve empty/inactive copy for the Students list and the parent
children list.

---

## PEB-04 — `All classes` must stay the only option

**UI shows:** `<select style="width:170px"><option>All classes</option></select>`.

No class table exists. When one does, populating this select adds `<option>`
nodes — a visible change to an approved control. The frontend therefore cannot
populate it, and PB-08 records the constraint rather than working around it.

**Owner.** Confirm the select may be populated once a class contract exists, and
that the `All classes` option is retained as the default.

---

## PEB-05 — No approved add-student / add-staff form

Both `＋ Add student` and `＋ Add staff` exist as buttons whose behaviour is a
toast. No form layout exists for either.

Admission/enrollment is also explicitly a **later module phase** in
PROJECT_MEMORY, so it may be out of V1 scope entirely.

**Owner.** Confirm whether enrollment is in V1, and approve a form layout if so.

---

## PEB-06 — Guardian linkage is the critical missing privacy dependency

PROJECT_MEMORY: *"Parents only see linked children."*

There is no `student_guardians` table, no endpoint, and no way for the client to
know which children a signed-in guardian is linked to. `selectLinkedChildren()`
consequently returns an **empty list** unless the caller supplies server-resolved
`linkedIds` — it refuses to assume every child is linked.

This is the single dependency that must not be approximated. If the frontend ever
received the whole roll and filtered locally, every parent would see every
child's attendance and fees.

**KiloCode.** Implement the linkage and resolve it server-side from the session.
The frontend must never receive the full child list.

---

## PEB-07 — No enrollment status vocabulary

`schools.status` is published (`pending|active|suspended|decommissioned`), but
that is a **school** lifecycle, not a **student** enrollment state.

The Students table shows a `Status` badge, and the only status text present in the
reference is `Active`. No student enrollment enum is published.

`classifyChildStatus()` therefore stays `known: false` unless the caller supplies
`activeValues`, and **never** treats an unknown status as active. An unmapped
value must reuse the existing `.bd.n` badge class — no new badge may be added.

**KiloCode.** Publish the enrollment status enum and its badge mapping.

---

## PEB-08 — Admissions and payroll scope unconfirmed

- The mobile `admissions` feature and the Super Admin `Website & online
  admissions` plan line both exist, but PROJECT_MEMORY lists "Admissions/website
  enquiry" under **later module phases**.
- The School Dashboard `Staff & HR` subtitle reads "Profiles, leave, attendance
  aur payroll", yet no payroll surface or field exists anywhere.

**Owner.** Confirm whether enrollment and payroll are in V1, so the schema work
is not started against out-of-scope modules.

---

## PEB-09 — Ordering dependency: Batch C must land first

People data must live in a **dedicated school database** (ADR-001), not the
control plane. No such database exists, and creating one requires the Batch C
provisioning path — which is itself blocked on an unpublished provisioning
endpoint.

So Batch E is blocked **behind Batch C**, not merely behind a contract.

---

## Summary

| ID | Blocker | Type | Owner |
|---|---|---|---|
| PEB-01 | No student/staff detail screen exists | UI | Owner |
| PEB-02 | No photo element and no student/guardian contact surface | UI | Owner |
| PEB-03 | No approved empty/inactive people copy | UI copy | Owner |
| PEB-04 | `All classes` select cannot be populated | UI | Owner |
| PEB-05 | No add-student / add-staff form layout | UI + scope | Owner |
| PEB-06 | **Guardian linkage missing — the critical privacy dependency** | Contract | KiloCode |
| PEB-07 | No enrollment status vocabulary | Contract | KiloCode |
| PEB-08 | Admissions and payroll V1 scope unconfirmed | Scope | Owner |
| PEB-09 | Blocked behind Batch C provisioning | Ordering | KiloCode |

Standing from earlier batches: **BLK-01…BLK-09**, **CPB-01…CPB-09**,
**DSB-01…DSB-08**. Chiefly still missing: no sign-in screen, no logout control,
no school connection code field, no renewal data, no academic structure, no
settings endpoint, and no 409/idempotency semantics.

**Net effect for Batch E: zero UI elements added.** The privacy policy and the
redacting selectors are the deliverable — they enforce least privilege today and
will enforce the correct data shape once the schema exists.