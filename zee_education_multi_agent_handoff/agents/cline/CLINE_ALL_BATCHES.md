# Zee Education — Cline Complete Batch Plan

This is the only all-batches roadmap for **Cline**. Read this file together with your agent packet before every new batch.

## Your permanent boundary
- You may write only `quality/**`, `ops/**` and your own tracker/status file.
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

- [ ] C-00.1 Audit current executable code vs static prototypes.
- [ ] C-00.2 Hash the three reference UI files.
- [ ] C-00.3 Write desktop/tablet/mobile visual regression checklist.
- [ ] C-01.1 Write role/permission matrix.
- [ ] C-01.2 Write tenant-isolation negative-test matrix.
- [ ] C-01.3 Write security threat model.
- [ ] C-02.1 Write Windows/Laragon preflight checklist.
- [ ] C-02.2 Write backup/restore runbook with no invented SLA numbers.
- [ ] C-02.3 Write release gates.
- [ ] C-03.1 Review real health/setup contract or mark it blocked.
- [ ] C-03.2 Write report/status.

### Batch exit gate (must pass before next batch)

- CodeIgniter foundation starts locally with `/health` and `/setup` tests passing, or exact environment blockers are recorded.
- Frontend API client/formatter tests pass.
- QA, security, UI-lock and operations baseline exists.
- No approved reference UI hash changed.

---

## Batch B — Identity, Roles & Session Security

**Goal:** Implement secure platform identity and role enforcement before any school data module.

### Your microtasks

- [ ] B-C-01 Convert role matrix into test cases for every role.
- [ ] B-C-02 Create tests/checklist for login brute-force handling, password reset, session fixation and logout.
- [ ] B-C-03 Create unauthorized/forbidden route test cases.
- [ ] B-C-04 Review CORS/session cookie/security-header settings after implementation.
- [ ] B-C-05 Execute actual auth negative tests and report only real results.

### Batch exit gate (must pass before next batch)

- Every role has server-side policy tests.
- Browser cannot self-assign a role/school.
- Login/logout/session-expiry behaviors are tested.
- No UI change occurred.

---

## Batch C — Super Admin School Registry & Dedicated Provisioning

**Goal:** Allow Super Admin to register a school and provision one dedicated installation/database safely. This is not a shared-tenant school-data model.

### Your microtasks

- [ ] C-C-01 Create provisioning abuse/failure test matrix.
- [ ] C-C-02 Create dedicated-database verification checklist: separate credentials, migration history, backups and no cross-school schema/data reuse.
- [ ] C-C-03 Test or review retry/idempotency behavior with synthetic failure scenario.
- [ ] C-C-04 Verify provisioning audit records do not reveal secrets.
- [ ] C-C-05 Verify manual school code and QR flow do not reveal school data before authentication.

### Batch exit gate (must pass before next batch)

- A synthetic school can be provisioned into a separate local database safely.
- A retry cannot silently create inconsistent duplicate data.
- No school-local student table exists in the control-plane database.

---

## Batch D — School Setup, Academic Structure & Assignment Boundaries

**Goal:** Implement each school’s independent foundation: branding/settings, sessions, classes, sections, subjects and staff assignment rules.

### Your microtasks

- [ ] D-C-01 Create settings/upload validation test matrix.
- [ ] D-C-02 Create school-local database connection/isolation verification cases.
- [ ] D-C-03 Test teacher cannot edit unassigned academic records.
- [ ] D-C-04 Run UI-lock comparisons after data binding.

### Batch exit gate (must pass before next batch)

- A school can configure its safe basics and academic structure in its own database.
- Teacher assignment scope is enforceable server-side.
- Uploaded logo controls are tested.

---

## Batch E — People: Students, Guardians, Staff & Enrollment

**Goal:** Build complete but privacy-safe people records and enrollment lifecycle in the dedicated school database.

### Your microtasks

- [ ] E-C-01 Execute parent-to-child and teacher-to-assignment access negative tests.
- [ ] E-C-02 Test guessed student ID and cross-school database denial.
- [ ] E-C-03 Review PII masking in logs/errors/exports.
- [ ] E-C-04 Verify archive/withdraw does not corrupt historical records.

### Batch exit gate (must pass before next batch)

- School can maintain students, guardians, staff and enrollment history.
- Privacy/role/isolation tests pass using synthetic data.

---

## Batch F — Attendance

**Goal:** Provide daily attendance with Present, Absent and Leave, scoped by class/section and role.

### Your microtasks

- [ ] F-C-01 Execute duplicate/forbidden/cross-school attendance tests.
- [ ] F-C-02 Verify corrections are traceable and not silently destructive.
- [ ] F-C-03 Verify parent sees only linked child attendance.
- [ ] F-C-04 Run visual UI-lock regression review.

### Batch exit gate (must pass before next batch)

- Attendance is correct, scoped, auditable and role-safe.

---

## Batch G — Timetable, Homework, Notices & Manual PDF Sharing

