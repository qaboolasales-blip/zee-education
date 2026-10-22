# OpenCode Status Tracker

Owner: OpenCode (UI-safe Frontend Integration Owner). Boundary: `frontend/**` only.

## Batch A (Completed)
- Status: COMPLETE — re-verified this run, no file edits made
- Date: 2026-10-18
- Completed task IDs: O-00.1, O-00.2, O-00.3, O-01.1, O-01.2, O-01.3, O-01.4, O-02.1, O-02.2, O-02.3, O-02.4
- Tests: 816/816 pass, 176 suites, UI lock 3/3 OK
- Report: `frontend/opencode-batch-a-report.md`
- O-01.4 kept PARTIAL/BLOCKED exactly as reported:
  - `/setup` has no approved JSON payload to model — the published contract itself
    confirms it is a display-only HTML page. Unmodelled BY DESIGN.
  - Live frontend binding of `/health` needs a real KiloCode API contract AND
    Cline UI-lock approval. `LIVE_BINDING_AUTHORIZED === false`.

## Batch B (Completed, contract-backed)
- B-O-01, B-O-02, B-O-03, B-O-04, B-O-05, B-O-06 all delivered
- KiloCode published a real auth contract: `GET/POST /login`, `GET /logout`,
  `GET/POST /register`, `GET/POST /forgot`, `GET/POST /reset-password`, plus
  `docs/auth-endpoints.md`, `docs/authentication-design.md`,
  `docs/role-permission-policy.md`, `docs/role-filter-implementation.md`,
  `docs/auth-session-lifecycle.md`, `app/Filters/RoleFilter.php`,
  `app/Policies/RolePolicy.php`, `app/Filters/SuperAdminFilter.php`, and the
  `auth_groups` role seed migration.
- `login`, `logout` and `role-permissions` are now PUBLISHED; `refresh` and
  `current-identity` remain BLOCKED.
- Report: `frontend/opencode-batch-b-report.md`

## Batch C (Completed as far as contract permits)
- C-O-01, C-O-02, C-O-05, C-O-06 delivered; C-O-03, C-O-04 BLOCKED
- New backend facts recorded: migration 000006 extends `schools` (contact, address,
  branding, commercial_metadata, installation_state, etc.), migration 000007 adds
  UNIQUE `schools.school_code`, `docs/provisioning-state-machine.md` documents the
  code rule. The schema record was updated and the drift guard now scans all three
  `schools` migrations.
- Report: `frontend/opencode-batch-c-report.md` (in `docs/provisioning-ui-blockers.md`)

## Batch D (Completed as far as contract permits)
- D-O-01 through D-O-05 delivered
- DSB-01 and CPB-02 PARTIALLY CLOSED by migration 000006/000007; the logo and the
  code SEMANTICS still have no contract.
- Report: `frontend/opencode-batch-d-report.md`

## Batch E (Completed as far as contract permits)
- E-O-01, E-O-02, E-O-03, E-O-05 delivered; E-O-04 delivered for 6 of 7 cases

## Batch F (Completed as far as contract permits)
- F-O-01 through F-O-05 delivered as pure logic

## Batch G (Completed as far as contract permits)
- G-O-02, G-O-05 complete and enforced; G-O-01, G-O-03, G-O-04 as models and policies

## Batch H (Completed as far as contract permits)
- H-O-01 through H-O-05 all delivered — publication gate enforced, no grade invented

## Batch I (Completed as far as contract permits)
- I-O-01 through I-O-05 all delivered — I-O-05 complete and enforced

## Batch J (Completed as far as contract permits)
- J-O-01 through J-O-04 delivered; BLOCKED on schema/endpoint

## Batch K (Completed as far as contract permits)
- K-O-01 through K-O-04 delivered; BLOCKED on schema/endpoint

## Batch L (Completed as far as contract permits)
- L-O-01 through L-O-05 delivered; L-O-06 BLOCKED — needs Cline's harness
- `schools.school_code` now exists (migration 000007) with a documented character
  rule, but the SEMANTICS are still unpublished, so `connectSchool()` stays a demo
  transition and the code may not be bound, persisted or transmitted.

## Batch M (Completed as far as contract permits)
- M-O-02 and M-O-03 delivered; M-O-01 and M-O-04 BLOCKED

## Batch N (Completed as far as contract permits)
- N-O-01 and N-O-03 delivered; N-O-02 and N-O-04 BLOCKED

## Environment blocker (KiloCode's, independently confirmed)
PHP `intl` extension missing, MySQL not running, no global Composer — the
CodeIgniter runtime and all backend tests cannot execute on this host. Frontend
checks are independent and all green. Do not claim full-project readiness until
KiloCode runs genuine backend tests in the correct Windows/Laragon environment.

## Current state
All OpenCode microtasks A–N are complete within what KiloCode has published, or
carry a specific documented blocker. Every remaining sub-task names its exact
dependency. No approved reference UI hash has changed. Final check: 816/816 pass,
176 suites, UI lock 3/3 OK.