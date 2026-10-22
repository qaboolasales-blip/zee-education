# Zee Education — Complete Batch-by-Batch Execution Plan

This is the master sequence for KiloCode, OpenCode and Cline. **Only one batch is active at a time.** All three agents may work on the active batch concurrently, but only in their assigned directories and separate Git worktrees.

## Permanent rules for every batch

1. Merge and tag the prior batch before starting the next one.
2. Run UI-reference hash verification before and after every merge. The three approved HTML references must stay byte-for-byte unchanged.
3. KiloCode writes only `backend/**`; OpenCode writes only `frontend/**`; Cline writes only `quality/**` and `ops/**`.
4. No agent may redesign, reformat, copy-over, or modify the approved UI. Missing UI capability is a documented blocker, never a reason to add a visible component.
5. Every microtask must produce a real file, real test, documented decision, or honest blocker. No dummy completion.
6. No production credentials or personal school data in code, test fixtures, commits or reports.
7. At the end of a batch, obtain all three reports, review the changed-file lists, run checks, then merge in order: **KiloCode → OpenCode → Cline**.
8. Never start the next batch from a verbal “done”; start only after its exit gate passes.

---

# Batch 0 — Coordination Setup (completed)

## Goal

Prepare strict agent ownership, UI lock and reference material before production coding.

## Completed

- [x] Three approved UI references copied for each agent.
- [x] 100% pixel-identical UI lock and hashes documented.
- [x] KiloCode, OpenCode and Cline have isolated packet/rule/memory/task files.
- [x] Prior workspace material archived.
- [x] VS Code copy-paste prompts prepared.

## Exit gate

- [x] Each agent has received only its matching prompt and handoff folder.

---

# Batch A — Foundation, Contracts & Quality Baseline (ACTIVE NOW)

## Goal

Create a safe CodeIgniter foundation, a non-visual frontend integration base and an independent QA/operations baseline. No business module or UI redesign is allowed.

## KiloCode microtasks

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

## OpenCode microtasks

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

## Cline microtasks

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

## Exit gate

- CodeIgniter foundation starts locally with `/health` and `/setup` tests passing, or exact environment blockers are recorded.
- Frontend API client/formatter tests pass.
- QA, security, UI-lock and operations baseline exists.
- No approved reference UI hash changed.

---

# Batch B — Identity, Roles & Session Security

## Goal

Implement secure platform identity and role enforcement before any school data module.

## KiloCode microtasks

- [ ] B-K-01 Choose and document the CodeIgniter-compatible authentication implementation; record package/version/license/security rationale.
- [ ] B-K-02 Create platform-user migration/model with secure password handling and no role trust from client input.
- [ ] B-K-03 Create role/permission migration/model/policy: Super Admin, School Admin, Teacher, Parent/Guardian, Student.
- [ ] B-K-04 Define session/token lifecycle, logout, expiry, password reset and lockout rules.
- [ ] B-K-05 Implement login/logout/current-session endpoints.
- [ ] B-K-06 Enforce server-side role policy middleware/filters.
- [ ] B-K-07 Add audit event for successful/failed sensitive authentication events without logging secrets.
- [ ] B-K-08 Publish auth API contract and run authentication/authorization tests.

## OpenCode microtasks

- [ ] B-O-01 Read the published auth contract; compare it with existing locked login-related UI hooks.
- [ ] B-O-02 Add non-visual secure session storage strategy only after contract review; do not expose tokens in logs.
- [ ] B-O-03 Add API-client auth headers/refresh/error behavior based on the real contract.
- [ ] B-O-04 Add role-route guard logic that selects only existing approved screens.
- [ ] B-O-05 Test no-session, expired-session, forbidden-role and logout states without changing UI layout.
- [ ] B-O-06 Record any required missing UI hook as a blocker, not a new UI element.

## Cline microtasks

- [ ] B-C-01 Convert role matrix into test cases for every role.
- [ ] B-C-02 Create tests/checklist for login brute-force handling, password reset, session fixation and logout.
- [ ] B-C-03 Create unauthorized/forbidden route test cases.
- [ ] B-C-04 Review CORS/session cookie/security-header settings after implementation.
- [ ] B-C-05 Execute actual auth negative tests and report only real results.

