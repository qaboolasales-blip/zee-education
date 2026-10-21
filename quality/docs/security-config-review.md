# Security Configuration Review — B-C-04

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **B-C-04** (Batch B — Review CORS/session cookie/security-header settings after implementation)
- Created: 2026-10-17
- Method: **static review of the actual config files** in `backend/app/Config/` (read 2026-10-17). Runtime header/session assertions are **planned** because auth/session middleware is not yet wired.
- Important honesty note: "present in config" ≠ "enforced at runtime." Several security filters are **defined but commented out / not applied** (see §2). This review states both facts for each control.
- **2026-10-20 runtime re-review EXECUTED** (this document keeps its 2026-10-17 findings; each section carries a dated update): `quality/docs/security-runtime-review.md` — live HTTP assertions against a local server, pre-bundle (28 checks), post-bundle (**36/36 PASS**, incl. the session-fixation `H` block), and final build-5 CSRF round (**39/39 PASS**, incl. the `I` global-CSRF block), with `backend/tests/Feature/SecurityHeadersRuntimeTest.php` (suite 161/653 → **164/671 green** after round 2) pinning the new state.

## 1. Scope reviewed (files read)

`Cors.php`, `Session.php`, `Security.php` (CSRF), `Cookie.php`, `ContentSecurityPolicy.php`, `Filters.php`, `Routes.php`. Cross-referenced to `quality/docs/security-threat-model.md` §1–§2 and `ops/windows-laragon-preflight.md`.

## 2. Findings

Each finding names the file+setting (verified by reading) and marks runtime enforcement honestly.

### SC-1 — No authentication/authorization filter exists (pending)
- **Verified:** `Filters.php` `$filters = []`, `$globals` has no auth filter, no auth alias defined; `Routes.php` has no auth routes; Controllers are only Health/Home/Setup.
- **Impact:** There is currently **zero** server-side authz. This is expected pre-implementation, not a regression.
- **Planned check:** once auth ships, assert every non-PUBLIC route is bound to an auth+role filter (B-C-01/B-C-03). Ties to `release-gates.md` G6.
- **2026-10-20 update:** this finding is **obsolete** — Shield `session`/`role:*`/`superadmin`/`license` filters now guard every authenticated route with negative tests in the suite (see G6 in `release-gates.md`); the 2026-10-20 runtime round confirmed real logins + authed 200s/401s. Still open: the full live role matrix against owner-approved accounts (G6, never waivable).

