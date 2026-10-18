# Attendance Mapping & Behaviour — F-O-01 … F-O-05

Maps every **already-visible** attendance element to the approved controls, and
defines the safe submission behaviour that must exist before any request does.

**No UI element is created, changed or added by this document.**

## The hard constraint

`backend/docs/control-plane-data-boundary.md` lists "Attendance records" under
school-local data that is **"Never stored in the control plane"**. So attendance
cannot go in the 4 existing control-plane tables, and cannot exist at all until
the Batch C provisioning path creates a dedicated school database.

Three missing entities are enumerated in `MISSING_ATTENDANCE_ENTITIES`:
`attendance_registers`, `attendance_marks`, `attendance_audit` — the last because
the Batch F exit gate requires attendance to be **auditable**.

---

## F-O-01 — Status model bound to the approved controls, exactly

The School Dashboard register is the **only** place all three approved statuses
exist:

```js
const c=['P','A','L'];
`<button class="${k}${att[i]===j?' on':''}" onclick="att[${i}]=${j};render()">${k}</button>`

.ch button.on.P{background:#10b981;…}   /* green  */
.ch button.on.A{background:#ef4444;…}   /* red    */
.ch button.on.L{background:#f59e0b;…}   /* amber  */
```

`core/attendance/status-model.js` encodes exactly that — three statuses, three
letters, three selectors, and the precise class string the reference emits
(unselected is the **bare letter**, selected is `letter + " on"`).

`assertStatusModelMatchesReferences()` re-reads both references on every run and
fails if:
- any letter or any `.ch button.on.X` selector disappears;
- the letter order changes;
- the mobile pill toggle `${p?'g':'r'}` changes;
- the mobile labels change;
- **the mobile surface grows a third pill** — because that would be a UI change.

### FAT-02 — the mobile attendance surface is binary, and that is locked

```js
const p = s ? att[i]!==0 : x[1]==='Present';
<span class="pill ${p?'g':'r'}">${p?'Present':'Absent'}</span>
```

The mobile screen renders **Present and Absent only**, and the staff toggle is
binary (`att[i]=att[i]===0?1:0`). There is no Leave pill anywhere on mobile, even
though the approved *model* is Present/Absent/Leave.

So a teacher using the mobile app **cannot record Leave**. That is a real gap in
the approved design, not something the integration layer may paper over: adding a
third pill would be a visible change.

**Recorded as FAT-02 for the UI owner.** The frontend reflects it faithfully —
`isEnterableOn(Surface.MOBILE_APP, 'leave') === false`, and the drift guard fails
if a third pill ever appears.

---

## F-O-02 — Binding contract

`core/attendance/element-bindings.js` — 13 descriptors, drift-guarded against both
references.

| ID | Element | Hook | State |
|---|---|---|---|
| FAB-01 | Register title `Grade 6 · Section A · 16 Oct` | text node | unpublished |
| FAB-02 | `.ar` row — name + ID | row template | unpublished |
| FAB-03 | `.ch` P/A/L buttons + `.on` | attribute | unpublished |
| FAB-04 | `CLASS PROGRESS` `.sm` card | text node | unpublished |
| FAB-05 | `PARENT ALERTS` `.sm` card | text node | unpublished |
| FAB-06 | `✓ Submit register` | **blocked** | unpublished |
| FAB-07 | `Attendance today` stat tile | text node | unpublished |
| FAB-08 | `Attendance overview` SVG chart | attribute | unpublished |
| FAB-09 | Mobile `.hello` header + `h3` | text node | unpublished |
| FAB-10 | Mobile `.list .row` + `.pill.g/.pill.r` | row template | unpublished |
| FAB-11 | Mobile `Submit attendance` | **blocked** | unpublished |
| FAB-12 | Mobile `hero` + `.bar i` | text node | unpublished |
| FAB-13 | Role-specific KPI tiles | text node | unpublished |

Existing approved shapes a future binding must reproduce, not invent:
`28 / 28` + `Sab entries marked`, `91.7%` + `above target`, `94.2% this month`,
`1 pending`, `92%`.

FAB-08 is load-bearing: the chart is inline SVG with `preserveAspectRatio="none"`,
so a chart library may not be substituted.

---

## F-O-03 — Safe optimistic / error / retry behaviour

`core/attendance/submission.js` — a **pure** state machine. It performs no request,
because no endpoint exists. It provides the safety logic that must be correct
before any request is written.

**States:** `idle · marking · submitting · confirmed · rejected ·
failed-transport · no-assignment`

