# Zee Education — OpenCode Complete Batch Plan

This is the only all-batches roadmap for **OpenCode**. Read this file together with your agent packet before every new batch.

## Your permanent boundary
- You may write only `frontend/**` and your own tracker/status file.
- Never edit approved reference UI HTML files. They are 100% pixel-locked.
- Never edit another agent’s directory, shared governance, root configuration or archive.
- Do only the currently activated batch. A later batch is blocked until the prior batch is merged and its exit gate passes.
- Complete microtasks in order, run real checks, and report evidence honestly.
- At every batch end, stop and wait for owner review/merge before starting the next batch.

## Current instruction

> **Only Batch A is active now.** Complete your Batch A tasks, report, then stop. Do not begin Batch B until the owner gives a new prompt after review.

## Batch 0 — Coordination Setup (completed)

**Goal:** Prepare strict agent ownership, UI lock and reference material before production coding.

### Status

- [x] Three approved UI references copied for each agent.
- [x] 100% pixel-identical UI lock and hashes documented.
- [x] KiloCode, OpenCode and Cline have isolated packet/rule/memory/task files.
- [x] Prior workspace material archived.
- [x] VS Code copy-paste prompts prepared.

### Batch exit gate (must pass before next batch)

- [x] Each agent has received only its matching prompt and handoff folder.

---

## Batch A — Foundation, Contracts & Quality Baseline (ACTIVE NOW)

**Goal:** Create a safe CodeIgniter foundation, a non-visual frontend integration base and an independent QA/operations baseline. No business module or UI redesign is allowed.

### Your microtasks

- [ ] O-00.1 Audit and hash reference UI without editing it.
- [ ] O-00.2 Map existing UI areas to future data needs; do not change UI.
- [ ] O-00.3 Write visual UI-lock comparison plan.
- [ ] O-01.1 Create relative-path API client module.
- [ ] O-01.2 Add consistent error/response normalization.
- [ ] O-01.3 Test URL/error/no-secret behavior.
- [ ] O-01.4 Type/document health/setup contract only after backend contract exists; otherwise mark blocked.
- [ ] O-02.1 Add PKR, Pakistan date/time and empty-value formatters.
- [ ] O-02.2 Test the formatters with synthetic data.
- [ ] O-02.3 Document frontend boundary/run/test commands.
- [ ] O-02.4 Write report/status.

### Batch exit gate (must pass before next batch)

- CodeIgniter foundation starts locally with `/health` and `/setup` tests passing, or exact environment blockers are recorded.
- Frontend API client/formatter tests pass.
- QA, security, UI-lock and operations baseline exists.
- No approved reference UI hash changed.

---

## Batch B — Identity, Roles & Session Security

**Goal:** Implement secure platform identity and role enforcement before any school data module.

### Your microtasks

- [ ] B-O-01 Read the published auth contract; compare it with existing locked login-related UI hooks.
- [ ] B-O-02 Add non-visual secure session storage strategy only after contract review; do not expose tokens in logs.
- [ ] B-O-03 Add API-client auth headers/refresh/error behavior based on the real contract.
- [ ] B-O-04 Add role-route guard logic that selects only existing approved screens.
- [ ] B-O-05 Test no-session, expired-session, forbidden-role and logout states without changing UI layout.
- [ ] B-O-06 Record any required missing UI hook as a blocker, not a new UI element.

### Batch exit gate (must pass before next batch)

- Every role has server-side policy tests.
- Browser cannot self-assign a role/school.
- Login/logout/session-expiry behaviors are tested.
- No UI change occurred.

---

## Batch C — Super Admin School Registry & Dedicated Provisioning

**Goal:** Allow Super Admin to register a school and provision one dedicated installation/database safely. This is not a shared-tenant school-data model.

### Your microtasks

- [ ] C-O-01 Map existing Super Admin installation/setup UI elements to provisioning contract fields.
- [ ] C-O-02 Map existing mobile QR/manual school connection elements to real-school-code payload requirements.
- [ ] C-O-03 Add non-visual QR payload parser/validator with expiry/signature contract placeholders only after backend contract exists.
- [ ] C-O-04 Add API adapter calls for school registry/provisioning using existing UI hooks only.
- [ ] C-O-05 Test malformed QR/manual code/expired code/error normalization with synthetic payloads.
- [ ] C-O-06 Record any absent UI hook; no UI additions.

