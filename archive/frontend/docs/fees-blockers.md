# Fees & receipts blockers — Batch I

Every item below is blocked on work owned by another agent, or on an owner
decision. Nothing here has been worked around, guessed at, or stubbed.

Status vocabulary follows the earlier batches: **BLOCKED** = cannot proceed without
the named dependency.

---

## IB-01 — Discounts and fines have no approved UI at all

**BLOCKED — owner decision, not just a contract**

`PROJECT_MEMORY` lists "approved discounts/fines" as in-scope for V1. But a scan of
all three locked references for `discount|fine|waiver` returns **zero matches**:

| Reference | Matches |
| --- | --- |
| School Dashboard | 0 |
| Mobile Preview | 0 |
| Super Admin | 0 |

There is no tile, no column, no badge, no form and no copy for a discount or a fine
anywhere in the approved UI. Two independent things are missing:

1. **An owner-approved surface.** Adding one is a visual change, which this role
   cannot make unilaterally.
2. **A contract.** No `fee_discounts` or `fee_fines` table exists either.

Until both exist, discounts and fines cannot be modelled, bound, or tested. The
scope claim in `PROJECT_MEMORY` is currently unimplementable as written.

**Unblock requires:** the owner approves where discounts and fines appear — which
screen, which columns, which states — then KiloCode publishes the contract.

**Recommendation:** treat this as a V1 scope decision before implementation starts,
because the placement determines the schema.

---

## IB-02 — Invoice status enum is unpublished

**BLOCKED — contract**

The references display exactly two invoice states: `Paid` (`.bd.g`) and `Due`
(`.bd.w`). No enum is published, so the following have no approved treatment:

| Possible state | Why it is a problem |
| --- | --- |
| Partial / part-paid | money outstanding but no third badge exists |
| Overdue | due-date property of a `Due` row, not a separate status |
| Cancelled / waived | no badge, no copy |
| Any backend-only value | would silently render as unknown |

Current handling: an unrecognised status reuses the **existing** neutral `.bd.n`
badge with no label. No third badge is invented, and a bad value is never coerced to
`Due` — `normaliseInvoice()` returns `valid: false`.

**Unblock requires:** KiloCode publishes the status vocabulary and its `.bd` class
mapping.

---

## IB-03 — Quick-receipt `Mode` select has only two options

**BLOCKED — visible change**

`PAYMENT SOURCES` names four sources: `Cash · Bank · Wallet · Cheque`. But the locked
`Mode` `<select>` in Quick manual receipt contains exactly:

```html
<option>Cash</option><option>Bank</option>
```

So a Wallet or Cheque payment cannot be recorded through the only approved write
path. Adding a third option is a visible change to a locked screen.

Current handling: `PAYMENT_MODES` (4, displayable) is kept separate from
`WRITABLE_PAYMENT_MODES` (2, writable). A Wallet/Cheque row can be displayed once it
exists; `recordManualPayment()` refuses to create one with `NOT_WRITABLE_MODE`.

**Unblock requires:** either the owner approves adding the options, or the contract
defines how Wallet/Cheque payments are recorded.

---

## IB-04 — Locked money strings disagree on K casing

**BLOCKED — owner decision**

Inside the same locked UI:

* `OUTSTANDING DUES` reads **`PKR 296K`** — uppercase K.
* Parent KPI reads **`PKR 12.5k`** — lowercase k.

`formatPkrCompact` produces lowercase `k`, so it derives `PKR 296k` for the dues
tile. Reconciling either string is a one-character **visible change**, so it has not
been done. `approvedCompactStrings(296000)` reports
`{ locked: 'PKR 296K', derived: 'PKR 296k', matches: false }` rather than hiding it.

**Unblock requires:** the owner decides which form is canonical. Until then a binding
that must reproduce `PKR 296K` takes the literal from `COMPACT_LOCKED_STRINGS`, never
a re-derived value.

---

## IB-05 — No inline error surface on the quick-receipt form

**BLOCKED — visible change**

The Quick manual receipt has four fields and no error markup: no error text, no
error class, no inline validation message. Its only feedback affordance is `#toast`,
which the reference already uses.

`recordManualPayment()` returns precise reasons (`MODE_REQUIRES_REFERENCE`,
`OVERPAYMENT`, `PARTIAL_NOT_SETTLED`, …) but there is nowhere approved to show them
per-field.

