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
| CORS allowlist / no wildcard | Yes (`Cors.php` deny-by-default, skips `*`, `supportsCredentials=false`) | Yes — `cors` filter applied (`$required['before']`), runtime matrix **39/39** (final run, build-5 CSRF round; was 36/36 pre-round) + `SecurityHeadersRuntimeTest` (2026-10-20) | **Strong** |
| AuthN/AuthZ filter | **2026-10-20: obsolete** — `session`/`role:*`/`superadmin`/`license` now bound to every authenticated route | Yes + negative tests; live role matrix pending accounts (G6) | OK pending G6 |
| CSRF | Configured (session mode now; regenerate); **global filter enabled 2026-10-20** — `'csrf' => ['except' => ['api/admin/billing*']]` in `$globals['before']` | **Yes — global** — billing keeps `api_csrf` (JSON contract); probe `I1`/`I2`/`I3` 39/39, suite 164/671 green with the filter on | **Closed (2026-10-20 build-5 round)** — residual `tokenRandomize=false` (SC-2) |
| Secure headers | Alias only → **enabled in `$globals['after']` (2026-10-20)** | Yes — five headers live-observed + feature tests | **Closed** |
| Cookie `HttpOnly`/`SameSite` | Yes (true / Lax) | Yes | OK |
| Cookie `Secure` | from `cookie.secure` env (2026-10-20) | Yes — polarity live-verified; prod must set `true` | **Closed (mechanism)** |
| Session expiry/rotation | 7200s / 300s | Yes (framework) | OK; login-time regen **live-verified 2026-10-20** (probe H1/H2) |
| CSP | Configured, **not applied (deliberate)** | No | **Gap** — needs per-view nonces (SC-6; RB-7 itself closed 2026-10-20) |
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

1. **Live authZ role matrix not executed** (G6, never-waivable) — highest risk; implementation + negative tests exist (2026-10-20).
2. **CSP nonces + `tokenRandomize`** — remaining hardening actions before prod; global/login CSRF **closed 2026-10-20** (build-5 round, probe `I1`/`I2`/`I3` + suite 164/671), alongside the already-closed secure headers and `cookie.secure` mechanism (RB-7 fully closed; residuals = SC-6 + SC-2).
3. **PATH-PHP missing `intl`** — env fix (use Laragon PHP); not a code defect. Addressed in CI by the pinned runtime (`.github/workflows/ci.yml`, G1/G2 pending first remote run).
4. **No provisioning idempotency guard** (R-2) — **closed 2026-10-20** (RB-4: migration `2026-10-20_000016` + `ProvisioningIdempotencyTest`).
5. `composer audit`/dependency CVE scan not yet run (needs network/CI).

## Status
- **Executed:** dependency inventory, security-config re-verification, secrets/log/.env scan, reference/V1 checks — all real. **Planned:** `composer audit` (network). Nothing unexecuted is claimed passing.