**Goal:** Deliver daily academic communication without SMS, automated WhatsApp or payment services.

### Your microtasks

- [ ] G-C-01 Test timetable collision and teacher/class isolation cases.
- [ ] G-C-02 Test notices by audience and expiry.
- [ ] G-C-03 Verify PDF authorization and temporary-file cleanup policy.
- [ ] G-C-04 Verify only manual user-initiated share is present.

### Batch exit gate (must pass before next batch)

- Timetable, homework and notices function per role.
- PDF sharing stays within the agreed manual V1 boundary.

---

## Batch H — Assessments, Marks, Review & Results

**Goal:** Implement the full protected result lifecycle: teacher entry → School Admin review → publish.

### Your microtasks

- [ ] H-C-01 Execute teacher scope, admin review and early-publication negative tests.
- [ ] H-C-02 Test calculation edge cases and audit history.
- [ ] H-C-03 Verify parent/student cannot access draft/reviewed results.
- [ ] H-C-04 Run UI lock checks around all result screens.

### Batch exit gate (must pass before next batch)

- Only reviewed/published results reach parent/student views.
- Results are accurate, traceable and export-protected.

---

## Batch I — Manual Fees, Receipts, Discounts & Fines

**Goal:** Provide an auditable manual fee workflow without online payment gateway.

### Your microtasks

- [ ] I-C-01 Execute transaction/duplicate/rounding/manual-reference test cases.
- [ ] I-C-02 Verify audit trail for discounts, fines, voids and corrections.
- [ ] I-C-03 Verify fee access scope and export authorization.
- [ ] I-C-04 Test receipt uniqueness under controlled concurrent requests if environment allows.

### Batch exit gate (must pass before next batch)

- Manual fee and receipt records are consistent, auditable and role-protected.
- No online payment feature has been added.

---

## Batch J — Reports, Exports & Print Templates

**Goal:** Produce role-safe operational reports and owner-controlled print templates.

### Your microtasks

- [ ] J-C-01 Test export field minimization and cross-school denial.
- [ ] J-C-02 Test direct URL download authorization and expiry.
- [ ] J-C-03 Verify custom-template Super Admin-only rule and no reprint double-charge behavior.
- [ ] J-C-04 Review export logs for PII/secrets.

### Batch exit gate (must pass before next batch)

- Exports are secure and role/school scoped.
- Template commercial rules are enforced accurately.

---

## Batch K — Super Admin Commercial, License, Renewal & Support

**Goal:** Complete Super Admin operational controls without putting school data at risk.

### Your microtasks

- [ ] K-C-01 Verify no public hard-coded pricing is exposed.
- [ ] K-C-02 Test renewal reminder duplicate/retry behavior.
- [ ] K-C-03 Verify expiry cannot delete/hide/block school-owned data and exports.
- [ ] K-C-04 Test support-access auditability and default-deny learner-data access.

### Batch exit gate (must pass before next batch)

- Commercial/licensing records work per school and expiry safeguards protect school data.

---

## Batch L — Mobile/PWA Connection, Role Launch & Resilience

**Goal:** Finalize the universal mobile/PWA flow: school selection once, authentication, automatic role experience and safe resilience.

### Your microtasks

- [ ] L-C-01 Test QR replay/expiry/revocation/rate-limit risks.
- [ ] L-C-02 Test school selection cannot be changed by client tampering after authentication.
- [ ] L-C-03 Test each mobile role sees only its permitted features/data.
- [ ] L-C-04 Perform mobile UI-lock comparison and keyboard/accessibility checks.

### Batch exit gate (must pass before next batch)

- First-time school connection and role-based launch works securely without UI drift.

---

## Batch M — Full Integration, Security, Performance & Data Recovery

**Goal:** Validate the assembled product using synthetic data before any pilot school.

### Your microtasks

- [ ] M-C-01 Execute full role, tenant-isolation, authorization and export test matrix.
- [ ] M-C-02 Execute backup and restore drill against synthetic school database.
- [ ] M-C-03 Conduct dependency/security configuration review.
- [ ] M-C-04 Execute performance smoke tests for critical lists, attendance, results and exports.
- [ ] M-C-05 Write prioritized defects and release-blocker report.

### Batch exit gate (must pass before next batch)

- No critical security, isolation, data-integrity, backup/restore or UI-lock defect remains open.
- All results are evidenced, not claimed.

---

## Batch N — Pilot Release, Monitoring & Handover

**Goal:** Deploy safely to one pilot school and prepare support/handover.

### Your microtasks

- [ ] N-C-01 Execute pilot acceptance checklist with synthetic then owner-approved pilot data.
- [ ] N-C-02 Verify backup schedule configuration and one supervised restore-readiness check.
- [ ] N-C-03 Verify incident/support contact path and audit log collection.
- [ ] N-C-04 Produce pilot go/no-go report with evidence and known non-blocking limitations.

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
