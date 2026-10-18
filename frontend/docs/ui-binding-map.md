# UI Binding Map (O-00.2)

Maps every **already-visible** UI area in the three approved reference designs
to the data it will eventually need, so that integration can be planned without
touching a single approved pixel.

## Hard rules for this document

1. **This map adds nothing to the UI.** It is a planning artefact only. No
   button, card, row, column, icon, spinner, toast, modal, CSS rule, breakpoint
   or DOM node may be created because of anything written here.
2. **No backend payload is invented.** No column below specifies a request body,
   a response body, a field name, a data type or an envelope. The "Planned call"
   column records only an *intent* (method + logical resource) so that the
   eventual adapter can be scoped. Every entry is marked
   `contract-pending` because no API contract has been published yet
   (see `frontend/docs/backend-contract-dependency.md`).
3. **Missing hooks are recorded, not created.** Where a data need has no
   existing visible container, the state requirement column says
   `BLOCKED — no approved hook`. That is a decision for the UI owner, not for
   the integration owner.

## Legend

| Term | Meaning |
|------|---------|
| Hook | An element that already exists in the approved reference and may receive a text/attribute update without changing layout |
| `existing-text-node` | Reuse an already-rendered text node (e.g. `.stat strong`) |
| `existing-attribute` | Set an attribute already styled by the reference (e.g. `.bar i` `style="width:…%"`) |
| `existing-row-template` | The reference already renders a repeatable row/list shape; only its data source changes |
| `BLOCKED — no approved hook` | No safe existing binding point. Requires an explicit owner UI decision before any binding |
| contract-pending | No published API contract exists; the intent is recorded only |

## Global / shared areas

These areas appear on more than one screen and are the only places allowed to
carry session-, school- and locale-level bindings.

| # | Area (existing) | Hook type | Future data need | Role scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| G1 | Sidebar `.brand` + `b`/`small` — product name / subtitle | `existing-text-node` | Product name, workspace subtitle | all | static (from approved UI, not backend) | none — must stay literal |
| G2 | Sidebar `.sc` — school/platform switcher card (`b`, `p`) | `existing-text-node` | Current school name, city, workspace label | School Admin, Teacher, Parent, Student | contract-pending | Loading/error/empty: **BLOCKED — no approved hook**. No spinner or empty-state markup exists in `.sc` |
| G3 | Header `.crumb span` / `#crumb b` | `existing-text-node` | Breadcrumb label + active screen title | all | contract-pending | Loading/error: `existing-text-node` (reuse `b` for a neutral label). Empty: reuse `#crumb` default `Overview` |
| G4 | Header search `.search input#q` | `existing-attribute` | Free-text search dispatch | all | contract-pending | Loading/error/empty: **BLOCKED — no approved hook** (input has no status affordance). Search stays local-only until a contract exists |
| G5 | Header notification button `.ib.dot` | `existing-attribute` (dot visibility only, via the already-styled `:after`) | Unread count > 0 | all | contract-pending | Loading/error: **BLOCKED — no approved hook** (no badge/count element exists). Dot on/off is the only permitted visual signal |
| G6 | Header avatar `.av` | `existing-text-node` | Signed-in user's initials | all | contract-pending | Loading: render `—`. Error: keep last known. Empty: `—` |
| G7 | Language button `.ib.hl` (`EN`) | `existing-text-node` | Active locale code | all | static + persisted preference | none |
| G8 | Appearance toggle `.ib.mode` | `existing-attribute` (`data-theme` on `<html>`) | local preference only | all | none (local storage) | none — must not be data-bound |
| G9 | Toast `#toast` | `existing-text-node` | Short operational status / error summary | all | n/a | This is the **only** approved channel for a user-visible error/empty notice. No new toast may be introduced |
| G10 | Bottom nav `.bt button` (mobile) | `existing-attribute` (`.on` class already styled) | Role-scoped nav subset | all | contract-pending | Empty: hide nothing — nav is static per role |

---

## A. `Zee Education — School Dashboard.html`

### A0. `Overview` (default screen)

