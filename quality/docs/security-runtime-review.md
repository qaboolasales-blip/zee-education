# Security runtime review — CORS, security headers, cookies, CSRF (live assertions)

- Date: 2026-10-20
- Status: **pre-bundle executed (this document); post-bundle table appended in the same hardening round; `I` global-CSRF block appended in the build-5 CSRF round (39/39 final).**
- Scope: runtime header assertions on a local dev server (`php spark serve`) against real HTTP responses. Static review lives in `quality/docs/security-config-review.md` (§4 pointed here).
- Server: CodeIgniter 4.7.5, PHP 8.3.33, `http://127.0.0.1:8899`, local DBs `zee_education_control` + `zi_school_a` (school id 1 "Horizon Public School", state=completed).
- Driver: `quality/tools/security-runtime-probe.php` (committed, no secrets inside).
  - Usage: `php quality/tools/security-runtime-probe.php <pre|post> [baseUrl] [pathToEnv] [pathToSecrets]`
  - Reads `probe_secrets.json` (`{ "superadmin": "...", "school_admin": "..." }`) from its own directory or the 4th argument. **Not committed** — local credentials only (`%USERPROFILE%\role_accounts_credentials.txt` for the role accounts; superadmin created locally by raw SQL because `InstallerService::createSuperAdmin` short-circuits when `users` is non-empty).
  - The driver temporarily sets `app.corsAllowedOrigins` (and, post-bundle, `cookie.secure`) in `backend/.env` for the polarity checks and **restores the file in a `finally` block** — verified restored after every run.
  - Exits non-zero if any expectation fails. The two deliberate FAIL rows below are the pre-bundle finding (RT-2), not driver errors.

## 1. Pre-bundle run (before CORS/secureheaders/cookie wiring) — executed 2026-10-20

`phase=pre`: **28 checks — 26 PASS, 2 deliberate FAIL (RT-2), 0 driver errors.**

