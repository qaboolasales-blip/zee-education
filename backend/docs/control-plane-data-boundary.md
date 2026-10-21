# Control Plane Data Boundary

Defines which data lives in the Super Admin control plane and which stays in each school's dedicated database.

## Architecture rule (ADR-001)

Every school gets its **own dedicated installation and dedicated database**. The control plane holds only metadata about schools, not their operational data.

A shared table with only a `tenant_id` column is **not** an acceptable substitute without explicit owner approval.

## Control-plane data (this database)

Allowed in `zee_education_control`:

| Entity | Purpose | Contains |
|---|---|---|
| `schools` | School identity and installation record | Name, address, contact, branding, status, plan, domain |
| `school_domains` | Verified hostnames for each school | Domain, verification status, TLS hint |
| `provisioning_jobs` | Installation workflow state | Job type, status, target database name, idempotency key (UNIQUE), timestamps |
| `platform_audit_events` | Immutable audit log | Actor, action, target, IP, timestamp |
| `user_school_access` | Which platform user may operate which school (ADR-003) | User id, school id, role |
| `license_plans` | Seeded plan catalogue — labels only, no pricing | Code, label, sort order |
| `school_licenses` | Per-school licence state | Plan, starts, expires, status, key hash (never the key) |
| `license_invoices` | Licence invoices (issued / paid / void) | School, amount, status, reference |
| `license_payments` | Settled payments against an invoice | Invoice, amount, method, external reference |
| `school_db_credentials` | Encrypted per-school database connection metadata | Encrypted connection fields, no plaintext secrets in logs |
| `school_invites` | Short-lived connect / QR invite tokens | Token hash, expiry, revoked / exhausted flags |
| `migrations` | CI4 migration tracking | Migration name, batch number |
| Shield `auth_*` tables | Sign-in identities, groups, tokens (Shield-owned) | Managed entirely by Shield migrations |
| `commercial_records` | **Documented allowance only — no migration exists.** Superseded for licensing by `license_*` above | (unused) |
| `support_tickets` | **Documented allowance only — no migration exists** | (unused) |

## School-local data (separate database per school)

**Never** stored in the control plane:

- Student / guardian profiles
- Staff / teacher profiles and assignments
- Attendance records
- Academic results
- Fee records, receipts, discounts, fines
- Timetable, homework, notices
- Class, section, subject definitions
- School-specific settings beyond branding

Each school's database is provisioned at install time by the Phase P3 installer wizard. The control plane stores only the connection metadata (encrypted) and installation state.

## Field rationale

### `schools`

- `id` — internal surrogate key, never exposed to browsers
- `name` — school display name
- `status` — active, suspended, decommissioned
- `plan_code` — references commercial plan, not pricing
- `created_at`, `updated_at` — audit timestamps

### `school_domains`

- `school_id` — FK to `schools.id`
- `domain` — verified hostname
- `is_primary` — which domain is the canonical one
- `verified_at` — when verification completed

### `provisioning_jobs`

- `school_id` — FK to `schools.id`
- `type` — install, migrate, suspend, resume, decommission
- `status` — pending, running, completed, failed
- `target_database` — name of the school's dedicated database
- `idempotency_key` — caller-supplied key (e.g. `install:{school_id}`);
  UNIQUE index `uq_provisioning_jobs_idempotency_key` (migration
  `2026-10-20_000016`), nullable — multiple NULLs are allowed, duplicate
  values are rejected by the database
- `error_message` — last failure detail (sanitized, no credentials)

### `platform_audit_events`

- `actor_type` — super_admin, system, installer
- `actor_id` — user id (or null for system events)
- `action` — create, update, delete, provision, suspend
- `target_type` — school, domain, job, commercial_record
- `target_id` — id of the affected record
- `ip_address` — requester IP for abuse investigation
- `created_at` — event timestamp

## Data-safe licensing rule

No licence or expiry mechanism may delete, encrypt, hide or block a school from exporting its own data. Suspension can restrict access but must never destroy or conceal school data.

## Migration order

Migrations must be applied in this order:

1. `schools` — base entity, no dependencies
2. `school_domains` — depends on `schools`
3. `provisioning_jobs` — depends on `schools`
4. `commercial_records` — depends on `schools`
5. `support_tickets` — depends on `schools`
6. `platform_audit_events` — depends on all above (or independent; writes reference other entities)

## See also

- `docs/environment-audit.md`
- `docs/migration-plan.md`
- `docs/api/openapi-v0.md`