| # | Visible area | Hook type | Future data need | Role scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| A0-1 | `.hd .eb` — `Friday · 16 October 2026` | `existing-text-node` | Current date in Asia/Karachi | School Admin | contract-pending (or client clock — see note) | Loading: current date is not remote data. Error: n/a |
| A0-2 | `.hd h1` — `Good morning, Ayesha ☀` | `existing-text-node` | Signed-in first name + greeting | School Admin | contract-pending | Loading: `—`. Error: keep literal. Empty: `—` |
| A0-3 | `.hd p` — school tagline | `existing-text-node` | School name | School Admin | contract-pending | Error: keep literal |
| A0-4 | `.hd .bs` buttons `▣ View reports`, `＋ Quick admission` | `existing-row-template` (labels already rendered) | Button label text only | School Admin | contract-pending | No state hook. **Do not** add disabled/loading styling |
| A0-5 | `.stats .card.stat` ×5 — icon, `.up` delta, `label`, `strong`, `small` | `existing-text-node` | Enrolled students; active parents; active teachers; attendance today %; fees collected this month | School Admin | contract-pending | Loading: `—` in `strong`. Error: keep last known, `small` reused for status text. Empty: `—`. Delta `.up`: hide via existing DOM removal only if the row itself is not rendered |
| A0-6 | `Attendance overview` card — SVG path/circle geometry (`#ar` gradient, `path`, `circle`) | `existing-attribute` (path `d`, circle `cx/cy`) | 7-day school-wide attendance series | School Admin | contract-pending | Loading/error/empty: **BLOCKED — no approved hook**. The chart has no empty/loading state. Empty series must render as the currently hard-coded `pts` geometry, not a blank chart |
| A0-7 | `Students by grade` donut — `conic-gradient` stops + `.donut b` total + `.lg` legend rows | `existing-attribute` (`style` on `.donut`) | Grade-wise counts + total | School Admin | contract-pending | Loading: `—` in `.donut b`. Empty: legend renders zero rows; total `—` |
| A0-8 | `Recent activity` `.act` rows — icon, `b`, `span`, `time` | `existing-row-template` | Latest school events with relative time | School Admin | contract-pending | Loading: no rows. Error: reuse `#toast`. Empty: **BLOCKED — no approved hook** (no "no activity" copy exists) |
| A0-9 | `Monthly fee collection` `.bi` bars — `b` lakh label, `i` height, month label | `existing-attribute` (`--h`, `--c`) | 6 months of PKR collections | School Admin | contract-pending | Loading/error/empty: **BLOCKED — no approved hook** for bars. Footer total line already exists and can carry `—` |
| A0-10 | `Top classes` `.rk` rows — rank, class name, `.pr i` width, `b` % | `existing-row-template` | Attendance % per class | School Admin | contract-pending | Empty: zero rows |
| A0-11 | `School calendar` `.cal` grid — `.td` marked day + 2 event lines | `existing-attribute` (`.td` on one span) | Month grid + 2 upcoming events | School Admin | contract-pending | Loading/error: keep current month. Empty: event lines collapse to the two `.s` lines with `—` |

### A1. `Students`

| # | Visible area | Hook type | Future data need | Role scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| A1-1 | `.hd` eyebrow/title/subtitle + action buttons | `existing-text-node` | static copy | School Admin | n/a | none |
| A1-2 | `.tool .search input` | `existing-attribute` | Student/ID/guardian filter | School Admin | contract-pending | **BLOCKED — no approved hook** for result counts |
| A1-3 | `.tool select` (`All classes`) | `existing-attribute` (`<option>` list is existing DOM) | Class filter options | School Admin | contract-pending | Empty: keep the single `All classes` option. Adding options mutates existing `<option>` nodes only |
| A1-4 | `table` rows — `.pe` person cell, `ID`, `Class`, `Guardian`, `bd` status badge, `.lk` View | `existing-row-template` | Student list with enrollment status | School Admin (own school only) | contract-pending | Loading: no rows. Error: `#toast`. Empty: **BLOCKED — no approved hook** (no empty-state row exists) |
| A1-5 | `bd` status badges `g/w/r/n` | `existing-attribute` (existing classes only) | Enrollment status enum | School Admin | contract-pending | Unknown status → reuse `n` class only. No new badge colour may be introduced |

### A2. `Attendance`