## Exit gate

- Every role has server-side policy tests.
- Browser cannot self-assign a role/school.
- Login/logout/session-expiry behaviors are tested.
- No UI change occurred.

---

# Batch C — Super Admin School Registry & Dedicated Provisioning

## Goal

Allow Super Admin to register a school and provision one dedicated installation/database safely. This is not a shared-tenant school-data model.

## KiloCode microtasks

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

## OpenCode microtasks

- [ ] C-O-01 Map existing Super Admin installation/setup UI elements to provisioning contract fields.
- [ ] C-O-02 Map existing mobile QR/manual school connection elements to real-school-code payload requirements.
- [ ] C-O-03 Add non-visual QR payload parser/validator with expiry/signature contract placeholders only after backend contract exists.
- [ ] C-O-04 Add API adapter calls for school registry/provisioning using existing UI hooks only.
- [ ] C-O-05 Test malformed QR/manual code/expired code/error normalization with synthetic payloads.
- [ ] C-O-06 Record any absent UI hook; no UI additions.

## Cline microtasks

- [ ] C-C-01 Create provisioning abuse/failure test matrix.
- [ ] C-C-02 Create dedicated-database verification checklist: separate credentials, migration history, backups and no cross-school schema/data reuse.
- [ ] C-C-03 Test or review retry/idempotency behavior with synthetic failure scenario.
- [ ] C-C-04 Verify provisioning audit records do not reveal secrets.
- [ ] C-C-05 Verify manual school code and QR flow do not reveal school data before authentication.

## Exit gate

- A synthetic school can be provisioned into a separate local database safely.
- A retry cannot silently create inconsistent duplicate data.
- No school-local student table exists in the control-plane database.

---

# Batch D — School Setup, Academic Structure & Assignment Boundaries

## Goal

Implement each school’s independent foundation: branding/settings, sessions, classes, sections, subjects and staff assignment rules.

## KiloCode microtasks

- [ ] D-K-01 Define school-local settings schema: school identity, contact, address, logo path, base theme selection and locale/time zone.
- [ ] D-K-02 Add safe logo upload validation/storage policy; no public arbitrary-file upload.
- [ ] D-K-03 Create academic-session schema and active-session validation.
- [ ] D-K-04 Create class, section and subject schema with unique/active constraints.
- [ ] D-K-05 Create teacher-subject-section assignment schema.
- [ ] D-K-06 Create CRUD endpoints with server-side school connection and role enforcement.
- [ ] D-K-07 Add validation/duplicate/archival tests.
- [ ] D-K-08 Publish contract and audit significant configuration changes.

## OpenCode microtasks

- [ ] D-O-01 Map existing school dashboard settings/academic screens to real fields.
- [ ] D-O-02 Bind settings/academic data only through existing approved elements.
- [ ] D-O-03 Use existing base-color/multicolor theme mechanisms only; never alter visual tokens.
- [ ] D-O-04 Add adapter formatting/validation mapping for school settings.
- [ ] D-O-05 Test empty, duplicate, inactive-session and permission-denied responses.

## Cline microtasks

- [ ] D-C-01 Create settings/upload validation test matrix.
- [ ] D-C-02 Create school-local database connection/isolation verification cases.
- [ ] D-C-03 Test teacher cannot edit unassigned academic records.
- [ ] D-C-04 Run UI-lock comparisons after data binding.

## Exit gate

- A school can configure its safe basics and academic structure in its own database.
- Teacher assignment scope is enforceable server-side.
- Uploaded logo controls are tested.

---

# Batch E — People: Students, Guardians, Staff & Enrollment

## Goal

Build complete but privacy-safe people records and enrollment lifecycle in the dedicated school database.

## KiloCode microtasks

- [ ] E-K-01 Define student profile fields, unique admission number policy and data-retention notes.
- [ ] E-K-02 Define guardian profile/link schema supporting one or more linked children.
- [ ] E-K-03 Define staff/teacher profile and account-link schema.
- [ ] E-K-04 Define academic enrollment schema/history and transfer/withdraw/archive states.
- [ ] E-K-05 Implement validation, duplicate checks and protected CRUD endpoints.
- [ ] E-K-06 Implement parent-child access policy and teacher assignment restrictions.
- [ ] E-K-07 Add synthetic fixtures and tests for links, duplicates, archives and forbidden access.
- [ ] E-K-08 Publish people/enrollment API contracts.

