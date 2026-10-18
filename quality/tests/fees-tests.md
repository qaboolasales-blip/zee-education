# Manual Fees, Receipts, Discounts & Fines — Batch I

- Agent: Cline (QA/Security/Ops). Microtasks **I-C-01..I-C-04**. 2026-10-17.
- State check: **no** fees/receipt schema, no auth, no money logic in backend. V1 exclusion (no online payment gateway) holds — verified by real scan in `communication-tests.md` G-C-04.

## I-C-01 — Transaction / duplicate / rounding / manual-reference cases — **BLOCKED (spec ready)**
- Cannot execute: no fees subsystem. Evidence needed: school-local fees schema + auth + money handling.
- Spec:
  - FE-01 Fee write is transactional (multi-record updates all-or-nothing).
  - FE-02 Duplicate payment for the same fee/reference → detected/rejected (idempotency).
  - FE-03 Amounts stored as integer minor units (no float drift); rounding deterministic (matches `ZeeEducation` note "monetary values stored as integer minor units").
  - FE-04 Manual reference (bank/challan no.) validated, not trusted for uniqueness alone.
  - FE-05 Negative/zero/overpayment amounts validated per policy.
  - FE-06 Cross-school fee write → **403/404**.

## I-C-02 — Audit trail for discounts, fines, voids, corrections — **BLOCKED (spec ready)**
- Cannot execute: no fee audit path. Evidence needed: implemented fee workflow + audit.
- Spec: FE-A01 every discount/fine records approver + reason + amount; FE-A02 void/correction leaves an audit event and never hard-deletes the original; FE-A03 corrections are transactional; FE-A04 audit holds no secrets (mirrors `provisioning-audit-secrets-review.md`).

## I-C-03 — Fee access scope & export authorization — **BLOCKED (spec ready)**
- Cannot execute: no fee data/auth. Evidence needed: fees + linkage + auth.
- Spec: FE-S01 Parent views only linked child's fees; FE-S02 Teacher has no fee write; FE-S03 School Admin own school only; FE-S04 fee export scoped to the session's school/children; FE-S05 forged `student_id`/`school_id` ignored.

## I-C-04 — Receipt uniqueness under controlled concurrency — **BLOCKED (spec ready; environment ready)**
- Cannot execute: no receipts. Evidence needed: implemented receipts. **Environment note (real):** MySQL 8.4.3 is available via Laragon (`ops/windows-laragon-preflight.md` §3), so a controlled concurrent receipt-uniqueness test (parallel requests asserting one receipt per fee) can run once receipts exist.
- Spec: FE-R01 receipt number unique per school (DB unique constraint, not app-only); FE-R02 concurrent payment submission yields exactly one receipt; FE-R03 no duplicate/dangling receipt on partial failure.

## Status
- Blocked: I-C-01/02/03/04 (no fees/receipts implementation). V1 no-gateway exclusion verified green (G-C-04). Reference UI unchanged (3/3). Nothing unexecuted is claimed passing.
