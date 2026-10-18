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
