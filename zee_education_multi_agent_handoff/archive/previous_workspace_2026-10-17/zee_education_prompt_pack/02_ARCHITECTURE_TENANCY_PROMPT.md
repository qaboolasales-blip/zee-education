# Prompt 02 — Production Architecture and Tenant Isolation

Use `00_MASTER_CONTEXT_PROMPT.md` and the approved Prompt 01 audit.

**Architecture proposal only. Do not implement infrastructure or production databases until the product owner approves the decision record.**

## Goal

Design a maintainable V1 architecture for the current React/Vite/MUI frontend and secure backend while preserving a dedicated installation and database for each school.

## Work required

1. Compare 2–3 practical backend approaches. A modular monolith is the preferred default; explain why or why not. You may compare TypeScript/Fastify or NestJS + PostgreSQL with a suitable managed alternative.
2. Compare these interpretations of “separate installation”:
   - independent application deployment and database for every school;
   - shared application runtime/control plane routing safely to a dedicated database and isolated tenant configuration for each school;
   - any other defensible option.
   State operational cost, update process, failure isolation, security, backups and support trade-offs. Do not treat a shared table with `tenant_id` as equivalent.
3. Define a separate Super Admin control plane and school data plane. State exactly what records live in each boundary.
4. Design the request flow from school domain/manual code/QR to the correct installation. QR token must be signed, short-lived, revocable and non-sensitive. Mitigate brute force, replay, enumeration and misrouting.
5. Define authentication, session management, server-side tenant resolution, RBAC boundary, file storage, API versioning, background jobs, logging and audit events.
6. Define school provisioning: quote/approval → installation → database → migrations → domain/SSL → school code/QR → health check → handover; include failures/retry/rollback.
7. Define schema migration, backup/restore, disaster recovery, upgrades, suspension and offboarding per school.
8. Provide a threat model focused on cross-school access, Super Admin misuse, domain/code attacks, backup leakage and migration errors.

## Required outputs

- System context + container/deployment diagrams (Mermaid acceptable).
- Control plane vs school data table.
- Tenant provisioning and login/connection sequence diagrams.
- Recommendation, alternatives, cost drivers and operational risks.
- ADRs with assumptions/open questions.
- Phased implementation roadmap for pilot scale.

Ask for approval on backend/runtime, hosting/deployment topology, identity approach, backup RPO/RTO, data retention and PWA/native direction before coding.