| # | Visible area | Hook type | Future data need | Role scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| A2-1 | Register card title `Grade 6 · Section A · 16 Oct` | `existing-text-node` | Class/section/date | Teacher (assigned), School Admin | contract-pending | Error: `—` |
| A2-2 | `.ar` rows — student name, ID, `.ch` P/A/L buttons | `existing-row-template` | Assigned-class roster | Teacher (assigned classes only) | contract-pending | Loading: no rows. Empty: **BLOCKED — no approved hook** |
| A2-3 | `.ch button.P/.A/.L` `.on` class | `existing-attribute` (classes already styled green/amber/red) | Mark value per student | Teacher | contract-pending (POST) | No state hook. Confirm feedback must reuse `#toast` |
| A2-4 | `sm('CLASS PROGRESS','28 / 28',…)` | `existing-text-node` | Marked/total count | Teacher | contract-pending | Loading: `— / —`. Empty: `0 / 0` |
| A2-5 | `sm('PARENT ALERTS', …)` | `existing-text-node` | App-notification follow-up count | Teacher | contract-pending | Loading: `—`. Empty: `0`. Copy must not claim SMS (V1 exclusion) |

### A3. `Academics`

| # | Visible area | Hook type | Future data need | Role scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| A3-1 | Assessment card title/subtitle (`Term 1 · Max 20`) | `existing-text-node` | Assessment name, term, max marks | Teacher (assigned), School Admin (review) | contract-pending | Error: `—` |
| A3-2 | `bd('w','Awaiting review')` | `existing-attribute` | Publication workflow state | Teacher, School Admin | contract-pending | Only the 4 existing badge classes may be used |
| A3-3 | Score inputs `.in` (`value`) + grade column | `existing-row-template` / `existing-attribute` | Draft marks per student | Teacher (own class) | contract-pending (PATCH/POST) | Loading: disable is **not** available without a CSS/attr change → use read-only + `#toast`. Error: keep last entered value |
| A3-4 | `.flow` 3-step publication workflow (`.d`, `.nw`) | `existing-attribute` (classes already styled) | Workflow step | Teacher, School Admin | contract-pending | Step must map to an existing class; no new step may be inserted |
| A3-5 | `Send for review` primary button | n/a | Submission action | Teacher | contract-pending (POST) | Feedback via `#toast` |

### A4. `Fees & Accounts`

| # | Visible area | Hook type | Future data need | Role scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| A4-1 | `sm` tiles: collected this month / outstanding dues / payment sources | `existing-text-node` | PKR totals, invoice counts, mode count | School Admin | contract-pending | Loading: `—`. Empty: `0`. PKR formatting via `formatPkr` |
| A4-2 | Fee table rows — student, invoice no., amount, reference, status badge | `existing-row-template` | Manual fee records with source/mode/reference | School Admin | contract-pending | Loading: no rows. Empty: **BLOCKED — no approved hook**. Offline gap: existing `—` in the reference column is the correct empty value |
| A4-3 | `Quick manual receipt` `.fg` fields — student select, amount input, mode select, reference input | `existing-attribute` (`<option>` values, input `value`) | Manual payment capture | School Admin | contract-pending (POST) | Validation errors: **BLOCKED — no approved hook** (no inline error markup exists). Field-level validation must reuse `#toast`. **Online gateway must stay absent (V1 exclusion)** |
| A4-4 | `Save payment & receipt` button | n/a | Receipt write | School Admin | contract-pending (POST) | Success/failure via `#toast`; no receipt modal may be added |

### A5. `Staff & HR`

| # | Visible area | Hook type | Future data need | Role Scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| A5-1 | `sm` tiles — active staff / present today / leave requests | `existing-text-node` | Counts + split | School Admin | contract-pending | Loading: `—`. Empty: `0` |
| A5-2 | Staff table — `.pe` person, role, contact, status badge | `existing-row-template` | Staff profiles + today's attendance | School Admin | contract-pending | Loading: no rows. Empty: **BLOCKED — no approved hook**. Payroll is not in V1 scope |

### A6. `Timetable`

| # | Visible area | Hook type | Future data need | Role Scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| A6-1 | `Grade 6 · Section A` / `Week of 19 Oct` | `existing-text-node` | Class + week | Teacher, Student | contract-pending | Error: `—` |
| A6-2 | `.sch` grid — period label + `.sl` subject cells per weekday | `existing-row-template` | Weekly timetable | Teacher, Student (own), Parent (linked child) | contract-pending | Loading/error/empty: **BLOCKED — no approved hook**. Empty day must keep the existing `.sch>div` skeleton |
| A6-3 | `Homework queue` `.ar` rows — title, class+due, `Open` | `existing-row-template` | Homework per class | Teacher, Student, Parent | contract-pending | Loading: no rows. Empty: **BLOCKED — no approved hook** |

