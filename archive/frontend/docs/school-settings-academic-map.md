# School Settings & Academic Structure Mapping — D-O-01, D-O-02

Maps every **already-visible** School Dashboard settings/academic element to the
published `schools` / `school_domains` columns, and records what has no field.

**No UI element is created, moved, restyled or renamed by this document.**

## What is actually published

Only two of the four control-plane tables touch this screen:

```text
schools(id, name, status, plan_code, timezone, currency, locale, created_at, updated_at)
         timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Karachi'
         currency VARCHAR(8)  NOT NULL DEFAULT 'PKR'
         locale   VARCHAR(8)  NOT NULL DEFAULT 'en'
         name     VARCHAR(191) NOT NULL
         status   ENUM(pending|active|suspended|decommissioned)

school_domains(id, school_id, domain, is_primary, verified_at, created_at)
         domain VARCHAR(191) NOT NULL   UNIQUE(school_id, domain)
```

**Academic structure does not exist at all.** No class, section, subject,
academic session, timetable, homework, assessment, marks, staff or
teacher-assignment table. Recorded as `MISSING_ACADEMIC_ENTITIES` (12 entities).

---

## D-O-01 — Element → field map

Machine-readable form: `frontend/core/settings/element-bindings.js` (`BINDINGS`).
Drift-guarded against the reference on every test run.

| ID | Element (locked reference) | Hook kind | Published field | State |
|---|---|---|---|---|
| DB-01 | `Settings → School branding` 8 theme swatches `.tm` | `existing-attribute` | **none** | **unpublished** |
| DB-02 | `School branding` subtitle | `existing-text-node` | — | **static copy** |
| DB-03 | `Language` select (English / Roman Urdu / اردو · RTL) | `existing-option-value` | `schools.locale` | **column yes, vocabulary no** |
| DB-04 | `Timezone` select (`Asia/Karachi`) | `existing-option-value` | `schools.timezone` | ✅ **published** |
| DB-05 | `Domain` input | `existing-attribute` | `school_domains.domain` | ✅ **published** |
| DB-06 | `Code` input | `existing-attribute` | **none** | **unpublished** |
| DB-07 | `▣ Generate app QR` | **blocked** | **none** | **unpublished** |
| DB-08 | `Backup & audit` rows | `existing-row-template` | — | **static copy** |
| DB-09 | `Academics` card title `Science Quiz · Grade 6-A` / `Term 1 · Max 20` | `existing-text-node` | **none** | **unpublished** |
| DB-10 | `Academics` score inputs + grade cells | `existing-row-template` | **none** | **unpublished** |
| DB-11 | `Academics` publication flow `.flow .d/.nw` | `existing-attribute` | **none** | **unpublished** |
| DB-12 | `Timetable` `.sch` period labels (`08:30`) | `existing-row-template` | **none** | **unpublished** |
| DB-13 | `Timetable` `.sl` subject cells | `existing-row-template` | **none** | **unpublished** |
| DB-14 | `Timetable` homework queue `.ar` rows | `existing-row-template` | **none** | **unpublished** |
| DB-15 | `Students` `Class` column (`Grade 6 · A`) + `All classes` select | `existing-row-template` | **none** | **unpublished** |

**Two of fifteen** elements have a directly bindable published field: the timezone
select (DB-04) and the domain input (DB-05).

### DB-03 — the locale column exists but its vocabulary does not

`schools.locale` is `VARCHAR(8) DEFAULT 'en'`. The approved select shows three
human labels. **No locale code list is published**, so mapping
"Roman Urdu" → a code would be inventing it. The frontend therefore validates
only the column's *format* and refuses to build a label map (DSB-03).

### DB-01 — branding has no column

Migration 000001 creates only `name`, `status`, `plan_code`, `timezone`,
`currency`, `locale`. The data-boundary document *claims* schools contain
"address, contact, branding, status, plan, domain" — but three of those
(address, contact, branding) **are not implemented**. See CPB-07 / DSB-01.

---

## D-O-02 — binding only through existing approved elements

`element-bindings.js` encodes the rule structurally:

- Every descriptor is `existing-text-node`, `existing-attribute`,
  `existing-row-template`, `existing-option-value`, or **blocked**.
- `assertNoElementCreation()` throws if any descriptor ever declares an
  element-creating capability.
- `assertBindingsMatchReference()` re-reads the locked School Dashboard and
  fails if a CSS hook or a screen name a binding depends on has disappeared — so
  a binding cannot outlive its target element.

Nothing is bound at runtime yet, because there is no endpoint to bind from. What
exists is the contract, with the exact attribute each future write would target.