### Batch exit gate (must pass before next batch)

- A synthetic school can be provisioned into a separate local database safely.
- A retry cannot silently create inconsistent duplicate data.
- No school-local student table exists in the control-plane database.

---

## Batch D — School Setup, Academic Structure & Assignment Boundaries

**Goal:** Implement each school’s independent foundation: branding/settings, sessions, classes, sections, subjects and staff assignment rules.

### Your microtasks

- [ ] D-O-01 Map existing school dashboard settings/academic screens to real fields.
- [ ] D-O-02 Bind settings/academic data only through existing approved elements.
- [ ] D-O-03 Use existing base-color/multicolor theme mechanisms only; never alter visual tokens.
- [ ] D-O-04 Add adapter formatting/validation mapping for school settings.
- [ ] D-O-05 Test empty, duplicate, inactive-session and permission-denied responses.

### Batch exit gate (must pass before next batch)

- A school can configure its safe basics and academic structure in its own database.
- Teacher assignment scope is enforceable server-side.
- Uploaded logo controls are tested.

---

## Batch E — People: Students, Guardians, Staff & Enrollment

**Goal:** Build complete but privacy-safe people records and enrollment lifecycle in the dedicated school database.

### Your microtasks

- [ ] E-O-01 Map existing School Dashboard/Mobile role screens to student, guardian and staff fields.
- [ ] E-O-02 Create privacy-safe data selectors/formatters; avoid exposing data beyond role needs.
- [ ] E-O-03 Bind existing list/detail areas without layout change.
- [ ] E-O-04 Test zero, one, many children; inactive student; missing photo/contact; forbidden response.
- [ ] E-O-05 Verify mobile role landing chooses only existing approved role experience.

### Batch exit gate (must pass before next batch)

- School can maintain students, guardians, staff and enrollment history.
- Privacy/role/isolation tests pass using synthetic data.

---

## Batch F — Attendance

**Goal:** Provide daily attendance with Present, Absent and Leave, scoped by class/section and role.

### Your microtasks

- [ ] F-O-01 Map existing attendance UI controls/status visuals to Present/Absent/Leave exactly.
- [ ] F-O-02 Bind class/date/student data through existing hooks only.
- [ ] F-O-03 Add safe optimistic/error/retry adapter behavior without visual redesign.
- [ ] F-O-04 Format role-safe attendance summaries using existing cards/charts only.
- [ ] F-O-05 Test empty roster, duplicate submission, no assignment and offline/error responses.

### Batch exit gate (must pass before next batch)

- Attendance is correct, scoped, auditable and role-safe.

---

## Batch G — Timetable, Homework, Notices & Manual PDF Sharing

**Goal:** Deliver daily academic communication without SMS, automated WhatsApp or payment services.

### Your microtasks

- [ ] G-O-01 Bind timetable/homework/notice data to existing approved areas only.
- [ ] G-O-02 Use existing navigation, drawers and bottom nav; do not add a new menu.
- [ ] G-O-03 Implement manual PDF download/share invocation through existing allowed hooks only.
- [ ] G-O-04 Test no timetable, expired notice, forbidden audience and PDF generation failure.
- [ ] G-O-05 Confirm no UI code calls an unofficial WhatsApp automation API.

### Batch exit gate (must pass before next batch)

- Timetable, homework and notices function per role.
- PDF sharing stays within the agreed manual V1 boundary.

---

## Batch H — Assessments, Marks, Review & Results

**Goal:** Implement the full protected result lifecycle: teacher entry → School Admin review → publish.

### Your microtasks

- [ ] H-O-01 Map existing marks/review/results UI zones to contract fields and status states.
- [ ] H-O-02 Bind teacher draft/review feedback using existing visual states only.
- [ ] H-O-03 Bind published result views/charts without altering chart design.
- [ ] H-O-04 Add safe display for pending/unpublished/no-result using existing approved empty areas.
- [ ] H-O-05 Test role/session/error data mapping.

### Batch exit gate (must pass before next batch)

- Only reviewed/published results reach parent/student views.
- Results are accurate, traceable and export-protected.

---

## Batch I — Manual Fees, Receipts, Discounts & Fines

**Goal:** Provide an auditable manual fee workflow without online payment gateway.

### Your microtasks

