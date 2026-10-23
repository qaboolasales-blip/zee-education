# Remaining Tasks — Zee Education

This file contains the **remaining tasks** still open for AI / owner action.
`SUMMARY.md` (same folder) is the single-file project reference — read it first
instead of the full doc set.

Documentation reports, audits, and per-agent write artifacts were consolidated
out of the project root into `archive/` (reference only). Files that the build
script, the test suites, or the running app require stay at their original
paths — see the table in `SUMMARY.md` § Documentation Inventory.

## Open Release Gates — Still NO-GO (as of 2026-10-23)

| Gate | Task / Blocker | Owner |
|------|----------------|-------|
| G3b | UI pixel regression after data binding — never executed | Owner |
| G7 | Local isolation rows executed on 2026-10-23 (single school + two-school A/B, 0 leaks). Remaining: rows T-1, T-3, T-5, T-8..T-12 on the **production** school-B DB grant (host action) | Owner/Host |
| G9 | Backup/restore drill owner sign-off (RPO/RTO/retention) | Owner |
| G10 | Owner decisions — SSH rotation, RPO/RTO, Node pin, pixel-gate redefinition, brand/legal | Owner |

## Owner Actions — Blocking Final Release GO

1. Rotate exposed SSH password (still live) — repo owner — proof: old password rejected.
2. Rotate chat-exposed PAT (`ghp_41u0…`) — revoke/rotate — proof: revoked.
3. Owner sign-off on backup RPO/RTO/retention — repo owner.
4. Owner decision: Node runtime pin, G3b pixel-gate redefinition, brand/legal clearance.

## AI / Ops Remaining Tasks

1. ~~Deploy rebuilt ZIP to staging DB (not production) and run full live smoke.~~
   **Done 2026-10-23** — see "Live Staging Smoke" below.
2. ~~Run smoke checklist from `release/RELEASE_NOTES_v0.1.0.md` — invoice issue/pay/void,
   missing-CSRF 403, PWA install.~~ **Done 2026-10-23** — billing lifecycle, licence
   402/read-only, missing-CSRF 403, `manifest.json` + `sw.js` all exercised.
3. Re-run the G7 school-B-dependent isolation rows after the host DB grant.
4. ~~Create owner-approved role accounts + run role smoke tests (5 roles).~~
   **Done 2026-10-23** — 5 roles signed in and landed on their approved surface.
5. Move final release status: `FINAL_RELEASE_STATUS` → GO only after all gates pass.

## Live Staging Smoke — 2026-10-23

Environment: extracted build-12 ZIP at
`C:\laragon\www\zee_staging\Zee_Education_v0.1.0`, Laragon PHP 8.3.30, MySQL 8.4,
control plane `zee_stage_control` + school DB `zi_stage_demo`, served by
`php spark serve` on `http://127.0.0.1:8899` (development env, offline).