---

## D-O-03 — theme mechanism: used only, never altered

`frontend/core/settings/theme-tokens.js` is the enforcement point.

| Rule | Enforcement |
|---|---|
| Only the existing mechanism is used | The references' own `setProperty('--brand'…)` path. `themeDeclarations()` emits exactly the two properties and nothing else |
| No new colour | Exactly 8 swatches per surface, transcribed from the references, frozen. `resolveThemeSwatch()` returns the surface default for any out-of-range index rather than inventing a colour |
| No new token | `assertThemeTokensOnly()` rejects anything outside `--brand` / `--brand2` |
| Palette tokens never themable | `--bg --card --ink --muted --line --soft --side --shadow` are rejected |
| No drift | `assertThemesMatchReferences()` re-reads all three references and asserts **every** `setProperty('…')` call in each file targets exactly `--brand` or `--brand2` |

Two locked facts the guard now encodes rather than assumes:

- The **7th swatch differs by workspace**: Super Admin uses
  `#3558c8/#1b2a6b` where the school workspace and mobile app use
  `#3b4fb8/#1e2a5e`. Preserved exactly.
- **`--side` does not exist in the Mobile App Preview** (it has no sidebar), and
  the mobile preview themes via `data-a`/`data-b` rather than a `setTheme()`
  function. Both are documented differences, not drift — an earlier version of
  my guard wrongly assumed the desktop shape everywhere, and the tests caught it.

---

## D-O-04 — adapter formatting/validation mapping

`frontend/core/settings/school-settings.js`

| Concern | Rule | Source |
|---|---|---|
| Defaults | timezone `Asia/Karachi`, currency `PKR`, locale `en` | column defaults, not guesses |
| Writable fields | exactly `name`, `timezone`, `currency`, `locale` | `id`, `status`, `plan_code` are server-owned |
| Browser-supplied `id`/`status` | **rejected** | PROJECT_MEMORY: never trust a browser-supplied school ID |
| Timezone | only `Asia/Karachi` | the select has one `<option>`; adding another is a visual change (DSB-02) |
| Currency | only `PKR` | V1 product rule |
| Locale | **format only**, `VARCHAR(8)` | no vocabulary published (DSB-03) |
| Name | string, trimmed, ≤ 191 | column definition |
| Empty values | fall back to published defaults, never to a blank control | column defaults |
| School availability | only `active` is operational | `schools.status` enum |
| Data protection | `suspended` restricts access but `dataStillAccessible` stays `true` | data-boundary override: licence state must never hide, encrypt or block export |

Rejection reasons are a closed set (`SettingReject`). No free-form text can reach
UI copy, and every result object is frozen.

---

## D-O-05 — empty / duplicate / inactive / permission-denied

| Case | Tested? | Basis |
|---|---|---|
| **Empty** | ✅ | `applySchoolSettingDefaults()` fills every gap; tested with `{}`, blank strings, `null` |
| **Duplicate** | ⚠️ partially | `validateSchoolLocale`/domain reject malformed values, but there is **no 409 status** in the published error table, so duplicate creation cannot be interpreted. Recorded, not invented (DSB-05) |
| **Inactive** | ✅ | `classifySchoolAvailability()` for all four `schools.status` values plus unknown; suspended/pending are inactive but data stays accessible |
| **Permission-denied** | ⚠️ documented | 403 is published ("valid auth but insufficient scope") but there is no auth contract and no per-endpoint role requirement, so the case is recorded as blocked (DSB-07) |

---

## Task outcome

| Task | Outcome |
|---|---|
| **D-O-01** Map settings/academic screens to real fields | **DONE** — 15 elements mapped |
| **D-O-02** Bind only through existing approved elements | **DONE** — binding contract with structural guards; nothing bound (no endpoint) |
| **D-O-03** Use existing theme mechanism only | **DONE + enforced** — drift guard over all three references |
| **D-O-04** Adapter formatting/validation mapping | **DONE** — settings adapter over published columns |
| **D-O-05** Test empty / duplicate / inactive / permission-denied | **DONE within published scope** — empty and inactive fully tested; duplicate and permission-denied recorded as blocked |

## Honest status line

> **No school setting can be read or saved, and no academic structure exists.**
> Three published columns (`timezone`, `currency`, `locale`) plus `domain` have a
> real home on the approved Settings screen; the other eleven mapped elements have
> no field at all, because Batch D's entire academic half — classes, sections,
> subjects, sessions, timetable, homework, assessments, marks, staff and teacher
> assignment — has zero published schema. The theme registry and the binding
> contract are enforced against the approved references on every test run.