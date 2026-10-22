# School Settings & Academic Blockers — D-O-06 (Batch D)

Gaps Batch D found that are not mine to fill. None resolved by adding UI.

Evidence: `docs/school-settings-academic-map.md`, `core/settings/**`, KiloCode's
published migrations. Reference UI 3/3 SHA-256 MATCH.

---

## DSB-01 — School branding has no column

**UI shows:** `Settings → School branding`, 8 theme swatches, subtitle
"Base theme school identity hai; multicolor sirf data categories ke liye."
**Schema has:** nothing. `schools` has no branding, address or contact column.

The data-boundary document *claims* `schools` contains "Name, address, contact,
branding, status, plan, domain" — but migration 000001 creates only
`name`, `status`, `plan_code`, `timezone`, `currency`, `locale`. **Three of the
documented fields are not implemented.** That is a documentation/implementation
mismatch worth closing.

**What I did.** The theme registry carries only the client-local swatches the
references already ship, enforced against the reference files. No branding value
is persisted or sent anywhere.

**Owner / KiloCode.** Either narrow the data-boundary document to what is built,
or implement the missing columns.

---

## DSB-02 — The timezone select has exactly one option

**UI shows:** `<select><option>Asia/Karachi</option></select>`.
**Product reality:** `schools.timezone` is `VARCHAR(64)`, which suggests multiple
zones were anticipated.

**Why I did not add an option.** Adding a second `<option>` to an approved control
is a visible change to a locked screen. The frontend therefore accepts **only**
`Asia/Karachi` and rejects everything else with `not-approved-timezone`.

**Owner.** Is the deployment permanently Asia/Karachi, or should the select gain
options? If the latter, that is an approved UI change plus a contract decision.

---

## DSB-03 — No published locale vocabulary

**UI shows:** `English`, `Roman Urdu`, `اردو · RTL`.
**Schema has:** `schools.locale VARCHAR(8) DEFAULT 'en'` — no enumeration, no
label mapping.

**Why I did not invent codes.** Guessing `'ur'` vs `'ur-PK'` vs `'ur-PK-arab'`
risks writing a locale the server does not recognise, and `VARCHAR(8)` cannot even
hold the longer forms. The frontend validates the column *format* only and
builds no label map.

**Also relevant.** UNIVERSAL_RULES requires RTL readiness. Switching to
`اردو · RTL` must not require new CSS — if it does, that is a new UI decision.

**KiloCode.** Publish the supported locale codes and the label mapping.

---

## DSB-04 — No academic structure whatsoever

**UI shows:** `Academics` (assessment, term, max marks, scores, grades,
draft→review→publish flow), `Timetable` (periods, subjects, homework queue),
`Students` (`Grade 6 · A` class/section).

**Schema has:** none of it. Twelve missing entities are enumerated in
`MISSING_ACADEMIC_ENTITIES`, including `classes`, `sections`, `subjects`,
`class_subjects`, `timetable_slots`, `assessments`, `assessment_marks`,
`homework`, `staff` and `teacher_assignments`.

**Consequence for the Batch D exit gate.** *"Teacher assignment scope is
enforceable server-side"* — there is no teacher record and no assignment table, so
this cannot hold at all. Reporting, not claiming.

**KiloCode.** Implement the academic-structure migrations in the per-school
database and publish each module's contract.

---

## DSB-05 — Duplicate handling has no published status

The Batch D exit gate and general data integrity require sane duplicate
behaviour. The published error table is `400, 401, 403, 404, 429, 500` — **409
Conflict is absent**. So:

- A client cannot distinguish "duplicate school name" from any other failure.
- There is no unique constraint on `schools.name` (only on
  `school_domains(school_id, domain)`).
- There is no idempotency-key strategy.

**What I did.** Duplicate/over-long/malformed *values* are rejected client-side
before any request, with a closed reason set. Server-side duplicate semantics are
recorded as blocked.

**KiloCode.** Publish conflict and idempotency semantics. Same root cause as
CPB-09.

---

## DSB-06 — Logo upload has nothing to attach to

The Batch D exit gate expects *"Uploaded logo controls are tested."*

**Reality:** no branding column, no upload endpoint, no storage contract, and **no
logo element anywhere in the approved references** — the `.logo` in the sidebar is
the fixed "Z" product mark, not a school logo.

Nothing can be tested. Even with a backend contract, rendering a school logo would
be a new visual element.

**Owner.** Approve a logo presentation (or confirm logos are out of V1) and the
upload contract (formats, size limits, serving path).

---

## DSB-07 — Permission-denied cannot be tested end to end

**Published:** `403 = Forbidden — valid auth but insufficient scope`.
**Missing:** an auth contract, a role vocabulary, and per-endpoint role
requirements — all Batch B blocks.

`classifyProvisioningOutcome()` maps 403 correctly, but there is nothing to
authorize against, so a real permission-denied test is not possible.

**KiloCode.** Publish the permission model (Batch B dependency).

---

## DSB-08 — No settings endpoint at all

Neither read nor write exists for school settings. Tenant resolution must come
from the authenticated session, which does not exist yet either.

**What I did.** Built the value layer (`core/settings/school-settings.js`) so that
when the endpoint appears, binding is mechanical rather than inventive.

---

## Summary

| ID | Blocker | Type | Owner |
|---|---|---|---|
| DSB-01 | Branding/address/contact documented but not implemented | Doc vs schema | KiloCode |
| DSB-02 | Timezone select has one option; product may need more | Product vs locked UI | Owner |
| DSB-03 | No published locale vocabulary | Contract | KiloCode |
| DSB-04 | No academic structure at all — 12 missing entities | Schema | KiloCode |
| DSB-05 | No 409 / idempotency semantics | Contract + server | KiloCode |
| DSB-06 | No logo storage, no contract, no approved UI element | Contract + UI | Owner + KiloCode |
| DSB-07 | Permission-denied untestable without an auth contract | Contract | KiloCode |
| DSB-08 | No settings read/write endpoint | Contract | KiloCode |

Standing from earlier batches: **BLK-01…BLK-09** (auth) and **CPB-01…CPB-09**
(provisioning). Chiefly still missing: no sign-in screen, no logout control, no
school connection code field, and no renewal data.

**Net effect for Batch D: zero UI elements added.** Three published columns plus
one domain field were bound to real approved hooks; the remaining eleven mapped
elements are recorded here with the decision each needs.