# Backup & Restore Runbook — C-02.2

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-02.2** (Batch A)
- Created: 2026-10-17
- Status: **Runbook template.** It deliberately leaves RPO/RTO and retention as **owner-decision placeholders** — this agent must not invent business values. The **restore drill is mandatory on non-production before pilot.**

## 0. Governing invariants (must hold in any backup/restore design)

1. **Dedicated database per school (ADR-001).** Each school's data lives in its own database; backups are therefore **per school**, not one monolithic dump of every tenant by default.
2. **Strict access control.** Backup/restore capability is a privileged operation; access is restricted and audited.
3. **License expiry never blocks data access/export.** A lapsed license must not prevent a school from reading or exporting its own data, and must not be a reason backups become unavailable to that school. (See `quality/docs/security-threat-model.md` §8, tenant matrix T-25..T-27.)
4. **No real credentials/secrets in backups or docs.** Backup storage must not embed `.env`/DB passwords in cleartext; keys are managed separately.

## 1. Owner-decision placeholders (fill before pilot — DO NOT invent)

| Parameter | Value | Owner decision |
|-----------|-------|----------------|
| **RPO** (max acceptable data loss, e.g. "≤ 24 h") | `<<OWNER_RPO>>` | Owner to set |
| **RTO** (max acceptable time to restore) | `<<OWNER_RTO>>` | Owner to set |
| **Backup frequency** (e.g. daily / hourly) | `<<OWNER_FREQUENCY>>` | Must satisfy RPO |
| **Retention period** (hot / warm / cold) | `<<OWNER_RETENTION>>` | Owner/legal to set; **not invented here** |
| **Offsite / geo location** | `<<OWNER_LOCATION>>` | Owner to set |
| **Encryption key custody** | `<<OWNER_KEY_CUSTODY>>` | Owner to set |
| **Backup encryption enabled (yes/no)** | `<<OWNER_ENCRYPTION>>` | Recommend **yes**; owner confirms |

Until these are filled, no numeric retention/RPO/RTO is asserted anywhere in this runbook.

## 2. What to back up (per school)

For each provisioned school, capture **consistent** copies of:

- That school's **dedicated database** (schema + data).
- Uploaded files/attachments belonging to that school (per-tenant storage).
- School-specific configuration/branding needed to rebuild the instance.

Also back up separately (control plane): installation/provisioning metadata and commercial/support records. Keep control-plane backups **logically separated** from any individual school's data dump.

Do **not** default to a single file containing every school's plaintext database (see `security-threat-model.md` BK-1).

## 3. Backup procedure (outline — finalise once provisioning exists)

1. Confirm the target school's dedicated DB name/identifier from the provisioning registry.
2. Take a consistent snapshot (DB dump + file archive) using the DB client from `windows-laragon-preflight.md`.
3. Encrypt the backup artifacts at rest; store keys per §1 (never alongside the backup in cleartext).
4. Store to the owner-approved location (§1), with restricted, audited access.
5. Record metadata: school id, timestamp, tool, checksum, encryption status, retention class.

## 4. Restore procedure (outline)

1. Identify the exact school and the backup point to restore (metadata from §3.5).
2. Restore into a **clean, dedicated** database/filespace for that school — never merge into another tenant's store (see `security-threat-model.md` BK-4).
3. Verify integrity: row counts, checksums, sample markers, and that the restored data belongs **only** to the target school.
4. Point the school's instance at the restored DB; confirm application connectivity and login.
5. Record the restore: who, when, which backup point, verification result.

## 5. MANDATORY non-production restore drill (before pilot)

A backup is not real until a restore has been proven. This is a **hard gate** for pilot (see `ops/release-gates.md`, and Batch B task **C-10.4**).

Drill steps (run on a **non-production** environment, using synthetic/seed data only — no real student data):

1. Take a fresh backup of a seeded test school.
2. Wipe/stand up an empty target and **restore from that backup only**.
3. Verify success **objectively**:
   - [ ] Row counts match the pre-backup counts for key tables.
   - [ ] A known synthetic marker string planted before backup is present after restore.
   - [ ] Uploaded-file archive restores and a sample file is byte-identical (checksum match).
   - [ ] Application boots and the seeded admin can log in and read data post-restore.
   - [ ] Restored data contains **only** the target school (no cross-tenant rows).
4. Measure and record **actual restore time** against `<<OWNER_RTO>>` and data-loss window against `<<OWNER_RPO>>` (fill §1 first).
5. Record the drill result in the agent tracker. A failed or unproven restore **blocks pilot**.

**Status as of 2026-10-17:** NOT performed — there is no provisioning/migrations/data yet, so no restore has been executed. This is a **planned drill** and remains an open pilot blocker (C-10.4).

## 6. Restore verification checklist (copy per drill)

```text
School / DB under test:        ______________________
Backup point (timestamp/id):   ______________________
[ ] Backup taken + checksum recorded
[ ] Backup encrypted at rest (or owner-approved exception logged)
[ ] Restored into clean dedicated DB for that school only
[ ] Row counts match pre-backup
[ ] Synthetic marker present after restore
[ ] Sample file checksum matches
[ ] App boots; seeded login works post-restore
[ ] No cross-tenant rows present
Actual restore time:           ______   (vs <<OWNER_RTO>>)
Observed data-loss window:     ______   (vs <<OWNER_RPO>>)
Result: PASS / FAIL            Signed: __________________
```

## 7. Notes and limits

- No RPO/RTO/retention numbers are asserted — they are owner decisions (§1).
- No restore has been executed yet; nothing here is claimed as "tested" or "certified."
- Per-school (not shared-`tenant_id`) backups preserve the ADR-001 isolation boundary during backup **and** restore.
- License expiry must never be a reason a school loses its own backups/exports (§0.3).

