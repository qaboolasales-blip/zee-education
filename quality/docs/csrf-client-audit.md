# CSRF client audit — what breaks if the global `csrf` filter is turned on

- **Date:** 2026-10-20
- **Scope:** every state-changing (POST/PUT/PATCH/DELETE) surface in the shipped
  runtime, so RB-7's residual ("global `csrf` filter still off — requires
  client/multi-view work") can be stated precisely instead of speculatively.
  *(Executed same day — the residual was closed in the build-5 round; see §4.)*
- **Method:** exhaustive scans of `backend/app/Views/**` (`.php` **and** the
  byte-locked `.html` shells), `backend/public/**/*.js`, Shield's shipped views
  (`vendor/codeigniter4/shield/src/Views`), `backend/app/Views/setup`,
  `frontend/` (checked: contract/test scaffolding only — no runtime page), and
  the feature suite's write calls.
- **Live facts already proven** (`quality/docs/security-runtime-review.md` RT-6):
  billing mutations without a token get `403 csrf_required` via the scoped
  `api_csrf` filter — feature tests do **not** bypass CSRF (`BillingApiTest`
  posts without a token → refused, with `X-CSRF-TOKEN` → accepted).

## 1. Runtime HTML surfaces (what a browser actually submits today)

| Surface | Method | Token posture | Verdict |
|---|---|---|---|
| `Views/install/index.php`, `database.php`, `admin.php` (installer wizard) | POST forms | `<?= csrf_field() ?>` present in all 3 (`install/index.php:28`, `database.php:25`, `admin.php:18`) | **Ready** — works with global `csrf` on (routes are `InstallLockFilter`-locked after install anyway) |
| Shield login `vendor/…/shield/src/Views/login.php:32` | POST form | `csrf_field()` present | **Ready** — enabling global `csrf` closes login-CSRF immediately |
| Shield `register.php`, `magic_link_form.php`, `email_2fa_show/verify.php`, `email_activate_show.php` | POST forms | `csrf_field()` present in all | **Ready** |
| `Views/portal/superadmin.html`, `school.html`, `mobile.html` (byte-locked reference shells) | — | **zero** `<form>`, `fetch(`, `XMLHttpRequest`, `method:` or `/api/` occurrences (27–33 KB each, presentation-only) | **No mutating client exists** — nothing to break |
| `Views/setup/index.php` | — | no form, no fetch | No mutations |
| `public/sw.js` | GET only | `fetch(event.request)` only as cache-miss fallback for shell **page** requests (`SHELL.includes(url.pathname)`) | No mutations |
| `frontend/` (OpenCode adapters) | — | contract/test scaffolding; documented "no server session" (MB-4) | Not a shipped runtime client; token duty recorded in its pending contracts |

**Finding:** the entire live HTML surface that can POST already carries a CSRF
token. There is no shipped browser client that a global `csrf` filter would
break.

## 2. What actually blocks turning it on

The blockage is **not** browser clients — it is the API/test/contract surface:

| Blocker | Quantified evidence |
|---|---|
| Write-path feature tests posting without tokens | **7 files / ~53 write calls** with no token helper: `LicenseEnforcementTest` (14), `ProvisioningIdempotencyTest` (14), `PortalTest` (10), `ConnectTest` (8), `TenantIsolationTest` (5), `LicenseTest` (1), `SetupTest` (1). Suite would go red the moment `$globals.before['csrf']` is uncommented. The retrofit pattern already exists: `BillingApiTest::csrfToken()` + `withHeaders(['X-CSRF-TOKEN' => …])` (27 of ~80 write calls are already token-aware). |
| Future API clients (dashboard SPA, PWA wiring) | The live shells have no API calls yet; when they are wired they must read the CSRF cookie / hidden field and send `X-CSRF-TOKEN`. Contract duty is already noted in `frontend/core/auth/contracts/pending-auth-contract.js`. |
| Probe login helper | `security-runtime-probe.php` logs in with a bare POST; under global `csrf` it must first extract the hidden token from `GET /login`. |
| Shipped-config change | Uncommenting the filter in `Filters.php` changes shipped code → forces a rebuild (build 5) + re-verification. |

