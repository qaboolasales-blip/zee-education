# Super Admin Provisioning & School-Connection Mapping — C-O-01, C-O-02

Maps every **already-visible** Super Admin / setup / school-connection UI area to
the control-plane schema KiloCode has actually published, and records what has
no field at all.

**No UI element is proposed, added or changed by this document.**

## Sources of truth

| Layer | Source | State |
|---|---|---|
| Schema (authoritative) | `backend/app/Database/Migrations/*.php` (4 tables) | **Published and implemented** |
| Schema (documentary) | `backend/docs/migration-plan.md`, `backend/docs/control-plane-data-boundary.md` | Published |
| Endpoints | `backend/docs/api/openapi-v0.md` | **`/health` + `/setup` only** |
| Visual authority | `agents/opencode/reference_ui/` | 100% pixel-locked, 3/3 hashes MATCH |

Frontend transcription: `frontend/core/provisioning/control-plane-schema.js`,
verified against the migration files by `test/provisioning-schema.test.js` on
every run (`assertSchemaMatchesMigrations`).

## Published control-plane schema

```text
schools(id, name, status, plan_code, timezone, currency, locale, created_at, updated_at)
         status ENUM(pending|active|suspended|decommissioned) DEFAULT pending

school_domains(id, school_id, domain, is_primary, verified_at, created_at)
         UNIQUE(school_id, domain)  FK school_id -> schools.id

provisioning_jobs(id, school_id, type, status, target_database, attempts,
                  error_message, started_at, completed_at, created_at)
         type   ENUM(install|migrate|suspend|resume|decommission)
         status ENUM(pending|running|completed|failed) DEFAULT pending
         attempts INT UNSIGNED DEFAULT 0        -- NO credential columns (ADR-108)

platform_audit_events(id, actor_type, actor_id, action, target_type, target_id,
                      ip_address, created_at)   -- append-only
         actor_type ENUM(super_admin|system|installer)
```

Documented but **not implemented** (no migration): `commercial_records`,
`support_tickets`.

---

## C-O-01 — Super Admin installation/setup UI → published fields

Reference: `Zee Education — Super Admin.html`, `Schools & Installs` screen.

| # | Visible element | Published field | Status |
|---|---|---|---|
| 1 | Table column `School` (`.pe` person cell) | `schools.name` VARCHAR(191) NOT NULL | **Bindable** |
| 2 | Table column `Domain` | `school_domains.domain` (unique per school, `is_primary`) | **Bindable** |
| 3 | Table column `Plan` (`Starter`/`Growth`/`Complete`) | `schools.plan_code` VARCHAR(64) NULL | **Partial — PUB-03.** Column exists; the label set does not. PROJECT_MEMORY calls these *proposed* labels and there is no plan table or endpoint. `plan_code` never carries pricing |
| 4 | Table column `Database` — badge `Dedicated` | **none** | **PUB-04.** ADR-001 makes a dedicated database per school a *constant architectural rule*, not a column. The badge is correctly static copy; nothing to bind |
| 5 | Table column `Status` — badges `Active`, `Provisioning`, `Renewal due` | `schools.status` ENUM | **CONFLICT — see §Conflict A.** `Provisioning` and `Renewal due` are **not** in the published enum |
| 6 | Table column `Renewal` (`28 Oct 2026`, `—`) | **none** | **PUB-02.** No renewal column on `schools`; `commercial_records` has no migration |
| 7 | Row action `Manage` | — | **No approved target screen.** No drill-down route exists in the reference |
| 8 | `Install lifecycle` flow — `1 Approved → 2 Database → 3 Migration → 4 Domain → 5 Active` | `provisioning_jobs.type` + `.status` | **PUB-05.** Five named stages vs two enum fields. `status` is pending/running/completed/failed — no per-stage representation |
| 9 | `View health log` button | — | **No endpoint, no field.** `/health` is a platform liveness probe, not a per-school log |
| 10 | `Isolation note` + `Dedicated database required` badge | ADR-001 constant | **Correctly static.** Must not be bound; it is governance copy |
| 11 | `＋ Add school` / provisioning button | `provisioning_jobs.type = install` | **Endpoint missing (C-O-04).** The action exists in the UI, the API does not |
| 12 | Toolbar: search + `All plans` + `All states` selects | — | **No published filter/sort/pagination contract.** Blocking for any real list |
| 13 | `⇩ Export` | — | **No export endpoint.** Batch J |
| 14 | Support ticket / billing screens | `support_tickets`, `commercial_records` | **Documented, not implemented.** Blocking for Batch K |

### Conflict A — Super Admin status values are not the published enum

The locked reference renders three status values:

```js
const stc = s => s==='Active' ? 'g' : s==='Renewal due' ? 'w' : 'n';
const SC = [['Horizon Public School', …, 'Active',   '28 Oct 2026', …],
            ['Crescent School',       …, 'Provisioning', '—',      …]];
```

