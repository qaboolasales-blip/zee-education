# PACKAGING DECISIONS — Zee Education commercial package

Build date: 2026-10-19 (rebuild of the 2026-10-18 build — see section 9)
Package name: `Zee_Education_v0.1.0_Hostinger_Installer.zip`

---

## 1. Version and commit

| Item | Value |
|---|---|
| Product version | **0.1.0** (from `app/Config/ZeeEducation.php::$appVersion`) |
| Source commit | `0ee7a233b493921c54795f6441acbaeb4537d281` (`main`) |
| Git tag | **NONE** |
| Working tree | **dirty — 98 changed/untracked entries** |

### Truthful version statement

There is **no Git tag** in this repository, and the working tree is not committed.
Therefore this package is a **PRE-RELEASE build**, versioned `0.1.0-pre`, and it is
**not** a tagged release. The commit above is only the last committed revision; the
files actually shipped in this ZIP include uncommitted work.

This is stated here so no buyer is ever told the package came from a tagged release.

---

## 2. Install model supported

### Platform Owner / Super Admin (control-plane) installation

This package installs a **Super Admin control plane**. The installer's only supported
mode is "Platform Owner". It is explicitly **not** a public multi-school signup.

The Super Admin:
- manages schools and installations
- sees commercial records and provisioning state
- **never** browses learner data

### One school = one database (non-negotiable)

Every school owns a **separate database**. The control plane holds only
school/install metadata. It must never hold student, guardian, staff, attendance,
results or fee tables.

This is enforced in code and was verified on a real deployment:

| Check | Result |
|---|---|
| school-local tables inside the control-plane DB | **0** |
| control-plane tables inside a school DB | **0** |
| control user writing into a school DB | `ERROR 1142` denied |
| school user writing into the control DB | `ERROR 1142` denied |

A shared table scoped only by `tenant_id` is **forbidden** and is not used anywhere.

---

## 3. Hostinger constraints discovered (from a real deployment)

These were found by installing on a live Hostinger shared-hosting account, not guessed.

| Constraint | Evidence |
|---|---|
| SSH available on port 65002 | login succeeded |
| PHP 8.3.35, `intl`, `mbstring`, `mysqli`, `openssl` present | preflight PASS |
| Composer 2.9.8, MariaDB client 11.8.9 | present |
| **Application DB user cannot `CREATE DATABASE`** | `ERROR 1044 Access denied` |
| **Application DB user cannot `CREATE USER`** | `ERROR 1227 you need the CREATE USER privilege` |
| **Application DB user cannot `GRANT`** | `ERROR 1044 Access denied` |
| Web root **must** point at `public/` | installer preflight check |
| `netdeveloper.online` host folder may already be a **symlink to another live app** | verified, must not overwrite |

### Safe fallback when `CREATE DATABASE` is not available (shared hosting)

This is the documented and supported path. It does **not** weaken the
one-school-one-database rule.

1. The buyer (or Hostinger support) creates **one database + one MySQL user per school**
   in the hosting panel.
2. The mapping from school code to database name is written into the **server-local
   `.env`** as:

   ```
   schooldb.default.hostname = localhost
   schooldb.default.database = <school database name>
   schooldb.default.username = <school database user>
   schooldb.default.password = <school database password>
   ZEE_SCHOOL_DB_PREFIX = <prefix>
   ZEE_SCHOOL_DB_MAP  = <schoolcode>=<database name>,<schoolcode2>=<database name2>
   ```

3. The Super Admin provisions the school through the normal flow. The application then
   applies **only** the school-local migrations to that dedicated database.

Credentials for a school database are **never** entered through a browser form. They come
from protected server-local configuration only.

When the hosting plan *does* grant `CREATE DATABASE`, the same flow works unchanged; the
service verifies the database is reachable and refuses to continue if it is not.

---

## 4. Dependencies: included vs installed by the buyer

