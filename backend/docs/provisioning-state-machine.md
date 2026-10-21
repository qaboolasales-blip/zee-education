# Provisioning State Machine & Domain Rules

## School Code Rules (C-K-02)
- school_code: Unique, 3-50 chars, alphanumeric + hyphens/underscores
- Uniqueness enforced at database level
- No PII in codes
- Server-side validation only

## Domain Rules (C-K-02)
- Domains verified and stored in school_domains table
- Each school can have multiple domains; one primary
- Validation of domain format server-side
- No automatic trust of client input

## Provisioning State Machine (C-K-03)
States: `requested`, `validating`, `creating`, `migrated`, `seeded`, `completed`, `failed`
- requested → validating (validation started)
- validating → creating (validation passed)
- creating → migrated (DB created, migrations applied)
- migrated → seeded (seed safe defaults only)
- seeded → completed (provisioning complete)
- Any state → failed (on error with sanitized error message)
- failed → validating (retry allowed - idempotent)

## Security
- Protected - Super Admin only (C-K-09)
- Credentials never logged
- Idempotent retries (C-K-08)
  - DB level: migration `2026-10-20_000016` puts a UNIQUE `idempotency_key`
    on `provisioning_jobs`, so a duplicated job key is rejected by MySQL
    itself (error 1062); repeated NULL keys remain allowed
  - App level: `school_code` duplicate POST returns 409 with the existing
    school id; re-provision of a `completed` school is a no-op reporting
    `Already provisioned`
- No student data in seeds (C-K-07)
- Dedicated DB per school (separate from control plane)

## Constraints
- Works within hosting constraints; shared hosting considerations documented (C-K-05)
- Validation without logging connection strings/passwords (C-K-04)
