# Role onboarding guide — external documentation

N-O-04 permits concise role onboarding/help text only where it fits existing approved
UI or external documentation. Adding help text to the locked screens would be a visual
change, so this guide is **external documentation**, not part of the product UI.

---

## Super Admin

Platform-wide operator. Manages school installations, commercial records and support.

- **Schools & Installs** — the licence status column shows `Active` (green) or
  `Renewal due` (amber); anything else is neutral. A school still being provisioned
  shows a neutral status and `—` for its renewal date.
- **Plans & Add-ons** — proposed plans and separately-quoted add-ons. Custom print
  design is a one-time fee; reprints of an approved design are included.
- **Billing & Renewals** — setup/installation is one-time, licence renewal is annual
  and negotiated per school, hosting/domain is separate. `Prepare reminder` only
  prepares a reminder; email is not connected, so nothing is sent.
- **Support Tickets** — support sees installation health and approved logs. School
  records stay isolated unless an exceptional audited policy is approved. Reading
  approved logs requires an audited reason.
- **Print Templates** — built-in forms are free; a custom design is approved by Super
  Admin only.

## School Admin

Runs one school. Sees only that school's data.

- **Overview** — fees collected, attendance, results and account health.
- **Fees & Accounts** — three tiles (collected this month, outstanding dues, payment
  sources) and the invoice table. Manual receipts record amount, mode (`Cash` or
  `Bank`) and a receipt reference. Online payment is not in V1.
- **Students / Admissions / Staff** — people records for this school only.
- **Reports & Print** — built-in reports and the four free templates (Admission form,
  Teacher form, Student ID card, Result card).
- **Settings** — brand, language, app connection and backup visibility.

## Teacher

Classroom teacher. Sees timetable, attendance, marks, homework, notices, reports and
leave.

- **Attendance** — Present / Absent / Leave, per assigned register. A partially marked
  register cannot be submitted; unmarked students would otherwise be recorded absent.
- **Marks** — draft, then submit for review. Only School Admin may publish.
- **Reports** — teachers may create exports; documents are not on a teacher's tool list.

## Parent

Guardian of linked children. Sees fees, timetable, homework, notices, leave,
messages, calendar and documents.

- **Fees** — `Next fee due` and the `Fee due` tile are compact (`PKR 12.5k`). A missing
  payment reference shows `—`, which means no payment is recorded yet — not a zero
  amount.
- **Documents** — Student ID card, Result card and Admission form. A result card is
  available only once the result is published.
- **Reports** — parents have no `reports` tool; they see documents, not aggregated
  exports.

## Student

Learner. Sees timetable, homework, notices, calendar, messages, leave and documents —
no fees, no reports, no attendance tool.

---

## Universal boundaries

These hold for every role and are enforced in code, not just documented:

- **No online payment gateway in V1.** Fees are recorded manually.
- **Manual PDF sharing only.** A human presses the control; the code never names a
  destination.
- **Server-resolved role.** The browser cannot self-assign a role or a school.
- **Fee records are school-local.** Super Admin never sees a school's fee records.
- **Unpublished results are invisible** to parents and students, even if the server
  sends them.
