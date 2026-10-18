# KiloCode Agent Packet — Backend & Control Plane Owner

## Read-only inputs

- `reference_ui/` — approved UI; never modify.
- `../../shared/UNIVERSAL_RULES.md`
- `../../shared/PROJECT_MEMORY.md`
- `../../shared/REFERENCE_UI_LOCK.md`
- `../../shared/ARCHITECTURE_BOUNDARY.md`

## Exclusive ownership

You may write only inside `backend/**` and your own status file `../../coordination/agent_status/kilocode.md`.

Never edit `frontend/**`, `quality/**`, `ops/**`, shared files, reference UI files, other agent packets, root files or Git configuration.

## Agent rules

- Inspect before writing. Preserve valid existing files.
- Do not alter approved UI or create replacement frontend layouts.
- Use CodeIgniter 4, PHP 8.2+ and MySQL/MariaDB only.
- Use framework validation, CSRF/session/security practices appropriate to route type, strict origin policy, transactions and defensive null-safe code.
- Do not use secrets or real PII.
- Do not create student/attendance/fee modules in Batch A.
- Do not mark any mock/stub as production-ready.

## Agent memory

- You own backend foundation and the Super Admin control-plane backend only.
- Each school will later have a dedicated installation/database. Do not implement a shared student tenant table.
- Current approved UI exists but is static; it is not your job to modify it.
- V1 excludes SMS, payment gateway and automated WhatsApp.

## Verified completed before your work

- [x] Approved UI reference files are supplied read-only.
- [x] Backend stack decision: CodeIgniter 4 + MySQL/MariaDB.
- [ ] No verified CodeIgniter runtime, Composer install, database or API exists yet.

## Remaining task tracker

### Batch A — execute now, in order

- [ ] **K-00.1** Inspect repository and confirm PHP, Composer, MySQL and required PHP extensions. Record exact versions/missing items in `backend/docs/environment-audit.md`.
- [ ] **K-00.2** Confirm `backend/` is empty or identify existing valid CodeIgniter project. Do not overwrite unknown work.
- [ ] **K-01.1** Initialize a clean CodeIgniter 4 app inside `backend/` only when Composer/PHP are available.
- [ ] **K-01.2** Configure `.gitignore` to protect `.env`, writable logs/cache, dependency artifacts as appropriate and secrets.
- [ ] **K-01.3** Create `.env.example` using placeholders only; document PHP 8.2+, MySQL/MariaDB and required extensions.
- [ ] **K-01.4** Write `backend/README.md` with local Laragon start commands and test commands.
- [ ] **K-02.1** Add safe `GET /health` endpoint returning only app name, safe status and version; no credentials/debug details.
- [ ] **K-02.2** Add test for `/health` response/status/content.
- [ ] **K-02.3** Add safe `GET /setup` installer placeholder route/view; it must not write databases or collect secrets yet.
- [ ] **K-02.4** Add test for `/setup` response/status.
- [ ] **K-03.1** Write `backend/docs/control-plane-data-boundary.md`: control-plane fields vs school-local fields.
- [ ] **K-03.2** Define migration plan for control-plane entities only: schools, school domains, provisioning jobs and platform audit events. Document field rationale before migration code.
- [ ] **K-03.3** Implement only approved control-plane migrations after K-03.2 documentation.
- [ ] **K-03.4** Add migration smoke test or documented local migration command; run it against synthetic local database only.
- [ ] **K-04.1** Create `backend/docs/api/openapi-v0.md` with health/setup response contract and future tenant route conventions. Do not invent student APIs.
- [ ] **K-04.2** Run available CI4 tests and report exact commands/results.
- [ ] **K-04.3** Update your status file with completed IDs, evidence, tests and blockers.

### Batch B — do not begin until Batch A is merged and explicitly assigned

- [ ] **K-10.1** Implement approved authentication approach.
- [ ] **K-10.2** Implement server-side role/permission policy.
- [ ] **K-10.3** Implement dedicated-school provisioning workflow.
- [ ] **K-10.4** Publish API contracts needed by OpenCode.

## Completion report format

Write `../../coordination/agent_status/kilocode.md` with: completed IDs, changed files, test commands/results, mocks/placeholders, blocked IDs and next safe microtask. Commit only your owned path.
