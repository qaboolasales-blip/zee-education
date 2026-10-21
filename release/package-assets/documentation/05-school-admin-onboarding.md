# 05 — School Admin onboarding

This guide is for the **School Admin** of one school.

A School Admin works inside **their own school's database only**. They cannot see, and
cannot be shown, any other school's data.

---

## What a School Admin can do

| Can | Cannot |
|---|---|
| Manage their own school profile | See other schools |
| Manage classes, sections and subjects | Touch the control plane |
| Manage students, guardians and staff | Create databases or change server settings |
| Record attendance | See or edit platform commercial records |
| Enter marks and publish results | See provisioning credentials |
| Create manual fees and receipts | Change roles or permissions they do not own |
| View reports and print | Bypass the role system |

Least privilege is enforced in code by role filters, not only hidden in the interface.

---

## First sign-in

1. The Super Admin creates your account and gives you the **School Admin** role, tied to
   your school.
2. You receive the sign-in link and set your password.
3. Sign in.

If you were not created, or you land on an empty panel, contact your provider. Do not share
accounts — every login is recorded.

---

## Your first configuration tasks

Work through these in order. Each affects how the rest behaves.

### 1. School settings

- School display name
- Logo (the platform only stores the file path; your branding never overwrites the
  approved platform design)
- Address, contact email and phone
- Timezone and currency

### 2. Academic year and classes

1. Create the **academic session** (e.g. `2026-2027`).
2. Create **classes** (e.g. Grade 6, Grade 7).
3. Create **sections** inside each class (e.g. A, B).
4. Create **subjects**.

Sections matter: students, attendance, marks and timetables all attach to a section.

### 3. People

- **Staff / teachers** — staff record with their employee number.
- **Students** — with an admission number. Admission numbers are unique inside your school.
- **Guardians** — linked to their children.
- Enrol students into a section.

### 4. Attendance

Record Present / Absent / Leave per student per day, per section.

### 5. Marks and results

1. Create assessments for a class/section/subject.
2. Teachers enter marks.
3. School Admin reviews.
4. Publish results so parents and students can see them.

### 6. Fees

1. Create fee invoices (manual only — no payment gateway in this version).
2. Record source, mode and reference.
3. Record receipts against invoices.
4. Apply only approved discounts or fines.

### 7. Communication

Notices, homework and role-scoped messages.

### 8. Reports

Reports with print and PDF/CSV export.

---

## Printing and templates

Built-in print templates are included and free to use. Custom design work arranged with your
provider is a one-time charge, and reprints of an approved design are not charged again.

---

## Mobile access

The platform works in a mobile browser. There is **no native app store build** in this
version.

---

## If something looks wrong

| Symptom | Do this |
|---|---|
| Empty lists everywhere | Check the academic session is set for the current year. |
| Cannot see a student you added | Check the student is enrolled in a section. |
| Marks do not appear | Confirm the assessment belongs to the right class/section/subject. |
| Pages fail with 500 | Ask your host for `writable/logs` contents, then contact your provider. |
| You cannot reach another school's data | This is expected and correct behaviour. |

---

**Roman Urdu quick note:** Pehle academic year aur classes/sections banayein, phir students
aur staff, phir attendance, marks aur fees. School Admin sirf apne school ka data dekhta
hai — doosre school ka bilkul nahi.