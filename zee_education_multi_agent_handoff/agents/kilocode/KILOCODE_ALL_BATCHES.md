# Zee Education — KiloCode Complete Batch Plan

This is the only all-batches roadmap for **KiloCode**. Read this file together with your agent packet before every new batch.

## Your permanent boundary
- You may write only `backend/**` and your own tracker/status file.
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

- [ ] K-00.1 Inspect PHP, Composer, MySQL and required PHP extensions; record exact versions/missing items.
- [ ] K-00.2 Inspect `backend/`; do not overwrite unknown valid work.
- [ ] K-01.1 Initialize CodeIgniter 4 under `backend/` only when the runtime exists.
- [ ] K-01.2 Protect secrets, writable artifacts and local config in `.gitignore`.
- [ ] K-01.3 Add placeholder-only `.env.example`.
- [ ] K-01.4 Document Windows/Laragon run/test commands.
- [ ] K-02.1 Add safe `/health` endpoint.
- [ ] K-02.2 Add real health endpoint test.
- [ ] K-02.3 Add inert `/setup` placeholder route/view.
- [ ] K-02.4 Add real setup route test.
- [ ] K-03.1 Document control-plane vs school-local data boundary.
- [ ] K-03.2 Document control-plane migration design before writing it.
- [ ] K-03.3 Implement only control-plane migrations.
- [ ] K-03.4 Run migration smoke check on synthetic local database only.
- [ ] K-04.1 Publish initial health/setup API contract.
- [ ] K-04.2 Run available real tests.
- [ ] K-04.3 Write report/status.

### Batch exit gate (must pass before next batch)

- CodeIgniter foundation starts locally with `/health` and `/setup` tests passing, or exact environment blockers are recorded.
- Frontend API client/formatter tests pass.
- QA, security, UI-lock and operations baseline exists.
- No approved reference UI hash changed.

---

## Batch B — Identity, Roles & Session Security

**Goal:** Implement secure platform identity and role enforcement before any school data module.

### Your microtasks

- [ ] B-K-01 Choose and document the CodeIgniter-compatible authentication implementation; record package/version/license/security rationale.
- [ ] B-K-02 Create platform-user migration/model with secure password handling and no role trust from client input.
- [ ] B-K-03 Create role/permission migration/model/policy: Super Admin, School Admin, Teacher, Parent/Guardian, Student.
- [ ] B-K-04 Define session/token lifecycle, logout, expiry, password reset and lockout rules.
- [ ] B-K-05 Implement login/logout/current-session endpoints.
- [ ] B-K-06 Enforce server-side role policy middleware/filters.
- [ ] B-K-07 Add audit event for successful/failed sensitive authentication events without logging secrets.
- [ ] B-K-08 Publish auth API contract and run authentication/authorization tests.

### Batch exit gate (must pass before next batch)

- Every role has server-side policy tests.
- Browser cannot self-assign a role/school.
- Login/logout/session-expiry behaviors are tested.
- No UI change occurred.

---

## Batch C — Super Admin School Registry & Dedicated Provisioning

**Goal:** Allow Super Admin to register a school and provision one dedicated installation/database safely. This is not a shared-tenant school-data model.

### Your microtasks

- [ ] C-K-01 Finalize control-plane school record fields: status, contact, branding reference, negotiated commercial metadata and installation state.
- [ ] C-K-02 Define school-code/domain rules and uniqueness validation.
- [ ] C-K-03 Define protected provisioning state machine: requested, validating, creating, migrated, seeded, failed, retry-safe.
- [ ] C-K-04 Build credential validation without logging connection strings/passwords.
- [ ] C-K-05 Build dedicated database creation/connection workflow appropriate to the deployment host; document shared-hosting constraints.
- [ ] C-K-06 Apply school-local baseline migrations to the dedicated database only.
- [ ] C-K-07 Seed only safe default roles/settings; never fake production users.
- [ ] C-K-08 Build idempotent provisioning retry/error handling.
- [ ] C-K-09 Add Super Admin-only provisioning authorization and audit events.
- [ ] C-K-10 Publish provisioning API contract and synthetic end-to-end test.

### Batch exit gate (must pass before next batch)

- A synthetic school can be provisioned into a separate local database safely.
- A retry cannot silently create inconsistent duplicate data.
- No school-local student table exists in the control-plane database.

---

## Batch D — School Setup, Academic Structure & Assignment Boundaries

**Goal:** Implement each school’s independent foundation: branding/settings, sessions, classes, sections, subjects and staff assignment rules.

### Your microtasks

