# Super Admin Commercial, License, Renewal & Support — Batch K

- Agent: Cline (QA/Security/Ops). Microtasks **K-C-01..K-C-04**. 2026-10-17.
- State check: control-plane schema exists (schools/school_domains/provisioning_jobs/platform_audit_events). No renewal/licensing/support **logic** in backend yet (Models/Libraries empty).

## K-C-01 — No public hard-coded pricing exposed — **EXECUTED (real, PASS with a noted nuance)**
- **Executed:** scanned `frontend/core/**` and `backend/app/Config/ZeeEducation.php` for `PKR|price|pricing|NN,NNN`.
- **Result:** backend stores **`plan_code` only** (migration 000001 — a plan reference, **no price column**); `ZeeEducation.php` has no pricing. All 64 frontend matches are **locked UI sample strings** (e.g. `PKR 1.08M`, `PKR 12,500`) explicitly annotated *"locked sample, not a computed revenue figure"* / *"must come from a contract."* There is **no commercial pricing catalogue / plan-price table** anywhere.
- **Nuance (honest):** the approved, pixel-locked reference UI contains sample PKR amounts as display copy. These must **not** be altered (UI lock) and are **not** a public price list. Prices are negotiated per school (`PROJECT_MEMORY.md`) and none are hard-coded as commercial pricing. **PASS** on the rule "no public hard-coded pricing."

## K-C-02 — Renewal reminder duplicate/retry behaviour — **BLOCKED (spec ready)**
- Cannot execute: no renewal/reminder logic. Evidence needed: implemented licensing/renewal.
- Spec: LR-01 a renewal reminder is not sent twice for the same due event (idempotency); LR-02 retry after a failed send does not duplicate; LR-03 reminder scheduling is per-school and time-based; LR-04 no reminder reveals another school's data.

## K-C-03 — Expiry cannot delete/hide/block school-owned data & exports — **DESIGN REVIEW (invariant preserved) + runtime BLOCKED**
- **Verified (design/governance):** the invariant is encoded across authoritative sources — `UNIVERSAL_RULES.md` Override §4, `PROJECT_MEMORY.md`, `control-plane-data-boundary.md` ("no licence or expiry mechanism may delete, encrypt, hide or block export"), and my `tenant-isolation-test-matrix.md` T-25..T-27 + `security-threat-model.md` LIC-1. `schools.status` supports `suspended` **without** touching the school's own DB (separate schema), so suspension cannot destroy school data by construction.
- **Blocked (runtime):** no licensing/expiry code exists to execute T-25..T-27. Evidence needed: an implemented expiry path; then assert a suspended/expired school still reads + exports its own data (ALLOW) and no row is deleted/hidden/encrypted.

## K-C-04 — Support-access auditability & default-deny learner-data access — **DESIGN REVIEW + runtime BLOCKED**
- **Verified (schema, real):** `platform_audit_events` provides append-only audit (actor_type/actor_id/action/target/ip/time) with **no secret columns** (C-C-04/A-1) — the substrate for auditable support access exists.
- **Verified (spec):** Super Admin **default-deny** on learner data is specified in `role-permission-matrix.md` §0.4 and `role-policy-test-cases.md` RP-SU-03/04/06 (break-glass-only, audited).
- **Blocked (runtime):** no support/break-glass mechanism or learner-data endpoints exist. Evidence needed: implemented support access; then assert default-deny (403) + an audit row for any elevation.

## Status
- Executed now: K-C-01 (real scan — no commercial hard-coded pricing; plan_code only). Design-reviewed: K-C-03/K-C-04 (invariants preserved). Blocked: K-C-02 (no renewal logic) + K-C-03/04 runtime. Reference UI unchanged (3/3). Nothing unexecuted is claimed passing.

## Update 2026-10-20 (post billing/licence implementation)

The "no renewal/licensing logic" state check in the header is now obsolete. What changed,
and what this means for each microtask:

- **Licensing/billing logic now exists:** `LicenseService` (hashed keys, key rotation on
  renewal), `LicenseFilter` (blocks **writes only** on expiry), `BillingService` +
  `BillingApi` (9 Super Admin routes: issue/invoice/pay/void/revoke/renew, audit row per
  action), six new control-plane migrations. Covered by `LicenseEnforcementTest` (11
  tests) and `BillingApiTest` (20 tests), both green in the suite (164/671 as of
  the 2026-10-20 build-5 CSRF round — the licence/billing write tests now carry
  CSRF tokens via `CsrfTokenTrait::withCsrf()`; 161/653 at the security round,
  155/621 when this record was written).
- **K-C-02 (renewal reminders): still BLOCKED — reason updated.** Renewal *itself* is
  implemented, but the product has **no reminder/notification channel at all** (no email,
  SMS or cron sender), so LR-01..LR-04 idempotency still has nothing to execute against.
- **K-C-03 (expiry cannot destroy data): runtime evidence now exists at unit level.**
  `LicenseEnforcementTest` proves expiry/suspension blocks writes without deleting,
  hiding or export-blocking school data. The **T-25..T-27 behavioural rows have not been
  executed on a live school** — gate G8 in `ops/release-gates.md` stays NO-GO until they
  are recorded.
- **K-C-04 (support access default-deny): partly structural now.** Learner-data endpoints
  exist for school roles (`/api/school/*`), but **no control-plane route serves learner
  data at all** — Super Admin structural default-deny holds by construction (no route to
  break). The break-glass/elevation mechanism itself still does not exist, so audit-row
  verification for elevation remains BLOCKED.
- Reference UI still 3/3; no pricing is hard-coded anywhere (re-verified in the build
  reports of 2026-10-19/20).