## OpenCode microtasks

- [ ] E-O-01 Map existing School Dashboard/Mobile role screens to student, guardian and staff fields.
- [ ] E-O-02 Create privacy-safe data selectors/formatters; avoid exposing data beyond role needs.
- [ ] E-O-03 Bind existing list/detail areas without layout change.
- [ ] E-O-04 Test zero, one, many children; inactive student; missing photo/contact; forbidden response.
- [ ] E-O-05 Verify mobile role landing chooses only existing approved role experience.

## Cline microtasks

- [ ] E-C-01 Execute parent-to-child and teacher-to-assignment access negative tests.
- [ ] E-C-02 Test guessed student ID and cross-school database denial.
- [ ] E-C-03 Review PII masking in logs/errors/exports.
- [ ] E-C-04 Verify archive/withdraw does not corrupt historical records.

## Exit gate

- School can maintain students, guardians, staff and enrollment history.
- Privacy/role/isolation tests pass using synthetic data.

---

# Batch F — Attendance

## Goal

Provide daily attendance with Present, Absent and Leave, scoped by class/section and role.

## KiloCode microtasks

- [ ] F-K-01 Define attendance date, student, status, source, recorded-by and correction/audit fields.
- [ ] F-K-02 Add uniqueness rule for one attendance record per student/date/session as approved.
- [ ] F-K-03 Implement teacher-assignment scope validation.
- [ ] F-K-04 Implement create/update/correction endpoints with transaction and audit behavior.
- [ ] F-K-05 Implement role-safe attendance views/summary queries.
- [ ] F-K-06 Add tests for duplicate, date boundary, forbidden class and correction history.
- [ ] F-K-07 Publish attendance contract.

## OpenCode microtasks

- [ ] F-O-01 Map existing attendance UI controls/status visuals to Present/Absent/Leave exactly.
- [ ] F-O-02 Bind class/date/student data through existing hooks only.
- [ ] F-O-03 Add safe optimistic/error/retry adapter behavior without visual redesign.
- [ ] F-O-04 Format role-safe attendance summaries using existing cards/charts only.
- [ ] F-O-05 Test empty roster, duplicate submission, no assignment and offline/error responses.

## Cline microtasks

- [ ] F-C-01 Execute duplicate/forbidden/cross-school attendance tests.
- [ ] F-C-02 Verify corrections are traceable and not silently destructive.
- [ ] F-C-03 Verify parent sees only linked child attendance.
- [ ] F-C-04 Run visual UI-lock regression review.

## Exit gate

- Attendance is correct, scoped, auditable and role-safe.

---

# Batch G — Timetable, Homework, Notices & Manual PDF Sharing

## Goal

Deliver daily academic communication without SMS, automated WhatsApp or payment services.

## KiloCode microtasks

- [ ] G-K-01 Define timetable slots, class/section/subject/teacher/location constraints.
- [ ] G-K-02 Validate timetable collision rules.
- [ ] G-K-03 Define homework schema: assignment, due date, attachment policy and class/subject scope.
- [ ] G-K-04 Define notice schema: audience, schedule, expiry and publish workflow.
- [ ] G-K-05 Generate protected downloadable PDFs where approved.
- [ ] G-K-06 Ensure WhatsApp behavior is manual user-initiated share of a generated PDF only; no automation.
- [ ] G-K-07 Test collision, audience, attachment, authorization and manual-share boundaries.
- [ ] G-K-08 Publish communication API contracts.

## OpenCode microtasks

- [ ] G-O-01 Bind timetable/homework/notice data to existing approved areas only.
- [ ] G-O-02 Use existing navigation, drawers and bottom nav; do not add a new menu.
- [ ] G-O-03 Implement manual PDF download/share invocation through existing allowed hooks only.
- [ ] G-O-04 Test no timetable, expired notice, forbidden audience and PDF generation failure.
- [ ] G-O-05 Confirm no UI code calls an unofficial WhatsApp automation API.

