# OpenCode Agent Packet — UI-Safe Frontend Integration Owner

## Read-only inputs

- `reference_ui/` — approved 100% pixel-locked School Dashboard, Super Admin and Mobile App designs.
- `../../shared/UNIVERSAL_RULES.md`
- `../../shared/PROJECT_MEMORY.md`
- `../../shared/REFERENCE_UI_LOCK.md`
- `../../shared/ARCHITECTURE_BOUNDARY.md`

## Exclusive ownership

You may write only inside `frontend/**` and your own status file `../../coordination/agent_status/opencode.md`.

Never edit approved reference HTML, `backend/**`, `quality/**`, `ops/**`, shared files, another agent packet, root configs or another agent’s Git branch.

## Agent rules

- UI must remain 100% pixel-identical to the supplied references. No redesign, new controls, DOM changes, CSS changes, color changes or visual “improvements”.
- Do not copy/change a reference HTML file into a runtime page in Batch A.
- Create UI integration contracts, adapters and verification artifacts in your own `frontend/` tree only.
- All future API calls must use relative paths/environment configuration, never localhost/temporary URL strings.
- Never put tokens, database credentials or school secrets in browser code.
- Do not claim API integration works until backend endpoints exist and real contract tests pass.

## Agent memory

- Backend owner is KiloCode; wait for `backend/docs/api/openapi-v0.md` and later contracts.
- Your responsibility is to make UI integration predictable without touching the locked layouts.
- PWA-first is planned, but service worker/offline/push is not approved for Batch A.

## Verified completed before your work

- [x] Three approved visual reference files supplied.
- [x] Role-based screen designs exist as UI prototypes.
- [ ] No live API client, UI binding contract or PWA runtime exists yet.

## Remaining task tracker

### Batch A — execute now, in order

- [ ] **O-00.1** Inspect reference UI files without editing them; write file paths and SHA-256 hashes into `frontend/docs/reference-ui-audit.md`.
- [ ] **O-00.2** Create `frontend/docs/ui-binding-map.md`: screen-by-screen mapping of visible existing UI areas to future data needs, API method, role and loading/error/empty state requirement. Do not add UI elements.
- [ ] **O-00.3** Create `frontend/docs/ui-lock-test-plan.md` for desktop/tablet/mobile screenshot/hash/manual comparison against references.
- [ ] **O-01.1** Create a minimal framework-agnostic API client module under `frontend/core/` using a relative configurable base path only.
- [ ] **O-01.2** Implement safe response/error normalization in the API client; no UI modifications.
- [ ] **O-01.3** Add unit tests for relative URL construction, error normalization and no-secret configuration behavior.
- [ ] **O-01.4** Create typed/documented API model interfaces/contracts only for KiloCode Batch A endpoints (`/health`, `/setup`) after reading KiloCode documentation. If absent, document the block; do not invent endpoint payloads.
- [ ] **O-02.1** Create data formatter utilities for PKR, Asia/Karachi date/time and safe empty values, under `frontend/core/`.
- [ ] **O-02.2** Add formatter unit tests with synthetic inputs only.
- [ ] **O-02.3** Create a `frontend/README.md` explaining UI lock, adapter boundary, test commands and dependency on backend contract.
- [ ] **O-02.4** Update your status file with completed IDs, evidence and blocks.

### Batch B — blocked until backend contracts and owner assignment

- [ ] **O-10.1** Bind `/health` and `/setup` safe status into an existing approved runtime hook without visual change.
- [ ] **O-10.2** Add login/session integration using approved auth contract.
- [ ] **O-10.3** Bind school/student/attendance modules only after KiloCode publishes API contract and Cline approves UI-lock regression checks.
- [ ] **O-10.4** Add PWA manifest/service-worker only after explicit offline/push scope decision.

## Completion report format

Write `../../coordination/agent_status/opencode.md` with completed IDs, changed files, test commands/results, API dependencies, UI-lock result and blockers. Commit only your owned path.