| Check | Expected | Observed | Result |
|---|---|---|---|
| A unauth+evil /health | no ACAO header | absent (status 200) | PASS |
| A unauth+evil /api/health | no ACAO header | absent (status 200) | PASS |
| A unauth+evil /api/school/students | no ACAO header | absent (status 302) | PASS |
| A unauth+evil /api/school/invoices | no ACAO header | absent (status 302) | PASS |
| A unauth+evil /api/admin/billing/summary | no ACAO header | absent (status 401) | PASS |
| A unauth+evil /api/connect/verify | no ACAO header | absent (status 500) | PASS |
| A unauth+evil /admin/schools | no ACAO header | absent (status 302) | PASS |
| A unauth+evil /portal | no ACAO header | absent (status 302) | PASS |
| A unauth+evil /school | no ACAO header | absent (status 302) | PASS |
| A unauth+evil /m | no ACAO header | absent (status 302) | PASS |
| B preflight OPTIONS evil | no ACAO header | absent (status 404) | PASS |
| E X-Frame-Options (on /health) | absent (filter not enabled) | absent | PASS |
| E X-Content-Type-Options (on /health) | absent (filter not enabled) | absent | PASS |
| E X-Download-Options (on /health) | absent (filter not enabled) | absent | PASS |
| E X-Permitted-Cross-Domain-Policies (on /health) | absent (filter not enabled) | absent | PASS |
| E Referrer-Policy (on /health) | absent (filter not enabled) | absent | PASS |
| E Content-Security-Policy | absent (CSP off, SC-6 open) | absent | PASS |
| C school_admin POST /login | 302/303 + ci_session cookie | status 303 \| ci_session=…; expires=…; Max-Age=7200; path=/; HttpOnly; SameSite=Lax | PASS |
| C authed(school_admin)+evil /api/school/students | no ACAO header | absent (status 200, headers-off) | PASS |
| C authed(school_admin)+evil /school | no ACAO header | absent (status 200, headers-off) | PASS |
| C authed(school_admin)+evil /m | no ACAO header | absent (status 200, headers-off) | PASS |
| C authed(school_admin)+evil /portal | no ACAO header | absent (status 302, headers-off) | PASS |
| D superadmin POST /login | 302/303 + ci_session cookie | status 303 \| ci_session=…; expires=…; Max-Age=7200; path=/; HttpOnly; SameSite=Lax | PASS |
| D billing POST w/o CSRF token | 403 csrf_required | status 403 body `{ "ok": false, "error": "csrf_required", "message": "A valid CSRF token is required…" } | PASS |
| F allowlisted origin on /health | ACAO echoes https://app.example.edu (filter wired) | ABSENT (cors filter not applied) | **FAIL (RT-2)** |
| F allowlisted origin on authed billing | ACAO echoes https://app.example.edu | ABSENT (cors filter not applied) | **FAIL (RT-2)** |
| F evil origin on /health (allowlist set) | no ACAO header | absent | PASS |
| F evil origin on authed billing (allowlist set) | no ACAO header | absent | PASS |

## 2. Findings (pre-bundle)

- **RT-1 — deny-by-default holds at runtime; wildcard impossible.** With `Origin: https://evil.example`, no response on 10 unauthenticated routes, the preflight `OPTIONS`, or 4 authenticated routes (real `school_admin` session) carried `Access-Control-Allow-Origin`. Nothing emits `*` because nothing emits ACAO at all. Satisfies the "no `*` / deny-by-default" half of `ops/release-gates.md` G5 at runtime.
- **RT-2 — the allowlist is dormant (reason the pre run shows 2 FAILs).** With `app.corsAllowedOrigins = 'https://app.example.edu'` set, the allowlisted origin still receives no ACAO header: the `cors` filter is only aliased in `app/Config/Filters.php`, never applied (no `$globals`/route entry). G5's "explicit allowlist only" emission therefore does not work yet — **G5 cannot go until the filter is wired** (bundle below).
- **RT-3 — SC-3 confirmed open at runtime:** none of `X-Frame-Options`, `X-Content-Type-Options`, `X-Download-Options`, `X-Permitted-Cross-Domain-Policies`, `Referrer-Policy` are emitted (`secureheaders` commented out).
- **RT-4 — SC-6 confirmed open at runtime:** no `Content-Security-Policy` header. Remains a deliberate, documented decision for this round (enabling CSP needs per-view nonces because views rely on inline scripts); `app.CSPEnabled = false` stays.
- **RT-5 — session cookie attributes (pre-bundle):** `path=/; HttpOnly; SameSite=Lax`, `Expires`+`Max-Age=7200`, **no `Secure`** (`cookie.secure` unset → `Config\Cookie::$secure = false`). Correct for local HTTP dev; production needs the env-driven `Secure` flag (bundle below, SC-4).
- **RT-6 — CS-01 verified enforced at runtime (billing scope):** a real superadmin session POSTing `/api/admin/billing/issue` without a CSRF token gets `403 {"error":"csrf_required"}`. Global CSRF remained commented out at this point (state of 2026-10-20 pre-bundle; superseded — global filter enabled in the build-5 round, see RT-9).
- **RT-7 — local sign-in works for real:** both role and superadmin logins return `303` + fresh `ci_session`; authenticated GETs on `/api/school/students`, `/school`, `/m` return 200 under a real session (licence filter does not block GETs, as designed).

Unauthenticated statuses observed (informational): API auth routes 301-class redirects to login / 401 JSON on `/api/admin/billing/summary`; `/api/connect/verify` returned 500 on an unauthenticated GET (root cause later found to be the `Throttler::checkTokens()` typo — fixed in the build-5 round, see RT-10).

## 3. Hardening bundle executed in this round (build 4)

Planned shipped-code changes (each forces a package rebuild as build 4):

1. **Apply `cors` filter** so the configured allowlist actually emits explicit ACAO for allowlisted origins and never for others (RT-2 / SC-7 / G5).
2. **Apply `secureheaders` filter** so RT-3's five headers are emitted (SC-3).
3. **`Config\Cookie::$secure` driven by `cookie.secure` env** (default `false` locally; `true` in production `.env`) (RT-5 / SC-4).
4. **Feature tests:** security headers present on a live response; evil origin gets no ACAO; never `*`. Allowed-origin echo and the `cookie.secure=true` Secure flag are asserted by the `post` phase of this driver against a real server (config-level polarity, verified live).

