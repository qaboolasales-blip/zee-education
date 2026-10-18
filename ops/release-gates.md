# Release Gates — Pilot Go/No-Go — C-02.3

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-02.3** (Batch A)
- Created: 2026-10-17
- Purpose: objective, binary conditions that must all be **GO** before a pilot is approved. Each gate names its pass criterion and, where possible, its current status with evidence. A gate that cannot be evaluated yet is **NO-GO (blocked)**, not "assumed OK."

## How to use

- Every gate is **GO** or **NO-GO**. No partial credit, no "mostly done."
- "GO" requires objective evidence (a green test run, a matching hash, a signed drill record) — not a claim.
- Any single **NO-GO** blocks pilot. Security/data-loss gates (G6, G7, G8) are **never** waivable.

## Gates

### G1 — Environment / toolchain ready
- **Pass criterion:** Backend suite runs green using the Laragon PHP (≥8.2 with `intl`, `mysqli`, `pdo_mysql`, `mbstring`, `openssl`, `curl`, `dom`, `xml`, `fileinfo`, `gd`, `zip`); MySQL/MariaDB starts; `.env` present locally with an explicit/empty CORS allowlist (no `*`).
- **Evidence:** `ops/windows-laragon-preflight.md` §8 checklist all ticked; `phpunit` → `OK`.
- **Current status:** **Partial.** Preflight executed 2026-10-17; suite green (`OK (22 tests, 81 assertions)`) with Laragon PHP. Not yet formalised in CI. → **NO-GO until CI/runner pins the correct PHP.**

### G2 — Automated test suite green
- **Pass criterion:** The backend test suite passes (0 failures/errors) on the pinned runtime, and grows to cover implemented features.
- **Evidence:** CI/test log.
- **Current status:** **Partial.** 22/22 pass locally (Laragon PHP). Coverage limited to health/setup/framework-sanity; no authz/tenant/migration tests yet (they don't exist). → **NO-GO for pilot** until implemented features are covered.

### G3 — Reference UI lock intact
- **Pass criterion:** `node frontend/tools/verify-reference-ui.mjs` → `UI LOCK OK — 3/3` (exit 0); no unauthorised change to the three approved files.
- **Evidence:** verifier output + `quality/ui/reference-hashes.sha256`.
- **Current status:** **GO (byte-level).** PASS 3/3 on 2026-10-17. NOTE: byte-level only; full pixel regression (C-10.3) is a separate sub-gate below.

### G3b — UI pixel regression after data binding
- **Pass criterion:** Runtime screens pixel-identical to reference at all viewports/colour passes (threshold 0) per `quality/docs/ui-regression-checklist.md` §7.
- **Evidence:** baseline vs candidate PNG diffs, 0 differing pixels.
- **Current status:** **NO-GO (blocked).** No runtime page exists yet; this is a Batch B gate (C-10.3).

### G4 — No secrets / no real personal data in repo
- **Pass criterion:** No credentials, `.env` secrets, or real student/guardian data in source, tests, logs or docs; `.env` not committed with real values.
- **Evidence:** repo scan; this agent authored no secrets.
- **Current status:** **GO for this batch's artifacts** (none added). Full-repo scan is a **planned check** (C-10.x) once more code exists.

### G5 — CORS locked down
- **Pass criterion:** No `Access-Control-Allow-Origin: *` on any authenticated school/Super Admin API; explicit allowlist only; deny-by-default when unset.
- **Evidence:** `Config\Cors.php` review (executed) + runtime header assertions (planned).
- **Current status:** **Partial.** Static config verified deny-by-default, wildcard rejected (executed). Runtime assertions across all routes are a **planned check** (C-10.2). → **NO-GO until auth'd routes asserted.**

### G6 — Authentication & server-side authorization enforced
- **Pass criterion:** Deny-by-default; every authenticated route has a server-side role check; browser-supplied school/role/IDs are never trusted; negative authz tests pass (`role-permission-matrix.md` §4).
- **Evidence:** C-10.2 test results.
- **Current status:** **NO-GO (blocked).** No auth/authorization implemented yet. **Never waivable.**

### G7 — Tenant isolation proven (dedicated DB per school)
- **Pass criterion:** All rows in `quality/docs/tenant-isolation-test-matrix.md` (T-1..T-24) return DENY/ALLOW as specified; dedicated database per school (ADR-001) actually provisioned; no cross-tenant read/write/export/file/job/cache leak.
- **Evidence:** C-10.2 results with synthetic markers.
- **Current status:** **NO-GO (blocked).** No provisioning/second school yet. **Never waivable.**

### G8 — License expiry preserves data access/export
- **Pass criterion:** Expiring/suspending a license never deletes, hides, encrypts or export-blocks a school's own data (T-25..T-27).
- **Evidence:** C-10.2/owner-confirmed behaviour.
- **Current status:** **NO-GO (blocked).** Behaviour not yet implemented/tested. **Never waivable** (owner decision preserved).

### G9 — Backup + proven restore drill
- **Pass criterion:** Per-school backups exist; a **non-production restore drill** passes with objective verification (row counts, marker, file checksum, login) and meets `<<OWNER_RTO>>`/`<<OWNER_RPO>>`; retention/RPO/RTO owner-approved (`ops/backup-restore-runbook.md` §1,§5).
- **Evidence:** signed drill record (runbook §6).
- **Current status:** **NO-GO (blocked).** No data yet; drill not performed. Owner RPO/RTO/retention still unfilled. **Never waivable.**

### G10 — Owner decisions resolved
- **Pass criterion:** Outstanding owner decisions are closed: RPO/RTO/retention (`backup-restore-runbook.md` §1), Node runtime pin (`windows-laragon-preflight.md` §4), brand/legal clearance (noted in `Config\ZeeEducation.php`).
- **Evidence:** owner sign-off.
- **Current status:** **NO-GO (open).** Multiple owner decisions outstanding.

## Pilot go/no-go summary (as of 2026-10-17)

| Gate | Topic | Status |
|------|-------|--------|
| G1 | Environment/toolchain | NO-GO (partial; pin PHP in CI) |
| G2 | Test suite coverage | NO-GO (partial; only starter tests) |
| G3 | UI lock (byte) | **GO** (3/3 verified) |
| G3b | UI pixel regression | NO-GO (blocked, C-10.3) |
| G4 | No secrets/real data (this batch) | GO (this batch); full scan planned |
| G5 | CORS | NO-GO (partial; runtime asserts pending) |
| G6 | AuthN/AuthZ | NO-GO (blocked, never waivable) |
| G7 | Tenant isolation | NO-GO (blocked, never waivable) |
| G8 | License data-access | NO-GO (blocked, never waivable) |
| G9 | Backup + restore drill | NO-GO (blocked, never waivable) |
| G10 | Owner decisions | NO-GO (open) |

**Overall: NO-GO for pilot.** Only G3 (byte-level UI lock) and G4 (this batch's artifacts) are currently GO. The blocking gates (G6–G9) require implementation that does not exist yet; they are exactly what Batch B (C-10.x) verifies.

## Rules

- Gates are binary and evidence-based; never mark GO without the stated evidence.
- Security and data-loss gates (G6, G7, G8, G9) cannot be waived by schedule pressure.
- This document does not certify compliance and does not claim any check that was not executed.
- Re-evaluate all gates at every pilot review; record results in the agent tracker.

