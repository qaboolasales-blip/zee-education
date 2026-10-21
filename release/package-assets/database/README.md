# Database directory

**This folder intentionally contains no database dump and no `.sql` file.**

Shipping a real data dump would mean shipping one school's real student, guardian, staff,
fee or attendance data to every buyer. That is not acceptable, so no dump is included.

---

## How the database gets created

The database is created **by you** in your hosting panel, and the schema is created by the
installer's migration system.

### 1. You create the databases

| Database | Who creates it | Holds |
|---|---|---|
| Control plane | You, in hPanel | School records, installations, commercial records, users |
| One per school | You, in hPanel | That school's students, guardians, staff, attendance, results, fees |

### 2. The application creates the tables

The first-run installer runs migrations automatically in this fixed order:

```
1. CodeIgniter\Shield     -> authentication tables
2. CodeIgniter\Settings   -> settings table
3. App                    -> schools, domains, provisioning, audit, commercial
```

School databases get their schema when the school is provisioned, using a separate
migration namespace (`AppSchool`) that only ever runs against that school's own database.

---

## Do not run these by hand

```bash
php spark migrate --all
```

**Never use `--all`.** It searches every registered migration namespace, including the
school one, and will try to create student and attendance tables inside your **control-plane
database**.

Always run the three explicit commands:

```bash
php spark migrate -n "CodeIgniter\Shield"
php spark migrate -n "CodeIgniter\Settings"
php spark migrate -n "App"
```

To inspect what has run:

```bash
php spark migrate:status
```

To undo the control-plane migrations:

```bash
php spark migrate:rollback -n "App"
```

---

## What you should see

**Control plane — about 21 tables:**

```
auth_groups_users      auth_identities        auth_logins
auth_permissions_users auth_remember_tokens   auth_token_logins
commercial_agreements  license_invoices       license_payments
license_plans          migrations             platform_audit_events
provisioning_jobs      school_db_credentials  school_domains
school_invites         school_licenses        schools
settings               user_school_access     users
```

There must be **no** `students`, `attendance`, `marks_entries` or `fee_invoices` table here.

**School database — about 22 tables:**

```
academic_sessions  assessments    attendance     classes
enrollments        fee_invoices   fee_receipts   guardians
homework           marks_entries  migrations     notices
print_templates    report_definitions           school_settings
sections           staff         students       student_guardian
subjects           teacher_assignments           timetables
```

There must be **no** `users` or `schools` table here.

If either of those rules is broken, stop and contact your provider.