Left open by design this round (unchanged): global CSRF enablement (RB-7), CSP enforcement (SC-6/nonce work), `platform_roles` migration no-op observation.

## 4. Post-bundle run (phase=post) — executed 2026-10-20 after the bundle

Shipped-code changes verified in this run (rebuild required → package **build 4**):
`app/Config/Filters.php` (`cors` in `$required['before']` so preflights are answered before routing; `secureheaders` in `$globals['after']`), `app/Config/Cookie.php` (`$secure` driven by `cookie.secure` env).
A second shipped-code change set followed the same day (package **build 5**, CSRF
round): `Filters.php` `$globals['before']` now carries
`'csrf' => ['except' => ['api/admin/billing*']]` (billing keeps its route-level
`api_csrf` JSON contract — and must stay excepted, because `Security::verify()`
consumes+regenerates the token, so a double run would always fail), and
`ConnectApi` throttle calls were repaired (RT-10).

**39 checks — 39 PASS, 0 failed.** (Evolution same day: 36 checks at build 4 →
`H` session-fixation block appended post-build → `I` global-CSRF polarity block
appended in the build-5 CSRF round. The table below is the final 39-check run
after the build-5 shipped changes.)

| Check | Expected | Observed | Result |
|---|---|---|---|
| A unauth+evil /health | no ACAO header | absent (status 200) | PASS |
| A unauth+evil /api/health | no ACAO header | absent (status 200) | PASS |
| A unauth+evil /api/school/students | no ACAO header | absent (status 302) | PASS |
| A unauth+evil /api/school/invoices | no ACAO header | absent (status 302) | PASS |
| A unauth+evil /api/admin/billing/summary | no ACAO header | absent (status 401) | PASS |
| A unauth+evil /api/connect/verify | no ACAO header | absent (status 200 — was `500` before the RT-10 `ConnectApi` fix) | PASS |
| A unauth+evil /admin/schools | no ACAO header | absent (status 302) | PASS |
| A unauth+evil /portal | no ACAO header | absent (status 302) | PASS |
| A unauth+evil /school | no ACAO header | absent (status 302) | PASS |
| A unauth+evil /m | no ACAO header | absent (status 302) | PASS |
| B preflight OPTIONS evil (allowlist unset) | no ACAO header | absent (status 204) | PASS |
| E X-Frame-Options (on /health) | present | SAMEORIGIN | PASS |
| E X-Content-Type-Options (on /health) | present | nosniff | PASS |
| E X-Download-Options (on /health) | present | noopen | PASS |
| E X-Permitted-Cross-Domain-Policies (on /health) | present | none | PASS |
| E Referrer-Policy (on /health) | present | same-origin | PASS |
| E Content-Security-Policy | absent (deliberately still off) | absent | PASS |
| C school_admin POST /login | 302/303 + ci_session cookie | status 303 \| ci_session=…; path=/; HttpOnly; SameSite=Lax | PASS |
| C authed(school_admin)+evil /api/school/students | no ACAO header | absent (status 200, headers-on) | PASS |
| C authed(school_admin)+evil /school | no ACAO header | absent (status 200, headers-on) | PASS |
| C authed(school_admin)+evil /m | no ACAO header | absent (status 200, headers-on) | PASS |
| C authed(school_admin)+evil /portal | no ACAO header | absent (status 302, headers-off) | PASS |
| D superadmin POST /login | 302/303 + ci_session cookie | status 303 \| ci_session=…; path=/; HttpOnly; SameSite=Lax | PASS |
| D billing POST w/o CSRF token | 403 csrf_required | status 403 body `{ "ok": false, "error": "csrf_required", … }` | PASS |
| F allowlisted origin on /health | ACAO = https://app.example.edu | https://app.example.edu | PASS |
| F allowlisted origin on authed billing | ACAO = https://app.example.edu | https://app.example.edu | PASS |
| F evil origin on /health (allowlist set) | absent or configured origin only (never evil, never `*`) | https://app.example.edu | PASS |
| F evil origin on authed billing (allowlist set) | absent or configured origin only (never evil, never `*`) | https://app.example.edu | PASS |
| F preflight allowlisted origin | 204 + ACAO = https://app.example.edu | status 204 ACAO=https://app.example.edu | PASS |
| F preflight evil origin (allowlist set) | absent or configured origin only (never evil, never `*`) | status 204 ACAO=https://app.example.edu | PASS |
| G cookie.secure=true → session cookie has secure attr | secure attribute present (rendered lowercase) | path=/; secure; HttpOnly; SameSite=Lax | PASS |
| G cookie.secure=false → session cookie has no secure attr (dev default) | no secure attribute | path=/; HttpOnly; SameSite=Lax | PASS |
| H GET /login issues pre-auth session id A | ci_session set before login | A=930855ee... | PASS |
| H1 login with pre-auth id A → Set-Cookie id B ≠ A (SF-01 regenerate) | 303 + new ci_session different from A (Shield Session.php:720-721) | status 303 \| A=930855ee... B=657b081c... | PASS |
| H2 old id A rejected after login (SF-02 pre-login replay / destroy=true) | not authenticated (302/303 redirect to login, never 200) | status 302 | PASS |
| H3 new id B is the authenticated session (sanity) | 200 on authed route | status 200 | PASS |
| I1 token-less POST outside billing (/api/connect/resolve) refused | 403 CSRF refusal (`SecurityException::forDisallowedAction`) | status 403 body `{ "title": "…SecurityException", "code": 403, "message": "The action you requested is not allowed." }` | PASS |
| I2 same POST with a valid `X-CSRF-TOKEN` reaches the controller | 200 + `{found:false,…}` identical-shape contract (this call was a `500` before the `Throttler::checkTokens` fix) | status 200 body `{ "found": false, "domain": null, "signin": null, "ok": true }` | PASS |
| I3 login POST without token refused (login-CSRF enforced) | 403 (dev: `$redirect=false`, no silent redirect) | status 403 | PASS |

