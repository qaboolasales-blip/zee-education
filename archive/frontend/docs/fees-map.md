# Fees & receipts map — Batch I

Scope: what the locked UI already shows about money, and which existing element
each of those shapes belongs to. Nothing here creates, moves or restyles anything.

References (read-only, hash-verified by `npm run test:ui-lock`):

| Surface | File |
| --- | --- |
| School Dashboard | `reference_ui/Zee Education — School Dashboard.html` |
| Mobile Preview | `reference_ui/Zee Education — Mobile App Preview.html` |
| Super Admin | `reference_ui/Zee Education — Super Admin.html` |

---

## 1. What the references actually contain

### 1.1 School Dashboard — Fees & Accounts

Three summary tiles, in this order, built by the reference's own `sm()` helper:

```
COLLECTED THIS MONTH   PKR 1.08M   ↑ 12.5% vs last month
OUTSTANDING DUES       PKR 296K    47 invoices pending
PAYMENT SOURCES        4          Cash · Bank · Wallet · Cheque
```

One table, five columns, two rows:

| Student | Invoice | Amount | Reference | Status |
| --- | --- | --- | --- | --- |
| Muhammad Ayan | INV-1024 | PKR 12,500 | Bank · 294012 | Paid (`.bd.g`) |
| Zain Ahmed | INV-1026 | PKR 11,000 | — | Due (`.bd.w`) |

One form, `Quick manual receipt`, with four fields: `Student` (select), `Amount`,
`Mode` (select — exactly `Cash` and `Bank`), `Reference` (`placeholder="Receipt no."`),
and one button, `Save payment & receipt`.

Two header actions: `＋ Record payment` and `Filter` (export is greyed).

Two lines of copy carry the V1 exclusion:

> "Online gateway V1 mein nahin." — under Quick manual receipt
> "Fee collected = manual payments. Online gateway V1 mein nahin."

### 1.2 School Dashboard — Overview

`Fees collected`, `PKR 1.08M`, `this month`, `12.5%`, accent `--c:#8b5cf6`.

### 1.3 Mobile Preview

| Location | Shape |
| --- | --- |
| fees feature | `THIS MONTH` / `PKR 1.08M`; rows like `October tuition` / `PKR 12,500` / `Due` / `.pill.w`; note `Manual source tracking`; `Online payment V1 mein enabled nahin` |
| Parent home | card `Next fee due` / `PKR 12,500` / `Due 25 Oct · manual payment` |
| Parent KPI | `Fee due` / `PKR 12.5k`, accent `--k:#f59e0b` |

Role lists: Parent and School Admin both include `fees`. `TL.Teacher` and
`TL.Student` contain no `fees` entry at all.

### 1.4 Super Admin

Nothing. No fee tile, no fee route, no school-fee column. This is the intended
outcome, not a gap — `backend/docs/control-plane-data-boundary.md` states fee
records are school-local and never control-plane data, and the mobile privacy
matrix denies Super Admin fee records.

---

## 2. Binding contract

`core/fees/element-bindings.js` holds 18 descriptors, `IFB-01`…`IFB-18`. Each one
names an element that already exists, its CSS hook, and `state: 'unpublished'`.

| ID | Surface | Element | Kind |
| --- | --- | --- | --- |
| IFB-01 | Dashboard | `COLLECTED THIS MONTH` `.sm` card | text node |
| IFB-02 | Dashboard | `OUTSTANDING DUES` `.sm` card | text node |
| IFB-03 | Dashboard | `PAYMENT SOURCES` `.sm` card | text node |
| IFB-04 | Dashboard | table `Student` `.pe` cell | row template |
| IFB-05 | Dashboard | table `Invoice` column | text node |
| IFB-06 | Dashboard | table `Amount` column | text node |
| IFB-07 | Dashboard | table `Reference` column | text node |
| IFB-08 | Dashboard | table `Status` `.bd` badge | attribute |
| IFB-09 | Dashboard | quick-receipt `Student` select | select option |
| IFB-10 | Dashboard | quick-receipt `Amount` input | attribute |
| IFB-11 | Dashboard | quick-receipt `Mode` select | select option |
| IFB-12 | Dashboard | quick-receipt `Reference` input | attribute |
| IFB-13 | Dashboard | `Save payment & receipt` | **blocked** |
| IFB-14 | Dashboard | `＋ Record payment` | **blocked** |
| IFB-15 | Dashboard | Overview `Fees collected` tile | text node |
| IFB-16 | Mobile | fees hero + invoice rows | row template |
| IFB-17 | Mobile | Parent `Next fee due` card | text node |
| IFB-18 | Mobile | Parent KPI `Fee due` tile | text node |

`assertNoFeeElementCreation()` rejects any descriptor that names a DOM-creating
operation. `assertFeeBindingsMatchReferences()` re-checks every CSS hook and screen
name against the live references, so a future reference revision fails the suite
rather than silently invalidating a binding.

