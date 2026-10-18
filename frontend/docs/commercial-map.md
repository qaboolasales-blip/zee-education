# Super Admin commercial, license & support map — Batch K

Scope: what the locked Super Admin reference already shows about plans, licences, renewals and support, mapped to existing UI only.

Reference (read-only): `reference_ui/Zee Education — Super Admin.html`

---

## 1. What the reference contains

### 1.1 Schools & Installs — commercial columns

Table columns: `['School','Domain','Plan','Database','Status','Renewal','']`

Rows:

| School | Domain | Plan | Database | Status | Renewal |
| --- | --- | --- | --- | --- | --- |
| Horizon Public School | horizon.school.pk | Growth | Dedicated | Active | 28 Oct 2026 |
| Bright Future Academy | brightfuture.edu.pk | Starter | Dedicated | Active | 31 Oct 2026 |
| Al-Noor Model School | alnoor.school.pk | Complete | Dedicated | Renewal due | 12 Oct 2026 |
| Crescent School | crescent.edu.pk | Starter | Provisioning | Setup in progress | — |

The first cell is `.pe` (school identity, Batch E) — not a person cell.

### 1.2 Status mapping, transcribed exactly

From the reference's own `stc`:

```js
stc = s => s === 'Active' ? 'g' : s === 'Renewal due' ? 'w' : 'n'
```

and the Database badge:

```js
bd(x[4] === 'Dedicated' ? 'g' : 'w', x[4])
```

So:
- `Active` → `.g` (green)
- `Renewal due` → `.w` (amber/orange)
- anything else (`Setup in progress`, `Expired`, …) → `.n` (neutral). **Never `Active`.**
- `Dedicated` database → `.g`; anything else → `.w`

These badge classes reuse the existing global `.g`/`.w`/`.n` classes that Batch H results also use.

### 1.3 Overview `.stat` tiles

| Tile | Value | Detail | Accent |
| --- | --- | --- | --- |
| Total school installs | 28 | `24 active — 4 provisioning` / `+3 this month` | `#fff` |
| Upcoming renewals | 5 | `next: 28 Oct 2026` / `5 due soon` | `#f59e0b` |
| Licensed revenue | PKR 1.46M | `current billing period` / `+12.5%` | `#10b981` |
| Open support tickets | 7 | `across 5 school installs` / `2 waiting` | `#ec4899` |

The chart `Installation & renewal trend` is `.bars` inline SVG built by the reference; `.lg` legend names `New installations` (#3b82f6) and `Renewal collection` (#10b981).

### 1.4 Plans

Three plan names observed in the reference: `Starter`, `Growth`, `Complete`. Rate book sample:
- Horizon Public School — Growth — `42,000`
- Bright Future Academy — Starter — `30,000`
- Al-Noor Model School — Complete — `65,000`

Add-ons (`Plans & Add-ons`):
- `Additional campus` — Separately quoted
- `Payroll module` — Separately quoted
- `Custom fields` — Separately quoted
- `Custom print design` — One-time fee

Plan card styles: `.plans{display:grid:repeat(3,1fr)}`, `.plan.pop{border:2px solid var(--brand)}`.

### 1.5 Billing & Renewals

Tiles: `SETUP / INSTALLATION` (One-time, Quote per school), `LICENSE RENEWAL` (Annual, Negotiated per school), `HOSTING / DOMAIN` (Separate, License mein merge nahin).

Rate book rows have `.pn` container; export button `⬇ Billing export` → `Billing export preview`; quote `＋ Create quote` → `Billing quote preview` (variant 1).

`Renewals needing attention` list `.rr` rows: `[name, 'Complete → PKR 65,000', '4d', accent]`, rendered as `Due in 4d`.

`🔔 Prepare reminder` → `Preview only — email not connected`. **Email is not connected**, so a reminder is prepared only, never sent.

### 1.6 Support Tickets

`Support access rule` card: *"Support installation health aur approved logs dekhta hai. School records isolated rehte hain jab tak exceptional audited policy approve na ho."*

Tickets `.tk`: `['ZE-1048','Horizon Public School','App connection code','Normal','Today']`, etc. Priorities: `Normal`, `Low`, `High`.

`Create ticket` → `New ticket preview`. Support reads: installation health + approved logs only. School records stay isolated unless an exceptional audited policy is approved (Batch E privacy matrix restated).

---

## 2. Licence-state model

`core/commercial/license-state.js` transcribes `stc` and the database mapping.

| Input state | Badge | Known? |
| --- | --- | --- |
| `Active` | `.g` | yes |
| `Renewal due` | `.w` | yes |
| anything else | `.n` | no |

Database: `Dedicated` → `.g`; else → `.w`.

Renewal date: renders through the existing `—` empty marker when absent or unparseable (`—` is what the reference shows for Crescent School while it is being set up).

The one deliberate design decision: an unrecognised state such as `Expired` keeps `.n` and reports `known: false`. It is never coloured green, because a lapsed licence that looked "Active" would hide the exact problem an operator must notice.

---

## 3. Support boundary

`core/commercial/support-boundary.js` models the reference rule as an allowlist:

| Action | Scope | Conditions |
| --- | --- | --- |
| view-installation-health | installation-health | Super Admin only |
| view-approved-logs | approved-logs | Super Admin only + audited reason |
| view-commercial-record | commercial-record | Super Admin only |
| create-ticket | installation-health | Super Admin only |
| prepare-renewal-reminder | commercial-record | Super Admin only |

School-data categories (`student_profile`, `guardian_profile`, `staff_profile`, `attendance`, `academic_results`, `fee_records`) are **forbidden** through a support surface, even for Super Admin — reusing the Batch E matrix (`assertSuperAdminCannotBrowseLearners`).

`prepareRenewalReminder()` returns `{ state: 'prepared', sent: false, channel: null }`; it never returns `sent: true`, because the reference states `email not connected`.

---

## 4. Contract dependency

Every capability below is BLOCKED — no commercial table, no licensing table, no support table, no endpoint:

| ID | Capability |
| --- | --- |
| `commercial-read` | list plans, licences, renewals, rate book |
| `license-state` | report licence state for UI colouring |
| `renewal-reminder` | prepare/send a renewal reminder |
| `support-tickets` | list/create support tickets |
| `support-logs` | read approved logs for an installation |

`assertNoInventedCommercialSchemas()` fails the suite if any gains a method, path, schema or `implemented: true`.

License vocabulary gap: the reference defines exactly two states (`Active`, `Renewal due`) — no `Expired`, `Suspended` or `Trial`. The server vocabulary is a blocking question.

---

## 5. What was verified

`npm run check` — UI lock unchanged, all tests pass. Of these, 28 are the Batch K suite in `test/commercial.test.js`, covering licence-state transcription, the unknown-state fallback, commercial summary arithmetic, the support allowlist, the reminder `sent: false` contract, the binding contract and the fail-closed contract registry.

No HTML, CSS, image, font or runtime page was added to `frontend/`.