### A7. `Reports & Print`

| # | Visible area | Hook type | Future data need | Role Scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| A7-1 | `sm` tiles — attendance report / result status / exports | `existing-text-node` | Report summaries | School Admin | contract-pending | Loading: `—`. Empty: `0` |
| A7-2 | Free built-in template cards (`.tpl` ×4) | `existing-row-template` | Available print templates | School Admin | contract-pending | Built-in templates are free (commercial rule). Custom design remains Super Admin controlled |
| A7-3 | `CUSTOM SCHOOL DESIGN` `sm` tile | `existing-text-node` | Commercial state of custom design | School Admin | contract-pending | Copy must not change; only values may bind |
| A7-4 | `Export Excel / CSV`, `Print / PDF` buttons | n/a | Export generation | School Admin (permission-controlled) | contract-pending (GET) | Progress/errors via `#toast`. **No new export dialog may be added** |

### A8. `Settings`

| # | Visible area | Hook type | Future data need | Role Scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| A8-1 | `School branding` theme swatches `.tm` `.on` | `existing-attribute` (`--brand`, `--brand2`) | School base theme | School Admin | contract-pending | Existing `setTheme()` already does this locally. `.on` ring is pre-styled. **No new swatch may be added** |
| A8-2 | `Language` select (`English`/`Roman Urdu`/`اردو · RTL`) | `existing-attribute` (`<option selected>`) | Locale preference | School Admin | contract-pending | Only the 3 existing `<option>` nodes may be used. RTL readiness is a UNIVERSAL_RULES requirement |
| A8-3 | `Timezone` select (`Asia/Karachi`) | `existing-attribute` | School timezone | School Admin | contract-pending | Locked to `Asia/Karachi` in this deployment; formatter uses that zone |
| A8-4 | `App connection` domain/code inputs + `▣ Generate app QR` | `existing-attribute` (input `value`) | School domain, connection code | School Admin | contract-pending | **The connection code is not a browser-held secret**; it is a revocable short-lived code (per the mobile reference copy). Errors via `#toast`. QR **must be generated server-side** — never in browser code |
| A8-5 | `Backup & audit` rows — daily backup, change history | `existing-text-node` | Infrastructure status | School Admin | contract-pending | **BLOCKED — no approved hook** for a degraded state (only `g`/`n` badges exist). License expiry must never hide or block school data export |

---

## B. `Zee Education — Super Admin.html`

Super Admin must not browse learner data by default (PROJECT_MEMORY). Nothing in
this section may request student, attendance, marks or fee records.

### B0. `Overview`

| # | Visible area | Hook type | Future data need | Role scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| B0-1 | `.hd` eyebrow/title/subtitle | `existing-text-node` | static copy | Super Admin | n/a | none |
| B0-2 | `.stats .card.stat` ×4 — total installs, upcoming renewals, licensed revenue, open tickets | `existing-text-node` | Platform aggregates only | Super Admin | contract-pending | Loading: `—`. Error: keep last known. Empty: `0`. Revenue via `formatPkrCompact` |
| B0-3 | `Installation & renewal trend` `.bg` grouped bars (`--h`, `--c`) | `existing-attribute` | 6-month install + renewal series | Super Admin | contract-pending | Loading/error/empty: **BLOCKED — no approved hook**. Empty series must keep the existing 6 `.bg` groups |
| B0-4 | `Renewals needing attention` `.rr` rows — school, plan + PKR amount, `small` due-in | `existing-row-template` | Renewals due within window | Super Admin | contract-pending | Loading: no rows. Empty: **BLOCKED — no approved hook** |
| B0-5 | `School installations` table + `⇩ Export` | `existing-row-template` | Install list: school, domain, plan, database mode, status, renewal | Super Admin | contract-pending | Loading: no rows. Empty: **BLOCKED — no approved hook**. Only the existing `g/w/n` badges may be used |
| B0-6 | Plan cards (`PL`) ×3 with `SUGGESTED` ribbon | `existing-row-template` | Plan catalogue labels | Super Admin | contract-pending | **No public hard-coded pricing.** Prices are negotiated per school, so only plan names/labels may bind |
| B0-7 | `View all →` link → `Billing & Renewals` | n/a | navigation only | Super Admin | n/a | none |