**No binding has a published field.** `field` is `null` on all 18, because no fee
schema exists. Writing a field name here would be inventing a contract.

---

## 3. Money formatting

`core/fees/money-contract.js` delegates entirely to the Batch A formatters in
`core/format/`. It adds no formatting logic; it pins which shapes are approved.

| Function | Output | Used by |
| --- | --- | --- |
| `formatFee(12500)` | `PKR 12,500` | table `Amount`, receipts, dues |
| `formatFeeCompact(1080000)` | `PKR 1.08M` | `COLLECTED THIS MONTH`, Overview, mobile hero |
| `formatFeeCompact(12500)` | `PKR 12.5k` | Parent KPI |
| `formatPaymentReference('Bank','294012')` | `Bank · 294012` | table `Reference` |
| `formatPaymentReference(null,null)` | `—` | a due row with no payment yet |
| `formatFee(null)` | `—` | any absent amount |
| `formatCount(47)` | `47` | `47 invoices pending`, the sources tile count |

The `—` is the existing `EMPTY_MARKER` from `core/format/empty.js`. It is reused,
not newly introduced, and it is the reason no cell may ever render empty.

### The one unresolved casing divergence

The locked UI is internally inconsistent:

* `OUTSTANDING DUES` reads **`PKR 296K`** — uppercase K.
* Parent KPI reads **`PKR 12.5k`** — lowercase k.

`formatPkrCompact` produces lowercase `k`, matching `PKR 12.5k`. It therefore
derives `PKR 296k` for the dues tile, one character away from the locked string.

Reconciling it would be a visible change to a locked screen, so **it is not
reconciled**. `approvedCompactStrings(296000)` reports it honestly instead:

```js
{ locked: 'PKR 296K', derived: 'PKR 296k', matches: false }
```

A binding that must reproduce `PKR 296K` byte-for-byte takes the literal from
`COMPACT_LOCKED_STRINGS` via this function; it never re-derives it. Tracked as
**IB-04**.

---

## 4. Modes: displayed four, writable two

`PAYMENT_MODES` — the four sources the tile names: `Cash`, `Bank`, `Wallet`, `Cheque`.
`WRITABLE_PAYMENT_MODES` — the two the locked `Mode` select can record: `Cash`, `Bank`.

These are deliberately separate. A Wallet or Cheque invoice may be **displayed**
once it exists in a ledger; nothing in V1 can **create** one, because the select has
only two `<option>` nodes and a third would be a visible change. Tracked as **IB-03**.

---

## 5. Ledger state

`core/fees/ledger.js`. Pure functions over caller-supplied data.

### Roles

`feeVisibility()` reuses the Batch E privacy matrix (`DataCategory.FEE_RECORDS`):

| Role | Result |
| --- | --- |
| School Admin | permitted, school scope |
| Parent | permitted **only** with a server-resolved `linkedIds` non-empty array |
| Teacher | denied |
| Student | denied |
| Super Admin | denied |
| anything unknown | denied |

A denied role gets `EMPTY_FEE_SUMMARY` — `collected: null`, `collectedText: null` —
never `0`. The distinction matters: zero means "collected nothing", null means "not
yours to see".

### Invoice rows

`normaliseInvoice()` maps a row onto the five existing columns and returns
`valid: false` rather than fabricating a value. An unusable amount must never read
as `PKR 0`, which would look like "nothing owed".

Status maps to exactly two badges:

| Status | Class | Label |
| --- | --- | --- |
| `paid` | `.bd.g` | `Paid` |
| `due` | `.bd.w` | `Due` |
| anything else | `.bd.n` | *(no label)* |

`.bd.n` already exists in the reference as the neutral badge. An unknown status
reuses it; no third badge may be added (IB-02).

### Summary

`summariseFees()` totals only valid rows and reports `invalidCount` so a malformed
record is visible to QA instead of quietly shrinking the totals.

### Fee state

`feeStateForRole()` returns one of three honest states:

* `no-fee` — no invoices at all (`present: false`). Not a zero-valued ledger.
* `partial` — at least one row was invalid.
* `null` — everything parsed.

`classifyFeeDue()` derives `due` / `overdue` / `settled` from supplied instants in
Asia/Karachi only. No due date means `known: false`, never an assumed state. Overdue
is a due-date property of a `Due` invoice, **not** a third badge.

---

## 6. Manual payment

`recordManualPayment()` is the only path by which an invoice becomes `Paid`. It is
refused unless all of the following hold:

1. The role is `SCHOOL_ADMIN`. Everyone else gets `ROLE_NOT_PERMITTED`.
2. The invoice is not already `Paid` (`ALREADY_PAID`).
3. The amount is a finite non-negative number.
4. The mode is one of the four approved **and** writable (`NOT_APPROVED_MODE` /
   `NOT_WRITABLE_MODE`).
