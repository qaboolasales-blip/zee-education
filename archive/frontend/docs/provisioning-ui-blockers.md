# Provisioning UI Blockers — C-O-06

Gaps Batch C found that are **not** mine to fill. None was resolved by adding UI.

Evidence: `docs/provisioning-ui-map.md`, `core/provisioning/**`, and KiloCode's
published migrations and docs. Reference UI 3/3 SHA-256 MATCH.

---

## Published schema, unpublished endpoints

The asymmetry is the whole story:

| Layer | Published? |
|---|---|
| `schools`, `school_domains`, `provisioning_jobs`, `platform_audit_events` tables | ✅ yes, 4 migrations implemented |
| `schools` extensions (contact_email, contact_phone, address, branding_logo_path, branding_reference, commercial_metadata, installation_state, installation_status, provisioned_at) | ✅ yes, migration 000006 (C-K-01) |
| `schools.school_code` | ✅ yes, migration 000007 (C-K-02) — UNIQUE VARCHAR 50 |
| `academic_sessions` (per-school DB) | ✅ yes, `Models/SchoolLocal/AcademicSessionModel.php` (D-K-01) — correctly school-local |
| `commercial_records`, `support_tickets` | ⚠️ documented only, no migration |
| School registry endpoint | ❌ no |
| Provisioning endpoint | ❌ no |
| QR payload contract | ❌ no |
| Connection-code SEMANTICS | ❌ no — the column exists but has no payload format, signature, expiry or revocation |

**Re-check 2026-10-18 — three new backend facts, none of which change the verdict:**

1. **Migration 000006 extended `schools`** with `contact_email`, `contact_phone`,
   `address`, `branding_logo_path`, `branding_reference`, `commercial_metadata`,
   `installation_state`, `installation_status`, `provisioned_at`. So DSB-01 is
   **partially closed**: address, contact and branding now exist as columns. The
   logo still has no storage contract and no approved UI element (DSB-06 stands).
2. **Migration 000007 added `schools.school_code`** (UNIQUE VARCHAR 50, nullable).
   So CPB-02 is **partially closed**: the column exists, and
   `docs/provisioning-state-machine.md` documents the character rule (3-50 chars,
   alphanumeric + hyphens/underscores, no PII, uniqueness enforced at database
   level). What is still missing is the SEMANTICS — no payload format, no
   signature, no expiry, no revocation and no endpoint.
3. **`Models/SchoolLocal/AcademicSessionModel.php`** (D-K-01) maps to an
   `academic_sessions` table in the **per-school database**, not the control
   plane. This is CORRECT under ADR-001 and is the first school-local model. It
   does not weaken the control-plane boundary: the guard still asserts that no
   school-local model appears in `Models/` itself.

---

## CPB-01 — Super Admin status values are not in the published enum

**UI shows:** `Active`, `Provisioning`, `Renewal due` (locked reference, `SC` array
and `stc()`).
**Schema has:** `pending`, `active`, `suspended`, `decommissioned`.

Only `Active` matches. `Provisioning` and `Renewal due` would both be invalid.

**Why I did not fix it.** Two possible resolutions, both outside my scope:
KiloCode extends the enum, or the locked UI labels change. The second is a visual
change to an approved screen.

**What I did.** `validateSchoolStatus()` rejects both values and the test asserts
it. The frontend refuses to guess rather than mapping them silently.

**Owner decision.** Is `Provisioning` a `provisioning_jobs.status` of
pending/running joined onto the row? Is `Renewal due` commercial data
(`commercial_records`, not yet implemented)? Then: does the enum change, or do the
labels?

---

## CPB-02 — The school connection code has no published field

**UI shows `HZ-9246` in three places:** mobile `#code` input, mobile Profile
`School code:`, School Dashboard `Settings → App connection` `Code` input.
**Schema has:** no code column on any of the 4 tables. Only `schools.plan_code`,
which is a commercial plan reference.

**Why I did not fix it.** Inventing a code format or a storage location would
create a client that rejects valid codes. The reference already states the correct
property — short-lived and revocable, "not a permanent secret" — but nothing
defines it.

**Owner / KiloCode.** Publish where the code lives (table, column, hashing,
expiry, revocation) and the resolve-endpoint contract.

---

## CPB-03 — Renewal / licensing data does not exist yet

**UI shows:** Super Admin `Renewal` column, `Upcoming renewals` stat, `Renewals
needing attention` list with `Due in 4d`.
**Schema has:** nothing. `commercial_records` is permitted by the data-boundary
document but has no migration, and `schools` has no renewal column.

**Owner / KiloCode.** Batch K needs `commercial_records` implemented and
contracted. Until then these cells render the empty marker.

---

## CPB-04 — Plan labels are proposed, not published

