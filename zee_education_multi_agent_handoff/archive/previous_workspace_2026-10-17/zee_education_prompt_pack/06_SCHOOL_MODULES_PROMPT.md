# Prompt 06 — School Core Modules

Use the Master Context, approved schema/API and RBAC matrix. Connect the existing School Dashboard to persisted, permission-checked data in small vertical slices. Do not keep a demo toast that implies a record was saved when it was not.

## Suggested delivery order

1. School settings, academic years, classes, sections and subjects.
2. Student profiles, guardian links, enrollment, staff/teacher profiles and teacher assignments.
3. Daily attendance: class/date selection, Present/Absent/Leave, duplicate protection, correction history, teacher submission and approved parent-facing absence information.
4. Assessments/results: teacher draft marks, validation, School Admin review, publication, result locking/history and parent/student view only after publication.
5. Timetable, homework/assignments and notices.
6. Admissions/enquiries and public-school content, where approved.

## Required behavior per module

- UI → API → database mapping and server-side permission checks.
- Validation, loading/empty/error/success states and meaningful feedback.
- Accessible desktop/mobile/RTL layouts.
- Search, filtering, pagination and safe sorting for growing lists.
- Audit events for sensitive record/change/publication actions.
- Dedicated school database only; no cross-school lookup.
- Unit, integration and role/tenant negative tests.

For each delivered slice, report acceptance criteria, migration/API changes, UI changes, tests/build and limitations. Do not add online payments, automated WhatsApp or SMS in this prompt.