| Dependency | Version | How it ships |
|---|---|---|
| codeigniter4/framework | v4.7.5 | **included** in `application/vendor` (built with `composer install --no-dev --optimize-autoloader`) |
| codeigniter4/shield | v1.4.1 | **included** |
| codeigniter4/settings | v2.4.0 | **included** |
| endroid/qr-code | 5.1.0 | **included** (school invite QR codes; see section 9 for the font decision) |
| bacon/bacon-qr-code, dasprid/enum | (transitive) | **included** |
| laminas/laminas-escaper, psr/log, psr/container | (transitive) | **included** |
| phpunit, fakerphp, vfsStream, mockery + 27 transitive | dev only | **excluded** |

Including `vendor/` means the buyer does **not** need Composer or SSH to install.
`composer.json` and `composer.lock` are still shipped so the installation can be
maintained or updated later.

Third-party licenses are MIT and are shipped with their packages inside `vendor/`.
Re-distribution is permitted.

---

## 5. Migration architecture

Two completely separate migration namespaces. This split is what prevents a control-plane
mistake from ever writing into a school database.

| Namespace | Path | Target |
|---|---|---|
| `CodeIgniter\Shield` | vendor | control plane |
| `CodeIgniter\Settings` | vendor | control plane |
| `App` | `application/app/Database/Migrations` | control plane |
| `AppSchool` | `application/app/SchoolLocal/Database/Migrations` | **each school database** |

### Control-plane order (fixed)

```
CodeIgniter\Shield  ->  CodeIgniter\Settings  ->  App
```

Run by the installer, one namespace at a time. Never with `--all`.

`--all` is explicitly forbidden: it recurses into every registered namespace and would run
school migrations against the control plane. This was an actual defect found and fixed
during this work.

### School order

```
AppSchool
```

Run only by `SchoolProvisioningService::applySchoolMigrations()` against the dedicated
school connection.

---

## 6. First-run installer

Implemented as a real flow, not static screens.

| Step | What it does |
|---|---|
| 1 | Server preflight: PHP version, `intl`/`mbstring`/`mysqli`/`json`/`openssl`, writable paths, web-root-is-`public/`, HTTPS base URL, DB configured |
| 2 | Control-plane database connection test (uses only the server `.env`, never the browser) |
| 3 | Migrations in fixed order |
| 4 | First Super Admin with validated data and strong password rules |
| 5 | Install lock written to `writable/install.lock` |

Once locked, `/install` redirects to `/login` through `InstallLockFilter`, so the public
installer never reappears.

### Verified end-to-end locally

- preflight: **14 PASS / 0 FAIL**
- migrations: 14 tables created in the correct order
- Super Admin: row created, `superadmin` group attached, `email_password` identity saved
- lock written, `/install` → `/login`
- **login succeeded**, `auth_logins` row written

---

## 7. What is deliberately EXCLUDED from the package

Excluded, and verified absent from the built ZIP:

- `.env` (the real server environment file) and every `.env.*` variant
- `writable/install.lock`
- `writable/cache/*`, `writable/logs/*`, `writable/session/*`, `writable/debugbar/*` contents
- `writable/uploads/*` (user uploads)
- `tests/` and `phpunit.dist.xml`
- `.git/`, `.gitignore`, `.github/`
- agent handoff folders, batch reports, status notes
- pilot / release reports of the vendor's own deployment
- any SQL dump, database export, or backup
- `node_modules/`, `*.log`, `*.sql`, `.DS_Store`
- `docs/` internal API notes of the development repository

Included deliberately:

- `vendor/` production dependencies (so the buyer needs no Composer)
- `composer.json` / `composer.lock`
- migrations, installer, configuration
- `documentation/` written for the buyer
- `.env.example` with placeholders only

The three approved reference UI HTML files are **never** copied into the package and were
never modified. They are the vendor's internal design authority, not shipped assets.

---

## 8. License activation

There is **no** online licence server and **no** automated activation and **no**
payment gateway.

Licensing is handled manually and owner-controlled, per the project's commercial rules:
setup/installation is a one-time charge, licence/renewal/hosting are separate line items,
and prices are negotiated per school with no hard-coded public price.

