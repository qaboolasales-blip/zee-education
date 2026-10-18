# Zee Education — Development Prompt Pack

Yeh pack AI coding agent (Cursor, Claude Code, ChatGPT, Copilot ya similar) ko Zee Education ke current UI prototype ko **production product** mein step-by-step convert karne ke liye hai.

## Important: current status

- School Dashboard, Super Admin aur Mobile App preview ke UI concepts/prototypes ban chuke hain.
- Production system abhi complete nahin: real backend/API, login, RBAC, per-school provisioning, dedicated databases, live reports, integrations, backup/restore drills aur deployment baqi hain.
- Har school ke liye separate installation aur separate database requirement hai. Is ko architecture phase mein approve karna zaroori hai.
- UI direction: selected **base theme** branding/navigation/primary actions ke liye; coordinated **multi-color** accents KPIs, charts, categories aur statuses ke liye. UI clean aur readable rahe, random rainbow look na ho.

## Use order

1. `00_MASTER_CONTEXT_PROMPT.md` — har agent session mein pehle dein.
2. `01_AUDIT_PRD_PROMPT.md` — existing repo ka audit; no code changes.
3. `02_ARCHITECTURE_TENANCY_PROMPT.md` — backend/deployment/tenant architecture approval.
4. `03_UI_UX_DESIGN_PROMPT.md` — screen-level UX/UI and design system.
5. `04_AUTH_SECURITY_PROMPT.md` — authentication, RBAC and security.
6. `05_DATABASE_API_PROMPT.md` — database, API contracts and migrations.
7. `06_SCHOOL_MODULES_PROMPT.md` — school-side core workflows.
8. `07_SUPER_ADMIN_BILLING_PROMPT.md` — platform control plane and commercial records.
9. `08_MOBILE_APP_PROMPT.md` — mobile/PWA strategy and school connection.
10. `09_REPORTING_TEMPLATES_EXPORTS_PROMPT.md` — reports, printing and templates.
11. `10_MESSAGING_PROMPT.md` — V1 communication and later integrations.
12. `11_TESTING_QA_PROMPT.md` — quality, accessibility and pilot gates.
13. `12_DEPLOYMENT_OPERATIONS_PROMPT.md` — staging, production, backup and monitoring.
14. `13_PROTOTYPE_TO_PRODUCTION_PROMPT.md` — exact phased execution plan.

## Working method

- Ek waqt mein **sirf ek prompt/milestone** chalayein.
- Architecture, hosting, identity provider, PWA vs native app, retention, backups aur external integrations ke high-impact decisions ko AI se recommendation le kar **aap approve** karein.
- Har milestone ke baad: Git commit, diff review, tests, production build and known-risks report.
- API keys, passwords, database URLs, client records ya student data prompts mein kabhi paste na karein.
- Kisi visible button ko production-complete na samjhein jab tak woh actual API, permissions, validation aur tests ke sath na chale.
