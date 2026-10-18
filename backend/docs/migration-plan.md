# Migration Plan — Control Plane Entities

Scope: only control-plane entities. School-local schema lives in each school's dedicated database and is outside this plan.

## Entities and rationale

### 1. `schools`

Base entity. One row per school installation.

Columns:
- `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `name` VARCHAR(191) NOT NULL
- `status` ENUM('pending','active','suspended','decommissioned') NOT NULL DEFAULT 'pending'
- `plan_code` VARCHAR(64) NULL
- `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Karachi'
- `currency` VARCHAR(8) NOT NULL DEFAULT 'PKR'
- `locale` VARCHAR(8) NOT NULL DEFAULT 'en'
- `created_at` DATETIME NOT NULL
- `updated_at` DATETIME NOT NULL

Rationale: status drives lifecycle; plan_code references commercial plan without storing pricing.

### 2. `school_domains`

Verified hostnames for each school. One school may have multiple domains; one is primary.

Columns:
- `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `school_id` BIGINT UNSIGNED NOT NULL
- `domain` VARCHAR(191) NOT NULL
- `is_primary` TINYINT(1) NOT NULL DEFAULT 0
- `verified_at` DATETIME NULL
- `created_at` DATETIME NOT NULL

Index: `uq_school_domain` on (school_id, domain). FK to schools.

### 3. `provisioning_jobs`

Tracks installation and lifecycle operations for a school.

Columns:
- `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `school_id` BIGINT UNSIGNED NOT NULL
- `type` ENUM('install','migrate','suspend','resume','decommission') NOT NULL
- `status` ENUM('pending','running','completed','failed') NOT NULL DEFAULT 'pending'
- `target_database` VARCHAR(191) NOT NULL
- `attempts` INT UNSIGNED NOT NULL DEFAULT 0
- `error_message` TEXT NULL
- `started_at` DATETIME NULL
- `completed_at` DATETIME NULL
- `created_at` DATETIME NOT NULL

FK to schools. No credential columns — connection details are encrypted and stored separately per ADR-108.

### 4. `platform_audit_events`

Immutable audit log for control-plane actions.

Columns:
- `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `actor_type` ENUM('super_admin','system','installer') NOT NULL
- `actor_id` BIGINT UNSIGNED NULL
- `action` VARCHAR(64) NOT NULL
- `target_type` VARCHAR(64) NOT NULL
- `target_id` BIGINT UNSIGNED NULL
- `ip_address` VARCHAR(45) NULL
- `created_at` DATETIME NOT NULL

No PII beyond actor id and IP. Append-only: no UPDATE or DELETE allowed in application code.

## Migration order

1. `schools`
2. `school_domains` (depends on schools)
3. `provisioning_jobs` (depends on schools)
4. `platform_audit_events` (independent, but after schools for clarity)

## Local verification

Run against a synthetic local database only:

```bash
cd backend
php spark migrate
```

Expected output: 4 migrations applied, `migrations` table contains 4 rows.

## Notes

- All tables use `utf8mb4` charset and `utf8mb4_unicode_ci` collation.
- No school-local tables (students, attendance, fees, etc.) are created here.
- Each school's dedicated database is provisioned by the Phase P3 installer and is not represented in these migrations.