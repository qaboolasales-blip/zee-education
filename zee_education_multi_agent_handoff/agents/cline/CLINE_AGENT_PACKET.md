# Cline Agent Packet — QA, Security & Operations Owner

## Read-only inputs

- `reference_ui/` — approved 100% pixel-locked UI files.
- `../../shared/UNIVERSAL_RULES.md`
- `../../shared/PROJECT_MEMORY.md`
- `../../shared/REFERENCE_UI_LOCK.md`
- `../../shared/ARCHITECTURE_BOUNDARY.md`

## Exclusive ownership

You may write only inside `quality/**`, `ops/**` and your own status file `../../coordination/agent_status/cline.md`.

Never edit `backend/**`, `frontend/**`, reference UI, shared files, root configs or other agent packets.

## Agent rules

- You are an independent verifier. Do not rewrite implementation code owned by other agents.
- Do not alter UI to fix a test. Report UI regressions with evidence.
- Use no real student/guardian data, secrets or production credentials.
- Security findings must be actionable and tied to a test/check; do not claim compliance certification.
- Produce test/operations artifacts that later agents can execute without ambiguity.

## Agent memory

- Dedicated installation/database per school is mandatory.
- Authenticated APIs need explicit origin allowlists, server-side role checks and cross-school denial tests.
- License expiry cannot make a school lose access/export to its own data.
- UI references are locked and currently static prototype assets.

## Verified completed before your work

- [x] UI reference files supplied.
- [x] Project governance and agent-boundary design supplied.
- [ ] No verified automated test suite, security middleware, deployment pipeline or backup/restore drill exists yet.

## Remaining task tracker

### Batch A — execute now, in order

- [ ] **C-00.1** Inspect repository and create `quality/docs/current-state-audit.md`; distinguish prototype UI from executable backend/frontend code.
- [ ] **C-00.2** Create `quality/ui/reference-hashes.sha256` for the three read-only UI files and document how a future agent verifies them.
- [ ] **C-00.3** Create `quality/docs/ui-regression-checklist.md` covering desktop, tablet, phone, light/dark modes, navigation, dark header, hamburger drawer and mobile bottom nav.
- [ ] **C-01.1** Create `quality/docs/role-permission-matrix.md` for Super Admin, School Admin, Teacher, Parent and Student.
- [ ] **C-01.2** Create `quality/docs/tenant-isolation-test-matrix.md` covering guessed IDs, cross-school reads/writes/exports/files/background jobs/cache and support access.
- [ ] **C-01.3** Create `quality/docs/security-threat-model.md` for CORS, session/token, QR/manual school code, uploads, exports, migration and backup risks.
- [ ] **C-02.1** Create `ops/windows-laragon-preflight.md` with PHP/Composer/MySQL/extensions verification.
- [ ] **C-02.2** Create `ops/backup-restore-runbook.md` with placeholders for owner-approved RPO/RTO and a mandatory non-production restore drill. Do not invent retention values.
- [ ] **C-02.3** Create `ops/release-gates.md` with objective pilot go/no-go conditions.
- [ ] **C-03.1** Review KiloCode Batch A API documentation if present; create `quality/contracts/health-setup-contract-checklist.md`. Otherwise record the dependency as blocked.
- [ ] **C-03.2** Update your status file with completed IDs, evidence and blocks.

### Batch B — blocked until implementation is merged

- [ ] **C-10.1** Execute backend health/setup tests and record actual result.
- [ ] **C-10.2** Add/execute negative authorization and cross-tenant tests after auth exists.
- [ ] **C-10.3** Perform UI-lock regression comparison after OpenCode binds live data.
- [ ] **C-10.4** Run migration/restore drill before pilot approval.

## Completion report format

Write `../../coordination/agent_status/cline.md` with completed IDs, changed files, actual checks run/results, findings, blocked dependencies and next safe microtask. Commit only owned paths.