### B1. `Schools & Installs`

| # | Visible area | Hook type | Future data need | Role scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| B1-1 | `.tool .search input` | `existing-attribute` | School/domain/city filter | Super Admin | contract-pending | **BLOCKED — no approved hook** for result counts |
| B1-2 | `.tool select` (`All plans`, `All states`) | `existing-attribute` | Plan and status filters | Super Admin | contract-pending | Only existing `<option>` nodes may be mutated |
| B1-3 | Install table (shared with B0-5) | `existing-row-template` | Install records | Super Admin | contract-pending | as B0-5 |
| B1-4 | `Install lifecycle` `.flow` ×5 (`.d`/`.nw`) | `existing-attribute` | Provisioning stage per install | Super Admin | contract-pending | Stage must map to an existing class; **no extra step may be inserted** |
| B1-5 | `View health log` button | n/a | Health log for that install | Super Admin | contract-pending (GET) | Output via `#toast` only; **no log modal may be added** |
| B1-6 | `Isolation note` + `Dedicated database required` badge | `existing-text-node` | static governance copy | Super Admin | n/a | Must not change. A shared `tenant_id` table is **not** an acceptable substitute (UNIVERSAL_RULES §5) |

### B2. `Plans & Add-ons`

| # | Visible area | Hook type | Future data need | Role scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| B2-1 | Plan cards ×3 | `existing-row-template` | Catalogue copy | Super Admin | contract-pending | Labels only; no public pricing |
| B2-2 | Add-on cards ×4 (`Additional campus`, `Payroll module`, `Custom fields`, `Custom print design`) | `existing-row-template` | Add-on catalogue + charging mode | Super Admin | contract-pending | Charging rules are fixed by commercial policy; only labels may bind |
| B2-3 | `＋ Custom quote` / `Create quote` / `Add to quote` | n/a | Quote actions | Super Admin | contract-pending (POST) | `★ Custom quote builder preview ★` in the reference is a **placeholder** — a real quote form has **no approved UI hook** and is BLOCKED pending owner design |

### B3. `Billing & Renewals`

| # | Visible area | Hook type | Future data need | Role scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| B3-1 | `sm` tiles — setup one-time / annual renewal / hosting-domain separate | `existing-text-node` | Line-item model display | Super Admin | contract-pending | Must continue to show these as **separate** line items |
| B3-2 | `School rate book` `.ar` rows — school, plan, price input, `Save` | `existing-attribute` (input `value`) | Negotiated per-school rates | Super Admin | contract-pending (PATCH) | Validation errors: **BLOCKED — no approved hook**; use `#toast`. **Concurrent-edit conflict handling has no approved hook** |
| B3-3 | `Renewal reminder` school select + `Prepare reminder` | `existing-attribute` | Reminder target | Super Admin | contract-pending | Reference copy already states a real email service is required. **No email provider may be wired from browser code** |
| B3-4 | Billing records / receipts list | — | Commercial ledger | Super Admin | contract-pending | **BLOCKED — no approved hook.** The locked screen shows only a rate book; a ledger table does not exist and may not be added by me |

### B4. `Print Templates`

| # | Visible area | Hook type | Future data need | Role Scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| B4-1 | Free built-in templates `.tr` ×4 with `Free` badge | `existing-row-template` | Built-in template list | Super Admin | contract-pending | Must remain free to select (commercial rule) |
| B4-2 | `Custom template rules` rows — design fee / future reprints | `existing-text-node` | Charge policy display | Super Admin | n/a | Must not change: one-time charge, reprints included |
| B4-3 | `＋ Custom template` editor | n/a | Template authoring | Super Admin | contract-pending | Reference says "Template editor preview". A real editor has **no approved hook** → BLOCKED pending owner design |

### B5. `Support Tickets`

