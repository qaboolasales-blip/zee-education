# DEEP CODE SCAN � FIX REPORT
Date: 2026-10-19
Scope: 9 automated passes over backend app/, tests/, docs/, migrations vs live DB, routes, security

## VERIFIED CLEAN (unchanged)
- Routes: 21/21 resolve to real controller methods (was 12)
- Views: 7/7 exist
- Models: 9/9, every $allowedFields column exists in the real table
- Stub detection: none
- Security: no raw SQL interpolation, no $_GET/$_POST/$_REQUEST in app/
- UI lock: 3/3 reference hashes unchanged
- Backend tests: 69 tests / 175 assertions / 0 failures (was 62/146)

--------------------------------------------------------------------------
## HIGH � ALL FIXED
--------------------------------------------------------------------------
H1. NO BUSINESS WRITE ENDPOINTS EXISTED.        -> FIXED
    Added app/Controllers/SchoolApi.php + app/Libraries/SchoolRecordService.php.
    Routes (session + school role required):
      POST /api/school/students
      POST /api/school/staff
      POST /api/school/attendance
      POST /api/school/fees/invoices
      POST /api/school/fees/receipts
      GET  /api/school/students
      GET  /api/school/invoices
    All writes go through the signed-in user's OWN dedicated school database.
    Input is validated and bound as query parameters; no SQL is built from
    request data.

H2. FRONTEND CALLED /api/* BUT NO SUCH ROUTES EXISTED.   -> FIXED
    Added /api/health plus the school API above, so the frontend health check
    and the school screens can actually reach the backend.

H3. POST /admin/schools/provision DOCUMENTED BUT NOT ROUTED.  -> FIXED
    Added app/Controllers/AdminApi.php and routed:
      GET  /admin/schools
      POST /admin/schools
      POST /admin/schools/provision
      GET  /api/admin/schools
      POST /api/admin/schools
    Super Admin only. No database credentials are accepted from the request.

H4. seedSchoolDefaults() SEEDED NOTHING.            -> FIXED
    Rewrote app/Database/Seeds/SchoolLocal/SafeDefaultsSeeder.php to insert real
    structural defaults and wired it into the provisioning service.
    PROVEN ON PRODUCTION: 7 settings inserted
      attendance_target_percent, currency, fee_number_sequence,
      receipt_number_sequence, school_initialized, session_status, timezone
    IDEMPOTENCY PROVEN: a second retry left 8 rows, 0 duplicate keys, and did
    NOT delete the 2 student rows that already existed.

--------------------------------------------------------------------------
## MEDIUM � ALL FIXED
--------------------------------------------------------------------------
M1. ORPHAN EMPTY DIRECTORIES                      -> FIXED
    Removed app/Controllers/SchoolLocal and app/SchoolLocal/Database.
    NOTE: during this cleanup app/SchoolLocal was removed by mistake because it
    DOES hold the school-local migrations. It was immediately restored from the
    package staging copy, all 8 migrations re-verified (AppSchool namespace,
    22 tables created), and the AppSchool autoload entry confirmed intact.
    This is recorded here rather than hidden.

M2. app/Policies/RolePolicy.php WAS DEAD CODE      -> FIXED
    Rewrote RolePolicy as the single source of truth for role answers and wired
    it into both SuperAdminFilter and RoleFilter.

M3. DOCS STALE / INCONSISTENT                     -> FIXED
    docs/api/openapi-v0.md changed from DRAFT to IMPLEMENTED and now carries a
    table of all 21 implemented routes with their guards and plane.
    The stale `"environment": "development"` example was corrected.

M4. TEST SUITE THIN / WEAK                        -> FIXED
    Added tests/Feature/RoleAccessTest.php: 7 tests / 29 real assertions covering
    role policy logic, group/config consistency, filter registration and that
    tenant resolution never reads a school id from input.
    HONEST LIMITATION, recorded not hidden: the phpunit test database
    (database.tests.*) is not migrated in this project, so an end-to-end request
    test that reaches Shield's session authenticator would fail on a missing
    `settings` table. Writing such a test and skipping it would be a fake pass,
    so it was not written. End-to-end role enforcement is instead proven on the
    live deployment by the shell smoke test (12/12).

M5. NO MOBILE / PWA IMPLEMENTATION                -> FIXED
    Added public/manifest.json and public/sw.js (offline shell only; the API is
    never cached), plus app/Controllers/MobileApp.php serving a runtime copy of
    the approved Mobile App Preview with all demo literals bound to real school
    data. Route: GET /m (session + school role).
    PROVEN ON PRODUCTION: mobile test 6/6 passed, zero demo strings served.

--------------------------------------------------------------------------
## LOW � FIXED
--------------------------------------------------------------------------
L1. One backend test still skipped (environment-dependent) - unchanged.
L2. Stale "environment": "development" in openapi-v0.md - corrected.

--------------------------------------------------------------------------
## PRODUCTION VERIFICATION (live Hostinger deployment)
--------------------------------------------------------------------------
Role smoke test      12 / 12 PASSED   (anonymous + 5 roles, tenant isolation)
Write API test        5 /  5 PASSED   (create, duplicate refused, validation,
                                         list, anonymous write blocked)
Mobile / PWA test     6 /  6 PASSED   (auth gate, render, assets, no demo data)
Seeding               7 defaults inserted into the school database
Idempotency           retry: 0 duplicates, 0 data loss
Separation            students table exists ONLY in the school database;
                       control plane has 0 school-local tables
UI lock               3 / 3 unchanged
--------------------------------------------------------------------------
## STILL OPEN
--------------------------------------------------------------------------
- ~~No Git tag.~~ Closed 2026-10-21: annotated tag `v0.1.0-pre` (commit `b1267df…`)
  pushed to GitHub; build 9 rebuilt from it so the manifest records the tag. It is
  a pre-release tag, not a stable-release tag.
- The phpunit test database is not migrated (see M4).
- The SSH password exposed earlier in chat has still not been rotated by the
  owner. That credential is live.