What this release added is the **bookkeeping**, not the money movement: the control plane
now stores licence plans, school licences, invoices and payments, and the Super Admin can
record them through `POST /api/admin/billing/*` (9 routes, `superadmin` + `api_csrf`
filter chain, contract in `backend/docs/api/billing-api.md`). A licence key is returned
once at issue and only its hash is stored afterwards. Money itself still changes hands
outside the product, by bank transfer or cash.

This is documented honestly in `documentation/10-license-and-support.md`. No fake
activation screen is shipped.

---

## 9. Rebuild decisions — 2026-10-19

The package was rebuilt from source after the licence/billing work landed. Every
statement in sections 1-8 still holds; this section records what changed and why.

### 9.1 The build is now reproducible

| Item | Before | Now |
|---|---|---|
| How staging was produced | ad-hoc copies by hand | `release/build-package.ps1`, one command |
| Where static package files live | only inside the previous ZIP | `release/package-assets/` (root files, `documentation/`, `database/README.md`, `tools/`) |
| Verification | on the build folder | **twice**: build folder and the extracted ZIP |

```powershell
powershell -ExecutionPolicy Bypass -File release\build-package.ps1 -Composer <path\to\composer.phar>
```

The script stages `backend/app` + `backend/public`, installs production dependencies,
builds the writable skeleton, writes `package-manifest.json`, verifies, zips, re-extracts
and verifies again, then regenerates `SHA256SUMS.txt`. The previous ZIP is kept as
`*.zip.bak-<timestamp>` rather than overwritten silently.

### 9.2 Dependency defects found and fixed by this rebuild

The 2026-10-18 package was **stale relative to the source it claimed to ship**, in two ways:

1. **Missing production packages.** `app/Libraries/QrRenderer.php` uses
   `endroid/qr-code`, but the shipped `composer.lock` and `vendor/` predated it.
   The old package would have fataled with *Class not found* on the first school invite
   QR code. `endroid/qr-code`, `bacon/bacon-qr-code` and `dasprid/enum` are now installed
   and present.
2. **Stale optimized autoloader.** The build uses `--optimize-autoloader`, so the
   shipped `vendor/composer/autoload_classmap.php` is authoritative. It did not know
   about `BillingApi`, `ApiCsrfFilter`, `LicenseService` or `QrRenderer`. The classmap
   is regenerated on every build and now lists them.

Dev dependencies (phpunit, faker, vfsStream + 27 transitive) are excluded as before;
the shipped `installed.json` reports `"dev": false` with exactly 8 production packages.

### 9.3 What the build strips, and why

| Removed | Reason |
|---|---|
| `vendor/codeigniter4/framework/tests/` (10 files) | the framework's own test suite is not part of the product; its presence triggers the verifier's "test folder shipped" warning |
| `vendor/endroid/qr-code/assets/*.otf`, `*.ttf` (16.6 MB) | those two fonts are read **only** when a QR code carries a text label or logo (`Label.php` / `Logo.php`). `QrRenderer` sets neither, so nothing in the product ever opens them. Shipping them would have cost every buyer 16 MB of dead weight (ZIP 17.1 MB → 3.9 MB). The constraint is written into `QrRenderer.php`: if a label is ever added, the fonts must come back in the same change. |
| `vendor/composer/tmp-*.zip` | composer download leftovers that were shipped in the previous build |

### 9.4 PWA service worker

`public/sw.js` cached `/m`. That was wrong twice over:

- `/m` is rendered per signed-in user from that user's own school. The Cache API is one
  shared store per device, so a cached copy would be served to the **next** person who
  opened the app on the same phone — one school's students shown to another school.
- An install-time fetch of `/m` is made without a session, so the server redirects it to
  the sign-in page. The cache would hold the sign-in page and then serve that in place
  of the app.

The shell list now contains only `/manifest.json`, and the cache version was bumped
`zee-shell-v1` → `zee-shell-v2` so any v1 cache (still holding a copy of the sign-in
page) is deleted on activation. No authenticated page and no API response is ever cached.

### 9.5 Not shipped: internal API notes

`backend/docs/` (including `billing-api.md`) stays in the repository and is **not** in the
package, exactly as before. `documentation/01..10` remains the buyer-facing set, unchanged
and still fully offline.