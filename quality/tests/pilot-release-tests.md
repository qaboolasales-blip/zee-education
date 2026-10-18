# Pilot Release, Monitoring & Handover — Batch N

- Agent: Cline (QA/Security/Ops). Microtasks **N-C-01..N-C-04**. 2026-10-17.
- State check: **no pilot school/data** exists. These items are gated on pilot approval and on prior batches' blockers (G6/G7/G8/G9, S1 RB-1..RB-7).

## N-C-01 — Pilot acceptance checklist (synthetic → owner-approved pilot data) — **BLOCKED (spec ready)**
- Cannot execute: no pilot school, no pilot data, no implemented business/acceptance surface. Evidence needed: owner pilot approval + a provisioned pilot school with synthetic then owner-approved data.
- Checklist to run on a real pilot: AC-01 login/role access; AC-02 attendance; AC-03 marks/results publish flow; AC-04 manual fee + receipt; AC-05 exports; AC-06 backup/restore; AC-07 UI-lock byte integrity (3/3 persisted); AC-08 license expiry preserves school data (K-C-03); AC-09 audit of provisioning/decimal changes. Each becomes PASS/FAIL with evidence; no PASS until independently executed.
- Status: **BLOCKED — no pilot approved; no pilot data.**

## N-C-02 — Backup schedule config & supervised restore-readiness — **BLOCKED (runbook ready)**
- Cannot execute: no data, no owner RPO/RTO, no backup subsystem implementing per-school dumps.
- Authoritative plan (read-only): `ops/backup-restore-runbook.md` §1 (owner RPO/RTO/retention placeholders) + §5 (mandatory non-production drill) + §6 (restore checklist). Owner RPO/RTO are still unfilled placeholders; a restore drill is **never to be performed on production data** — the drill uses the synthetic school from N-C-02.

## N-C-03 — Incident/support contact path & audit-log collection — **BLOCKED (spec ready)**
- Cannot execute: no support/incident path exists; pilot audit data not present.
- Verified (real, schema): `platform_audit_events` exists and is append-only (C-C-04/A-2) — support audit collection has a substrate. Implementation/contact-path + collection config remain to be defined; plan to point at that table with readonly access.
- Spec: IN-01 incident contact vetted and documented; IN-02 support roles logged to `platform_audit_events`; IN-03 access to logs currently requires no privileged credentials (no secrets in logs, real).

## N-C-04 — Pilot go/no-go report with evidence & known non-blocking limitations — **NO-GO (correct, with evidence)**
- Current evidence base (2026-10-17):
  - Reference UI **byte-locked 3/3 unchanged**; integration layer drift-checked (frontend 675/675).
  - `dependency-security-review.md` (M-C-03): S1/S2 blockers RB-1..RB-7 open (no auth, provisioning idempotency, hardening actions).
  - `defect-release-blocker-report.md` (M-C-05): **NO-GO for pilot**; S1/S2 blockers open; execution items still blocked on implementation.
  - Business-module data paths (school setup, people, attendance, marks, fees, exports) not implemented yet.
- Known non-blocking limitations (not a pass): controlled-environment PHP/PHPUnit version differences; no `composer audit` (network); no runtime pixel regression (no data-bound page).
- Verdict: **NO-GO** — all items in `defect-release-blocker-report.md` RB-1..RB-8 must close and pilot data/sample must pass the N-C-01 checklist before go.

## Status
- Blocked: all of N-C-01/N-C-02/N-C-03/N-C-04 require a pilot + implemented subsystems. Recorded the current **NO-GO with authoritative evidence**. Reference UI unchanged (3/3). Nothing unexecuted is claimed passing.
