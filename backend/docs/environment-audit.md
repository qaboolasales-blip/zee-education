# Environment Audit — Zee Education Backend

Audit performed: 2026-10-18
Scope: `backend/` CodeIgniter 4 application only.

## Confirmed available

| Component | Version | Notes |
|---|---|---|
| PHP | 8.3.33 (cli) (ZTS Visual C++ 2019 x64) | Exceeds minimum 8.2. |
| CodeIgniter 4 framework | v4.7.5 | Located at `backend/vendor/codeigniter4/framework`. |
| PHPUnit | 10.5.66 | Via `backend/vendor/bin/phpunit`. |
| PDO | enabled | Required for MySQL connectivity. |
| pdo_mysql | enabled | Required for MySQL connectivity. |
| mysqlnd | enabled | Required by CI4 for MySQL. |
| mbstring | enabled | Required by CI4. |
| json | enabled | Default; must remain enabled. |

## Disabled but present (configuration fix needed)

| Component | Status | Impact |
|---|---|---|
| **intl** | DLL present (`php_intl.dll`) but **commented out** in php.ini | **BLOCKER.** CI4 `CodeIgniter::initialize()` calls `Locale::setDefault()`. Without `intl` enabled, every CI4 request (including tests) throws `Class "Locale" not found`. Fix: uncomment `extension=intl` in php.ini. |
| **mysqli** | DLL present (`php_mysqli.dll`) but **commented out** in php.ini | Blocks MySQL-backed tests. Fix: uncomment `extension=mysql` in php.ini. |

## Missing / unavailable

| Component | Status | Impact |
|---|---|---|
| **Composer** (global command) | **NOT INSTALLED** | Required to install/modify dependencies. `composer create-project` cannot run. However, `backend/vendor/` already contains a fully installed CI4 app. |
| **MySQL / MariaDB server** | **NOT RUNNING** | No `mysqladmin`, no service, no Laragon MySQL binary found. Control-plane database cannot be created or migrated. Live migration tests must be skipped. |
| **Laragon** | Directory exists (`C:\laragon`) but MySQL binaries not found | Local dev server not confirmed running. |
| **Code coverage driver** | Not installed (Xdebug/PCOV) | PHPUnit warning only — does not block test execution. |

## Enabled PHP extensions (full list)

bcmath, calendar, Core, ctype, date, dom, filter, hash, iconv, json, libxml, mbstring, mysqlnd, openssl, pcre, PDO, pdo_mysql, Phar, random, readline, Reflection, session, SimpleXML, SPL, standard, tokenizer, xml, xmlreader, xmlwriter, zlib

## Required extensions for CI4 + Zee Education

| Extension | Required? | Present? | Enabled? |
|---|---|---|---|
| intl | **YES** — CI4 hard dependency | YES (DLL present) | **NO** — commented out |
| mbstring | YES | YES | YES |
| mysqlnd | YES | YES | YES |
| pdo_mysql | YES | YES | YES |
| mysqli | YES — required by MySQLi driver | YES (DLL present) | **NO** — commented out |
| json | YES | YES | YES |

## Test results (with intl + mysqli enabled via CLI flags)

```
PHPUnit 10.5.66
Runtime: PHP 8.3.33
Tests: 27, Assertions: 107, Errors: 0, Warnings: 1
Warning: No code coverage driver available (expected — Xdebug/PCOV not installed)
```

Command used:
```bash
cd backend
php -d extension=php_intl.dll -d extension=php_mysqli.dll vendor/bin/phpunit -c phpunit.dist.xml
```

## Blocker summary

1. **intl extension disabled** — uncomment `extension=intl` in `C:\Users\DEV\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.ini`. All tests pass once enabled.
2. **mysqli extension disabled** — uncomment `extension=mysql` in same php.ini. Required for database-backed tests.
3. **MySQL/MariaDB not running** — blocks live migration execution. Migration smoke test gracefully skips when no DB is available.
4. **Composer not available globally** — not blocking; `backend/vendor/` is already populated.

## Verification commands used

```bash
php -v
php -m
php -r "echo extension_loaded('intl') ? 'intl_OK' : 'intl_MISSING';"
php -r "echo extension_loaded('mysqli') ? 'mysqli_OK' : 'mysqli_MISSING';"
php -d extension=php_intl.dll -d extension=php_mysqli.dll backend/vendor/bin/phpunit -c backend/phpunit.dist.xml
```