| # | Visible area | Hook type | Future data need | Role scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| B5-1 | `Open tickets` `.tk` rows — id+subject, school, updated, priority badge | `existing-row-template` | Platform-level tickets | Super Admin | contract-pending | Loading: no rows. Empty: **BLOCKED — no approved hook**. Copy already warns against putting student data in tickets |
| B5-2 | `Ticket workflow` `.flow` ×4 | `existing-attribute` | Ticket state | Super Admin | contract-pending | Only existing classes; no extra stage |
| B5-3 | `＋ Create ticket` | n/a | Ticket creation | Super Admin (and School Admin from school workspace) | contract-pending (POST) | No compose modal exists → BLOCKED |
| B5-4 | `Support access rule` copy | `existing-text-node` | static governance copy | Super Admin | n/a | Must not change: school records stay isolated absent an audited exceptional policy |

### B6. `System Settings`

| # | Visible area | Hook type | Future data need | Role scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| B6-1 | `Platform operations` `.ar` toggles ×4 (`.tg`, `.tg.off`) | `existing-attribute` (class toggle already styled) | Platform preferences | Super Admin | contract-pending (PATCH) | The reference toggles are **local-only demo state**; binding them requires backend persistence and an audit trail. Toggle failure state: **BLOCKED — no approved hook** |
| B6-2 | `Languages & visual system` theme swatches `.tm` | `existing-attribute` | Platform preview theme | Super Admin | n/a | Must not affect school branding (explicit in locked copy) |
| B6-3 | V1 scope badges `Manual WhatsApp PDF · V1` / `SMS / online payments · excluded` | `existing-text-node` | static scope statement | Super Admin | n/a | Must not change. SMS / online gateway / automated WhatsApp stay excluded |

---

## C. `Zee Education — Mobile App Preview.html`