**UI shows:** `Starter`, `Growth`, `Complete` in the `Plan` column and on the plan
cards.
**Schema has:** `schools.plan_code` VARCHAR(64), rationale "references commercial
plan, not pricing". No plan table, no enumeration, no endpoint.

PROJECT_MEMORY lists those three as **proposed** plan labels.

**What I did.** Registered them in `PROPOSED_PLAN_LABELS` with that provenance,
asserted they contain no digits (no pricing), and asserted they already exist
verbatim in the locked reference — so nothing new was introduced.

**Owner / KiloCode.** Approve the label set and publish the catalogue contract.
No public hard-coded pricing may ever be added.

---

## CPB-05 — Five-stage install lifecycle has no representation

**UI shows:** `Install lifecycle` flow — `1 Approved → 2 Database → 3 Migration →
4 Domain → 5 Active`, with steps 1–4 styled as done (`.d`) and 5 as current (`.nw`).

**Schema has:** `provisioning_jobs.type` (install|migrate|suspend|resume|
decommission) and `.status` (pending|running|completed|failed). Two enums, four
values. No per-stage state, no step number, no ordering.

**Why I did not fix it.** Mapping 5 stages onto 2 enums is a product decision. Any
mapping I invented could mark a school "Active" before its migration finished.

**Owner.** Is the flow a decorative illustration of the install lifecycle, or a
real progress indicator? If real, `provisioning_jobs` needs a stage field.

---

## CPB-06 — No list filter, sort or pagination contract

**UI shows:** toolbar with `Search schools, domain or city`, `All plans`,
`All states`, plus `⇩ Export`.

**Schema has:** no endpoint, therefore no filter, sort, page or total-count
semantics. `schools.status` and `plan_code` are filterable columns, but there is
no contract saying so.

**Why I did not fix it.** Client-side filtering would fetch every school into the
browser — wrong for a control plane, and it would leak records the Super Admin may
not see.

**KiloCode.** Publish registry list semantics with the registry endpoint.

---

## CPB-07 — No `Manage` drill-down target

**UI shows:** a `Manage` link on every install row whose action is
`notice('Record: <school>')`.

There is no school-detail screen anywhere in the approved references, and no
endpoint. A detail view would be a **new screen** — a visual change.

**Owner.** Approve a school-detail screen, or confirm the link stays a placeholder
until Batch C's API exists.

---

## CPB-08 — No health log per school

**UI shows:** `View health log`.
**Available:** `GET /health` is a platform-wide liveness probe with no school
parameter and no log content. `provisioning_jobs.error_message` exists but is a
forbidden browser field in my selectors, because it can carry infrastructure
detail (and ADR-108 keeps credentials out of it entirely).

**Why this matters.** Wiring the button to `/health` would show the same platform
result for every school and imply per-school health that does not exist.

**KiloCode.** Publish a per-installation health/log contract, with the sanitization
rules for `error_message`.

---

## CPB-09 — No duplicate/idempotency semantics

The Batch C exit gate requires: *"A retry cannot silently create inconsistent
duplicate data."*

The published error table is `400, 401, 403, 404, 429, 500`. **409 Conflict is
absent**, so the client cannot interpret a duplicate creation even if one
occurred. There is also no idempotency-key strategy and no unique constraint on a
school name.

**What I did.** `classifyProvisioningOutcome()` maps only the six published
statuses; 409 and every other code collapse to a generic `unknown` outcome rather
than being interpreted. Asserted by test.

**KiloCode.** Publish idempotency and conflict semantics. This is a **server**
guarantee — it cannot be established or tested from a browser, so I am reporting
the gap rather than claiming it covered.

---

## Summary

| ID | Blocker | Type | Owner |
|---|---|---|---|
| CPB-01 | Super Admin status values not in the published enum | Contract vs locked UI | KiloCode + owner |
| CPB-02 | School connection code has no field | Contract | KiloCode |
| CPB-03 | Renewal/licensing data not implemented | Contract | KiloCode (Batch K) |
| CPB-04 | Plan labels proposed only | Contract + commercial | Owner + KiloCode |
| CPB-05 | Five-stage lifecycle has no representation | Product + schema | Owner + KiloCode |
| CPB-06 | No list filter/sort/pagination contract | Contract | KiloCode |
| CPB-07 | No school-detail target screen | UI | Owner |
| CPB-08 | No per-school health log | Contract | KiloCode |
| CPB-09 | No 409 / idempotency semantics — exit-gate gap | Contract + server | KiloCode |

Plus the nine Batch B blockers in `auth-ui-blockers.md` (BLK-01…BLK-09), which
still stand: chiefly no sign-in screen, no logout control, no forbidden screen and
no credential field.

**Net effect for Batch C: zero UI elements added.** Seven of fourteen mapped
Super Admin elements are bindable to a real published field; the rest are recorded
here with the specific decision each one needs.