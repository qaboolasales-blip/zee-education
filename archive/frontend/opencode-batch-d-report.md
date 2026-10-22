Batch: D
Completed task IDs: D-O-01, D-O-02, D-O-03, D-O-04, D-O-05
Changed files: `frontend/core/settings/element-bindings.js` (DB-01 note corrected to
state that migration 000006 now adds address/contact/branding columns), `frontend/test/school-settings.test.js`
(no changes needed — the new columns are not in the writable set and the test suite
already passed), `frontend/docs/provisioning-ui-blockers.md` (DSB-01 partially closed,
three new backend facts recorded).

Commands/checks actually run:
- `npm run test:ui-lock` (frontend/) -> "UI LOCK OK — 3/3 reference files
  unchanged." exit 0
- `npm test` (frontend/) -> tests 816, suites 176, pass 816, fail 0, exit 0
- `npm run check` (frontend/) -> both gates green, exit 0
- Read-only inspection of the new backend state:
  - `backend/app/Database/Migrations/2026-10-18_000006_extend_schools_table.php`
    — adds contact_email, contact_phone, address, branding_logo_path,
    branding_reference, commercial_metadata, installation_state,
    installation_status, provisioned_at to `schools`
  - `backend/app/Database/Migrations/2026-10-18_000007_add_school_code.php`
    — adds UNIQUE `schools.school_code` (VARCHAR 50, nullable)
  - `backend/app/Models/SchoolLocal/AcademicSessionModel.php` — first school-LOCAL
    model, maps to `academic_sessions` in the per-school database (correct under
    ADR-001; the control-plane boundary is a directory boundary as well as a data one)
  - `backend/docs/provisioning-state-machine.md` — documents the school code rule
    (3-50 chars, alphanumeric + hyphens/underscores, no PII, uniqueness enforced at
    database level) and the provisioning state machine
  - `backend/docs/shared-hosting-constraints.md` — documents the dedicated DB per
    school rule and the connection workflow

Reference UI hash result: unchanged. All three approved files match the lock:
- Mobile App Preview  deec1fceb15cdf4af44d174a65ff27261b1ad87d7418087f3783fa8bbbb73d9f
- School Dashboard     56d82bef4b1ef5ede1811fc12da0f643b1db0c328926b24de4f10f5d78a6948d
- Super Admin          df876fbc699389c5e1128d99678ead93c3ac1e4340a4a805948e8d5ba606cb30

Blockers or deferred items:
- DSB-01 PARTIALLY CLOSED: address, contact and branding now exist as columns on
  `schools` (migration 000006), but the logo still has no storage contract and no
  approved UI element, so DSB-06 stands.
- CPB-02 PARTIALLY CLOSED: `schools.school_code` now exists (migration 000007) with
  a documented character rule, but the SEMANTICS are still unpublished — no payload
  format, no signature, no expiry, no revocation and no endpoint. The frontend may
  validate the character set against the published rule but may not bind, persist or
  transmit the code to any endpoint.
- DSB-02 (timezone select has one option), DSB-03 (no locale vocabulary), DSB-04
  (no academic structure — 12 missing entities), DSB-05 (no 409 / idempotency),
  DSB-06 (no logo storage/contract/UI element), DSB-07 (permission-denied
  untestable), DSB-08 (no settings read/write endpoint) all still stand.
- D-O-05: empty and inactive fully tested; duplicate and permission-denied remain
  recorded as blocked because 409 is absent from the published error table and there
  is still no auth contract.

Next safe microtask: none outstanding in Batch D. The Batch D exit gate is met for
the frontend side: a school can configure its safe basics (timezone, currency,
locale, name, domain) through existing approved elements using the published
columns; the binding contract is enforced against the locked references on every
test run; the theme mechanism is used only and never altered; and no UI change
occurred. The backend half of the gate (teacher assignment scope enforceable
server-side, uploaded logo controls tested) is KiloCode's and cannot be executed
here — there is no teacher record, no assignment table and no logo storage.