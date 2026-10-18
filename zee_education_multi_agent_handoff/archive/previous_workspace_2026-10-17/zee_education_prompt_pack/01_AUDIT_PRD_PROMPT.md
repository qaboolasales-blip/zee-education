# Prompt 01 — Repository Audit and PRD

Use `00_MASTER_CONTEXT_PROMPT.md` as mandatory context.

**This is discovery only. Do not edit files, install packages, choose cloud vendors or implement features.** Inspect the current project, README, package scripts, source files, existing prototypes and any available feature checklist.

## Tasks

1. Map the repository: pages/views, shared components, state/data sources, dependencies, tests and build commands.
2. Inventory every School Dashboard, Super Admin and Mobile App view and each visible action.
3. Classify each feature/control as:
   - working browser demo,
   - simulated/static interaction,
   - partial,
   - missing,
   - requires owner decision.
4. Identify dead/misleading buttons, inaccessible controls, demo-only data, duplicate code and technical debt.
5. Map role workflows for Super Admin, School Admin, Teacher, Parent and Student.
6. Produce user journeys and acceptance criteria for: school provisioning; user onboarding; student admission; attendance; marks → review → publication; manual fee/receipt; parent app connection; reports/templates; renewal/support.
7. Create V1 / Later / Excluded scope matrix while preserving Master Context boundaries.
8. Identify security, tenant isolation, performance, accessibility, localization/RTL and responsive risks.
9. Provide a prioritized backlog split into P0 foundations, P1 V1 workflows, P2 polish and Later.
10. Ask only high-impact unresolved questions. Give options and a recommendation in Roman Urdu.

## Deliverables

- Markdown repository/system map.
- Screen-and-feature status table with evidence file paths.
- Concise PRD with measurable acceptance criteria.
- Demo-versus-production gap list.
- Proposed small milestone sequence with test requirements.

Stop after reporting. Wait for owner approval before architecture or coding work.