## Cline microtasks

- [ ] G-C-01 Test timetable collision and teacher/class isolation cases.
- [ ] G-C-02 Test notices by audience and expiry.
- [ ] G-C-03 Verify PDF authorization and temporary-file cleanup policy.
- [ ] G-C-04 Verify only manual user-initiated share is present.

## Exit gate

- Timetable, homework and notices function per role.
- PDF sharing stays within the agreed manual V1 boundary.

---

# Batch H — Assessments, Marks, Review & Results

## Goal

Implement the full protected result lifecycle: teacher entry → School Admin review → publish.

## KiloCode microtasks

- [ ] H-K-01 Define exam/assessment structure, grading rules and maximum marks validation.
- [ ] H-K-02 Define marks-entry schema with draft/submitted/reviewed/published states.
- [ ] H-K-03 Restrict teacher entry to assigned class/subject.
- [ ] H-K-04 Implement School Admin review/return/approve workflow.
- [ ] H-K-05 Implement result calculation with documented rounding/absent rules.
- [ ] H-K-06 Block parent/student publication access until state is published.
- [ ] H-K-07 Generate protected result/PDF data source.
- [ ] H-K-08 Test invalid marks, unauthorized publish, review return, calculation and publication visibility.
- [ ] H-K-09 Publish result API contract.

## OpenCode microtasks

- [ ] H-O-01 Map existing marks/review/results UI zones to contract fields and status states.
- [ ] H-O-02 Bind teacher draft/review feedback using existing visual states only.
- [ ] H-O-03 Bind published result views/charts without altering chart design.
- [ ] H-O-04 Add safe display for pending/unpublished/no-result using existing approved empty areas.
- [ ] H-O-05 Test role/session/error data mapping.

## Cline microtasks

- [ ] H-C-01 Execute teacher scope, admin review and early-publication negative tests.
- [ ] H-C-02 Test calculation edge cases and audit history.
- [ ] H-C-03 Verify parent/student cannot access draft/reviewed results.
- [ ] H-C-04 Run UI lock checks around all result screens.

## Exit gate

- Only reviewed/published results reach parent/student views.
- Results are accurate, traceable and export-protected.

---

# Batch I — Manual Fees, Receipts, Discounts & Fines

## Goal

Provide an auditable manual fee workflow without online payment gateway.

## KiloCode microtasks

- [ ] I-K-01 Define fee head, academic period, invoice/demand, concession, fine and receipt schema.
- [ ] I-K-02 Define manual payment fields: date, amount, mode, reference and collector.
- [ ] I-K-03 Enforce role approval for discounts/fines/voids/refunds as approved.
- [ ] I-K-04 Use transactions and immutable audit trail for money-impacting writes.
- [ ] I-K-05 Generate unique receipt number/PDF source.
- [ ] I-K-06 Implement due/paid/partial/overdue summaries.
- [ ] I-K-07 Add tests for duplicate receipt, invalid amount, unauthorized discount, void audit and report totals.
- [ ] I-K-08 Publish fees/receipts API contract.

## OpenCode microtasks

- [ ] I-O-01 Bind fee/receipt data only to existing approved UI components.
- [ ] I-O-02 Use PKR formatter and existing color/category accents without visual edits.
- [ ] I-O-03 Bind manual receipt/PDF download/share through existing hooks only.
- [ ] I-O-04 Test partial/overdue/no-fee/forbidden/failed-PDF response mapping.
- [ ] I-O-05 Confirm there is no payment gateway UI or checkout logic.

## Cline microtasks

- [ ] I-C-01 Execute transaction/duplicate/rounding/manual-reference test cases.
- [ ] I-C-02 Verify audit trail for discounts, fines, voids and corrections.
- [ ] I-C-03 Verify fee access scope and export authorization.
- [ ] I-C-04 Test receipt uniqueness under controlled concurrent requests if environment allows.

## Exit gate

- Manual fee and receipt records are consistent, auditable and role-protected.
- No online payment feature has been added.

---

# Batch J — Reports, Exports & Print Templates

## Goal

Produce role-safe operational reports and owner-controlled print templates.

## KiloCode microtasks

