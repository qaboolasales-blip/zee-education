# Remaining Tasks — Zee Education

This file contains the **remaining tasks** still open for AI / owner action.
`SUMMARY.md` (same folder) is the single-file project reference — read it first
instead of the full doc set.

Documentation reports, audits, and per-agent write artifacts were consolidated
out of the project root into `archive/` (reference only). Files that the build
script, the test suites, or the running app require stay at their original
paths — see the table in `SUMMARY.md` § Documentation Inventory.

## Open Release Gates — Still NO-GO (as of 2026-10-22)

| Gate | Task / Blocker | Owner |
|------|----------------|-------|
| G3b | UI pixel regression after data binding — never executed | Owner |
| G7 | Tenant isolation rows T-1, T-3, T-5, T-8..T-12 — school-B DB grant pending (host action) | Owner/Host |
| G9 | Backup/restore drill owner sign-off (RPO/RTO/retention) | Owner |
| G10 | Owner decisions — SSH rotation, RPO/RTO, Node pin, pixel-gate redefinition, brand/legal | Owner |

## Owner Actions — Blocking Final Release GO

1. Rotate exposed SSH password (still live) — repo owner — proof: old password rejected.
2. Rotate chat-exposed PAT (`ghp_41u0…`) — revoke/rotate — proof: revoked.
3. Owner sign-off on backup RPO/RTO/retention — repo owner.
4. Owner decision: Node runtime pin, G3b pixel-gate redefinition, brand/legal clearance.

## AI / Ops Remaining Tasks

1. Deploy rebuilt ZIP to staging DB (not production) and run full live smoke.
2. Run smoke checklist from `release/RELEASE_NOTES_v0.1.0.md` — invoice issue/pay/void, missing-CSRF 403, PWA install.
3. Re-run the G7 school-B-dependent isolation rows after the host DB grant.
4. Create owner-approved role accounts + run role smoke tests (5 roles).
5. Move final release status: `FINAL_RELEASE_STATUS` → GO only after all gates pass.

## Closed Since 2026-10-21

| Item | Was | Now | Proof |
|------|-----|-----|-------|
| LB-2 | `POST /api/school/attendance` → 500 (NOT NULL academic-structure columns omitted) | Fixed — session/class/section/actor resolved from the school's own data | `SchoolRecordWriteTest` (5 attendance tests) against the real shipped school schema |
| LB-4 | `POST /api/school/fees/invoices` → 500 (NOT NULL session + due date; status outside the ENUM) | Fixed — session resolved, due date defaults +30 days, status `due`/`partial`/`paid` | `SchoolRecordWriteTest` (4 fee tests) against the real shipped school schema |
| Scratch files in the package | 4 leftover `.tmp` view fragments would have shipped to buyers (the builder copies the whole `app/` tree) | Deleted; `*.tmp`/`*.bak`/`*.orig` git-ignored; the package verifier now fails on any scratch file | Package rebuild: 0 scratch files, verifier 35/35 |
| Backend suite | Could not run locally — MySQL service was down (148 connection errors) | MySQL started; suite green | `OK (220 tests, 958 assertions)`; frontend `816/816` |

## Pending Batch Microtasks

- Batch B: B-K-02 → next (auth implementation continuing).
- Batch G–N: statuses per the archived `backend/kilocode-status.md`.

## Defects Still Open

- None in the write-path family. The previously open LB-2 and LB-4 are fixed
  and regression-pinned (see "Closed Since 2026-10-21").
- G3b (pixel regression) is unproven, not defective: it has never been executed.