This file is a **phone-frame preview harness**, not the mobile application.
The role selector in `.panel` is a preview control and is explicitly documented
as *not* how production identifies a role ("Production mein server account se
role identify karega — user khud admin role select nahin karega").

| # | Visible area | Hook type | Future data need | Role scope | Planned call | State requirement |
|---|---|---|---|---|---|---|
| C1 | `.panel .roles button` — role preview selector | n/a | none | preview only | **must never be data-bound** | Production role comes from the server session. Binding this control would be an authorization defect |
| C2 | `.panel #domain` / `#code` inputs + `Connect school` / `Open onboarding screen` | `existing-attribute` (input `value`) | School domain + short-lived connection code | pre-auth | contract-pending (POST) | The reference copy already states production QR codes are short-lived/revocable, **not permanent secrets**. Browser must not cache or persist the code beyond the flow |
| C3 | `.bound` V1 boundary note | `existing-text-node` | static scope statement | all | n/a | Must not change |
| C4 | `.phone .status` `9:41` / `5G ▮▮▮` | n/a | none | all | n/a | **Fake chrome — must never be data-bound.** On a real device this is OS-rendered |
| C5 | `.head .school` — `#sn` school name + `#rs` role | `existing-text-node` | School identity + authenticated role | all | contract-pending | Loading: `—`. Error: keep last known. Empty: `—` |
| C6 | `.head .bell` notification dot (`:after`) | `existing-attribute` | Unread flag | all | contract-pending | **BLOCKED — no approved hook** for a count badge |
| C7 | `.screen .hello` date line + `h3` greeting | `existing-text-node` | Asia/Karachi date; greeting + name | all | contract-pending | Loading: date from client clock; greeting `—` |
| C8 | `.hero` — `span` label, `strong` value, `small` note, `.bar i` width % | `existing-text-node` + `existing-attribute` | Role headline metric + progress | all | contract-pending | Loading: `—`. Empty: `—`. `.bar i` width is the only permitted progress visual |
| C9 | `.kpis .kpi` ×4 — `span`, `b`, `i` | `existing-text-node` | Per-role KPIs (`KP`) | all | contract-pending | Loading: `—` in each `b`. Empty: `—` |
| C10 | `.insight` — 7 `.insight-bars i` (`--h`,`--c`) + day labels | `existing-attribute` | 7-day activity series | all | contract-pending | Loading/error/empty: **BLOCKED — no approved hook**. Empty series must keep 7 bars |
| C11 | `.card` insight cards (`label`,`strong`,`p`, optional `.prog`) | `existing-text-node` + `existing-attribute` | Fees due, notices, results review, next class | all | contract-pending | Loading: `—`. Empty: `—`. Progress via `.prog i` width only |
| C12 | `.quick` ×4 action tiles | `existing-row-template` (labels) | Action labels | all | contract-pending | Labels only; **no tile may be added or removed** |
| C13 | `↗ Share result PDF on WhatsApp` | n/a | Manual user-initiated PDF share | Parent | n/a | Must remain **manual**; automated WhatsApp/SMS is a V1 exclusion |
| C14 | `.list .row` — `b`, `span`, `.pill` | `existing-row-template` | Attendance days, timetable periods, fees, homework, notices, messages, leave, calendar, marks, reports, students, admissions, staff, settings, documents | Parent / Student / Teacher / School Admin (per `TL` scoping) | contract-pending | Loading: no rows. Empty: **BLOCKED — no approved hook** on every `.list` |
| C15 | `Attendance` screen — staff toggleable rows vs parent read-only rows | `existing-attribute` (`.pill.g` / `.pill.r`) | Present/Absent per student | Teacher/School Admin (toggle); Parent (linked children only, read-only) | contract-pending (POST for staff) | Only `.g`/`.r` pills may be used. Leave (`.w`) exists in the `.pill` set but is **not** used on this screen — see open item OI-4 |
| C16 | `Results` screen — `hero` + per-subject rows + primary action | `existing-text-node` | Teacher draft marks / Admin review / Parent published results | Teacher, School Admin, Parent, Student | contract-pending | Parents/Students may only ever see **published** results. Draft state must not be exposed to them |
| C17 | `Tasks` screen `.tools .tool` tiles (`F` registry, `TL` per role) | `existing-row-template` | Role-scoped tool list | all | contract-pending | The `TL` map is the least-privilege source of truth. **It may not be widened from the client** |
| C18 | `Profile` screen — account, school connection, theme cards | `existing-text-node` | Signed-in identity, school, locale, theme | all | contract-pending | Connection code display is locked copy (`School code: HZ-9246`). Treat as **non-secret but non-persistent** |
| C19 | `Connect` screen — QR art (`.qrart`), `▣ Scan QR code`, manual connection, `Continue to sign in` | `existing-attribute` (art is a hard-coded decorative grid) | School discovery by QR/domain/code | pre-auth | contract-pending (POST) | **Real camera/QR permission requires a real app/PWA scope decision — NOT approved for Batch A (packet O-10.4).** `.qrart` is decorative and must not be treated as a scannable code |

---

## Cross-cutting state rules

1. **No new state UI.** Loading, error and empty states may only be expressed
   through text nodes and attributes that already exist in the reference, or
   through `#toast`. Every `BLOCKED — no approved hook` row above is a genuine
   gap that the UI owner must resolve.
2. **Partial rendering is a data decision, not a layout decision.** If a record
   list is empty, the reference's existing row template renders zero rows; the
   surrounding card, header, border, radius, padding and grid stay untouched.
3. **Formatter reuse.** PKR, Asia/Karachi date/time and empty-value rendering
   must go through `frontend/core/format/` so that the strings already present
   in the locked references stay reproducible (`PKR 1.08M`, `10:00 AM`,
   `—`, `2m ago`). See the divergence noted as open item OI-3.
4. **Authorization is server-side.** No row in this map implies that the client
   may filter, widen or restrict data by itself. Browser-supplied school IDs are
   never trusted (PROJECT_MEMORY).

## Open items for the UI owner

| ID | Item | Why it is not mine to decide |
|---|---|---|
| OI-1 | 12 areas have no approved loading/error/empty presentation | Adding any of them would be a visual change |
| OI-2 | Real quote builder (B2-3), ledger (B3-4), ticket compose (B5-3) and template editor (B4-3) have no approved layout | New screens need owner design |
| OI-3 | `PKR 296K` (uppercase K) vs `PKR 12.5k` (lowercase k) and `PKR 1.08M` in the same locked UI; also `31L`/`22L` lakh shorthand has no formatter yet | Fixing either string would be a visible UI change |
| OI-4 | The mobile Attendance screen renders only Present/Absent pills although Present/Absent/Leave is the approved model | Adding a Leave pill would change the locked row |
| OI-5 | Chart/series empty states (A0-6, A0-9, B0-3, C10) and conflict/failure states for B3-2 rate editing | New presentation needed |
| OI-6 | Every reference button currently shows `preview`/`demo` toasts — real action results have no approved presentation | Needs owner-approved feedback design |