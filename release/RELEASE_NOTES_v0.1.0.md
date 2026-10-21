# Zee Education v0.1.0 — Release Notes

**Build date:** 2026-10-21 (build 9; rebuilds build 8/7/6 of 2026-10-20, build 5 of 2026-10-20, build 4 of 2026-10-20, build 3 of 2026-10-20, build 2 of 2026-10-19 and build 1 of 2026-10-18)
**Package:** `Zee_Education_v0.1.0_Hostinger_Installer.zip`
**Commit:** `b1267dfba2ac22b8de2aec9ba913e4e8d9ad179f` (tag `v0.1.0-pre`)
**SHA-256:** `46f5a4877618e3d0ae253781b1e34219d8dd67a02f0b2084d5e90d23db99186c`
(verify with `sha256sum` against `SHA256SUMS.txt`, then run `php tools/verify-package.php`)
**Release type:** PRE-RELEASE — tagged **`v0.1.0-pre`** (pre-release tag, not a stable release)
**Installation mode:** Platform Owner / Super Admin control plane

---

## Read this first

This is a **pre-release**, tagged `v0.1.0-pre` (a pre-release tag, not a stable
release). The source tree is committed and pushed to GitHub; the tag points at the
exact commit this package was built from. Treat it as an early build for a controlled
pilot. `PACKAGE_BUILD_REPORT.md` records exactly what was and was not verified.

No claim is made about CodeCanyon approval or any marketplace review. This is a
CodeCanyon-*style* commercial package only.

---

## What is new in 0.1.0

### The installer is real now

The first-run installer at `/install` is a working flow, not a placeholder:

- **Step 1** — server preflight (PHP >= 8.2, `intl`, `mbstring`, `mysqli`, `json`,
  `openssl`, writable folders, document root is `public/`, HTTPS base URL, database
  configured) with actionable fixes for every red item.
- **Step 2** — control-plane database connection test, then migrations in a fixed order.
- **Step 3** — creates the first Super Admin with strong password rules.
- Then it **locks itself**; `/install` redirects to sign-in.

**Verified end-to-end from the shipped ZIP:** preflight 14/14, correct migration order,
Super Admin created with the `superadmin` group and an email identity, installer locked,
and sign-in succeeded.

### Dedicated school databases that actually work

`SchoolProvisioningService` no longer returns `true` without doing anything. It now:

- verifies the school's dedicated database is reachable,
- applies **only** the school-local migrations to it,
- drives an explicit state machine
  (`requested → validating → creating → migrated → seeded → completed / failed`),
- is safe to retry without duplicating anything.

**Verified:** two synthetic schools provisioned into two separate databases.

| Database | Tables | Contains |
|---|---|---|
| control plane | 14 | schools, users, provisioning, commercial, audit |
| school A | 22 | classes, sections, students, staff, attendance, marks, fees |
| school B | 22 | same schema, separate data |

- school-local tables inside the control plane: **0**
- control-plane tables inside a school database: **0**
- a marker row written in school A is invisible in school B and in the control plane

### Security corrections

- `/health` no longer lies. It performs a real query instead of trusting a lazy
  connection object.
- CORS allow-list restricted to the real production origin; placeholder
  `example.edu` origins removed.
- The debug toolbar is disabled while the app is uninstalled, so the installer can boot
  before the settings table exists.
- The production `.env` template no longer carries the test-database block, so a test run
  can never truncate production data.
- `session.savePath` expression removed from the template; it broke the dotenv parser.

### Correctness fixes found during this work

- School-local migrations were living inside the control-plane migration folder, so
  `migrate --all` wrote student tables into the control plane. They now live in their own
  `AppSchool` namespace.
- `MigrationRunner::latest()` silently ignored its namespace argument; `setNamespace()` is
  now used.
- School database reachability was verified through the control-plane connection, which
  has no rights there.
- `SchoolsModel` was silently dropping `school_code`.
- Provisioning states did not match the `installation_state` column type.
- Duplicate unique indexes on `students.admission_number` and `staff.employee_id` crashed
  the school migrations.
- `FeeInvoiceModel` and `FeeReceiptModel` shared one file, so neither could be autoloaded.
- A host-specific hosting account identifier was hardcoded in the provisioning service and
  would have leaked into every distributed copy. It now requires server configuration.

---

## What changed in the 2026-10-19 rebuild

Two real defects in the previous package were found and fixed, and new commercial
features were added. Full reasoning: `PACKAGING_DECISIONS.md` §9.

**Fixes to the package itself:**

- The previous ZIP predated `endroid/qr-code`, which `QrRenderer` needs. Issuing a school
  invite QR code would have fataled with *Class not found*. The library and its
  dependencies are now installed and shipped.
- Its optimized autoloader did not know about the newer classes. Every build now
  regenerates `vendor/composer/autoload_classmap.php` from the current source.
- Composer download leftovers (`vendor/composer/tmp-*.zip`) are no longer shipped.
- `public/sw.js` used to cache `/m`, a page rendered per signed-in user. On a shared
  phone that meant one user's school data could be replayed to the next. The service
  worker now caches only `/manifest.json`, and the cache version bump purges any old copy.

**Documentation honesty (shipped docs corrected where they over-claimed):**

- The security guide no longer says CSRF protects "every form" — it now states the real
  posture: token verification on the billing API, `SameSite=Lax` + `HttpOnly` cookie
  defence on the other routes, blanket checking planned but not in this build.
- The troubleshooting guide's health-endpoint example now matches the real response,
  which includes version and milestone fields.
- `LICENSE.txt` and `README_FIRST.txt` no longer say the control plane holds *only*
  school and installation records; licence-billing records are listed and the ban on
  learner tables is unchanged.