| Check | Result |
|-------|--------|
| Install / migrations (18, three namespaces) | OK, installer locked |
| School provisioning — school 1 `demo` | `201 {state:"completed"}`, `installation_state=completed` |
| Tenant isolation — single school | 23 control-plane / 22 school tables, 0 cross-leaks |
| **Two-school isolation (LB-5 retest)** | School A admin sees only Ali (`ADM-STG-001`, 1 student, invoice `paid_total=5000`); school B admin sees only Bilal (`ADM-STG-B01`, 1 student, 0 invoices) |
| **Two-school write routing (LB-5 retest)** | B attendance write 200, row lands in `zi_stage_stagingb` with `recorded_by=6`; school A's attendance count unchanged |
| Super Admin login + `/portal` | 200, portal dashboard |
| Attendance write (LB-2) | 200; row carries `academic_session_id=1`, `class_id=1`, `section_id=1`, `recorded_by=2` |
| Fee invoice + receipts (LB-4) | 200; `due_date` defaulted +30d; 2000 cash + 3000 bank → `paid` |
| Licence gate — revoke | write `402`, read still `200` (data safe, read-only) |
| Licence gate — paid renewal | invoice 201 (`ZEE-INV-2026-0001`, PKR 30000) → pay settled + renewed new key → write 200 |
| Billing void | 200, invoice `void` |
| School exports — students / fees / attendance | 200 `text/csv`, real rows (`ADM-STG-001`) |
| School print — admission, result-card, fee-receipt, teacher, id-card | 200 HTML, school name in title, student data in id-card |
| Platform exports — schools / tickets / ratebook / renewals | 200 `text/csv`, real headers + rows |
| Platform print — admission, teacher, id-card, result-card | 200 HTML; unknown template 404 |
| Platform records — tickets, ratebook, settings, reminders, quotes, installations, template-requests | 200 `{ok:true}` |
| Role landings — superadmin / school_admin / teacher | 200 → `/portal`, `/school`, `/school` |
| Role landings — parent / student | 200 → `/setup` (approved placeholder per `Home::index`) |
| `/m` mobile shell (school_admin) | 200, "Mobile App" shell + manifest link |
| Write without CSRF — billing API | 403 `{ok:false,error:"csrf_required"} (documented contract) |
| Write without CSRF — school API / token-less login | 403 (global `csrf` filter) |
| Write with no active academic session | `200 {ok:false,"No active academic session…"}`, **0 rows written** |
| Same write after session restored | 200 `{ok:true}` |
| PWA `manifest.json` + `sw.js` | 200 |
| Audit trail | 6 platform events (issue, revoke, invoice×2, payment, void), actor `super_admin` |

This closes the AI/ops smoke items.

### Build 14 clean-install verification — 2026-10-23 (LB-6 fix proven)

A second, independent install was made from the final build-14 ZIP (new folder
`C:\laragon\www\zee_stage14`, new DBs `zee_stage14_control` + `zi_stage14_demo`)
to prove the packaged installer, not a hand-patched tree.

| Check | Result |
|-------|--------|
| Extracted build-14 ZIP, `.env` from `.env.example` | 1317 files, verifier 35/35 |
| Installer migrations (18, three namespaces) | 23 control tables; install locked |
| **Plan catalogue seeded by the installer** | **3 plans immediately after the migration step** (Starter 30000, Growth 42000, Complete 65000) — no CLI seeder |
| First Super Admin | created, `/portal` reached |
| School provisioning — `demo` | 201, `completed`, database `zi_stage14_demo` |
| Licence issue (plan 1) | 201, `license_id=1`, key `ZEE-9FT8-WEV1-MPM5-TVWX` |
| School-admin login | `/school` |
| Attendance write | 200 `{"ok":true,"message":"Attendance recorded"}`; row has `academic_session_id=1`, `class_id=1`, `section_id=1`, `recorded_by=2` |
| Licence row | `active`, 2026-10-23 → 2027-10-23 |

The same build-13 clean install exposed **LB-6** (no plans → licence issue 422);
build 14 fixes it and this run proves the fix from the shipped ZIP.

### Backup / restore drill — G9 evidence (2026-10-23, local)

| Step | Result |
|------|--------|
| `mysqldump` control plane | 47.7 KB, 0.56 s (with the school dump) |
| `mysqldump` school DB | 31.5 KB |
| Restore into scratch DBs | 4.04 s |
| Schema restored | 23 control + 22 school tables |
| Row counts (23 + 22 tables) | 130 control / 25 school, **0 diffs** vs live |
| `CHECKSUM TABLE` (all tables) | **0 diffs** vs live |
| Cleanup | scratch DBs dropped, dumps deleted |

Caveat for the owner: this proves the dump → restore → verify procedure on a
small local dataset (135 rows). It is not a production-sized timing or a
Hostinger storage/retention test, so **G9 still needs the owner's RPO/RTO/
retention sign-off**.

**G3b** (pixel regression) is untouched by this run and remains NO-GO. **G7**
now has both live isolation rows executed locally (single school and the
two-school A/B retest above); the remaining G7 item is the *production* school-B
host DB grant, which needs the owner/host action listed in the gate table.

### LB-5 — cross-tenant database fallback (found live, fixed in build 13)

| Item | Detail |
|------|--------|
| Symptom | School B's admin (`b_admin`, school 2) read school A's student `ADM-STG-001` and A's attendance; a B write would have been recorded against A's database |
| Root cause | `SchoolAccessService::connectionForSchoolId()` fell back to `schooldb.default.database` whenever `ZEE_SCHOOL_DB_MAP` was empty, while provisioning created `ZEE_SCHOOL_DB_PREFIX + school_code` databases — multi-school installs resolved every school to school A |
| Fix | New `databaseNameForSchool()` + static `resolveDatabaseName()`: explicit map → `<prefix><code>` → default **only for a single-school install**; otherwise `null` (fail closed) with an error log. `connectionForSchoolId()` returns `null` instead of guessing |
| Read contract | `SchoolApi::students()` / `invoices()` now use `insight()`: an unresolved/no-DB school answers `200` with empty lists, never `403` and never another tenant's rows |
| Regression pin | `TenantIsolationTest` +6 tests (map wins, prefix fallback, default only for one school, unsafe input rejected, fail-closed with two schools, prefix from code) — file 20/20 |
| Verification | Backend **228 tests / 976 assertions** green (226/968 at the time of the fix); live two-school retest rows above |

## Closed Since 2026-10-21

| Item | Was | Now | Proof |
|------|-----|-----|-------|
| LB-2 | `POST /api/school/attendance` → 500 (NOT NULL academic-structure columns omitted) | Fixed — session/class/section/actor resolved from the school's own data | `SchoolRecordWriteTest` (5 attendance tests) against the real shipped school schema |
| LB-4 | `POST /api/school/fees/invoices` → 500 (NOT NULL session + due date; status outside the ENUM) | Fixed — session resolved, due date defaults +30 days, status `due`/`partial`/`paid` | `SchoolRecordWriteTest` (4 fee tests) against the real shipped school schema |
| **LB-5** | Multi-school install resolved every school to the default (school A) database when `ZEE_SCHOOL_DB_MAP` was empty | Fixed — same map/prefix rule as provisioning; **fails closed** for multi-school installs, empty read for unresolved school | `TenantIsolationTest` +6 tests (20/20); live A/B retest on build 12 with patched files |
| **LB-6** | Fresh install had an empty `license_plans` table: licence issue failed `422` and every school stayed unlicensed (`402` on writes) | Fixed in build 14 — installer's migration step runs the idempotent `LicensePlansSeeder` and logs `plan catalogue: OK` | `InstallerPlanCatalogueTest` (2 tests, 228/976 suite); build-14 clean install showed 3 plans before any manual seed |
| Scratch files in the package | 4 leftover `.tmp` view fragments would have shipped to buyers (the builder copies the whole `app/` tree) | Deleted; `*.tmp`/`*.bak`/`*.orig` git-ignored; the package verifier now fails on any scratch file | Package rebuild: 0 scratch files, verifier 35/35 |
| Backend suite | Could not run locally — MySQL service was down (148 connection errors) | MySQL started; suite green | `OK (228 tests, 976 assertions)`; frontend `816/816` |

## Pending Batch Microtasks

- Batch B: B-K-02 → next (auth implementation continuing).
- Batch G–N: statuses per the archived `backend/kilocode-status.md`.

## Defects Still Open

- None in the write-path family. The previously open LB-2 and LB-4 are fixed
  and regression-pinned, **LB-5** (cross-tenant DB fallback) is fixed in build 13
  and **LB-6** (empty plan catalogue on a fresh install) is fixed in build 14,
  each with regression tests (see "Closed Since 2026-10-21").
- G3b (pixel regression) is unproven, not defective: it has never been executed.
