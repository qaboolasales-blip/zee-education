# Full Integration, Isolation, Backup & Performance — Batch M (M-C-01, M-C-02, M-C-04)

- Agent: Cline (QA/Security/Ops). Microtasks **M-C-01, M-C-02, M-C-04**. 2026-10-17.
- State check: backend has only Health/Home/Setup + 4 control-plane migrations; **no** auth, tenant provisioning, business modules, exports or backup subsystem. These three "execute" tasks are BLOCKED; the authoritative specs already exist and are cross-referenced so a later agent executes them without ambiguity. (M-C-03 and M-C-05 are separate, real deliverables.)

## M-C-01 — Full role / tenant-isolation / authorization / export matrix — **BLOCKED (specs consolidated)**
- Cannot execute: no implementation to exercise. Evidence needed: auth + tenant provisioning + all business modules + exports.
- Consolidated executable spec set (run all once implemented):
  - Roles/authz → `role-policy-test-cases.md` (RP-*), `unauthorized-route-test-cases.md` (UR-*), `auth-session-test-checklist.md` (BF/PR/SF/LO/SE/CS).
  - Tenant isolation → `tenant-isolation-test-matrix.md` (T-1..T-27), `school-local-db-isolation-cases.md` (CN/ISO/MF), `dedicated-database-verification-checklist.md` (DB-01..18).
  - Exports → `exports-tests.md` (EX-01..10), `people-access-privacy-tests.md` (E-C-03).
  - Provisioning → `provisioning-abuse-failure-matrix.md` (PV-*), `provisioning-retry-idempotency-review.md` (SC-1..06).
- Gate: no critical role/isolation/authz/export defect open. **Currently unrunnable.**

## M-C-02 — Backup & restore drill against a synthetic school DB — **BLOCKED (drill spec ready)**
- Cannot execute: no provisioned school DB / data / backup subsystem. Evidence needed: a provisioned synthetic school + backup tooling + owner RPO/RTO.
- Authoritative drill: `ops/backup-restore-runbook.md` §5 (mandatory non-production restore) + §6 checklist. Verify: row counts, synthetic marker, file checksum, post-restore login, no cross-tenant rows, measured RTO/RPO vs `<<OWNER_RTO>>`/`<<OWNER_RPO>>` (owner values still unfilled).
- Gate: a proven restore drill. **Currently unrunnable** (also `ops/release-gates.md` G9, never-waivable).

## M-C-04 — Performance smoke tests (critical lists, attendance, results, exports) — **BLOCKED (harness spec ready)**
- Cannot execute: no such endpoints. Evidence needed: implemented list/attendance/results/export endpoints.
- Spec: PERF-01 p95 latency budget for a 1k/10k-row student list; PERF-02 attendance batch write under concurrent teachers; PERF-03 result publication + read for a large class; PERF-04 export generation time and memory for a full-school export; PERF-05 no N+1 queries (query-count assertion). Record actual numbers against an owner-set budget (do not invent thresholds).

## Status
- Blocked: M-C-01/02/04 (no implementation). Specs are consolidated above for zero-ambiguity later execution. Reference UI unchanged (3/3). Nothing unexecuted is claimed passing.
