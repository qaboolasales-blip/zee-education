# Security Configuration Review — B-C-04

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **B-C-04** (Batch B — Review CORS/session cookie/security-header settings after implementation)
- Created: 2026-10-17
- Method: **static review of the actual config files** in `backend/app/Config/` (read 2026-10-17). Runtime header/session assertions are **planned** because auth/session middleware is not yet wired.
- Important honesty note: "present in config" ≠ "enforced at runtime." Several security filters are **defined but commented out / not applied** (see §2). This review states both facts for each control.

## 1. Scope reviewed (files read)

`Cors.php`, `Session.php`, `Security.php` (CSRF), `Cookie.php`, `ContentSecurityPolicy.php`, `Filters.php`, `Routes.php`. Cross-referenced to `quality/docs/security-threat-model.md` §1–§2 and `ops/windows-laragon-preflight.md`.

## 2. Findings

Each finding names the file+setting (verified by reading) and marks runtime enforcement honestly.

### SC-1 — No authentication/authorization filter exists (pending)
- **Verified:** `Filters.php` `$filters = []`, `$globals` has no auth filter, no auth alias defined; `Routes.php` has no auth routes; Controllers are only Health/Home/Setup.
- **Impact:** There is currently **zero** server-side authz. This is expected pre-implementation, not a regression.
- **Planned check:** once auth ships, assert every non-PUBLIC route is bound to an auth+role filter (B-C-01/B-C-03). Ties to `release-gates.md` G6.

### SC-2 — CSRF configured but NOT enabled; token randomization off
- **Verified:** `Security.php` sets `csrfProtection='cookie'`, `regenerate=true`, `expires=7200`, `redirect=production-only`, **`tokenRandomize=false`**. But `Filters.php` `$globals.before` has `'csrf'` **commented out**, so CSRF is not applied globally.
- **Impact:** No state-changing routes exist yet, so nothing is currently exploitable; but login, password-reset and all mutations must enable CSRF before they go live.
- **Recommendation:** enable `csrf` filter on all state-changing routes; set `tokenRandomize=true`. **Planned check** CS-01..CS-03 (`auth-session-test-checklist.md` §6).

### SC-3 — SecureHeaders defined but NOT enabled
- **Verified:** `Filters.php` alias `'secureheaders' => SecureHeaders::class` exists, but `$globals.after` has `'secureheaders'` **commented out**.
- **Impact:** Security response headers (e.g. HSTS, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`) are **not currently emitted**.
- **Recommendation:** enable `secureheaders` (and CSP, SC-6) globally, at least for production. **Planned check:** assert the header set on a live response.

### SC-4 — Cookie `secure=false`; HttpOnly and SameSite are correct
- **Verified:** `Cookie.php` → `secure=false`, `httponly=true`, `samesite='Lax'`, `path='/'`, `domain=''`.
- **Impact:** `HttpOnly` (good, blocks JS access) and `SameSite=Lax` (good default) are set. `secure=false` means cookies can be sent over plain HTTP — acceptable for local dev, **must be `true` in production** so the session/CSRF cookies are HTTPS-only.
- **Recommendation:** drive `Cookie::$secure` from environment (true in prod). **Planned check:** read `Set-Cookie` on a live login and assert `Secure` in production (SF-05).

### SC-5 — Session config present; login-time ID regeneration is an app responsibility (pending)
- **Verified:** `Session.php` → `FileHandler`, `cookieName='ci_session'`, `expiration=7200`, `timeToUpdate=300`, `regenerateDestroy=false`, `matchIP=false`.
- **Impact:** Idle expiration (7200s) and periodic ID rotation (300s) are configured. `regenerateDestroy=false` leaves old session records for GC; **fixation defense at login** (regenerate + destroy the pre-auth id) is application code that does not exist yet.
- **Planned check:** SF-01..SF-04 and SE-01..SE-04 (`auth-session-test-checklist.md` §3/§5).

### SC-6 — CSP configured but NOT applied
- **Verified:** `ContentSecurityPolicy.php` sets `reportOnly=false`, `upgradeInsecureRequests=false`, most directives to `'self'`, `autoNonce=true`. No CSP filter is enabled in `Filters.php`, so no `Content-Security-Policy` header is emitted today.
- **Recommendation:** enable CSP (start in report-only, then enforce); consider `upgradeInsecureRequests=true` in production. **Planned check:** assert CSP header present and non-`*` on live responses.

### SC-7 — CORS deny-by-default and wildcard-reject confirmed (strong)
- **Verified (Batch A, re-affirmed):** `Cors.php` reads `app.corsAllowedOrigins`, skips `*` and empty entries, defaults `allowedOrigins=[]` (cross-origin denied until configured), `supportsCredentials=false`, and skips `*` for methods/headers. Alias `'cors'` exists but is **not** applied globally (correct — it should be applied per authenticated route when built).
- **Impact:** The single most important CORS invariant (never `*` on authenticated APIs) is enforced in config. `HealthTest::testHealthNeverSendsWildcardCorsOrigin` already asserts it for `/health`.
- **Planned check:** assert no `Access-Control-Allow-Origin: *` on **every** authenticated route once they exist (C-10.2 / G5).

### SC-8 — HTTPS forcing enabled globally
- **Verified:** `Filters.php` `$required.before` includes `'forcehttps'`.
- **Impact:** Global HTTPS forcing is present (good for production). Harmless in local dev. Confirm it is active and not overridden in the production environment.

## 3. Summary table

| Control | Config present? | Enforced at runtime today? | Gap / action |
|---------|-----------------|---------------------------|--------------|
| AuthN/AuthZ filter | No | No | Implement + bind every protected route (SC-1) |
| CSRF | Yes (cookie, regen) | **No** (filter commented out) | Enable on mutations; `tokenRandomize=true` (SC-2) |
| Secure headers | Alias only | **No** (filter commented out) | Enable `secureheaders` in prod (SC-3) |
| Cookie `HttpOnly`/`SameSite` | Yes | Yes (framework default) | Keep (SC-4) |
| Cookie `Secure` | `false` | n/a | Set `true` in production via env (SC-4) |
| Session expiry / rotation | Yes (7200/300s) | Yes (framework) | Login-time regenerate+destroy still needed (SC-5) |
| CSP | Yes | **No** (not applied) | Enable report-only→enforce (SC-6) |
| CORS allowlist / no wildcard | Yes | Yes (config + `/health` test) | Assert across all authed routes later (SC-7) |
| Force HTTPS | Yes (`required.before`) | Yes | Confirm active in prod (SC-8) |

## 4. Re-review trigger (planned)

This is a **point-in-time static review**. Re-run it as a **runtime** review once KiloCode ships auth/session middleware, asserting on live responses:
- [ ] `Set-Cookie` for session + CSRF: `HttpOnly`, `SameSite`, `Secure=true` (prod).
- [ ] Security headers present (SC-3) and CSP header non-`*` (SC-6).
- [ ] CSRF rejects a token-less mutation (CS-01).
- [ ] No `Access-Control-Allow-Origin: *` on any authenticated route (SC-7).
- [ ] Session id regenerated on login (SF-01) and old id rejected (SF-04).

Until then, treat SC-1/SC-2/SC-3/SC-6 as **open hardening actions**, not as passing controls. No runtime security claim is made here; ties to `ops/release-gates.md` G5/G6.

