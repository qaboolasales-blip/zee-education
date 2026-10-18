# Super Admin commercial blockers — Batch K

Every item below is blocked on work owned by another agent, or on an owner decision.
Nothing has been worked around, guessed at, or stubbed.

Status vocabulary: **BLOCKED** = cannot proceed without the named dependency.

---

## KB-01 — Licence state vocabulary is unpublished

**BLOCKED — server contract**

The reference defines exactly two licence states: `Active` (`.g`) and `Renewal due` (`.w`). Everything else falls back to `.n`, including `Setup in progress`. There is no `Expired`, `Suspended` or `Trial` state anywhere in the reference, so no server vocabulary exists to check against.

`licenseStateFor()` deliberately never assumes an unknown state is `Active`: a lapsed licence must not look healthy. This means the honest UI answer to "what colour is this school?" is sometimes `.n` (neutral) until KiloCode publishes the vocabulary.

**Unblock requires:** KiloCode publishes the licence state enum and its badge mapping. Until then, anything outside `Active`/`Renewal due` renders `.n` and reports `known: false`.

---

## KB-02 — Support log reads are permitted but unrecorded

**BLOCKED — contract + audit sink**

The reference permits support to read *installation health* and *approved logs*, but it does not say who may read them, or that the read is recorded. `authoriseSupportAction()` already refuses `view-approved-logs` without an audited reason, but a client check is a usability guard: there is no `support_audit` sink for it to write to.

School records stay isolated: student_profile, guardian_profile, staff_profile, attendance, academic_results and fee_records are all forbidden through a support surface, even for Super Admin (Batch E matrix restated).

**Unblock requires:** KiloCode publishes the support-log contract and writes a `support_audit` row per approved-log read.

---

## KB-03 — Renewal reminders cannot be sent

**BLOCKED — delivery channel**

The reference states `Preview only — email not connected` next to `Prepare reminder`. `prepareRenewalReminder()` therefore returns `{ state: 'prepared', sent: false, channel: null }`. It never returns `sent: true`, and there is no code path that produces one.

**Unblock requires:** KiloCode publishes the reminder contract and confirms a delivery channel. Until then a reminder is a draft in the UI only.

---

## KB-04 — No commercial or support contract exists

**BLOCKED — KiloCode + control plane**

The umbrella blocker:

| Missing | Consequence |
| --- | --- |
| `school_plans` | no plan catalogue behind `Starter`/`Growth`/`Complete` |
| `school_licenses` | no state behind `Active`/`Renewal due` (KB-01) |
| `school_renewals` | no renewal date/amount/expiry behind `Due in 4d` |
| `school_addons` | no quote behind `Separately quoted` / `One-time fee` |
| `support_tickets` | no ticket contract behind `ZE-1048 · Normal · Today` |
| `support_audit` | see KB-02 |

`backend/docs/control-plane-data-boundary.md` places commercial records in the control plane, so they wait on KiloCode rather than on school provisioning — but they still wait on a contract either way.

---

## KB-05 — The trend chart cannot be rebuilt

**BLOCKED — visual change**

`Installation & renewal trend` is inline SVG authored by the reference, with the `.bars`/`.lg` legend. No module may generate it (`assertNoPrintDesigner()`-style guard), and no series-data contract exists. The tile is displayed only as an existing approved visual.

---

## Completed in this batch

| Task | Status |
| --- | --- |
| K-O-01 map Super Admin commercial areas | **DONE** — 14 bindings, all `unpublished`, `field: null`, drift-guarded |
| K-O-02 display licence state with existing styles | **DONE** — `stc` transcribed; unknown state → `.n` never `Active` |
| K-O-03 bind renewal/support actions to permission-aware adapters | **DONE** — allowlist; support isolation enforced; reminder never sends |
| K-O-04 test missing data / expired state / forbidden support | **DONE** — withholding, unknown-state fallback, forbidden-category refusal |

No blocker was resolved by guessing. Where the reference was silent — expired state, ticket priorities, log audit — the gap is recorded.
