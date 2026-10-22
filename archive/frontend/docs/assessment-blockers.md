# Assessment & Results Blockers — H-O-06 (Batch H)

Gaps Batch H found. None resolved by adding UI.

Evidence: `docs/assessment-map.md`, `core/assessment/**`. Reference UI 3/3
SHA-256 MATCH.

---

## HAB-01 — No grading policy exists, so no grade is computed

**UI shows:** `A`, `A+` in the Academics grade column, and `88 / 100 · A` on the
mobile Results screen.

**Published:** nothing. No boundaries, no pass mark, no letter scheme, no `+/-`
convention, no subject weighting, no percentage-to-grade mapping.

**Why this is the most important blocker in Batch H.** A plausible-looking band
(`>= 90 = A`, `>= 80 = B`, …) is four lines of code and would make the screen render
perfectly. It would also **decide whether a real child passed**. Different Pakistani
institutions use materially different bands, and some do not use letters at all.
A guessed band is not a display detail; it is assessment policy.

**What I did.** `gradeFor()` returns `{ known: false, grade: null, reason: 'unknown-grade-band' }`
for every input, and a test asserts it stays that way even for a valid mark.

**Owner.** Approve the grading policy: grade letters or not, boundaries, pass mark,
`+/-` scheme, subject weighting. **KiloCode** then publishes it, and the server
should own the mapping so the client can never disagree with the record.

---

## HAB-02 — Locked wording differs between surfaces and must not be unified

Desktop flow step 3 reads **"3 Publish"**. The mobile marks list reads
**"Published result"**. The same stage has two locked labels.

**Why I did not unify them.** "Correcting" this would change visible text in two
approved screens. Both are recorded in `STAGE_LABELS` and both are drift-guarded.

**Owner.** Only if you want them aligned — which is a UI change, not an integration
fix.

---

## HAB-03 — No "return for changes" control

The transition `in-review → draft` is real and necessary: without it a result a
School Admin rejects is stuck, and the teacher has no path to fix it.

**But no approved control exists for it.** The references offer exactly
`Save draft for review` and `Approve & publish`. There is no "Request changes",
no reject button, and the `.flow` has no fourth state.

The transition is modelled and permission-checked, but it has **no UI hook**.

**Owner.** Approve a return-for-changes affordance — which requires a decision about
what feedback accompanies it, and therefore a notification surface (BLK-01, FAT-05).

---

## HAB-04 — A malformed mark could otherwise escape the bar

The published result chart is a fixed 6px-tick `.prog` whose only variable is
`.prog i` inline `width`. An unclamped value (e.g. `940%`) would overflow the bar —
a visible defect in a locked chart.

**What I did.** `progressWidth()` clamps to 0–100 and returns `null` for an invalid
mark; an invalid row in `buildResultRows()` yields `width: null` and `text: null`
rather than a fabricated number.

---

## HAB-05 — No approved copy for pending / unpublished / no-result

`resultSetState()` returns structure only — `isPending`, `isEmpty`,
`isUnpublished`, `viewable`, `rowCount`. It emits **no sentence**, and a withheld
aggregate returns `percentText: null`.

The references contain no approved string for "no result yet", "not published" or
"awaiting publication"; every visible state is populated. There is also no approved
loading state for the results screen.

**Owner.** Approve copy for these states, or accept the existing empty marker.

---

## HAB-06 — No busy/disabled state for mark entry

The Academics score inputs are plain `.in` elements with no disabled, readonly or
spinner style. There is no approved affordance for "saving".

A naive implementation would disable the input or dim the card — **both are visual
changes**.

**What I did.** Recorded as a constraint: any submitting state must be signalled
through `#toast` only. Note this is the same one-channel limitation as BLK-01 and
GCB-04.

**Owner.** Approve a busy state, or confirm toast-only is acceptable for V1.

---

## HAB-07 — No traceability contract

The Batch H exit gate requires results to be **traceable**. Nothing is contracted
for:

- who entered or revised a mark, and when (`mark_revisions`)
- who published a result set, and when (`result_publication`)

`platform_audit_events` cannot be reused: it is a **control-plane** table for
platform actions, while marks live in a school database (ADR-001).

**KiloCode.** Implement audit in the school database and publish the record shape.

---

## HAB-08 — Export protection is a server property

The exit gate also requires results to be **export-protected**.

There is no export or render endpoint (already recorded as GCB-06), and no
per-role export permission contract. `Reports & Print` says only "Permission
controlled", and the mobile reference says "Exports role permission enforce karein".

Whether a **Student** or **Parent** may export a published result — as opposed to
only viewing it — is an undecided permission question.

**Owner.** Decide who may export results. **KiloCode.** Enforce it server-side and
publish the contract. Export must additionally respect the Batch G manual-share
boundary (GCB-01).

---

## Summary

| ID | Blocker | Type | Owner |
|---|---|---|---|
| **HAB-01** | **No grading policy — no grade is computed** | Assessment policy | Owner + KiloCode |
| HAB-02 | Locked wording differs between surfaces; must not be unified | Locked UI | Owner |
| HAB-03 | No "return for changes" control | UI | Owner |
| HAB-04 | Chart width clamped to protect the locked bar | **Handled** | — |
| HAB-05 | No approved pending/unpublished/no-result copy | UI copy | Owner |
| HAB-06 | No busy/disabled state for mark entry | UI | Owner |
| HAB-07 | No traceability contract for marks or publication | Contract + schema | KiloCode |
| HAB-08 | Export protection and export permissions undecided | Scope + contract | Owner + KiloCode |

Standing from earlier batches: **BLK-01…BLK-09**, **CPB-01…CPB-09**,
**DSB-01…DSB-08**, **PEB-01…PEB-09**, **FAT-01…FAT-08**, **GCB-01…GCB-08**.

**Net effect for Batch H: zero UI elements added, and no grade ever invented.**
The publication gate — the exit-gate rule — is enforced and tested: an unpublished
result cannot reach a parent or student view even if the server sends one.