**New in this build:**

- **Licence and billing bookkeeping in the control plane** — 6 new migrations
  (`license_plans`, `school_licenses`, `license_invoices`, `license_payments`,
  `school_db_credentials`, `school_invites`) plus a plan seeder.
- **Super Admin billing API** — 9 routes under `/api/admin/billing` for issuing, paying,
  voiding and renewing licence invoices, behind `superadmin` + CSRF verification, with an
  audit row for every action. There is still **no payment gateway**: money moves outside
  the product and the API only records it. Contract: `backend/docs/api/billing-api.md`
  in the repository; shipped to buyers as `documentation/11-billing-api.md`.
- **QR school invites** — `/api/connect/invite` (signed-in school role required) and the
  scannable `/connect/qr`.
- **Buyer guide 11** — the billing API reference is now part of the package's
  documentation set (guides 1-11), so the feature is usable straight from the ZIP.
- **Security hardening (build 4)** — five security headers (`X-Frame-Options`,
  `X-Content-Type-Options`, `X-Download-Options`, `X-Permitted-Cross-Domain-Policies`,
  `Referrer-Policy`) on every response; the CORS filter is now actually applied, so
  allowlisted origins get an explicit header, `OPTIONS` preflights are answered, an
  empty `app.corsAllowedOrigins` emits no CORS header at all and a wildcard stays
  impossible; the session cookie's `Secure` attribute is controlled by
  `cookie.secure = true` in `.env` (switch off only for plain-HTTP local development).
  Honest note: no `Content-Security-Policy` is emitted in this build (needs per-view
  nonces first), and `tokenRandomize` stays off (session-mode tokens are not
  cookie-readable; recorded hardening limitation).

**Verified for this build:** `verify-package.php` 35/35 clean on the build tree
*and* byte-identical extraction (1,308 files); reference UI hashes 3/3 unchanged; no real
`.env`, no private keys, no hosting account id, no pilot test data anywhere in the package;
backend tests **164 tests / 673 assertions / 0 skipped / 0 failures** (green with the global
CSRF filter enabled; CI empty-DB recipe re-validated at the same counts; 671 assertions
before the 2026-10-21 tag-round `ConnectTest` rewrite); a 39-check live
runtime security matrix passed (incl. session-fixation checks SF-01/SF-02 and the global-CSRF
polarity checks `I1`/`I2`/`I3`; repo-only evidence: `quality/docs/security-runtime-review.md`).

---

## Hosting support

Built and verified against a live Hostinger shared-hosting account:

- PHP 8.3.35, `intl`, `mbstring`, `mysqli`, `openssl` present
- Composer 2.9.8 and MariaDB client available
- SSH on port 65002

**Important limit:** on that plan the application database user **cannot**
`CREATE DATABASE` (`ERROR 1044`) or `CREATE USER` (`ERROR 1227`). Automatic provisioning
is therefore impossible on shared hosting, and the package documents the supported path:
the host pre-creates one database and one user per school, and the application maps them
through server-local `.env` configuration.

**One school still gets one database.** The rule is never weakened.

---

## Known limitations

- **This build has not been deployed.** It was built and verified locally; no live host
  was touched and neither production database was checked. Do not skip the smoke test.
- No role smoke tests were executed on the pilot deployment — no owner-approved pilot
  accounts existed yet.
- **CSRF verification is active globally** (build 5): every state-changing request —
  school write endpoints, `/admin/schools*` POSTs and Shield's own
  sign-in/2FA/magic-link forms — refuses token-less mutations with `403`. The billing
  API keeps its dedicated `api_csrf` filter so its documented JSON
  `{error: csrf_required}` contract is unchanged. Defence in depth on top: the session
  cookie is `SameSite=Lax` + `HttpOnly`, which browsers refuse to attach to cross-site
  POSTs.
- The Git tag `v0.1.0-pre` is a **pre-release** tag, not a stable-release tag.
- Backups are manual or cron-based; there is no built-in backup scheduler UI.
- No automated update mechanism.
- Licence activation and billing are **implemented** (licence plans, school licences,
  invoices, recorded payments, Super Admin billing API) but **payment is manual** —
  there is no online payment gateway; the owner records payments as they are received.
- Not tested on a real buyer account. Hostinger compatibility was validated locally and
  against the vendor's own live account, not against a fresh third-party purchase.

## Not included, by design

SMS · online payment gateway · unofficial/QR WhatsApp Web automation · automated WhatsApp
Business API · native app-store packaging

---

## Before you sell this

1. Deploy this exact ZIP to a **staging** database first, not straight to production.
2. Run the three migration namespaces in fixed order, confirm all 6 new licence tables
   exist in the control plane **and that the school database still holds 0 control-plane
   tables**.
3. Smoke: `/`, `/health`, `/login`, `/portal`, `/m`, sign in, provision a test school,
   issue + pay + void an invoice, confirm a missing CSRF token is refused with
   `403 csrf_required`, and confirm a fresh PWA install does not serve a cached
   sign-in page for `/m`. Build-5 additions: confirm a token-less browser sign-in
   attempt is refused with `403` while a normal sign-in still works; confirm
   `/api/connect/resolve` and `/api/connect/verify` return JSON (they were `500`
   before this build).
4. Re-run backup/restore on both databases and verify them clean of pilot data.
5. (done 2026-10-21) The working tree is committed and tagged `v0.1.0-pre`;
   build 9 was rebuilt from the tag so `package-manifest.json` records it.
6. Run the role smoke tests with real pilot accounts.
7. Have a second person run `php tools/verify-package.php` on the received ZIP and compare
   its SHA-256 with `SHA256SUMS.txt`.