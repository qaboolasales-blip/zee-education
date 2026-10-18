# Dependency & Security Configuration Review — M-C-03

- Agent: Cline (QA/Security/Ops). Microtask **M-C-03** (Batch M). 2026-10-17.
- Nature: **real, executable review** of what exists today (dependencies, runtime, security config, secrets posture). Consolidates and re-verifies earlier findings; nothing unexecuted is claimed.

## 1. Dependency posture (real)

| Aspect | Finding | Source |
|--------|---------|--------|
| Backend deps | Minimal & compatible: `php ^8.2`, `codeigniter4/framework ^4.7`; dev-only `phpunit ^10.5`, `faker`, `vfsstream`. Lightweight, no exotic packages. | `composer.json` |
| Frontend deps | **Zero** runtime/dev dependencies (`dependencies:{}`, `devDependencies:{}`); uses Node built-in test runner. Minimal attack surface. | `frontend/package.json` |
| PHP runtime | Laragon PHP **8.3.30** has all required extensions (intl, mysqli, pdo_mysql, mbstring, openssl, curl, dom, xml, fileinfo, gd, zip). The **PATH** WinGet PHP 8.3.33 lacks `intl,mysqli,curl,fileinfo,gd,zip` → backend suite fails there (F-1). Use Laragon PHP. | `ops/windows-laragon-preflight.md` |
| Known-vulnerability scan | **Planned:** `composer audit` requires network; run in CI. Not executed here (no internet assumption). | planned |

## 2. Security configuration (real; re-verified)

Consolidates `security-config-review.md` (B-C-04):

| Control | Config present | Enforced now | Verdict |
|---------|----------------|--------------|---------|
| CORS allowlist / no wildcard | Yes (`Cors.php` deny-by-default, skips `*`, `supportsCredentials=false`) | Yes for `/health` (`HealthTest::testHealthNeverSendsWildcardCorsOrigin`) | **Strong** |
| AuthN/AuthZ filter | **No** (`Filters::$filters=[]`) | No | **Gap** — open (G6) |
| CSRF | Configured (cookie, regenerate) but filter **commented out** | No | **Gap** — enable on mutations |
| Secure headers | Alias only, filter **commented out** | No | **Gap** — enable in prod |
| Cookie `HttpOnly`/`SameSite` | Yes (true / Lax) | Yes | OK |
| Cookie `Secure` | `false` | n/a | **Gap** — set true in prod |
| Session expiry/rotation | 7200s / 300s | Yes (framework) | OK; login-time regen pending |
| CSP | Configured, **not applied** | No | **Gap** — enable report-only→enforce |
| Force HTTPS | `required.before` | Yes | OK |

## 3. Secrets & PII posture (real)

- `.env` present locally and **gitignored** (not committed). Not read/printed by this agent.
- Backend logs scanned for `password|secret|token|api_key|DSN|mysql://|cnic|@student|guardian` → **NO matches**.
- `/health` negative-asserts no credentials/server/tenant/learner data (part of **OK 27/27, 107 assertions**).
- Control-plane schema has **no** secret/credential columns (ADR-108); audit/job tables secret-free by design.

## 4. UI / V1-exclusion posture (real)

- Reference UI **3/3 byte-identical** (verifier).
- No automated WhatsApp/SMS/payment-gateway code; V1 exclusions actively enforced by OpenCode boundary denylists (G-C-04).
- No commercial hard-coded pricing (`plan_code` only) — K-C-01.

## 5. Prioritized gaps (carry into defect report M-C-05)

1. **No server-side authN/authZ** (G6, never-waivable) — highest risk.
2. **CSRF, secure-headers, CSP defined but not enabled**; `Cookie::$secure=false` — hardening actions before prod.
3. **PATH-PHP missing `intl`** — env fix (use Laragon PHP); not a code defect.
4. **No provisioning idempotency guard** (R-2) — close in logic before pilot.
5. `composer audit`/dependency CVE scan not yet run (needs network/CI).

## Status
- **Executed:** dependency inventory, security-config re-verification, secrets/log/.env scan, reference/V1 checks — all real. **Planned:** `composer audit` (network). Nothing unexecuted is claimed passing.
