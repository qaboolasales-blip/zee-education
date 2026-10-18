# Prompt 09 — Reports, Print Templates and Exports

Use the Master Context, approved RBAC/API/schema and existing design rules. Implement reporting and printing as secure, repeatable server-side workflows where sensitive data is involved.

## Required V1 behavior

- Forms/records are saved first. User may then preview, print, download PDF and reprint authorized records.
- Built-in free templates: admission/student form, teacher form, student ID card and result card (final list owner-approved).
- Per-school branding: logo, colors, visible fields, signatures and seals where approved.
- Super Admin-only custom template workflow: school supplies reference/sample; Super Admin creates approved HTML/CSS template; one-time charge tracked; same approved template can be reprinted with no second design charge.
- Full-page static image must not be the primary template mechanism. Use HTML/CSS with controlled variables; images can be background/logo/seal assets.
- Reports: attendance, fee/manual payment, results, student/staff lists and approved operational reports. PDF/Excel/CSV exports only where role permissions permit.

## Security and reliability

- Tenant-aware data queries; export/download URL must require authenticated authorization every time.
- Escape/sanitize template variables and custom HTML/CSS. Avoid arbitrary customer JavaScript and server-side template injection.
- Add watermark/status draft where needed; prevent publishing draft results as final documents.
- Use queued/export-job status for heavy reports and show clear success/failure states.
- Log who generated/downloaded sensitive reports and when.
- Test print CSS on typical paper/card sizes, mobile preview, Urdu RTL and long names.

Deliver template data contract, variable whitelist, file-storage policy, approval/billing flow, export APIs and tests before adding arbitrary template editing.
