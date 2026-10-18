# Prompt 11 — Testing, Accessibility and Pilot Quality Gates

Use the Master Context and approved modules. Build a practical test strategy before pilot release.

## Required test layers

- Unit tests for domain rules, calculations, role policies, validation and utilities.
- API/integration tests for authentication, tenant resolution, RBAC, migrations and core school workflows.
- Negative cross-school/IDOR tests for every protected data category and export/download path.
- End-to-end tests for Super Admin provisioning, school login, admission, attendance, marks review/publication, manual fee receipt, report export and mobile school connection.
- UI tests for loading/error/empty/permission-denied states.
- Responsive checks at 320px, mobile, tablet and desktop.
- Accessibility checks: keyboard, focus, labels, dialog focus trap, contrast for all 8 themes, charts with textual alternatives and Urdu RTL.
- Performance checks: initial load, large list handling, export job behavior and slow/unreliable connections.
- Security checks: input validation, rate limits, session expiry, permissions, secrets scan and dependency vulnerability review.

## Pilot gates

Create a checklist that requires:

1. Fresh-school provisioning succeeds safely.
2. A restore drill to a non-production environment succeeds and is documented.
3. At least two isolated test schools pass cross-tenant denial tests.
4. No demo-only control is presented as live functionality.
5. All critical flows work in English and Urdu RTL or limitations are visible/documented.
6. Backup/monitoring/support escalation owner is identified.

Return test plan, tooling recommendation, coverage goals, bug severity rules and an exact go/no-go checklist. Do not declare launch-ready until results are attached.
