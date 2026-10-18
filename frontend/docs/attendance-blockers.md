# Attendance Blockers — F-O-06 (Batch F)

Gaps Batch F found. None resolved by adding UI.

Evidence: `docs/attendance-map.md`, `core/attendance/**`. Reference UI 3/3
SHA-256 MATCH.

---

## FAT-02 — The mobile attendance screen cannot record Leave

**The approved model:** Present, Absent, Leave (PROJECT_MEMORY).
**The School Dashboard:** three controls — `const c=['P','A','L']`, with
`.on.P` green, `.on.A` red, `.on.L` amber. All three work.

**The mobile app: two only.**

```js
const p = s ? att[i]!==0 : x[1]==='Present';
`<span class="pill ${p?'g':'r'}">${p?'Present':'Absent'}</span>`
// staff toggle: att[i]=att[i]===0?1:0      → binary
```

So a teacher taking attendance on mobile **cannot record Leave**. There is no
third pill and the toggle is binary.

**Why I did not fix it.** Adding a Leave pill to the mobile attendance screen is a
visible change to a pixel-locked reference. It is also a real product decision:
Leave has different semantics from Absent (it needs a reason, and it usually needs
School Admin visibility).

**What I did instead.** The model encodes the divergence exactly —
`isEnterableOn(Surface.MOBILE_APP, 'leave') === false`,
`statusesForSurface(Surface.MOBILE_APP) === ['present','absent']` — and
`assertStatusModelMatchesReferences()` **fails** if a third pill ever appears, so
the change can never happen silently.

**Owner.** Decide: (a) approve a Leave control on mobile attendance, (b) state that
mobile attendance is Present/Absent by design and Leave is desktop/School-Admin
only, or (c) state that Leave is recorded elsewhere. Option (b) is already what the
frontend implements — it needs confirming in writing.

---

## FAT-01 — Server-side duplicate protection is unpublished

The client refuses a no-op resubmission using deterministic keys
(`class|section|date|student|status`), and that protection is enforced in tests.

But **only the server can guarantee** that a retry, a double-tap, or two devices
cannot double-write a register. Two things are missing:

1. **No 409 Conflict** in the published error table (`400, 401, 403, 404, 429, 500`),
   so the client cannot even classify a duplicate the server reports. Same root
   cause as CPB-09 and DSB-05.
2. **No idempotency key strategy** and no unique constraint on
   (register, student, status).

The Batch F exit gate requires attendance to be **"correct, scoped, auditable"**.
Correctness under retry is a server property.

**KiloCode.** Publish the idempotency strategy and duplicate semantics, and add the
unique constraint.

---

## FAT-03 — No approved copy for attendance empty/incomplete states

`summariseRegister()` returns structure only — counts, a ratio, and the existing
`28 / 28` and `91.7%` shapes. It deliberately emits **no** sentence.

No approved string exists for:
- a register with no marks yet
- an empty roster
- an incomplete register
- a submit that was refused as duplicate
- a submit that failed and needs retry

The references show only populated, successful states.

**Owner.** Approve copy for those states, or accept `#toast` only.

---

## FAT-04 — Partial submission is refused by default

`canSubmit()` refuses a partially marked register (`incomplete`).

**Reason.** Without a submit contract, there is no way to know how the server would
treat unmarked students. A naive implementation records them as **absent** — which
is silently wrong attendance data, and attendance is exactly the module where a
silent default is most damaging.

**Owner / KiloCode.** Confirm whether partial submission is legitimate. If it is,
publish the contract for how unmarked students are stored (absent? unmarked? not
stored?), then this default changes.

---

## FAT-05 — Correction semantics are a frontend choice for now

The key includes the status, so correcting one student's mark produces a new key
and is permitted even when the other students are unchanged. That is the more
useful behaviour for a teacher who fixes one entry.

But the correct wire protocol — whether a correction is a full-register
resubmission or a delta — is a server decision.

**KiloCode.** Confirm the correction protocol when publishing the submit contract.

---

## FAT-06 — No audit surface

The Batch F exit gate requires attendance to be **auditable**.
`MISSING_ATTENDANCE_ENTITIES` includes `attendance_audit` (who marked what, and
when).

Note that `platform_audit_events` is a **control-plane** table for platform
actions. Attendance happens inside a school database, so an attendance audit trail
must be built there too — it cannot reuse the control-plane table.

**KiloCode.** Implement attendance auditing in the school database.

---

## FAT-07 — Class/section/date have no address

A register is identified by class + section + date. None of those exists:
`classes`, `sections` and academic sessions are all missing (DSB-04). The register
title `Grade 6 · Section A · 16 Oct` therefore has nothing to bind to, and
teacher assignment scope — which the exit gate requires — cannot be enforced
anywhere.

**KiloCode.** Academic structure first, then attendance.

---

## FAT-08 — No teacher assignment scope enforcement

PROJECT_MEMORY: *"teachers only use assigned class/subject data"*. There is no
teacher record and no assignment table, so this cannot be enforced client-side or
server-side. The client-side guard exists (`Scope.ASSIGNED_CLASS` in the Batch E
privacy matrix) but it is **explicitly not a security boundary**.

**KiloCode.** Implement assignment scope and enforce it server-side.

---

## Summary

| ID | Blocker | Type | Owner |
|---|---|---|---|
| FAT-02 | **Mobile attendance cannot record Leave** | Locked UI vs approved model | Owner |
| FAT-01 | No server-side duplicate/idempotency guarantee, no 409 | Contract + server | KiloCode |
| FAT-03 | No approved copy for attendance empty/incomplete states | UI copy | Owner |
| FAT-04 | Partial submission refused by default; server treatment unknown | Contract | KiloCode |
| FAT-05 | Correction protocol (full vs delta) is a server decision | Contract | KiloCode |
| FAT-06 | No attendance audit trail | Schema | KiloCode |
| FAT-07 | Class/section/date have no address | Schema (DSB-04) | KiloCode |
| FAT-08 | Teacher assignment scope unenforceable | Schema + auth | KiloCode |

Standing from earlier batches: **BLK-01…BLK-09**, **CPB-01…CPB-09**,
**DSB-01…DSB-08**, **PEB-01…PEB-09**.

**Net effect for Batch F: zero UI elements added.** One genuine defect was found
in the approved design (FAT-02, binary mobile attendance) and it is recorded, not
patched. Two genuine defects were found in my own code and fixed before delivery.