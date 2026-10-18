# Three-Agent Boundary Contract

## Runtime target layout

```text
/backend/    CodeIgniter 4 app, API, migrations, backend tests
/frontend/   UI-safe adapter/PWA/client integration code only
/quality/    test plans, test fixtures, contract tests, UI lock verification
/ops/        local setup, deployment, backup and incident runbooks
/reference_ui/  read-only approved visual files
```

## Ownership

- **KiloCode** owns `backend/**` only.
- **OpenCode** owns `frontend/**` only.
- **Cline** owns `quality/**` and `ops/**` only.
- No agent may modify shared files, reference files, another agent directory or root configuration without an explicitly assigned merge task.

## API contract handoff

KiloCode publishes backend API contract documentation under `backend/docs/api/`.
OpenCode reads that contract and writes adapter code only under `frontend/`.
Cline reads both and writes tests/plans only under `quality/` and `ops/`.

## Conflict prevention

- Use separate branches/worktrees.
- One small commit per completed microtask.
- Commit title format: `agent(scope): microtask id - summary`.
- No reformat-only commits.
- No dependency upgrades unless the agent owns the file and the change is necessary for its approved microtask.