| Reference value | Published `schools.status`? | Consequence |
|---|---|---|
| `Active` | ✅ matches `active` | Bindable |
| `Renewal due` | ❌ absent | Would map to an undefined state |
| `Provisioning` | ❌ absent | Would map to an undefined state |

**Resolution taken:** the frontend treats any value outside the published enum as
invalid and refuses to guess. `validateSchoolStatus('Renewal due')` and
`validateSchoolStatus('Provisioning')` both fail with `not-in-enum` — asserted by
test. `Provisioning` arguably means a `provisioning_jobs` row in `pending`/
`running`, and `Renewal due` is commercial data that does not exist yet.

**This needs an owner decision** (recorded, not resolved): either the backend
enum gains the states, or the UI labels change. Both are out of my scope — the
first is KiloCode's, the second is a locked UI change. See C-O-06 **CPB-01**.

---

## C-O-02 — Mobile QR / manual school connection → payload requirements

Reference: `Zee Education — Mobile App Preview.html` Connect screen, plus
`Zee Education — School Dashboard.html` → `Settings → App connection`.

### Existing elements

| # | Element | Reference value | Published field | Status |
|---|---|---|---|---|
| 1 | `#domain` input | `horizon.school.pk` | `school_domains.domain` | **Bindable.** Validated by `validateSchoolDomain` |
| 2 | `#code` input | `HZ-9246` | **none** | **PUB-01.** No code column exists anywhere |
| 3 | `Connect school` button | `connectSchool()` | — | **No resolve endpoint** |
| 4 | `.connect-row` "Option 2 · Manual connection" | `horizon.school.pk · HZ-9246` | mixed | Domain bindable; code is not |
| 5 | `▣ Scan QR code` + `.qrart` | decorative 81-cell grid | — | **PUB-06.** Not a scannable code; no payload contract |
| 6 | `Continue to sign in` | toast only | — | BLK-01 (Batch B) |
| 7 | School Dashboard `Domain` input | `horizon.school.pk` | `school_domains.domain` | **Bindable** |
| 8 | School Dashboard `Code` input | `HZ-9246` | **none** | **PUB-01** |
| 9 | School Dashboard `▣ Generate app QR` | "QR secure backend se generate hoga" | — | **PUB-06.** Correctly states the server must generate it |
| 10 | Profile `School code: HZ-9246` | display | **none** | **PUB-01** |

### PUB-01 is the central finding

**The school connection code has no published home.** Checked every column of all
four tables — the only code-like column is `schools.plan_code`, which references a
commercial plan. So the `HZ-9246` value that appears in **three places** in the
approved UI maps to nothing in the published schema.

The approved reference already constrains it correctly:

> "Production QR short-lived/revocable hota hai, permanent secret nahin."

So the intended design is a short-lived, revocable bootstrap code — but nothing
states where it is stored, how it is generated, how long it lives, or how it is
revoked. Until KiloCode publishes that, the frontend cannot validate, render or
persist it, and I will not invent a format.

### What C-O-03 is therefore blocked on

C-O-03 reads: *"Add non-visual QR payload parser/validator with expiry/signature
contract placeholders **only after backend contract exists**."*

No payload contract exists. So **no parser, no validator and no placeholder shape
was written.** A guessed payload format would produce a client that silently
rejects valid codes — worse than no parser. `test/provisioning-gate.test.js`
enforces this: it fails if any QR decoding, signature verification or
cryptography appears in the provisioning modules.

---

## Task outcome

| Task | Outcome |
|---|---|
| **C-O-01** Map Super Admin installation/setup UI → provisioning fields | **DONE** — §C-O-01, 14 elements mapped |
| **C-O-02** Map mobile QR/manual connection → school-code payload requirements | **DONE** — §C-O-02, 10 elements mapped |
| **C-O-03** QR payload parser/validator | **BLOCKED** — no payload contract (§PUB-06) |
| **C-O-04** API adapter calls for registry/provisioning | **BLOCKED** — no endpoints exist |
| **C-O-05** Test malformed code / expiry / error normalization with synthetic payloads | **DONE within published scope** — 336 tests pass. Expired-code testing is impossible (no code contract) |
| **C-O-06** Record absent UI hooks | **DONE** — `provisioning-ui-blockers.md` |

## Honest status line

> **No school can be registered or provisioned from the frontend.** The control
> plane *schema* is published and the frontend validates against it faithfully,
> but `Routes.php` still exposes only `/health` and `/setup` and `Models/` is
> still empty. The frontend can tell you exactly which approved UI elements have
> a real field behind them (name, domain, status enum, job type/status, audit
> actor) and which have none (connection code, renewal date, plan labels,
> lifecycle stages, QR payload).