# Prompt 12 — Deployment, Backups and Operations

Use the Master Context and approved architecture. Design operational delivery before launching schools.

## Environments

Define local/dev, test/CI, staging and production. Keep tenant data, credentials and domains separate across environments. Do not use production student data in staging unless formally approved and protected.

## Operations required

- Repeatable school provisioning from approved templates/infrastructure.
- Versioned deployment and per-school database migration rollout with health checks, canary/pilot approach, rollback/forward-fix strategy and clear maintenance windows.
- Domain/SSL lifecycle, school code/QR lifecycle and secret rotation.
- Encrypted backup schedule, access controls, retention policy, restore testing and clear RPO/RTO decision. Ask owner to approve retention/cost choices.
- Monitoring for application health, database health, failed jobs, failed backups, tenant provisioning status, authentication anomalies and error rates—without logging private student content.
- Alert routing, incident runbook, support escalation, maintenance notices and audit-log retention.
- Cost ledger by platform control plane, school install/database, storage, backups, domains and future message providers. Do not invent provider prices.
- Secure offboarding/decommissioning/export process after retention/legal decisions are approved.

## Deliverables

- Deployment diagram and environment matrix.
- CI/CD plan, migration runbook and rollback plan.
- Backup/restore runbook and documented restore drill.
- Monitoring/alerting plan.
- Incident response and support runbook.
- Launch checklist for one pilot school, then multi-school rollout.

Do not run destructive production commands or provision paid resources without explicit owner approval.