5. A receipt reference is present (`MODE_REQUIRES_REFERENCE`).
6. The reference is at most 191 characters (`REFERENCE_TOO_LONG`) — refused, never
   truncated.
7. The payment does not exceed the invoice (`OVERPAYMENT`).
8. The payment covers the invoice (`PARTIAL_NOT_SETTLED`).

The caller's invoice object is never mutated; the returned invoice is a frozen copy.

### Why a part payment is refused rather than handled

The references offer two states, `Paid` and `Due`, and no third badge exists. A
payment below the invoice amount leaves money genuinely outstanding, yet the only
available transition marks it `Paid` and paints it green. Silently settling a part
payment is an accounting error that is invisible the moment it happens.

So it is refused and recorded as **IB-07**, pending an invoice model that publishes
partial-payment semantics and an approved visual treatment for it.

### Why cash still needs a reference

Every settled row in the reference carries one — `Bank · 294012`, `Cash · RC-141`.
The single `—` belongs to a **due** row that has no payment yet, which is a
different thing. A cash receipt that cannot be traced to a receipt number is
unauditable, and "it was obviously cash" is not evidence. So the reference is
required for all four modes.

### What this does not guarantee

`recordManualPayment()` is a pure transition, not a security control. It cannot
write the audit entry, enforce server-side permission, or prevent duplicate
submission. Those belong to the endpoint, which does not exist (IB-08).

---

## 7. Payment boundary — I-O-05

Task I-O-05 asked for confirmation that no payment gateway UI or checkout logic
exists. It does not, and that is now enforced rather than merely asserted.

### The evidence

Both desktop references state the exclusion in locked copy:

* `Online gateway V1 mein nahin` (Quick manual receipt, and the ledger note)
* `Online payment V1 mein enabled nahin` (mobile fees feature)

`assertNoGatewayCopyInReferences()` fails if either line disappears, so the
exclusion cannot be quietly dropped from the reference.

### The enforcement

Two complementary guards, both scanning every module under `core/**`:

| Guard | Detects | Method |
| --- | --- | --- |
| `assertNoPaymentGateway()` | gateway names (stripe, paypal, easypaisa, jcash, razorpay, …), card/bank/token fields, `/checkout/` routes | raw text |
| `assertNoNetworkCalls()` | `fetch(`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `node:http(s)` imports, absolute URLs | executable tokens + raw text |

`validateManualPaymentRequest()` additionally refuses any payload carrying
`cardNumber`, `cvv`, `iban`, `checkoutToken`, `redirectUrl`, `gateway` and similar,
before validating anything else, and requires `manual: true`.

### A note on self-flagging guards

A denylist has to name what it denies, so the obvious implementation condemns the
very module that defines it. This was hit four times across Batches B, G and I.

The fix here is not an exemption. `assertNoNetworkCalls()` strips comments, string
literals and regex literals via `stripCommentsAndLiterals()` and inspects only
executable tokens — so *naming* `fetch` in a pattern list is invisible to it while
*calling* `fetch(...)` is not. The two declaration modules are exempted from the
name-based guard only, and remain fully covered by the no-exemption guard, which is
why they still cannot contain an absolute URL.

If a future guard needs the same property, it should strip literals rather than add
an exemption.

---

## 8. Contract dependency

`core/fees/contracts/pending-fee-contract.js` records five capabilities, all
blocked, with `method`, `path`, `requestSchema` and `responseSchema` pinned to
`null`:

| ID | Capability | State |
| --- | --- | --- |
| `fee-read` | list invoices, summarise collected/outstanding/sources | needs provisioning |
| `manual-payment` | record a payment, issue a receipt | needs provisioning |
| `receipt-pdf` | render and share a receipt or fee PDF | not contracted |
| `invoice-status-vocabulary` | confirm the invoice status enum | not contracted |
| `discounts-and-fines` | apply a discount or fine | not contracted |

`assertNoInventedFeeSchemas()` fails the suite if any of them gains a method, path,
schema, or an `implemented: true` flag. `FEE_INTEGRATION_AUTHORIZED` is `false`.

Fee records, receipts, discounts and fines are school-local data per
`backend/docs/control-plane-data-boundary.md` — so every one of these also waits on
school provisioning, not only on a contract.

---

## 9. What was verified

`npm run check` — 675 tests, 154 suites, 0 failures, `UI LOCK OK — 3/3 reference
files unchanged`. Of these, 56 are the Batch I suite in `test/fees.test.js`,
covering money formatting, the locked strings, the casing divergence, invoice
normalisation, role scope, summary arithmetic, the partial/overdue/no-fee cases,
every manual-payment refusal, the whole-tree gateway and network scans, the binding
contract, and the fail-closed contract registry.

No HTML, CSS, image, font or runtime page was added to `frontend/`.