## 3. Verdict / recommendation

- **RB-7's wording stands, now precisely scoped:** the residual is a
  *test-suite retrofit + future-client token duty + rebuild*, not an unknown
  client dependency. No runtime HTML client is missing a token today.
- **Login CSRF specifically is one uncomment away** from being enforced
  server-side (Shield's form already carries the field); nothing in the live
  surface regresses by it — but the suite retrofit must land in the same round
  or the suite goes red.
- **Enabling round (defined, not executed):** (a) retrofit the 7 test files to
  the `csrfToken()` pattern; (b) teach the probe's login helper to carry the
  hidden token; (c) uncomment `'csrf' => …` in `$globals['before']`;
  (d) rebuild as build 5 (shipped config) + full SHA/count record churn;
  (e) probe matrix re-run (expect unchanged 36/36 + a new "global csrf on"
  negative check on install/login/one API — actual outcome in §4: **39/39**).
  Until that round runs, global `csrf`
  stays **off** and billing remains covered by `api_csrf` (CS-01/RT-6, 403-verified).

Related: `tokenRandomize` (SC-2) and per-view CSP nonces (SC-6) are independent
residuals — this audit does not cover them.

## 4. Enabling round — EXECUTED 2026-10-20 (build 5)

The round above ran the same day, with these refinements discovered while
executing:

| Planned step | As executed |
|---|---|
| Retrofit "the 7 test files (~53 calls)" | **Only 9 calls in 3 files were HTTP writes** — the ~53 figure counted Query Builder `->delete()` cleanup calls. `LicenseEnforcementTest` (6 × `withCsrf()->post()`), `ProvisioningIdempotencyTest` (2), `SetupTest` (1, untouched: `PageNotFoundException` fires at routing, *before* filters, so it still passes untokened). New shared trait `backend/tests/_support/CsrfTokenTrait.php` (`Tests\Support\CsrfTokenTrait`, proven `BillingApiTest::csrfToken()` pattern). |
| Uncomment `'csrf'` in `$globals['before']` | Enabled **with an `except`**: `'csrf' => ['except' => ['api/admin/billing*']]`. Billing must stay excepted: `Security::verify()` *consumes* the token (`removeTokenInRequest`) and regenerates it (`$regenerate=true`), so the global filter running before route-level `api_csrf` would leave the second check with nothing to verify and fail every billing write — and the framework's failure shape is an HTML/debug `403`, not the documented JSON `{error: csrf_required}` contract (`ApiCsrfFilter` exists precisely for that). |
| Teach the probe's login helper to carry the token | Done: `csrfTokenFor()` GETs `/login`, parses the hidden field, feeds `X-CSRF-TOKEN` + jar to `login()` and to `H2`'s pre-auth POST. |
| Probe re-run + new negatives | **39/39 PASS** (36 → +3: `I1` token-less non-billing API POST → `403 SecurityException`; `I2` token-carrying POST → `200 {found:false,…}`; `I3` token-less `POST /login` → `403`). |
| Rebuild as build 5 | Done — see `release/PACKAGE_BUILD_REPORT.md`. |
| Retrofit outcome | Suite green **with the filter on**: 164 tests / 671 assertions / 0 skipped (161 → +3 `ConnectApiTest`). |

**Collateral find (forced by `I2`):** `ConnectApi::resolve()/verify()` were
returning `500` on *every* call — they invoked `Throttler::checkTokens()`, a
method that does not exist (real API: `check()`), and the `verify:` bucket key
carried a `:` that PSR-6 cache keys reject (this would also have broken IPv6
clients). Both fixed, both now covered by `ConnectApiTest`; see
`security-runtime-review.md` RT-10. The probe's original A-block had been
reporting `status 500` for `/api/connect/verify` as a *passing informational
observation* the whole time — a lesson now recorded in RT-10: header-absence
checks cannot detect dead controllers.

Related (still open, unaffected by this round): `tokenRandomize` (SC-2) and
per-view CSP nonces (SC-6).