- [ ] D-K-01 Define school-local settings schema: school identity, contact, address, logo path, base theme selection and locale/time zone.
- [ ] D-K-02 Add safe logo upload validation/storage policy; no public arbitrary-file upload.
- [ ] D-K-03 Create academic-session schema and active-session validation.
- [ ] D-K-04 Create class, section and subject schema with unique/active constraints.
- [ ] D-K-05 Create teacher-subject-section assignment schema.
- [ ] D-K-06 Create CRUD endpoints with server-side school connection and role enforcement.
- [ ] D-K-07 Add validation/duplicate/archival tests.
- [ ] D-K-08 Publish contract and audit significant configuration changes.

### Batch exit gate (must pass before next batch)

- A school can configure its safe basics and academic structure in its own database.
- Teacher assignment scope is enforceable server-side.
- Uploaded logo controls are tested.

---

## Batch E — People: Students, Guardians, Staff & Enrollment

**Goal:** Build complete but privacy-safe people records and enrollment lifecycle in the dedicated school database.

### Your microtasks

- [ ] E-K-01 Define student profile fields, unique admission number policy and data-retention notes.
- [ ] E-K-02 Define guardian profile/link schema supporting one or more linked children.
- [ ] E-K-03 Define staff/teacher profile and account-link schema.
- [ ] E-K-04 Define academic enrollment schema/history and transfer/withdraw/archive states.
- [ ] E-K-05 Implement validation, duplicate checks and protected CRUD endpoints.
- [ ] E-K-06 Implement parent-child access policy and teacher assignment restrictions.
- [ ] E-K-07 Add synthetic fixtures and tests for links, duplicates, archives and forbidden access.
- [ ] E-K-08 Publish people/enrollment API contracts.

### Batch exit gate (must pass before next batch)

- School can maintain students, guardians, staff and enrollment history.
- Privacy/role/isolation tests pass using synthetic data.

---

## Batch F — Attendance

**Goal:** Provide daily attendance with Present, Absent and Leave, scoped by class/section and role.

### Your microtasks

- [ ] F-K-01 Define attendance date, student, status, source, recorded-by and correction/audit fields.
- [ ] F-K-02 Add uniqueness rule for one attendance record per student/date/session as approved.
- [ ] F-K-03 Implement teacher-assignment scope validation.
- [ ] F-K-04 Implement create/update/correction endpoints with transaction and audit behavior.
- [ ] F-K-05 Implement role-safe attendance views/summary queries.
- [ ] F-K-06 Add tests for duplicate, date boundary, forbidden class and correction history.
- [ ] F-K-07 Publish attendance contract.

### Batch exit gate (must pass before next batch)

- Attendance is correct, scoped, auditable and role-safe.

---

## Batch G — Timetable, Homework, Notices & Manual PDF Sharing

**Goal:** Deliver daily academic communication without SMS, automated WhatsApp or payment services.

### Your microtasks

- [ ] G-K-01 Define timetable slots, class/section/subject/teacher/location constraints.
- [ ] G-K-02 Validate timetable collision rules.
- [ ] G-K-03 Define homework schema: assignment, due date, attachment policy and class/subject scope.
- [ ] G-K-04 Define notice schema: audience, schedule, expiry and publish workflow.
- [ ] G-K-05 Generate protected downloadable PDFs where approved.
- [ ] G-K-06 Ensure WhatsApp behavior is manual user-initiated share of a generated PDF only; no automation.
- [ ] G-K-07 Test collision, audience, attachment, authorization and manual-share boundaries.
- [ ] G-K-08 Publish communication API contracts.

### Batch exit gate (must pass before next batch)

- Timetable, homework and notices function per role.
- PDF sharing stays within the agreed manual V1 boundary.

---

## Batch H — Assessments, Marks, Review & Results

**Goal:** Implement the full protected result lifecycle: teacher entry → School Admin review → publish.

### Your microtasks

- [ ] H-K-01 Define exam/assessment structure, grading rules and maximum marks validation.
- [ ] H-K-02 Define marks-entry schema with draft/submitted/reviewed/published states.
- [ ] H-K-03 Restrict teacher entry to assigned class/subject.
- [ ] H-K-04 Implement School Admin review/return/approve workflow.
- [ ] H-K-05 Implement result calculation with documented rounding/absent rules.
- [ ] H-K-06 Block parent/student publication access until state is published.
- [ ] H-K-07 Generate protected result/PDF data source.
- [ ] H-K-08 Test invalid marks, unauthorized publish, review return, calculation and publication visibility.
- [ ] H-K-09 Publish result API contract.

### Batch exit gate (must pass before next batch)

- Only reviewed/published results reach parent/student views.
- Results are accurate, traceable and export-protected.

---

## Batch I — Manual Fees, Receipts, Discounts & Fines

**Goal:** Provide an auditable manual fee workflow without online payment gateway.

### Your microtasks

