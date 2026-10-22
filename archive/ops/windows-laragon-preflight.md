# Windows + Laragon Local Preflight — C-02.1

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-02.1** (Batch A)
- Created: 2026-10-17
- Target stack (`PROJECT_MEMORY.md`): Windows + Laragon, PHP 8.2+, Composer, MySQL/MariaDB, Node.js LTS.
- Status: **Executed against this machine.** Findings below are real, captured 2026-10-17. Values are the current machine state, not assumptions.

## 0. Headline finding (must read first)

Two PHP installs exist. The `php` that resolves on `PATH` is **not** the fully-provisioned Laragon PHP:

| PHP | Path | Version | Required extensions |
|-----|------|---------|---------------------|
| **WinGet PHP (on PATH)** | `C:\Users\DEV\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_…` | 8.3.33 | **Missing `intl`, `mysqli`, `curl`, `fileinfo`, `gd`, `zip`** |
| **Laragon PHP (not on PATH)** | `C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe` | 8.3.30 | **All present** (intl, mysqli, pdo_mysql, mbstring, openssl, curl, dom, xml, fileinfo, gd, zip) |

**Impact (executed):** running the backend suite with the PATH PHP fails 22/22 with `Class "Locale" not found` (`intl` missing → CodeIgniter 4 bootstrap aborts). Running the same suite with the Laragon PHP passes **22/22, 81 assertions, OK**.

**Rule:** use the **Laragon PHP** for all backend commands (Composer, `phpunit`, `spark`, `php spark serve`). Either call its full path, add it to `PATH` ahead of the WinGet install, or configure Laragon's terminal. This is the single most important preflight step.

## 1. PHP — verify

```powershell
# Canonical binary for this project:
$php = 'C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe'
& $php -v                 # expect 8.3.x (>= 8.2)
& $php -m                 # confirm the extension list below
```

Required extensions for CodeIgniter 4 + this app (all **PRESENT** on Laragon PHP as of 2026-10-17):

`intl`, `mysqli`, `pdo_mysql`, `mbstring`, `openssl`, `curl`, `dom`, `xml`, `fileinfo`, `gd`, `zip`

If any is missing on a fresh Laragon PHP, enable it in Laragon → PHP → ini (or edit that PHP's `php.ini`) and restart. `intl` is **mandatory** — without it CI4 cannot boot (proven by the 22/22 `Locale` failure).

## 2. Composer — verify

- Check (executed): `composer` is **NOT on PATH**. Laragon bundles composer under `C:\laragon\bin\composer`.
- Dependencies are already installed in this repo (`backend/vendor/`, `vendor/autoload.php`, `vendor/bin/phpunit` all present), so Composer has run previously.

```powershell
$php = 'C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe'
# If a composer.phar/composer.bat is available (Laragon's composer dir or project):
& $php <path-to-composer> --version
cd 'F:\Project\zee Education update\backend'
& $php <path-to-composer> install      # only when dependencies need refreshing
```

Rule: invoke Composer **through the Laragon PHP**, not the PATH PHP, so `intl` and friends are present during platform checks.

## 3. MySQL / MariaDB — verify

- Check (executed): `mysql` client is **NOT on PATH**; Laragon bundles **MySQL 8.4.3** at `C:\laragon\bin\mysql\mysql-8.4.3-winx64`.
- Use Laragon's bundled client or HeidiSQL (also bundled) to connect.

```powershell
$mysql = 'C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe'
& $mysql --version
# Start MySQL from the Laragon UI, then:
& $mysql -u root -p -e "SELECT VERSION();"
```

App DB connectivity uses `pdo_mysql` (PRESENT). Create a dedicated app DB account with least privilege when provisioning begins; keep root for admin only.

## 4. Node.js — verify

- Check (executed): `node` on PATH = **v24.17.0** (works). Used successfully to run `frontend/tools/verify-reference-ui.mjs`.
- `PROJECT_MEMORY.md` asks for **Node.js LTS**; the installed v24 is newer than the current LTS line. This is acceptable for the hash verifier, but pin the exact runtime the team standardises on before CI. **Flagged for owner decision** (not a blocker for Batch A).

```powershell
node -v
```

## 5. Environment file

- `backend/.env` and `backend/.env.example` exist. **This preflight does not read or print `.env`** (no secret exposure).
- On a new machine: copy `.env.example` → `.env` and fill values locally. Never commit real secrets. Set `app.corsAllowedOrigins` to the explicit origin(s) in use; leave it empty to keep CORS closed (deny-by-default).

## 6. Run the backend suite (proves PHP + extensions + framework)

```powershell
$env:CI_ENVIRONMENT = 'testing'
$php = 'C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe'
cd 'F:\Project\zee Education update\backend'
& $php vendor\bin\phpunit --no-coverage
```

Expected: `OK (n tests, m assertions)`. On 2026-10-17 this returned **`OK (22 tests, 81 assertions)`**. If you instead see `Class "Locale" not found`, you are on the wrong PHP (missing `intl`) — see §0.

## 7. Run the UI-lock hash gate (proves reference UI intact)

```powershell
cd 'F:\Project\zee Education update\frontend'
node tools\verify-reference-ui.mjs
```

Expected: `UI LOCK OK — 3/3 reference files unchanged.` (exit 0).

## 8. Preflight go/no-go checklist

Tick every box before local development or a pilot handoff is considered ready.

- [ ] Using **Laragon PHP** (≥8.2), not the WinGet PATH PHP — `& $php -v` shows Laragon build.
- [ ] `& $php -m` includes **intl, mysqli, pdo_mysql, mbstring, openssl, curl, dom, xml, fileinfo, gd, zip**.
- [ ] Composer runs **via Laragon PHP**; `composer install` completes; `backend/vendor/autoload.php` present.
- [ ] MySQL/MariaDB started from Laragon; client connects (`SELECT VERSION();` succeeds).
- [ ] `backend/.env` created from `.env.example` locally (not committed); `app.corsAllowedOrigins` set to explicit origin(s) or left empty (deny-by-default). No `*`.
- [ ] Backend suite green: `OK (22 tests, 81 assertions)` (or newer count) with Laragon PHP.
- [ ] UI-lock gate green: `UI LOCK OK — 3/3`.
- [ ] Node runtime pinned/decided for CI (see §4 flag).
- [ ] Per ADR-001: provisioning will create a **dedicated database per school**; no shared `tenant_id`-only design used as a substitute.

## 9. Known gaps (not defects of this preflight)

- No deployment pipeline, no migrations, no auth yet — these are future work; the preflight only proves the local toolchain can build and test what exists today.
- The PATH-PHP `intl` gap (F-1) is an environment configuration issue with a known fix (use Laragon PHP); it is **not** a code defect.

