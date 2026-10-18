# Prompt 04 — Authentication, RBAC and Security

Use `00_MASTER_CONTEXT_PROMPT.md` and the approved architecture. Implement only after tenant/identity topology is approved.

## Required roles

- **Super Admin:** platform installations, plan/add-on records, negotiated commercial data, templates, platform support and audited operations.
- **School Admin:** only own school records/settings, result approval/publication and school operations.
- **Teacher:** only assigned classes/subjects and allowed attendance/marks actions; no result publication unless explicitly permitted.
- **Parent/Guardian:** only explicitly linked children and approved parent-facing information.
- **Student:** only own permitted timetable, homework, attendance and published results.

## Requirements

1. Produce a full role-action permission matrix before implementation.
2. Resolve school context from authenticated server-side installation/session mapping, not from an untrusted request `schoolId`.
3. Enforce authorization in services/API/data layer—not only by hiding UI.
4. Secure login/logout, password reset, session expiry/revocation, anti-enumeration behavior, rate limiting and account lifecycle.
5. Recommend MFA for Super Admin; ask owner approval for policy/rollout before requiring it.
6. Define safe cookie/token, CSRF/CORS and secrets strategy according to approved architecture.
7. Protect exports, attachments, print files and QR connection flows with tenant-aware authorization.
8. Write audit events for sensitive changes but avoid logging tokens, passwords and unnecessary student PII.
9. Use synthetic fixtures only.

## Tests required

- Permitted access per role.
- Parent denied access to unlinked child.
- Teacher denied actions outside assigned class/subject.
- Cross-school read/write/export/file access denied.
- Expired/revoked session handling.
- QR token replay/expiry/revocation behavior.

Deliver permission matrix, threat summary, implementation and tests. Do not claim a menu is secure because it is hidden.
