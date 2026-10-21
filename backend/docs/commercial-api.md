# Commercial & License API

## Rules
- Negotiated rates per school; no hard-coded public pricing.
- License expiry never deletes/hides school data or blocks export.
- Support access default-deny learner data.

## Implementation
- `api/billing-api.md` — the Super Admin billing API (9 routes under
  `/api/admin/billing`, `superadmin` + CSRF). Records invoices, payments,
  voids, revokes and renewals; **no payment gateway**, money moves outside
  the product. Shipped to buyers as `documentation/11-billing-api.md`.