Current handling: reasons exist and are tested; nothing renders them. Any display must
reuse `#toast` or wait for an approved error surface.

**Unblock requires:** the owner approves an error surface, or accepts `#toast`-only
feedback.

---

## IB-06 — No receipt artefact exists

**BLOCKED — contract**

The button is labelled `Save payment & receipt`, and the mobile Parent card says
`Due 25 Oct · manual payment`. No receipt template, no receipt modal, no receipt
identifier scheme and no render endpoint are published.

`＋ Record payment` in the reference triggers a **preview toast**, not a flow.

Current handling: `receipt-pdf` is registered as a pending contract. Any future share
must additionally satisfy `validateShareRequest()` from
`core/curriculum/share-boundary.js` — user-initiated destination only, no automated
sharing.

**Unblock requires:** KiloCode publishes the render contract and the receipt
identifier format.

---

## IB-07 — Partial-payment semantics are undefined

**BLOCKED — contract + owner decision**

A payment smaller than the invoice leaves money genuinely outstanding. The only
available transition marks the invoice `Paid` and paints it `.bd.g`, so honouring a
part payment would silently settle a debt.

Current handling: `recordManualPayment()` **refuses** with
`PARTIAL_NOT_SETTLED`. This is a deliberate refusal, not an oversight — it is the only
behaviour that cannot corrupt the ledger.

Note this also means the honest answer to "can V1 take a part payment?" is **no**.

**Unblock requires:** the invoice model publishes partial-payment semantics, plus an
owner-approved visual treatment (a third badge, or a `PKR x of y` amount shape).

---

## IB-08 — Payment recording cannot be audited or de-duplicated

**BLOCKED — endpoint**

`recordManualPayment()` is a pure transition. It cannot:

* write the audit entry (`fee_audit` does not exist);
* enforce permission server-side;
* prevent a duplicate submission on retry;
* store the actor who recorded it;
* reject a stale write against an invoice another admin already settled.

Client-side role checks are a usability guard, not a security control. Any client
check can be bypassed by calling the endpoint directly.

**Unblock requires:** the `manual-payment` endpoint writes an immutable audit row and
performs its own authorisation and idempotency check.

---

## IB-09 — No fee schema, endpoint or school database

**BLOCKED — KiloCode + provisioning**

The umbrella blocker. Nothing in Batch I can be integrated because none of it exists:

| Missing | Consequence |
| --- | --- |
| `fee_invoices` | no rows for the five-column table |
| `fee_payments` | no history, so `PAYMENT SOURCES` has nothing to count |
| `fee_audit` | see IB-08 |
| `fee_discounts`, `fee_fines` | see IB-01 |
| fee endpoints | IFB-13 and IFB-14 stay blocked |
| invoice status vocabulary | see IB-02 |
| **school database** | no school-local data can exist at all |

Published backend contract remains `GET /health` and `GET /setup` only
(`backend/docs/api/openapi-v0.md` v0.1.0 DRAFT).

Fee records are school-local per `backend/docs/control-plane-data-boundary.md`, so
these wait on **school provisioning**, not only on a contract — the control-plane
migrations (`schools`, `school_domains`, `provisioning_jobs`,
`platform_audit_events`) contain no fee data by design.

**Unblock requires:** KiloCode implements fee invoices and payments in a dedicated
school database, provisions a school, and publishes the read and write contracts.

---

## Completed in this batch

| Task | Status |
| --- | --- |
| I-O-01 fees/receipts data contract | **DONE** — schema reviewed, zero endpoints found, 5 capabilities registered, `assertNoInventedFeeSchemas()` fails closed |
| I-O-02 PKR formatter + existing accents | **DONE** — delegates to Batch A formatters, reproduces all locked strings, no new colours |
| I-O-03 binding fee/receipt data to existing components | **DONE (binding contract)** — 18 descriptors, 16 blocked on contract, drift-guarded against the live references |
| I-O-04 partial / overdue / no-fee | **DONE** — `no-fee`, `partial`, `due`, `overdue`, `settled`, and `unknown` all distinct; no invented copy |
| I-O-05 confirm no gateway UI or checkout logic | **DONE** — confirmed, and enforced by a whole-tree scan plus a no-exemption network guard |

No blocker was resolved by guessing. Where the reference was silent — discounts,
fines, status vocabulary, part payments — the gap is recorded instead of filled.