| Property | How |
|---|---|
| Optimistic marks are reversible | Every `markStudent()` records the prior value, and `rollbackMark()` restores it exactly — including removing a mark that had none |
| Duplicate submission refused | Each mark yields a deterministic key `class\|section\|date\|student\|status`. A resubmission whose keys are **all** already sent is refused as `duplicate-submission` |
| Genuine corrections allowed | Because the key includes the status, fixing one student produces a new key, so a correction is not blocked by the untouched students (FAT-05) |
| No assignment is first-class | `openRegister()` yields `no-assignment` when assignments are unresolved — not an error to swallow, and no mark can be set |
| Offline ≠ rejected | A transport/timeout failure yields `failed-transport` with `retryable: true`; 403/401/400/404 yield `rejected` with `retryable: false` |
| Unpublished codes are not interpreted | Any status outside the six published codes — **including 409** — becomes `failed-transport` + `unpublished-status-code`, never guessed |

The idempotency key is a **readable deterministic string**, not a hash and not a
secret. No crypto is used anywhere in this layer.

---

## F-O-04 — Role-safe summaries, structure only

`core/attendance/summary.js` reuses the Batch E privacy matrix directly: a summary
is computed only when the role may see `attendance`, and parent/student summaries
require server-resolved scope.

| Role | Summary permitted? |
|---|---|
| School Admin | ✅ school scope |
| Teacher | ✅ assigned-class scope |
| Parent | only with server-resolved `linkedIds` |
| Student | only with server-resolved `ownId` |
| **Super Admin** | ❌ **withheld** — may not browse learner data |
| unknown | ❌ withheld |

The withheld shape returns `permitted: false` and `presentRatio: null`, so a
role with no permission **cannot be rendered as `0%`**. The distinction between
"no permission" and "nobody was present" is preserved rather than erased.

Percentages and the `28 / 28` shape come from the existing formatters
(`formatPercent`, `formatNumber`). `summariseSeries()` produces day-level
aggregates only — a chart has no per-student row.

**No label, sentence or colour is produced.** A test asserts every string field is
one of `scope`, `percentText` or `progressText`. Any new copy would be a new
locked string (FAT-03).

---

## F-O-05 — Empty roster, duplicate, no assignment, offline/error

| Case | Covered | Note |
|---|---|---|
| Empty roster | ✅ | `lastError: empty-roster`, submission refused, `isRegisterComplete()` false |
| No assignment | ✅ | `no-assignment`; no mark can be set at all |
| Duplicate submission | ✅ | No-op resubmission refused; correction permitted |
| Offline | ✅ | `failed-transport`, retryable, marks retained for the caller to decide |
| Error responses | ✅ | 400/401/403/404 rejected (not retryable); 429/500 retryable |
| Unpublished code | ✅ | 409/422/418 refused as uninterpretable |
| Partially marked register | ✅ | Refused as `incomplete` — see FAT-04 |

### FAT-04 — partial submission is refused by default

Without a submit contract there is no way to know how a server would treat
unmarked students, and a naive implementation would record them **absent** —
silently wrong attendance data. Requiring every roster entry to carry an explicit
mark is the only default that cannot do that.

If the contract later permits partial submission, this is the documented change
point.

---

## Task outcome

| Task | Outcome |
|---|---|
| **F-O-01** Map controls/status visuals to Present/Absent/Leave exactly | **DONE** — three statuses bound to the exact approved classes, drift-guarded |
| **F-O-02** Bind class/date/student through existing hooks only | **DONE** — binding contract; nothing bound (no endpoint) |
| **F-O-03** Safe optimistic/error/retry behaviour | **DONE** — pure state machine, no visual redesign |
| **F-O-04** Role-safe summaries using existing cards/charts | **DONE** — structure only, privacy-matrix driven |
| **F-O-05** Test empty / duplicate / no-assignment / offline-error | **DONE** — all six cases plus partial and unpublished codes |

## Honest status line

> **Attendance cannot be recorded, and no attendance row exists.** Batch F
> delivered the part that is pure logic and entirely mine to get right: a status
> model bound to the exact approved controls, a submission state machine where
> optimistic marks are reversible, duplicate submissions are structurally refused
> and corrections are not, offline is distinguishable from rejected, and no
> unpublished status code is ever interpreted; plus role-safe summaries that
> withhold rather than zero for Super Admin. Two real defects were caught by the
> tests before delivery: a `200` success was being treated as an unpublished error
> code, and the duplicate guard was blocking genuine corrections.
>
> The most important finding is **FAT-02**: the approved mobile attendance screen
> is Present/Absent only. A teacher cannot record Leave on mobile, and adding the
> third pill would be a visible change — so that is an owner decision, not an
> integration fix.