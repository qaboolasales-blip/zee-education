# FINAL BACKEND RELEASE REPORT

Updated: 2026-10-19

## Scope

This report covers **backend code verification only**. It is not a product release
decision — that lives in `FINAL_RELEASE_AND_PILOT_REPORT.md`, which still reads
`FINAL_RELEASE_STATUS: BLOCKED`.

## Git
- Branch: main
- Commit hash: 0ee7a23 — **the working tree is not committed** (~146 changed/untracked
  entries), so this commit does not describe what ships.

## PHP/Composer/MySQL
- PHP: 8.3.33 (cli)
- Extensions: intl, mbstring, pdo_mysql, mysqli, dom, xml, openssl present
- Production dependencies installed with `composer install --no-dev
  --optimize-autoloader`; shipped `installed.json` reports `dev: false`, 8 packages.

## Composer audit
- No security vulnerability advisories found.

## Migrations
- Run and evidenced **after** this report's first version: control-plane order
  Shield → Settings → App proven on a live Hostinger database and on synthetic databases;
  school-local migrations run only through `SchoolProvisioningService` against each
  school's own database.
- The 6 licence migrations (`2026-10-19_000010..000015`) have **not yet run against a
  live database** — they ship with build 2 and are on the smoke checklist.

## Tests
```
php vendor/bin/phpunit --no-coverage
Tests: 155, Assertions: 621, Skipped: 0, Failures: 0
```

## Security/isolation verification
- No debug routes found.
- No wildcard authenticated CORS found.
- No payment gateway / SMS / unofficial WhatsApp automation in app code.
- No school-local student table in control-plane migrations (and 0 school-local tables
  in the live control-plane database).
- Package build passes `verify-package.php` 35/35 with no `.env`, no private keys, no
  hosting account id and no pilot test data shipped.

## Remaining blockers (product level, not backend scope)
- No live smoke test of the current build; no role smoke tests (no approved accounts).
- No Git tag.
- CSRF verification active only on `/api/admin/billing/*`; school writes and the auth
  forms rely on `SameSite=Lax` cookies.
- Exposed SSH password not yet rotated by the owner.

## Go/no-go recommendation
BACKEND_CODE_STATUS: GO — backend tests, audit, isolation and package verification pass.
PRODUCT_RELEASE_STATUS: **BLOCKED** — see `FINAL_RELEASE_AND_PILOT_REPORT.md`.
