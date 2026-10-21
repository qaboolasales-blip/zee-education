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
php -d extension=php_intl.dll -d extension=mysql backend/vendor/bin/phpunit -c backend/phpunit.dist.xml
```

## Update 2026-10-20 — CI recipe validation and a `spark`/`testing` quirk

The numbers above are the original 2026-10-17 audit (27 tests); the current suite is
164 tests / 671 assertions (155/621 when this section was written, before
`SecurityHeadersRuntimeTest` landed; 161/653 after the security round; +3
`ConnectApiTest` in the build-5 CSRF round, green **with the global `csrf`
filter enabled**). Two new environment facts were established while authoring
`.github/workflows/ci.yml`:

1. **`php spark` + `CI_ENVIRONMENT = testing` is fatal in CI4 4.7.5.**
   `Config\AutoloadConfig::__construct()` branches on
   `$_SERVER['CI_ENVIRONMENT'] === 'testing'` and then references `SUPPORTPATH`, which
   is only defined by the PHPUnit bootstrap (`system/Test/bootstrap.php:67`) or
   `system/util_bootstrap.php` — neither runs in `spark`, so boot dies with
   `Undefined constant "CodeIgniter\Config\SUPPORTPATH"`. Workaround used by the CI
   workflow (and by all local runs): keep `CI_ENVIRONMENT = development` in `.env` and
   let PHPUnit force `testing` itself (`system/Test/bootstrap.php:28-29` overwrites
   both `$_SERVER['CI_ENVIRONMENT']` and `ENVIRONMENT` before anything else). Database
   targeting then relies on group choice, not environment: `spark` uses the default
   group, phpunit uses `tests`.
2. **A from-scratch backend run needs four inputs, in this order:** (a) two empty
   databases with `utf8mb4_unicode_ci` (control/test + school), (b) `spark migrate -n
   "CodeIgniter\Shield"` → `-n "CodeIgniter\Settings"` → `-n "App"` (never `--all`),
   (c) `spark db:seed LicensePlansSeeder` (billing tests assert plan rows exist), and
    (d) the `AppSchool` namespace applied to the *school* database — `spark` has no
    schooldb-group concept, so the recipe points `database.default` at the school DB for
    that one command. Validated 2026-10-20 from empty databases: `OK (155 tests, 621
     assertions)` with control/test histories untouched; **re-run from fresh empty
     `zee_ci`/`zee_ci_school` after the security round the same day: `OK (161 tests,
     653 assertions)`** on the identical recipe (harness DBs dropped and `backend/.env`
     restored afterwards); **re-run again in the build-5 CSRF round: `OK (164 tests,
     671 assertions)`** from fresh empty harness DBs — confirming the +3
     `ConnectApiTest` and the global-CSRF write-token retrofit need nothing beyond
     migrations + `LicensePlansSeeder` (control-school history still 1 row after the
     run; `backend/.env` restored byte-identical).

3. **`TestResponse::getHeader()` does not exist and silently returns `null`.**
   `CodeIgniter\Test\TestResponse::__call()` (system/Test/TestResponse.php:489) forwards
   unknown methods to the response's DOM parser and returns `null` when the parser has
   no such method — so `$result->getHeader('X')` looks like "header absent" while the
   header is actually present on `$result->response()`. Cost a 4-test red run on the
   harness (where the allowlist is non-empty and the expected value is non-null, unlike
   the local dev `.env` where the bogus `null` matched the expected `null`). Read headers
    via `$result->response()->getHeaderLine()` or `TestResponse::assertHeader()`.

4. **`service('response')` is a singleton across feature-test requests.**
   A later `$this->post()`/`$this->get()` overwrites the *same* Response instance
   that an earlier `TestResponse` wraps — including its **status code** and body.
   Cost showed up in the build-5 CSRF round while probing `ConnectApi` contracts
   between calls: `$known->response()->getBody()` started returning the *later*
   response's body (and a later 403 would retroactively relabel an earlier 200's
   status). Rule: snapshot what you need (`getBody()`, `getHeaderLine()`,
   `response()->getStatusCode()`) **immediately after** each call, before making
   the next one. (`TestResponse` itself keeps its captured `body`/`status` from
   construction time for direct assertions — the aliasing only bites when reading
   back through `->response()` after subsequent requests.)