### SC-2 — CSRF configured but NOT enabled; token randomization off *(as of the 2026-10-17 review — global filter since ENABLED 2026-10-20, see updates below; `tokenRandomize` still off)*
- **Verified:** `Security.php` sets `csrfProtection='cookie'`, `regenerate=true`, `expires=7200`, `redirect=production-only`, **`tokenRandomize=false`**. But `Filters.php` `$globals.before` has `'csrf'` **commented out**, so CSRF is not applied globally.
- **Impact:** No state-changing routes exist yet, so nothing is currently exploitable; but login, password-reset and all mutations must enable CSRF before they go live.
- **Recommendation:** enable `csrf` filter on all state-changing routes; set `tokenRandomize=true`. **Planned check** CS-01..CS-03 (`auth-session-test-checklist.md` §6).
- **2026-10-20 update (partial):** global `csrf` stays commented (client-token wiring is not locally closable — RB-7), but billing mutations are guarded by the `api_csrf` filter and **CS-01 is runtime-verified**: superadmin session, token-less `POST /api/admin/billing/issue` → `403 {"error":"csrf_required"}` (`security-runtime-review.md` RT-6). `tokenRandomize` still `false`. Residual: CSRF on login itself and on any future HTML forms + the rest of the mutation surface.
- **2026-10-20 update (round 2 — global CSRF ENABLED, this finding's main gap CLOSED):** `Filters.php` `$globals['before']` now carries `'csrf' => ['except' => ['api/admin/billing*']]` — every state-changing request (installer, Shield login/2FA/magic-link, all non-billing APIs) is refused `403` without a valid token; billing keeps its route-level `api_csrf` so the JSON `{error: csrf_required}` contract survives and `Security::verify()` never runs twice per request (verification consumes + regenerates the token). Runtime polarity proven by probe `I1`/`I2`/`I3` (**39/39**, `RT-9`) and pinned in the suite (164/671, incl. `ConnectApiTest::testResolveWithoutCsrfTokenIsRefused`). Note on mode: the 2026-10-17 read recorded `csrfProtection='cookie'`; the working copy now sets `'session'` (uncommitted change from an earlier hardening pass) — the token travels in the session + hidden field, which is what the probe's `csrfTokenFor()` extracts. **Still open in SC-2: `tokenRandomize=false`** (defense-in-depth; session-mode tokens are not cookie-readable, so exposure is limited — remains a hardening action, not a blocker).

### SC-3 — SecureHeaders defined but NOT enabled
- **Verified:** `Filters.php` alias `'secureheaders' => SecureHeaders::class` exists, but `$globals.after` has `'secureheaders'` **commented out**.
- **Impact:** Security response headers (e.g. HSTS, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`) are **not currently emitted**.
- **Recommendation:** enable `secureheaders` (and CSP, SC-6) globally, at least for production. **Planned check:** assert the header set on a live response.
- **2026-10-20 update — CLOSED:** `secureheaders` is enabled in `Filters.php` `$globals['after']`; live responses carry `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-Download-Options: noopen`, `X-Permitted-Cross-Domain-Policies: none`, `Referrer-Policy: same-origin` (verified pre/post in `security-runtime-review.md` E/C rows) and are pinned by `SecurityHeadersRuntimeTest`. CSP remains off (SC-6) by decision.

### SC-4 — Cookie `secure=false`; HttpOnly and SameSite are correct
- **Verified:** `Cookie.php` → `secure=false`, `httponly=true`, `samesite='Lax'`, `path='/'`, `domain=''`.
- **Impact:** `HttpOnly` (good, blocks JS access) and `SameSite=Lax` (good default) are set. `secure=false` means cookies can be sent over plain HTTP — acceptable for local dev, **must be `true` in production** so the session/CSRF cookies are HTTPS-only.
- **Recommendation:** drive `Cookie::$secure` from environment (true in prod). **Planned check:** read `Set-Cookie` on a live login and assert `Secure` in production (SF-05).
- **2026-10-20 update — CLOSED (mechanism):** `Cookie::$secure` now reads `cookie.secure` via env (`filter_var(..., FILTER_VALIDATE_BOOL)`, default `false`). Runtime polarity proven both ways: `cookie.secure=true` → session cookie rendered `; secure;` (CI4 renders it lowercase), `=false`/unset → no attribute (`security-runtime-review.md` RT-5/G rows). Production `.env` must still set `cookie.secure = true` at deploy — recorded in `.env.example` and the installer docs.

### SC-5 — Session config present; login-time ID regeneration is an app responsibility (CLOSED 2026-10-20, runtime-verified)
- **Verified:** `Session.php` → `FileHandler`, `cookieName='ci_session'`, `expiration=7200`, `timeToUpdate=300`, `regenerateDestroy=false`, `matchIP=false`.
- **Closed (2026-10-20):** login-time regenerate + destroy **does exist** — Shield's `SessionAuth::startLogin()` calls `session()->regenerate(true)` (vendor shield `Authenticators/Session.php:719-721`), i.e. a new id *and* the pre-auth id destroyed. Live-verified by the probe `H` block (`H1` new id on login, `H2` old id rejected → `302`, `H3` new id authenticated) in `security-runtime-review.md` RT-8. Caveat recorded: the regenerate call is guarded by `ENVIRONMENT !== 'testing'`, so phpunit (which forces `testing`) cannot pin it — hence the live probe, not a feature test. `regenerateDestroy=false` still governs only *auto*-rotation (GC collects old records); the login action itself destroys.
- **Remaining planned check:** SE-01..SE-04 session-expiry behaviours (`auth-session-test-checklist.md` §3/§5).

### SC-6 — CSP configured but NOT applied
- **Verified:** `ContentSecurityPolicy.php` sets `reportOnly=false`, `upgradeInsecureRequests=false`, most directives to `'self'`, `autoNonce=true`. No CSP filter is enabled in `Filters.php`, so no `Content-Security-Policy` header is emitted today.
- **Recommendation:** enable CSP (start in report-only, then enforce); consider `upgradeInsecureRequests=true` in production. **Planned check:** assert CSP header present and non-`*` on live responses.

### SC-7 — CORS deny-by-default and wildcard-reject confirmed (strong)
- **Verified (Batch A, re-affirmed):** `Cors.php` reads `app.corsAllowedOrigins`, skips `*` and empty entries, defaults `allowedOrigins=[]` (cross-origin denied until configured), `supportsCredentials=false`, and skips `*` for methods/headers. Alias `'cors'` exists but is **not** applied globally (correct — it should be applied per authenticated route when built).
- **Impact:** The single most important CORS invariant (never `*` on authenticated APIs) is enforced in config. `HealthTest::testHealthNeverSendsWildcardCorsOrigin` already asserts it for `/health`.
- **Planned check:** assert no `Access-Control-Allow-Origin: *` on **every** authenticated route once they exist (C-10.2 / G5).
- **2026-10-20 update — runtime matrix EXECUTED, filter WIRED:** the dormant-alias gap is fixed — `cors` now sits in `Filters.php` `$required['before']` (required filters run before routing, so preflights are answered even for `OPTIONS` paths with no route). Live assertions (`security-runtime-review.md` §1/§4): unset allowlist → zero ACAO on 10 unauth + 4 authed routes and preflights; set allowlist → explicit echo of exactly that origin on plain, authenticated and preflight (`204`) responses; `*` impossible twice over. **Framework quirk recorded:** single-entry allowlists are echoed without matching the request origin (browsers fail the mismatch; caller's origin is never echoed) — see RT-2 post-bundle finding.

### SC-8 — HTTPS forcing enabled globally
- **Verified:** `Filters.php` `$required.before` includes `'forcehttps'`.
- **Impact:** Global HTTPS forcing is present (good for production). Harmless in local dev. Confirm it is active and not overridden in the production environment.

## 3. Summary table

| Control | Config present? | Enforced at runtime today? | Gap / action |
|---------|-----------------|---------------------------|--------------|
| AuthN/AuthZ filter | Yes (`session`/`role:*`/`superadmin`/`license`) | **Yes** (route-bound + negative tests; 2026-10-20) | Live role matrix on owner accounts (G6) |
| CSRF | Yes (session, regen) | **Yes — global** — `'csrf'` in `$globals['before']` except billing, which keeps `api_csrf` (JSON contract); probe `I1`/`I2`/`I3`, 39/39 (2026-10-20 round 2) | `tokenRandomize=true` still open (SC-2 residual) |
| Secure headers | Alias only → **enabled in `$globals['after']`** | **Yes** — 5 headers emitted + feature tests (2026-10-20) | Keep (SC-3 closed) |
| Cookie `HttpOnly`/`SameSite` | Yes | Yes (framework default) + live-observed (SC-4) | Keep (SC-4) |
| Cookie `Secure` | `secure` from `cookie.secure` env | **Yes** — polarity live-verified (2026-10-20) | `cookie.secure = true` in production `.env` (SC-4) |
| Session expiry / rotation | Yes (7200/300s) | Yes (framework) | Login-time regenerate+destroy **live-verified 2026-10-20** (probe H1/H2; Shield `startLogin` → `regenerate(true)`) |
| CSP | Yes | **No** (deliberately off) | Enable report-only→enforce with nonces (SC-6 / RB-7) |
| CORS allowlist / no wildcard | Yes | **Yes** — `cors` in `$required['before']`, preflights answered, live matrix (2026-10-20) | Set `app.corsAllowedOrigins` explicitly per environment (SC-7) |
| Force HTTPS | Yes (`required.before`) | Yes | Confirm active in prod (SC-8) |

## 4. Re-review trigger (planned) — **EXECUTED 2026-10-20**

This was a **point-in-time static review**. The runtime re-review ran on 2026-10-20 against a local `php spark serve` with real logins; results: `quality/docs/security-runtime-review.md` (pre-bundle 26/28 + deliberate dormancy findings, post-bundle **36/36 PASS**, build-5 CSRF round **39/39 PASS**).

- [x] `Set-Cookie` for session: `HttpOnly`, `SameSite=Lax` observed; `secure` attribute polarity proven both ways via `cookie.secure` env (prod must set `true`). *(2026-10-20, RT-5)*
- [x] Security headers present (SC-3) — 5 headers live-observed + feature tests. CSP header still absent — **deliberate** (SC-6 remains open pending nonce work). *(2026-10-20, RT-3/RT-4)*
- [x] CSRF rejects a token-less mutation (CS-01) — billing scope, `403 csrf_required` live. *(2026-10-20, RT-6)*
- [x] CSRF enforced globally — token-less non-billing API POST → `403 SecurityException` (probe `I1`), token-carrying POST → `200` (probe `I2`), token-less `POST /login` → `403` (probe `I3`, login CSRF); suite green with the filter on (164/671). *(2026-10-20 round 2, RT-9)*
- [x] No `Access-Control-Allow-Origin: *` on any authenticated route (SC-7) — deny-by-default + explicit allowlist + preflight matrix executed; single-origin echo quirk recorded. *(2026-10-20, RT-1/RT-2)*
- [x] Session id regenerated on login (SF-01) and pre-login id rejected after login (SF-02). *(live-verified 2026-10-20 — probe `H1`/`H2`, `security-runtime-review.md` RT-8; Shield regenerates with destroy outside phpunit's `testing` environment. SF-04 auto-rotation destroy still open as MB-2)*

Still **open hardening actions**: SC-2 residual now narrowed to **`tokenRandomize` only** (global + login CSRF closed in the 2026-10-20 round-2 / build 5 run) and SC-6 (CSP, needs per-view nonces). Neither makes a runtime claim; both are recorded as deliberate shipped limitations. (SC-5 closed 2026-10-20 — see above.) Ties to `ops/release-gates.md` G5 (runtime asserts now executed) / G6.

