# Prompt 05 — Database, API Contracts and Migrations

Use the approved architecture, RBAC design and Master Context. Model schema/API first; obtain review before destructive migrations.

## Model only approved V1 needs

School-local entities can include: academic year, class, section, subject, student, guardian, student-guardian relationship, staff/teacher, enrollment, attendance session/entry, assessment/exam, marks, review/publication event, fee invoice/charge, discount/fine where approved, manual payment/receipt, timetable slot, homework/assignment, notice, admission enquiry/application, report/export job, print-template reference and audit event.

Control-plane entities can include: school installation, domain/code status, plan/add-on assignment, negotiated quote/rates, renewal, support ticket, provisioning job, template catalogue/approval and platform audit event.

## Requirements

- Preserve separate per-school databases and a separate control-plane store per approved architecture.
- Provide ERD, data dictionary, ownership, lifecycle/status states, constraints, indexes and access policies.
- Use precise monetary storage (integer minor units or explicitly documented decimal approach), not floats. Display PKR.
- Store timestamps consistently; default school timezone Asia/Karachi but make school timezone explicit/configurable as approved.
- Provide OpenAPI or equivalent API contract: request/response examples, pagination, filtering, validation, error format, idempotency and permissions.
- Migrations must be versioned, observable, safe across newly provisioned and existing school databases, with forward-fix/rollback strategy and backup-before-risky-migration rule.
- Avoid raw concatenated SQL, cross-school query paths and real PII test data.

## Deliverables

1. ERD and data dictionary for review.
2. API contract and endpoint-to-role matrix.
3. Migration/versioning/provisioning plan.
4. Synthetic seed data policy.
5. Migration, API validation and tenant-isolation test plan.

Implement only after schema/API approval; then deliver one vertical slice at a time.
