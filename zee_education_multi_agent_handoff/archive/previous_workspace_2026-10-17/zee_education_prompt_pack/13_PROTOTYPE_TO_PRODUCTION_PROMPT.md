# Prompt 13 — Prototype-to-Production Execution Plan

Use the Master Context plus the approved audit, architecture and design decisions. Produce a detailed but practical delivery plan that reuses the existing React/Vite/MUI prototype instead of rebuilding UI unnecessarily.

## Required plan

1. Identify reusable UI components/screens and components that need refactoring before API connection.
2. Define a folder/module structure separating UI, data access, API client, domain types, feature modules, state and design tokens.
3. Propose vertical-slice milestones with each milestone’s user value, files/services affected, dependencies, acceptance criteria, tests, migration/rollback needs and demo-vs-live transition.
4. Suggested milestone order:
   - baseline repo cleanup/design tokens and clear demo mode;
   - architecture skeleton/control plane + tenant provisioning proof of concept;
   - authentication/RBAC/tenant-context proof;
   - school setup + student/guardian records;
   - attendance;
   - assessments/marks/review/publication;
   - manual fees/receipts;
   - reports/templates/exports;
   - Super Admin commercial/support/provisioning screens;
   - mobile/PWA role experience and secure school connection;
   - QA, restore drills and pilot.
5. State what is intentionally deferred: online payments, SMS, automated WhatsApp API and any unapproved later features.
6. Include a migration strategy from browser mock data to real APIs without breaking visual demos, and remove fake-success behavior as each real slice goes live.
7. Define pilot success metrics: first-school provisioning time, tenant isolation test status, attendance/marks workflow success, backup restore success, support response and performance targets.

Return risks, staffing/skill needs, owner decisions, rough effort classes (S/M/L—not invented calendar dates), and a recommended first coding milestone. Do not start all milestones at once.
