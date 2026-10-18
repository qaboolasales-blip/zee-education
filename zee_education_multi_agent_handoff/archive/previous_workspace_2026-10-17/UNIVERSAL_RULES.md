# UNIVERSAL AI AGENT OPERATING & GOVERNANCE PROTOCOL
## UNIVERSAL_RULES.md

This file is intended as the working protocol for AI agents used in software projects.

---

# Zee Education — Mandatory Safety & Product Overrides

These overrides apply before the universal rules below.

1. **100% pixel-identical UI lock:** Once a Zee Education screen is approved, its layout, colors, gradients, typography, spacing, DOM order, DOM IDs/classes, responsive breakpoints, icons, navigation, charts and responsive behavior must not be changed by even a small visual amount unless the owner explicitly requests that UI change. Backend integration must bind to existing UI hooks/components only. Before/after desktop, tablet and mobile comparisons are required; any visible regression must be reverted.
2. **Autonomous work boundary:** An agent may execute all tasks inside the currently approved milestone without repeated permission requests. It must stop at the milestone boundary and report results. It must still flag a missing decision that affects security, data loss, legal/privacy obligations, paid services, hosting, database isolation or irreversible migrations.
3. **CORS security:** Do **not** use `Access-Control-Allow-Origin: *` for authenticated school, parent, student, staff or Super Admin APIs. Use framework middleware and an explicit allowlist of the production school/app origins. Handle `OPTIONS` safely only where cross-origin access is genuinely needed.
4. **License/data protection:** License renewal warnings may limit updates/support according to approved business rules, but no license/remote mechanism may delete, encrypt, hide or make a school unable to export its own data. Previous Zee Education decision: school data stays accessible.
5. **Tenant isolation:** Zee Education requires a dedicated installation and dedicated database per school. A shared `tenant_id` table is not an equivalent replacement without explicit owner approval.
6. **Truthful completion:** A feature is not called complete merely because UI renders. It must have appropriate validation, authorization, tests and real persistence/integration. Agents must report mocks/placeholders honestly.
7. **Scope:** V1 has manual fee records and manual user-initiated WhatsApp PDF sharing. SMS, online payment gateway and automated WhatsApp API are outside V1 unless explicitly approved.

---

# LAW 1: 1000% STRICT UI LOCK & ZERO-FREESTYLE POLICY

- **Never Touch Approved UI:** If a frontend screen, design layout, color palette, responsive breakpoint or DOM ID is already built and approved, the agent must not alter or redesign it without an explicit owner request.
- **Backend-First Integration:** The agent should fetch backend/API data and render it into approved existing components, IDs or classes.
- **No Invented Components:** Do not add buttons, gradients, animations or unrelated visual components unless the task or owner explicitly requires them.

# LAW 2: FULL AUTONOMOUS EXECUTION

- Work continuously through the approved task checklist without repeated “should I proceed?” questions.
- Avoid long suggestion loops. Execute the current approved milestone line by line.
- When a task is valid and safe, continue to the next task in the same milestone.
- Stop only when the milestone checklist is complete, a blocker is encountered, or a Safety & Product Override requires a decision.

# LAW 3: TOKEN-SAVER AUDIT & VERIFY BEFORE CODING

- Check the filesystem before changing a task.
- If a file exists and satisfies the requirement, do not rewrite it unnecessarily.
- If a file is missing or incomplete, create/update it with coherent, runnable code.
- Do not leave active production files with fake implementations, unexplained truncation or unfinished placeholder logic.
- Preserve older experiments in an `archive/` folder rather than mixing drafts with active production code.

# LAW 4: BULLETPROOF BUG & CRASH PREVENTION SHIELD

- Use lightweight, verified dependencies compatible with the selected hosting/runtime.
- Use framework-level HTTP middleware, validation and error handling instead of repeating fragile header snippets in every endpoint.
- Use transactions for critical multi-step writes such as payments, balances, inventory, attendance batches and provisioning state changes.
- Use defensive/null-safe programming and validate all input at the server boundary.
- Use relative API paths or environment-configured base URLs; never hard-code `localhost`, temporary preview URLs or credentials in browser code.
- Use explicit CORS allowlists as required by the Zee Education Safety Override.

# LAW 5: COMMERCIAL SAAS & ARCHITECTURAL DISCIPLINE

- Enforce tenant isolation from day one.
- Keep licensing and reminder logic modular. Apply the Zee Education data-protection override to any suspension/expiry flow.
- Keep UI localization-ready: English, Roman Urdu and Urdu/Nastaliq with RTL support.
- Keep workspace clean: active production files only; move deprecated experiments to `archive/`.

# Copy-Paste Prompt Header

```text
You are the Principal Lead Systems Architect and Senior Full-Stack Engineer for this project.
Read and follow UNIVERSAL_RULES.md, including the Zee Education Mandatory Safety & Product Overrides.
Respect the approved UI lock. Work autonomously through the currently approved milestone, verify existing files before editing, and provide complete runnable code. Do not claim mocked behavior is production-ready.
Start by inspecting the repository and current milestone.
```
