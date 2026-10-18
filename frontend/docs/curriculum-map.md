# Timetable, Homework, Notices & Manual PDF Sharing — G-O-01 … G-O-05

**Two of the five microtasks are complete and enforced without any backend:
G-O-02 (navigation) and G-O-05 (no unofficial WhatsApp automation).**
G-O-01, G-O-03 and G-O-04 are delivered as models and policies; nothing is bound,
because no timetable, homework or notice table and no school database exist.

**No UI element is created, changed or added by this document.**

`PROJECT_MEMORY` lists "Timetable, homework, notices" as school-local data that is
**"Never stored in the control plane"**, so none of it can land in the 4 existing
control-plane tables.

---

## G-O-01 — Approved subject and period model

The School Dashboard timetable is the only place subject colours are defined:

```js
const C  = {M:'#3b82f6', S:'#10b981', E:'#8b5cf6', U:'#f59e0b'}
const nm = {M:'Mathematics', S:'Science', E:'English', U:'Urdu'}
const R  = [['08:30','MSEUM'], ['09:20','SMUES'], ['10:10','EUMSU']]
```

`core/curriculum/subject-model.js` encodes exactly that. Four subjects, four
accents — a **closed set**. A fifth subject would need a fifth colour, which is a
visual change (GCB-02).

`subjectCellStyle()` emits only `{ '--c': accent }`, because that is the sole
inline declaration the reference applies to a `.sl` cell:

```css
.sl{background:color-mix(in srgb,var(--c) 14%,transparent);color:var(--c)}
```

Subject accents are deliberately kept separate from school branding: branding is
`--brand`/`--brand2` and lives in `core/settings/theme-tokens.js`.

`assertSubjectModelMatchesReferences()` re-reads the reference and fails if any
accent, label, period time or weekday changes.

### Timetable behaviour

| Rule | Behaviour |
|---|---|
| Grid shape is fixed | Five weekday columns always, matching `.sch{grid-template-columns:70px repeat(5,1fr)}` |
| Cells may be blank | `timetableSlot()` returns `null` for an empty cell rather than a placeholder row |
| A duplicate cannot double-fill | First slot for a cell wins |
| Malformed slots are dropped | Unknown weekday, bad time or unknown subject never render |
| "No timetable" is a real state | `hasTimetable: false`, `reason: no-timetable`, zero slots — never a fabricated row (GCB-03) |

---

## G-O-02 — Navigation may not change — COMPLETE

`validateNavigationChange()` **always refuses**, and says why:

> Both the 5-column mobile tab bar and the desktop sidebar grid are fixed-shape.
> Adding, removing or reordering an entry is a visual change (BLK-08). Role-based
> entry points belong on the variable-length Tasks/tools grid instead.

This includes an entry that surface *already has* — the reference already renders
it, so there is nothing to change and no reason to permit a change.

`APPROVED_NAVIGATION` records the exact approved sets per surface, and
`assertCurriculumBindingsMatchReferences()` verifies every one of those entries
still exists in its reference.

---

## G-O-03 — Manual PDF share boundary (V1) — COMPLETE AS A POLICY

UNIVERSAL_RULES §7 and PROJECT_MEMORY both state:

- V1 has "manual fee records and **manual user-initiated WhatsApp PDF sharing**";
- SMS, online payment gateway, unofficial/QR WhatsApp Web automation and
  automated WhatsApp Business API are **excluded**.

`core/curriculum/share-boundary.js` turns that into code:

| Rule | Enforcement |
|---|---|
| Only approved controls may initiate | 4 triggers, each an existing locked control's visible action text |
| The share must be user initiated | `userInitiated !== true` → refused. This is the defining property |
| Code may never choose the channel | **any** `destination` is refused, including `whatsapp`. The user picks the recipient |
| Only PDF is shareable | `mediaType` must be `application/pdf` (exports are exempt, they have no media type) |
| A document is required | No reference, no share |

The two share controls — `Share result PDF` and `↗ Share result PDF on WhatsApp` —
name WhatsApp in their **locked label**. That names the *user-chosen destination*,
not an integration, and the policy refuses any attempt to address it from code.

---

## G-O-04 — No timetable / expired notice / forbidden audience / PDF failure

| Case | Result |
|---|---|
| **No timetable** | `EMPTY_TIMETABLE`: `hasTimetable false`, `reason no-timetable`, zero slots. Also covers "timetable present but all slots malformed" → `empty-timetable` |
| **Expired notice** | `classifyNotice()` → `{ state: 'expired', expired: true }`. An expired notice is a first-class state, never rendered as current. Also handles `not-yet`, `current`, `no-expiry`, `unknown` |
| **Forbidden audience** | `canRoleSeeNotice()` denies an unknown audience outright, applies the approved audience rules, and for class/section notices **requires a server-resolved assignment** — the client never assumes class membership |
| **PDF generation failure** | `classifyPdfOutcome()` separates `forbidden`, `not-found`, `rate-limited`, `generation-failed`, `transport`, and crucially `empty-document`: a `200` with zero bytes is a failure, **not a shareable document** |

Homework is classified `open · due-soon · overdue · closed` against its due date,
with an exact instant delta. A homework with no due date reports **unknown** rather
than assuming `open`.

---

## G-O-05 — No unofficial WhatsApp automation — COMPLETE

`assertNoUnofficialAutomation()` scans executable code across **all of
`frontend/core/**`** (comments stripped) and fails on:

- WhatsApp hosts or schemes (`whatsapp`, `wa.me`, `api.whatsapp.com`, `web.whatsapp.com`)
- SMS/email providers (`twilio`, `vonage`, `msg91`, `sendgrid`, `mailgun`, …)
- messaging API paths (`/messages`, `/send_sms`, …)
- automation drivers (`puppeteer`, `playwright`, `selenium`, `webdriver`)
- `mailto:` schemes
- **any outbound absolute URL** — which applies to *every* file, including the ones
  that declare the rule

The API client is the only network path in this package, and it is relative-only by
construction. Two declaration modules are exempt from the *name*-based patterns
only, because a denylist cannot avoid naming what it denies; the absolute-URL ban
still applies to them.

---

## Task outcome

| Task | Outcome |
|---|---|
| **G-O-01** Bind timetable/homework/notice data to existing approved areas only | **DONE** — 12 descriptors, drift-guarded; nothing bound |
| **G-O-02** Use existing navigation; do not add a new menu | **DONE — complete and enforced** |
| **G-O-03** Manual PDF download/share through existing hooks only | **DONE as a policy** — 4 triggers, user-initiation mandatory, no destination, PDF only |
| **G-O-04** Test no timetable / expired notice / forbidden audience / PDF failure | **DONE** — all four plus homework and empty-document cases |
| **G-O-05** Confirm no UI code calls an unofficial WhatsApp automation API | **DONE — confirmed and continuously enforced** |

## Honest status line

> **Timetable, homework and notices cannot be read or written, and no such table
> exists.** Batch G delivered the two items that are entirely mine — **no
> navigation may change**, and **no unofficial WhatsApp automation is possible** —
> plus a subject/period model bound to the exact approved palette, timetable and
> notice behaviour with every empty/error state handled, and a manual PDF share
> boundary that refuses any non-user-initiated share, any code-chosen destination
> and any non-PDF payload.
>
> The share boundary is worth stating plainly: the locked UI contains a button
> labelled *Share result PDF on WhatsApp*, and V1 permits manual user-initiated
> WhatsApp PDF sharing. The correct implementation is that **code never names the
> destination** — the user does. That distinction is now enforced in code and in
> tests, so an automated integration cannot be added quietly later.