Post-bundle findings:

- **RT-2 closed:** allowlisted origins receive an explicit `Access-Control-Allow-Origin: https://app.example.edu` on plain and authenticated responses, and preflights (`OPTIONS` + `Access-Control-Request-Method`) are answered `204` with the same explicit value — previously they fell through to `404` with no CORS handling at all (why `cors` had to live in `$required['before']`: required filters run before routing, `CodeIgniter.php` `runRequiredBeforeFilters`).
- **Framework single-origin quirk (recorded, not patched):** with exactly one configured origin, `CorsService::setAllowOrigin()` echoes `allowedOrigins[0]` without matching the request `Origin`. A non-allowlisted caller therefore sees `ACAO: https://app.example.edu` — its own origin is never echoed, `*` is impossible (`Config\Cors` drops wildcard entries, `checkWildcard()` throws), and browsers reject the mismatch (`ACAO ≠ Origin` → blocked). Combined with `supportsCredentials=false` and `SameSite=Lax` session cookies, the G5 invariant ("no `*`, explicit allowlist only, deny-by-default when unset") holds: unset allowlist → no ACAO at all (A/B/C rows), set allowlist → only that literal value.
- **RT-3 closed:** the five SecureHeaders are emitted on real responses (C rows show `headers-on` for authenticated routes).
- **RT-4 unchanged by design:** no CSP header (`app.CSPEnabled = false` stays — per-view nonce work is out of scope, tracked as SC-6; the global-CSRF half of RB-7 closed in the build-5 round, CSP remains the recorded deferred sub-item).
- **RT-5 closed:** `cookie.secure = true` → session cookie rendered `; secure;` (CI4 renders the attribute **lowercase**); `cookie.secure = false`/unset → no secure attribute (dev default). Session and CSRF cookies both inherit `Config\Cookie`.
- **RT-6 re-verified:** token-less billing mutation still `403 csrf_required` after the bundle — and still after the build-5 global filter, because the billing group is excepted from the global `csrf` filter and keeps `api_csrf` as its only check (JSON contract preserved; double verification avoided).
- **Preflight status codes:** disallowed/unconfigured preflight → `204` without ACAO (browsers block); allowlisted → `204` with the explicit origin. `B` row changed `404 → 204` vs. the pre-run solely because required-before short-circuits OPTIONS before routing.
- **RT-8 closed (SC-5 / SF-01 / SF-02 — session fixation):** Shield's `SessionAuth::startLogin()` calls `session()->regenerate(true)` on login (vendor shield `Authenticators/Session.php:719-721`) — but **only when `ENVIRONMENT !== 'testing'`**, which is why this could not be pinned by phpunit (the feature suite runs with `ENVIRONMENT=testing`, so Shield deliberately skips it). The `H` block therefore asserts it live against the dev server (`ENVIRONMENT=development`): login with a known pre-auth session id yields a **different** id (`H1`, regenerate), the pre-auth id is **dead** afterwards (`H2`: `302` to login, never `200` — `destroy=true`), and the new id is the authenticated one (`H3`). Pre-auth `ci_session` cookie carries `HttpOnly; SameSite=Lax` (A/C rows). Note: `H2` = SF-02 (pre-login replay); SF-04's *auto-rotation* aspect (`regenerateDestroy=false`) remains as MB-2, distinct from login-time destroy.
- **RT-9 closed (global CSRF, build 5):** `$globals['before']` now applies `csrf`
  to every state-changing request except the billing group. Live polarity: `I1`
  a token-less JSON POST to a non-billing API → `403 SecurityException`
  ("The action you requested is not allowed.") *before* any controller runs;
  `I2` the same POST with `X-CSRF-TOKEN` minted by `GET /login` → `200` with the
  endpoint's own contract; `I3` a token-less `POST /login` → `403` (login CSRF
  now enforced server-side; `$redirect = (ENVIRONMENT === 'production')` means
  dev/test refuse with `403` instead of redirecting). The normal login path
  (`C`/`D`/`G`/`H1`) all carry the hidden field and still return `303`.
  Feature-suite equivalent: `ConnectApiTest::testResolveWithoutCsrfTokenIsRefused`
  (expects `SecurityException`) plus the 9 retrofitted write calls
  (`withCsrf()` via `Tests\Support\CsrfTokenTrait`).