- [ ] I-K-01 Define fee head, academic period, invoice/demand, concession, fine and receipt schema.
- [ ] I-K-02 Define manual payment fields: date, amount, mode, reference and collector.
- [ ] I-K-03 Enforce role approval for discounts/fines/voids/refunds as approved.
- [ ] I-K-04 Use transactions and immutable audit trail for money-impacting writes.
- [ ] I-K-05 Generate unique receipt number/PDF source.
- [ ] I-K-06 Implement due/paid/partial/overdue summaries.
- [ ] I-K-07 Add tests for duplicate receipt, invalid amount, unauthorized discount, void audit and report totals.
- [ ] I-K-08 Publish fees/receipts API contract.

### Batch exit gate (must pass before next batch)

- Manual fee and receipt records are consistent, auditable and role-protected.
- No online payment feature has been added.

---

## Batch J — Reports, Exports & Print Templates

**Goal:** Produce role-safe operational reports and owner-controlled print templates.

### Your microtasks

- [ ] J-K-01 Inventory each approved report with owner, fields, filters and authorization rules.
- [ ] J-K-02 Implement protected CSV/Excel/PDF export service with memory-safe pagination/limits.
- [ ] J-K-03 Ensure exports are scoped to the connected school database and authorized role.
- [ ] J-K-04 Implement built-in free print-template selection.
- [ ] J-K-05 Implement Super Admin-only custom-template request/approval metadata.
- [ ] J-K-06 Record one-time custom design charge state separately from later reprint events.
- [ ] J-K-07 Implement reprint flow that never adds a second design charge.
- [ ] J-K-08 Test data-scope, template authorization, large export handling and charge/reprint logic.

### Batch exit gate (must pass before next batch)

- Exports are secure and role/school scoped.
- Template commercial rules are enforced accurately.

---

## Batch K — Super Admin Commercial, License, Renewal & Support

**Goal:** Complete Super Admin operational controls without putting school data at risk.

### Your microtasks

- [ ] K-K-01 Define commercial agreement records: negotiated rates, setup, first-year, renewal, hosting/domain and add-ons as separate fields.
- [ ] K-K-02 Define plan labels as configurable proposed products, not fixed public prices.
- [ ] K-K-03 Define license state/reminder schedule and communications audit.
- [ ] K-K-04 Implement renewal reminders with safe queue/retry behavior where infrastructure permits.
- [ ] K-K-05 Implement license status visibility.
- [ ] K-K-06 Enforce safe expiry behavior: no deletion, hidden data or blocked data export.
- [ ] K-K-07 Define support ticket and support-access audit model; default deny learner-data browsing.
- [ ] K-K-08 Test negotiated pricing, reminder idempotency, expiry/data access and support authorization.

### Batch exit gate (must pass before next batch)

- Commercial/licensing records work per school and expiry safeguards protect school data.

---

## Batch L — Mobile/PWA Connection, Role Launch & Resilience

**Goal:** Finalize the universal mobile/PWA flow: school selection once, authentication, automatic role experience and safe resilience.

### Your microtasks

- [ ] L-K-01 Finalize school QR payload/signature/expiry/revocation rules.
- [ ] L-K-02 Provide manual school-code/domain lookup endpoint with enumeration/rate-limit protection.
- [ ] L-K-03 Bind selected school to authenticated session server-side.
- [ ] L-K-04 Return role-safe post-login capability/route information.
- [ ] L-K-05 Test QR expiry, revocation, malformed/manual input and selected-school mismatch.

### Batch exit gate (must pass before next batch)

- First-time school connection and role-based launch works securely without UI drift.

---

## Batch M — Full Integration, Security, Performance & Data Recovery

**Goal:** Validate the assembled product using synthetic data before any pilot school.

### Your microtasks

- [ ] M-K-01 Remove debug routes/logging and enforce production-safe configuration defaults.
- [ ] M-K-02 Review database indexes against actual report/list/filter queries.
- [ ] M-K-03 Add pagination and limits to all material lists/exports.
- [ ] M-K-04 Verify transactions/audit events across attendance, marks, fees and provisioning.
- [ ] M-K-05 Run schema migration from an empty synthetic database and upgrade path test.

### Batch exit gate (must pass before next batch)

- No critical security, isolation, data-integrity, backup/restore or UI-lock defect remains open.
- All results are evidenced, not claimed.

---

## Batch N — Pilot Release, Monitoring & Handover

**Goal:** Deploy safely to one pilot school and prepare support/handover.

### Your microtasks

- [ ] N-K-01 Create environment-specific config checklist with secrets outside source control.
- [ ] N-K-02 Run dedicated pilot-school provisioning with approved owner supervision.
- [ ] N-K-03 Apply migrations and verify health checks.
- [ ] N-K-04 Configure safe application/database error logging and monitoring hooks.
- [ ] N-K-05 Document rollback and migration-recovery procedure.

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