- [ ] J-K-01 Inventory each approved report with owner, fields, filters and authorization rules.
- [ ] J-K-02 Implement protected CSV/Excel/PDF export service with memory-safe pagination/limits.
- [ ] J-K-03 Ensure exports are scoped to the connected school database and authorized role.
- [ ] J-K-04 Implement built-in free print-template selection.
- [ ] J-K-05 Implement Super Admin-only custom-template request/approval metadata.
- [ ] J-K-06 Record one-time custom design charge state separately from later reprint events.
- [ ] J-K-07 Implement reprint flow that never adds a second design charge.
- [ ] J-K-08 Test data-scope, template authorization, large export handling and charge/reprint logic.

## OpenCode microtasks

- [ ] J-O-01 Bind existing export/print controls to real authorized endpoints only.
- [ ] J-O-02 Preserve existing template visual designs exactly; do not build a new print designer.
- [ ] J-O-03 Map export/job/download errors to existing feedback areas.
- [ ] J-O-04 Test no-data, forbidden, expired-download and failed-export mapping.

## Cline microtasks

- [ ] J-C-01 Test export field minimization and cross-school denial.
- [ ] J-C-02 Test direct URL download authorization and expiry.
- [ ] J-C-03 Verify custom-template Super Admin-only rule and no reprint double-charge behavior.
- [ ] J-C-04 Review export logs for PII/secrets.

## Exit gate

- Exports are secure and role/school scoped.
- Template commercial rules are enforced accurately.

---

# Batch K — Super Admin Commercial, License, Renewal & Support

## Goal

Complete Super Admin operational controls without putting school data at risk.

## KiloCode microtasks

- [ ] K-K-01 Define commercial agreement records: negotiated rates, setup, first-year, renewal, hosting/domain and add-ons as separate fields.
- [ ] K-K-02 Define plan labels as configurable proposed products, not fixed public prices.
- [ ] K-K-03 Define license state/reminder schedule and communications audit.
- [ ] K-K-04 Implement renewal reminders with safe queue/retry behavior where infrastructure permits.
- [ ] K-K-05 Implement license status visibility.
- [ ] K-K-06 Enforce safe expiry behavior: no deletion, hidden data or blocked data export.
- [ ] K-K-07 Define support ticket and support-access audit model; default deny learner-data browsing.
- [ ] K-K-08 Test negotiated pricing, reminder idempotency, expiry/data access and support authorization.

## OpenCode microtasks

- [ ] K-O-01 Bind existing Super Admin commercial/license/support areas to the real contract only.
- [ ] K-O-02 Display license state with existing approved UI styles only.
- [ ] K-O-03 Bind renewal/support actions to permission-aware adapters.
- [ ] K-O-04 Test missing commercial data, expired state and forbidden support actions.

## Cline microtasks

- [ ] K-C-01 Verify no public hard-coded pricing is exposed.
- [ ] K-C-02 Test renewal reminder duplicate/retry behavior.
- [ ] K-C-03 Verify expiry cannot delete/hide/block school-owned data and exports.
- [ ] K-C-04 Test support-access auditability and default-deny learner-data access.

## Exit gate

- Commercial/licensing records work per school and expiry safeguards protect school data.

---

# Batch L — Mobile/PWA Connection, Role Launch & Resilience

## Goal

Finalize the universal mobile/PWA flow: school selection once, authentication, automatic role experience and safe resilience.

## KiloCode microtasks

- [ ] L-K-01 Finalize school QR payload/signature/expiry/revocation rules.
- [ ] L-K-02 Provide manual school-code/domain lookup endpoint with enumeration/rate-limit protection.
- [ ] L-K-03 Bind selected school to authenticated session server-side.
- [ ] L-K-04 Return role-safe post-login capability/route information.
- [ ] L-K-05 Test QR expiry, revocation, malformed/manual input and selected-school mismatch.

## OpenCode microtasks

- [ ] L-O-01 Bind QR/manual school connection into the existing approved onboarding UI exactly.
- [ ] L-O-02 Store selected-school information only as approved and clear it correctly on logout/school switch.
- [ ] L-O-03 Launch the existing appropriate role experience after login; no new navigation design.
- [ ] L-O-04 Add manifest/install/offline behavior only after owner approves exact offline scope.
- [ ] L-O-05 Verify mobile internal scrollbar remains hidden as approved and accessibility remains usable.
- [ ] L-O-06 Test QR/manual/login/role/error/logout flow on phone widths.

