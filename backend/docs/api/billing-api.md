# Billing API (Super Admin)

Base path: `/api/admin/billing`

Every route below is **Super Admin only**. The filter chain is
`superadmin` → `api_csrf`, so a request is refused before it reaches any
controller code unless the caller is a signed-in platform operator AND the
request carries a valid CSRF token.

## Why this API is manual

There is no payment gateway. Fee collection is a bank transfer or a cash
handover that the owner confirms. Every endpoint below therefore records
**exactly what the operator asserted** — who, how much, when, by what
reference. Nothing is ever "verified" automatically, and no endpoint pretends
money was received.

The rules that the product is judged on:

| Rule | Where it is enforced |
| --- | --- |
| A quote is not revenue | `BillingService::summary()` counts only `paid` invoices |
| A part payment never grants access | `BillingService::recordPayment()` renews only when `isSettled()` is true |
| A licence key is never stored in plain text | `LicenseService::issue()` stores only the SHA-256 hash |
| A renewal rotates the key | `BillingService::renewForInvoice()` issues a new key and retires the old row as `superseded` |
| Nothing is ever deleted | Voided invoices and retired licences keep their rows |
| Expiry never removes data | `LicenseFilter` blocks writes only; `LicenseService::state()` never touches learner data |

## Authentication

Two things are required for a state-changing call:

1. **A signed-in Super Admin session.** The session cookie is enough; there is
   no API key for this surface.
2. **A CSRF token** in the `X-CSRF-TOKEN` request header (or the
   `csrf_test_name` form field).

Without a valid token the answer is `403` with `"error": "csrf_required"`.
Without a Super Admin session the answer is `401` with
`"error": "unauthenticated"`. With a signed-in non-operator the answer is
`403` with `"error": "super_admin_required"`.

`GET` requests never need a CSRF token: they change nothing.

## Endpoints

### `GET /api/admin/billing/summary`

Commercial totals.

```json
{
  "revenue_collected": "30000.00",
  "outstanding": "120000.00",
  "overdue_count": 1,
  "currency": "PKR"
}
```

`revenue_collected` counts **only** invoices whose status is `paid`.

### `GET /api/admin/billing/upcomings`

Licences inside the renewal window (30 days), soonest first. Drives the
"Renewals needing attention" card in the Super Admin console.

```json
{ "ok": true, "items": [ /* licence rows */ ], "count": 1 }
```

### `GET /api/admin/billing/invoices/{school_id}`

Every invoice for one school, newest first.

```json
{ "ok": true, "invoices": [ /* invoice rows */ ] }
```

### `POST /api/admin/billing/issue`

Issue a licence to a school. The **plaintext key is returned exactly once** —
only its hash is stored, so it cannot be shown again later.

Request:

```json
{ "school_id": 12, "plan_id": 1, "start_date": "2026-10-19", "grace_days": 14 }
```

`start_date`, `expires_at` and `grace_days` are optional. The plan's
`max_students` / `max_staff` limits are snapshotted onto the licence, so
editing the catalogue later can never shrink a licence that was already sold.

Response `201`:

```json
{ "ok": true, "license_id": 7, "license_key": "ZEE-XXXX-XXXX-XXXX-XXXX", "issued_at": "2026-10-19T10:00:00+00:00" }
```

### `POST /api/admin/billing/invoice`

Quote a licence fee. **Nothing is collected**; the result is a quote.

Request:

```json
{ "school_id": 12, "plan_id": 1, "kind": "renewal", "due_days": 15, "notes": "FY27" }
```

`kind` is one of `setup`, `first_year`, `renewal`.

Response `201`:

```json
{ "ok": true, "invoice_id": 21, "invoice_no": "ZEE-INV-2026-0003", "amount": "30000.00", "currency": "PKR", "due_date": "2026-11-03", "status": "due" }
```

### `POST /api/admin/billing/pay`

Record money the operator confirms receiving.

Request:

```json
{ "invoice_id": 21, "amount": 30000, "method": "bank_transfer", "reference": "TRF-88213", "note": "cash handover" }
```

Response `200`:

```json
{ "ok": true, "invoice_id": 21, "amount_paid": "30000.00", "settled": true, "renewed": true, "new_license_key": "ZEE-XXXX-XXXX-XXXX-XXXX" }
```

* `settled` is `false` while the payments are short of the invoiced amount.
  A part payment is recorded and shown on the invoice, but it grants nothing.
* `new_license_key` is present only when the invoice has just been paid in
  full. That is the moment the licence is renewed and the key is rotated.
* `amount` must be greater than zero. `422` otherwise.

### `POST /api/admin/billing/void`

Cancel an unpaid invoice. The row is kept.

Request: `{ "invoice_id": 21, "reason": "school withdrew" }`

A **paid** invoice cannot be voided: the answer is `409`. Refund or adjustment
is a separate commercial decision and is not modelled yet.

### `POST /api/admin/billing/revoke`

Withdraw a school's licence. The school becomes read-only immediately; nothing
is deleted and its data stays readable.

Request: `{ "school_id": 12, "reason": "payment dispute" }`

`reason` is required (`422` without it) because it is what the school is told
and it has to be on the record.

### `POST /api/admin/billing/renew`

Re-issue a licence from a **settled** invoice. Only an invoice whose payments
cover the full amount can trigger it (`422` otherwise).

Request: `{ "invoice_id": 21 }`

Response `200`:

```json
{ "ok": true, "school_id": 12, "license_key": "ZEE-XXXX-XXXX-XXXX-XXXX", "renewed_at": "2026-10-19T10:00:00+00:00" }
```

The old licence row is marked `superseded` and kept, so the school's billing
history stays reconstructable years later.

## Audit trail

Every commercial action writes a row to `platform_audit_events` with
`actor_type = 'super_admin'`, the acting user's id, the action
(`licence.issue`, `invoice.create`, `payment.record`, `invoice.void`,
`licence.revoke`, `invoice.renew`) and the target. The table is append-only:
application code never updates or deletes an audit row.

## Not covered by this API

* No database credentials are ever accepted from a request. A school's
  database mapping is server-local configuration only.
* No learner data is read or written by any endpoint here. This surface is
  commercial metadata only.
* No automatic charging, dunning or card handling.
