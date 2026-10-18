# Provisioning Audit Records — Secret-Leak Review — C-C-04

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-C-04** (Batch C — Verify provisioning audit records do not reveal secrets)
- Created: 2026-10-17
- Method: **real schema review** of the actual migration files (read 2026-10-17), plus **planned runtime checks** for when provisioning writes real rows. Invariant: no credentials/secrets in audit or job records (supports ADR-108 and `security-threat-model.md` BK-2/MIG-3).

## 1. `platform_audit_events` schema (verified from migration 000004)

Columns: `id`, `actor_type` ENUM(`super_admin|system|installer`), `actor_id` (nullable), `action` VARCHAR(64), `target_type` VARCHAR(64), `target_id` (nullable), `ip_address` VARCHAR(45) nullable, `created_at`.

**Verified findings:**
- **A-1 (No secret-bearing column — PASS at schema level).** There is **no** column for password, token, key, connection string, DSN, hostname, username, email or student PII. The schema **cannot structurally store a credential**. This satisfies the design intent.
- **A-2 (Append-only).** Docblock states application code must never UPDATE/DELETE rows. Immutable audit = lower tamper/leak surface. (Enforcement is in code → planned check A-6.)
- **A-3 (PII minimised).** Only `actor_id` and `ip_address` are person-linked; `ip_address` is justified for abuse investigation and is not a secret. `action`/`target_type` are bounded VARCHARs.

## 2. `provisioning_jobs.error_message` (verified from migration 000003)

- **A-4 (Free-text is the residual risk).** `error_message` is a nullable `TEXT` with **no structural restriction**. The migration docblock and `migration-plan.md` say it is *"sanitized, no credentials,"* but the **schema permits arbitrary text**. So the guarantee depends entirely on application code never interpolating a DSN/user/password into it. This is the **primary place a secret could leak** and must be runtime-verified (A-7).
- **A-5 (No credential column).** `provisioning_jobs` has no host/user/password column (verified) — connection details are stored encrypted/separately per ADR-108, not here.

## 3. Planned runtime checks (run when provisioning writes rows)

| ID | Check | Pass criterion |
|----|-------|----------------|
| A-6 | Audit is append-only in practice | No reachable UPDATE/DELETE on `platform_audit_events`; tamper attempt fails |
| A-7 | Failure path sanitises `error_message` | Force a DB-create failure (PV-F-01/SC-1); the stored `error_message` contains **no** password/DSN/host/user/keys (assert against the configured secrets, like `HealthTest` does for `/health`) |
| A-8 | Success + failure both audited without secrets | Read `platform_audit_events` after each provisioning action; assert no secret substrings in `action`/`target_type` |
| A-9 | No secret in any provisioning response/API body | Provisioning endpoint responses contain no credentials |
| A-10 | Logs free of secrets | Grep writable/logs after provisioning; no credential/DSN |

## 4. Execution status

- **Schema review: DONE (real).** A-1/A-2/A-3/A-5 verified against the actual migrations — the audit and job tables have **no secret/credential columns**, so a leak cannot be structural; it could only come from free-text `action`/`target_type`/`error_message` populated by code.
- **Runtime verification: BLOCKED (planned).** No provisioning code writes these rows yet, so A-6..A-10 cannot be executed. The single most important one to run later is **A-7** (sanitized `error_message` under an injected failure), because `error_message` is unstructured (A-4).
- Nothing in §3 is claimed as passing. Ties to `ops/release-gates.md` G7 and `security-threat-model.md` BK-2.