- [ ] I-O-01 Bind fee/receipt data only to existing approved UI components.
- [ ] I-O-02 Use PKR formatter and existing color/category accents without visual edits.
- [ ] I-O-03 Bind manual receipt/PDF download/share through existing hooks only.
- [ ] I-O-04 Test partial/overdue/no-fee/forbidden/failed-PDF response mapping.
- [ ] I-O-05 Confirm there is no payment gateway UI or checkout logic.

### Batch exit gate (must pass before next batch)

- Manual fee and receipt records are consistent, auditable and role-protected.
- No online payment feature has been added.

---

## Batch J — Reports, Exports & Print Templates

**Goal:** Produce role-safe operational reports and owner-controlled print templates.

### Your microtasks

- [ ] J-O-01 Bind existing export/print controls to real authorized endpoints only.
- [ ] J-O-02 Preserve existing template visual designs exactly; do not build a new print designer.
- [ ] J-O-03 Map export/job/download errors to existing feedback areas.
- [ ] J-O-04 Test no-data, forbidden, expired-download and failed-export mapping.

### Batch exit gate (must pass before next batch)

- Exports are secure and role/school scoped.
- Template commercial rules are enforced accurately.

---

## Batch K — Super Admin Commercial, License, Renewal & Support

**Goal:** Complete Super Admin operational controls without putting school data at risk.

### Your microtasks

- [ ] K-O-01 Bind existing Super Admin commercial/license/support areas to the real contract only.
- [ ] K-O-02 Display license state with existing approved UI styles only.
- [ ] K-O-03 Bind renewal/support actions to permission-aware adapters.
- [ ] K-O-04 Test missing commercial data, expired state and forbidden support actions.

### Batch exit gate (must pass before next batch)

- Commercial/licensing records work per school and expiry safeguards protect school data.

---

## Batch L — Mobile/PWA Connection, Role Launch & Resilience

**Goal:** Finalize the universal mobile/PWA flow: school selection once, authentication, automatic role experience and safe resilience.

### Your microtasks

- [ ] L-O-01 Bind QR/manual school connection into the existing approved onboarding UI exactly.
- [ ] L-O-02 Store selected-school information only as approved and clear it correctly on logout/school switch.
- [ ] L-O-03 Launch the existing appropriate role experience after login; no new navigation design.
- [ ] L-O-04 Add manifest/install/offline behavior only after owner approves exact offline scope.
- [ ] L-O-05 Verify mobile internal scrollbar remains hidden as approved and accessibility remains usable.
- [ ] L-O-06 Test QR/manual/login/role/error/logout flow on phone widths.

### Batch exit gate (must pass before next batch)

- First-time school connection and role-based launch works securely without UI drift.

---

## Batch M — Full Integration, Security, Performance & Data Recovery

**Goal:** Validate the assembled product using synthetic data before any pilot school.

### Your microtasks

- [ ] M-O-01 Execute all role flows against merged real APIs.
- [ ] M-O-02 Verify all loading/error/empty states use existing approved UI behavior only.
- [ ] M-O-03 Verify no external/local development URLs, credentials or debug data remain.
- [ ] M-O-04 Run desktop/tablet/mobile UI regression comparison against references.

### Batch exit gate (must pass before next batch)

- No critical security, isolation, data-integrity, backup/restore or UI-lock defect remains open.
- All results are evidenced, not claimed.

---

## Batch N — Pilot Release, Monitoring & Handover

**Goal:** Deploy safely to one pilot school and prepare support/handover.

### Your microtasks

- [ ] N-O-01 Validate deployed frontend integration uses production relative endpoints.
- [ ] N-O-02 Perform final approved UI comparison in deployed browsers/device widths.
- [ ] N-O-03 Validate manual PDF sharing/download flows in pilot environment.
- [ ] N-O-04 Create concise role onboarding/help text only if it fits existing approved UI or external documentation; no new UI design.

### Batch exit gate (must pass before next batch)

- Owner explicitly approves pilot go-live.
- Backup/restore, monitoring, role access and UI lock have evidence.
- Known V1 exclusions remain clearly documented.

---

## Completion-report template

```text
Batch: [letter]
Completed task IDs: [list]
Changed files: [exact paths]
Commands/checks actually run: [command + result]
Reference UI hash result: [unchanged / exact mismatch]
Blockers or deferred items: [list]
Next safe microtask: [ID]
```
