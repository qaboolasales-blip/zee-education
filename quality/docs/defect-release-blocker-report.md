# Prioritized Defects & Release-Blocker Report — M-C-05

- Agent: Cline (QA/Security/Ops). Microtask **M-C-05** (Batch M). 2026-10-17.
- Purpose: consolidated, prioritised defect and release-blocker list for non-blocking acceptance. All items carry evidence and a severity; nothing is claimed as passing beyond what was executed.

## Severity definitions

| Severity | Meaning |
|----------|---------|
| S1 — Critical | Security/isolation/data-loss defect; **never waivable**; blocks pilot. |
| S2 — High | Blocks a Batch exit gate item or a security/data boundary. |
| S3 — Medium | Works-around exist; fix before pilot but does not block it. |
| S4 — Low | Cosmetic/process; fix opportunistically. |

## Release-blockers (S1/S2) — pilot NOT approvable yet

| ID | Category | Item | Evidence | Priority / owner |
|----|----------|------|----------|------------------|
| RB-1 | S1 | No server-side authentication/authorization exists | Backends=Health/Home/Setup; Filters/Models/Libraries empty (2026-10-17) | Must fix before any auth endpoint exists |
| RB-2 | S1 | No server-side auth negative-tested | `role-policy-test-cases.md` spec only; suite has 0 auth tests (27/27 has none) | G6 gate |
| RB-3 | S1 | Tenant isolation untested at runtime | No provisioning; no 2nd school; T-1..T-27 + CN/ISO not run | G7 gate |
| RB-4 | S1 | Provisioning idempotency guard missing (R-2) | `provisioning_jobs` has no unique on (school_id,type)/target_database | Pre-pilot must close |
| RB-5 | S1 | No backup/restore drill executed | M-C-02 blocked (no school DB); runbook §5 open | G9 gate |
| RB-6 | S1 | No sales/retention/license expiry path | No licensing logic; T-25..T-27 unexecuted | G8 |
| RB-7 | S2 | CSRF/secure-headers/CSP configured but not enabled; `Cookie::$secure=false` | B-C-04 findings SC-2/3/6 | Hardening pre-prod |
| RB-8 | S2 | PATH PHP lacks `intl` | 22/22 failure → 27/27 with Laracon PHP | Env fix only |

## Medium / Low (S3/S4)

| ID | Category | Item | Evidence |
|----|----------|------|----------|
| MB-1 | S3 | `Composer audit`/dependency CVE scan not run | No network assumption; do in CI |
| MB-2 | S3 | `regenerateDestroy=false` (old session not destroyed on rotation) | SC-3; set true at login |
| MB-3 | S3 | No enforcement of `secure` on session/CSR cookies in prod | SC-3/4 |
| MB-4 | S3 | No frontend retention of school-local auth/session state | Client scaffolding present, no server session |
| MB-5 | S4 | Reference UI audit tooltip/format copy references `IB-04`, `INT-00` tracking IDs | To resolve with owners; reference byte-lock untouched |
| MB-6 | S4 | Test coverage of business modules absent until implementation lands | E–H,M test suites only exercise adapter/foundation |

## What is NOT a blocker (artifact of scope)

- No online payment/SMS/automated WhatsApp (V1 exclusion) — verified pass (G-C-04).
- No hard-coded public pricing — pass (K-C-01); sample UI strings are locked copy only.
- No SMS/payment/WhatsApp API in code — verified pass (G-C-04).
- No real data present anywhere in the workspace by design.

## Release go/no-go (current)

- **NO-GO** for pilot. S1/S2 blockers RB-1..RB-7 remain open; each requires KiloCode to ship implementation first (auth, provisioning idempotency, business modules, exports, backup restore). M-C-03/M-C-05 findings are controls-ready to carry into pilot approval once those implement.
- Evidence links: `quality/contracts/health-setup-contract-checklist.md`, `provisioning-retry-idempotency-review.md`, `dependency-security-review.md`, `ops/release-gates.md`, `ops/backup-restore-runbook.md`.

## Status
- Final verdict: **NO-GO for pilot** until RB-1..RB-8 are closed. All S1/S2 items have executed evidence (backend suite 27/27 + scan + schema review + reference lock) confirming they are real, and none were invented. Reference UI unchanged (3/3).