## Cline microtasks

- [ ] L-C-01 Test QR replay/expiry/revocation/rate-limit risks.
- [ ] L-C-02 Test school selection cannot be changed by client tampering after authentication.
- [ ] L-C-03 Test each mobile role sees only its permitted features/data.
- [ ] L-C-04 Perform mobile UI-lock comparison and keyboard/accessibility checks.

## Exit gate

- First-time school connection and role-based launch works securely without UI drift.

---

# Batch M — Full Integration, Security, Performance & Data Recovery

## Goal

Validate the assembled product using synthetic data before any pilot school.

## KiloCode microtasks

- [ ] M-K-01 Remove debug routes/logging and enforce production-safe configuration defaults.
- [ ] M-K-02 Review database indexes against actual report/list/filter queries.
- [ ] M-K-03 Add pagination and limits to all material lists/exports.
- [ ] M-K-04 Verify transactions/audit events across attendance, marks, fees and provisioning.
- [ ] M-K-05 Run schema migration from an empty synthetic database and upgrade path test.

## OpenCode microtasks

- [ ] M-O-01 Execute all role flows against merged real APIs.
- [ ] M-O-02 Verify all loading/error/empty states use existing approved UI behavior only.
- [ ] M-O-03 Verify no external/local development URLs, credentials or debug data remain.
- [ ] M-O-04 Run desktop/tablet/mobile UI regression comparison against references.

## Cline microtasks

- [ ] M-C-01 Execute full role, tenant-isolation, authorization and export test matrix.
- [ ] M-C-02 Execute backup and restore drill against synthetic school database.
- [ ] M-C-03 Conduct dependency/security configuration review.
- [ ] M-C-04 Execute performance smoke tests for critical lists, attendance, results and exports.
- [ ] M-C-05 Write prioritized defects and release-blocker report.

## Exit gate

- No critical security, isolation, data-integrity, backup/restore or UI-lock defect remains open.
- All results are evidenced, not claimed.

---

# Batch N — Pilot Release, Monitoring & Handover

## Goal

Deploy safely to one pilot school and prepare support/handover.

## KiloCode microtasks

- [ ] N-K-01 Create environment-specific config checklist with secrets outside source control.
- [ ] N-K-02 Run dedicated pilot-school provisioning with approved owner supervision.
- [ ] N-K-03 Apply migrations and verify health checks.
- [ ] N-K-04 Configure safe application/database error logging and monitoring hooks.
- [ ] N-K-05 Document rollback and migration-recovery procedure.

## OpenCode microtasks

- [ ] N-O-01 Validate deployed frontend integration uses production relative endpoints.
- [ ] N-O-02 Perform final approved UI comparison in deployed browsers/device widths.
- [ ] N-O-03 Validate manual PDF sharing/download flows in pilot environment.
- [ ] N-O-04 Create concise role onboarding/help text only if it fits existing approved UI or external documentation; no new UI design.

## Cline microtasks

- [ ] N-C-01 Execute pilot acceptance checklist with synthetic then owner-approved pilot data.
- [ ] N-C-02 Verify backup schedule configuration and one supervised restore-readiness check.
- [ ] N-C-03 Verify incident/support contact path and audit log collection.
- [ ] N-C-04 Produce pilot go/no-go report with evidence and known non-blocking limitations.

## Exit gate

- Owner explicitly approves pilot go-live.
- Backup/restore, monitoring, role access and UI lock have evidence.
- Known V1 exclusions remain clearly documented.

---

# After Pilot — Controlled Enhancement Queue

Only after pilot stabilization and owner approval, consider separate planned batches for:

- website/admissions expansion;
- biometric/transport/library/live-class integrations;
- official WhatsApp Business API only with approved consent/template/cost model;
- SMS if commercially approved;
- online payment gateway if commercially approved;
- native store packaging;
- custom school designs through the paid Super Admin controlled workflow.

None of these may be silently added into the V1 batches.