- **RT-10 closed (defect found by `I2`): `ConnectApi` was dead on arrival.**
  Both `resolve()` and `verify()` called `Throttler::checkTokens()` — **a method
  that does not exist** (the API is `Throttler::check()`) — so every call was a
  `500`. The `A`-block row for `/api/connect/verify` had been recording
  `status 500` in *both* the pre- and post-bundle runs (informational, outside
  the CORS criterion) without the root cause ever being chased; the new `I2`
  check turned it into a hard failure and forced the fix. A second latent 500
  was fixed in the same pass: the `verify:` throttle key prefix and IPv6 client
  addresses contain `:`, which PSR-6 cache keys reject
  (`Config\Cache::$reservedCharacters = '{}()/\@:'` → `InvalidArgumentException`),
  so bucket keys are now sanitised via `ConnectApi::throttleKey()` (`:` → `-`).
  Root cause pinned by the new `backend/tests/Feature/ConnectApiTest.php`
  (3 tests) — neither controller method had ever been exercised by the suite.
  Note for future probe design: assertions must check *body contracts*, not just
  header absence, or dead controllers keep passing.

Runtime automation added: `backend/tests/Feature/SecurityHeadersRuntimeTest.php` (6 tests, allowlist-aware — asserts the exact deny-by-default/echo rules under any configured allowlist, including CI's `https://ci.invalid`). Suite after bundle: **161 tests / 653 assertions / 0 failures** (was 155/621); after the build-5 CSRF round: **164 tests / 671 assertions / 0 failures** (+3 `ConnectApiTest`), green with the global filter enabled.

Reproduction: `php quality/tools/security-runtime-probe.php post` against `php spark serve --host 127.0.0.1 --port 8899` with a local `probe_secrets.json` (see header). Driver restores `backend/.env` after every run (verified: allowlist and `cookie.secure` lines absent after both runs).

