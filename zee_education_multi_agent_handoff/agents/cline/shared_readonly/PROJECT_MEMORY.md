# Zee Education — Shared Project Memory

## Confirmed decisions

- Product: Zee Education school-management system for Pakistan.
- Backend: CodeIgniter 4 on PHP 8.2+.
- Database: MySQL/MariaDB.
- Local environment: Windows + Laragon; Composer and Node.js LTS are required.
- Mobile path: responsive web/PWA first; native package is a later decision.
- Deployment model: Super Admin platform control plane plus a dedicated installation and dedicated database per school.
- UI references are approved and pixel-locked. Current visual layout must not change without direct owner instruction.

## Roles

- Super Admin
- School Admin
- Teacher
- Parent/Guardian
- Student

Least privilege is mandatory. Parents only see linked children; teachers only use assigned class/subject data; school users only use their school; Super Admin does not browse learner data by default.

## V1 modules

- School/class/section/subject setup.
- Student/guardian, staff/teacher profiles and assignments.
- Attendance: Present, Absent, Leave.
- Teacher marks → School Admin review → published results.
- Manual fees, source/mode/reference, receipt, approved discounts/fines.
- Timetable, homework, notices, role-scoped messages.
- Admissions/website enquiry as approved in later module phase.
- Reports, secure PDF/Excel/CSV exports and print templates.
- School mobile/PWA role views.
- Super Admin installations, commercial records, renewals, support and templates.

## Commercial rules

- Setup/installation: one-time.
- First-year license, renewal license and hosting/domain: separate line items.
- Prices are negotiated per school; no public hard-coded pricing.
- Starter/Growth/Complete are proposed plan labels.
- Built-in print templates are free; Super Admin custom design is charged once; approved reprints have no second design charge.

## Explicit V1 exclusions

- SMS.
- Online payment gateway.
- Unofficial/QR WhatsApp Web automation.
- Automated WhatsApp Business API.
- Native app store packaging.

## Data/security rules

- Never use a shared school/student table with only `tenant_id` in place of the dedicated-database requirement.
- Never trust browser-supplied school ID for authorization.
- Use strict CORS allowlists for authenticated APIs; never `Access-Control-Allow-Origin: *` there.
- Use transactions for critical multi-record writes.
- License expiry cannot delete, hide or make school data inaccessible/export-blocked.
- No real student data, secrets, `.env` passwords or production credentials in source/tests/logs.
