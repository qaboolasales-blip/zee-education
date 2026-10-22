# School Settings & Upload Validation Test Matrix — D-C-01

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **D-C-01** (Batch D — School Setup, Academic Structure & Assignment Boundaries)
- Created: 2026-10-17
- Grounding: control-plane `schools` columns (migration 000001: `name`, `status`, `plan_code`, `timezone` default `Asia/Karachi`, `currency` default `PKR`, `locale` default `en`); `security-threat-model.md` §4 (UP-1..UP-4).
- Status: **Executable-ready spec; runtime BLOCKED.** No school-settings write endpoint, no upload handler, no school-local schema exists yet (Controllers = Health/Home/Setup; Models/Libraries empty — verified 2026-10-17). Authored so a later agent can implement/run these unambiguously.

## 1. Settings validation (server-side) — prefix `SET`

| ID | Field | Case | Expected |
|----|-------|------|----------|
| SET-01 | `name` | Empty / over-length / control chars | Rejected **400**; sanitised; length-limited |
| SET-02 | `name`/branding | Stored-XSS payload (`<script>`, `javascript:`) | Stored escaped; renders inert; no stored XSS |
| SET-03 | `timezone` | Invalid tz identifier | Rejected **400**; must be a real IANA tz |
| SET-04 | `currency` | Unsupported code | Rejected; allowlist (PKR default; no arbitrary code) |
| SET-05 | `locale` | Unsupported locale | Rejected; allowlist (`en`,`ur` per `ZeeEducation::$supportedLanguages`) |
| SET-06 | `plan_code` | Client sets an arbitrary/premium plan | Only Super Admin may set plan; School Admin cannot self-upgrade |
| SET-07 | `status` | School Admin tries to set `status=active`/`suspended` | **403** — lifecycle is Super Admin / provisioning controlled |
| SET-08 | AuthZ | Non-Admin (Teacher/Parent/Student) edits school settings | **403** |
| SET-09 | CSRF | Settings POST without CSRF token | **403** once CSRF enabled (B-C-04 SC-2) |
| SET-10 | Scope | School A admin edits School B settings | **403/404** — own school only |
| SET-11 | Domain | Add/verify a `school_domains` hostname | Uniqueness enforced (`UNIQUE(school_id,domain)`); only verified domain is primary |
| SET-12 | Audit | Settings change writes an audit record | Recorded (actor/action/target/time), no secrets |

## 2. Logo / branding upload validation — prefix `UP` (ties to `security-threat-model.md` §4)

| ID | Case | Expected |
|----|------|----------|
| UP-D01 | Disallowed file type (`.php`, `.html`, `.svg`, `.exe`) upload | **Rejected 400** — allowlist of image types only (not extension-spoofable) |
| UP-D02 | MIME/content sniff vs extension mismatch | Rejected — validate real content, not just extension |
| UP-D03 | Oversized upload | Rejected **413** — size cap at web server + app |
| UP-D04 | Path traversal in filename (`../`, absolute, null byte) | Sanitised to a random per-tenant storage key; never escapes tenant dir |
| UP-D05 | Stored XSS via image/SVG | Scripted SVG rejected or served with a non-executable content type from a non-executable origin |
| UP-D06 | Cross-tenant logo fetch | Another school cannot fetch this school's logo by guessed URL (per-tenant ownership + unguessable/expiring key) |
| UP-D07 | Logo served safely | Served with correct `Content-Type`, `X-Content-Type-Options: nosniff`, and not inline-executable |
| UP-D08 | Replace logo | Old file cleaned up; no orphan accumulation; new file valid per UP-D01..D05 |
| UP-D09 | No-logo state | School renders with default branding; no error/leak |
| UP-D10 | AuthZ | Only School Admin (own school) may upload/replace the logo; others **403** |

## 3. Grounded schema facts (real, migration 000001)

- `schools` already constrains safe basics at the schema level: `timezone`/`currency`/`locale` have safe defaults; `status` is a controlled ENUM; `plan_code` is a reference only (no pricing stored — supports "no public hard-coded pricing").
- No branding/logo **file** column exists yet — the upload target is application storage (per-tenant), not a control-plane column. The logo must live in the **school's** storage boundary, not a shared path.

## 4. Execution status vs exit gate

- **Runtime execution: BLOCKED (planned).** No settings-write endpoint, no upload handler, and no auth exists to run SET-* / UP-* against (ties to `ops/release-gates.md` G6/G7).
- **Exit-gate items served (as spec):** UP-D01..D10 → *"uploaded logo controls are tested"*; SET-* → *"a school can configure its safe basics."*
- The frontend already carries non-visual `school-settings` validation logic (its test suite passes 675/675), but the **server-side** validation asserted here is unimplemented — that half is what these cases cover. Nothing is claimed as passing.

