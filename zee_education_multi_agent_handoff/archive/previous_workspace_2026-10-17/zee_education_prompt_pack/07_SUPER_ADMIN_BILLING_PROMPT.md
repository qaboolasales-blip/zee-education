# Prompt 07 — Super Admin, Provisioning and Commercial Records

Use the Master Context, approved tenant architecture and RBAC model. Implement platform control-plane workflows. Super Admin must not automatically see a school’s student/guardian records; any exceptional support access needs an explicit, audited policy and owner approval.

## Workflows

1. Create a school installation request and track provisioning states: draft, approved, provisioning, health-check, active, renewal due, suspended, failed and decommissioned.
2. Provision school domain/code, dedicated installation/database, baseline settings and migrations through approved infrastructure—not from the browser.
3. Manage school metadata, contacts, theme, plan/add-ons, install health, support tickets, backup health and audit events.
4. Manage proposed Starter/Growth/Complete plan templates and individual feature add-ons. Plans and entitlements must remain editable and owner-approved.
5. Store per-school negotiated commercial records separately:
   - setup/installation one-time;
   - first-year license;
   - renewal license;
   - hosting/domain;
   - one-time custom template design.
   Never invent or publish a fixed public price.
6. Create quotes, discounts and notes with clear status/history. Changes need permissions and audit trail.
7. Track renewal dates/reminders. If email isn’t connected, show manual/simulated status honestly; do not imply delivery.
8. Manage custom print templates: free built-ins selectable by school; Super Admin creates/approves custom HTML/CSS template; approved design charged once; reprints have no additional design charge.
9. Support tickets should have requester, school, priority, status, assignee, response history and safe attachments.

## Guardrails and tests

- No learner data in platform list/search/export by default.
- Per-school commercial data access limited to authorized Super Admin roles.
- Provisioning retries must be idempotent; failed setup must not leak DB credentials or leave unsafe partial access.
- Test tenant provisioning lifecycle, renewal calculation/status, quote change audit, template billing-once rule and access restrictions.
- Keep UI base-theme/multicolor system consistent, responsive and RTL-safe.
