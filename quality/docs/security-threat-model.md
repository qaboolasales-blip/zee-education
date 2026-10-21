# Security Threat Model — C-01.3

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-01.3** (Batch A)
- Created: 2026-10-17
- Status: Design-stage threat model. Each threat lists a **control** (required behaviour) and a **check** (executed now, or a **planned check** for Batch B). No compliance certification is claimed; most checks are planned because auth/tenancy are not implemented yet.

## 0. Scope and protected invariants

Assets: school configuration, student/guardian/staff records, attendance, marks/results, fees, files/exports, sessions, and the control plane's commercial/support data.

Invariants that must hold (from `UNIVERSAL_RULES.md` / `PROJECT_MEMORY.md`) and are preserved throughout this model:

1. **Dedicated database per school** (ADR-001) — no shared `tenant_id`-only store.
2. **Strict server-side access control** — never trust browser-supplied school/role/IDs.
3. **Explicit CORS allowlists** — never `Access-Control-Allow-Origin: *` on authenticated APIs.
4. **Safe data-access-on-license-expiry** — expiry cannot delete/hide/export-block a school's own data.

Method: lightweight STRIDE per surface (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege).

## 1. CORS

| ID | Threat (STRIDE) | Control | Check |
|----|-----------------|---------|-------|
| CORS-1 | `Access-Control-Allow-Origin: *` on authenticated school/Super Admin APIs lets any site call them with a user's browser context (EoP / info disclosure) | Explicit allowlist of real origins via `app.corsAllowedOrigins`; framework `Config\Cors` middleware; wildcard rejected outright | **Executed (code review + runtime, 2026-10-20):** `backend/app/Config/Cors.php` skips `*`, defaults `allowedOrigins=[]`, `supportsCredentials=false`; `cors` filter now applied in `Filters.php` `$required['before']` and the live matrix (`security-runtime-review.md`, **39/39**, final run of 2026-10-20) shows zero ACAO when the allowlist is unset across 10 unauth + 4 authed routes and preflights, explicit origin echo when set, never `*`. Pinned by `HealthTest::testHealthNeverSendsWildcardCorsOrigin` + `SecurityHeadersRuntimeTest`. |
| CORS-2 | Wildcard + `Access-Control-Allow-Credentials: true` (browser rejects, but misconfig risk) | Keep `supportsCredentials=false` unless a specific credentialed flow needs it, and then only with exact origins | **Executed (runtime, 2026-10-20):** no `Access-Control-Allow-Credentials` header observed on any probed response (`supportsCredentials=false`); wildcard pairing impossible (`checkWildcardAndCredentials` throws). |
| CORS-3 | Stale/dev origins (`localhost`, preview URLs) left in production allowlist | Environment-driven allowlist; strip dev origins before prod; fail closed if unset | **Partially executed (runtime, 2026-10-20):** unset → deny proven live (all A/B/C rows). Stale-origin scan of the production `.env` remains a deploy-time checklist item (no production `.env` exists yet). |
| CORS-4 | Over-broad `allowedMethods`/`allowedHeaders` (`*`) | Reject `*` methods/headers; allowlist only needed ones | **Executed (code review):** `Cors.php` skips `*` for methods/headers (`checkWildcard` throws as backstop). Preflight responses observed emitting no over-broad allow headers (defaults are empty lists). |

## 2. Session / token

| ID | Threat (STRIDE) | Control | Check |
|----|-----------------|---------|-------|
| SEC-1 | Session fixation/hijacking; insecure cookie flags | Secure, HttpOnly, SameSite cookies; regenerate session id on login; HTTPS-only in prod | **Executed (runtime, 2026-10-20):** probe G (cookie flags, `cookie.secure` polarity both ways) + probe H1/H2/H3 (login issues a new session id, pre-auth id destroyed, new id authenticated — SF-01/SF-02; `security-runtime-review.md` RT-8) |
| SEC-2 | Forged/tampered JWT or token claims (role, school, user) | Signed tokens, server-side verification, short TTL, revocation on logout/role change | Planned check: tampered token rejected; `school_id`/`role` claims not client-writable |
| SEC-3 | Privilege escalation by editing role/school in request | Server-side role filter is authoritative; browser IDs ignored | Planned check (see `role-permission-matrix.md` §4, `tenant-isolation-test-matrix.md` T-2/T-4) |
| SEC-4 | Brute force / credential stuffing on login | Rate limiting, lockout/backoff, strong password policy, no username enumeration in messages | Planned check: lockout + uniform error message |
| SEC-5 | Missing server-side authz on a new endpoint (UI hides it but API is open) | Deny-by-default route filter; every authenticated route requires explicit permission | Planned check (C-10.2): unauthenticated/again-wrong-role request → 403 |
| SEC-6 | Sensitive data in logs/`/health` | `/health` discloses only `Config\ZeeEducation` fields; no credentials/server detail | **Executed:** `HealthTest` asserts no DB credentials, no server detail, state-only `database` field, no tenant/learner terms → suite **PASS 22/22, 81 assertions** (Laragon PHP). This is a code-level assurance for `/health` only, not a general logging audit. |

## 3. QR / manual school code (tenant routing & join)

Schools are identified by a **school code** that a user either scans (QR) or types manually (e.g. to reach the right school's login/instance).

| ID | Threat (STRIDE) | Control | Check |
|----|-----------------|---------|-------|
| CODE-1 | Guess/enumerate school codes to discover tenants | Unguessable/ high-entropy codes; rate limit code lookup; do not reveal whether a code exists beyond need | Planned check: brute-forcing codes is rate-limited and leaks no tenant data |
| CODE-2 | Tampered QR encodes a wrong/phishing school or URL | QR encodes only a code/short link validated server-side; show school name for confirmation before login; signed/verified mapping | Planned check: tampered QR cannot redirect credentials to an attacker-controlled instance |
| CODE-3 | School code reused to bypass authorization (code ≠ authn) | Code is a **routing hint only**, never a credential; a valid code grants no data access without a proper login + server-side role check | Planned check: possessing a valid school code alone yields zero data |
| CODE-4 | Code from school A used to reach school B data | Code selects the instance/DB; session still scoped server-side to the authenticated school | Planned check (tenant matrix T-5/T-8) |

## 4. Uploads (files/attachments)

| ID | Threat (STRIDE) | Control | Check |
|----|-----------------|---------|-------|
| UP-1 | Malicious file type / stored XSS / web shell upload | Allowlist of types (not extension-only); validate content/MIME; store outside web root or with non-executable handling; never serve user HTML inline from an executable origin | Planned check: upload of `.php`/`.html`/disallowed type rejected; SVG/scripted content handled safely |
| UP-2 | Path traversal / overwrite (`../`, crafted filename) | Sanitize filenames; random storage keys; confine to per-tenant directory | Planned check (tenant matrix T-18) |
| UP-3 | Cross-tenant file read by guessed URL | Per-tenant ownership check on every fetch; unguessable/expiring URLs; no public bucket listing | Planned check (tenant matrix T-16/T-17) |
| UP-4 | Oversized upload → DoS | Size limits at web server + app; virus/-content scan if available | Planned check: oversize upload rejected with 413 |

## 5. Exports (PDF/Excel/CSV)

| ID | Threat (STRIDE) | Control | Check |
|----|-----------------|---------|-------|
| EX-1 | Export contains other tenants' rows | Export runs with the requesting session's row scope; dedicated-DB boundary | Planned check (tenant matrix T-13..T-15) |
| EX-2 | Export bypasses role/parent scoping | Export honours the same authz as the read path | Planned check (`role-permission-matrix.md` §4 export scoping) |
| EX-3 | Exported file leaks via insecure temp URL | Authenticated download; expiring links; no directory listing | Planned check: export URL requires auth and expires |
| EX-4 | Sensitive data in export logs/artifacts left on disk | Do not log export contents; clean temp files; restrict storage perms | Planned check |

## 6. Migration (schema / provisioning)

| ID | Threat (STRIDE) | Control | Check |
|----|-----------------|---------|-------|
| MIG-1 | Irreversible/ destructive migration on live data | Versioned, reversible migrations; run on non-production first; backup before migrate | Planned check (C-10.4 restore drill): migrate on copy, verify rollback |
| MIG-2 | Provisioning a new school writes into the wrong/shared DB | Provisioning creates a **dedicated DB per school**; verify connection targets only that DB | Planned check (tenant matrix dependency §5) |
| MIG-3 | Migration runs with privileged DB credentials beyond need | Least-privilege DB account for app; separate higher-priv account for migrations only | Planned check |
| MIG-4 | Seed/demo data leaks into production | Environments separated; seeds only in non-prod | Planned check |

## 7. Backup (and restore)

| ID | Threat (STRIDE) | Control | Check |
|----|-----------------|---------|-------|
| BK-1 | Backup exposes all tenants if stolen (aggregated) | Per-school backups; encrypt at rest; restrict access; avoid a single file with every school's plaintext DB | Planned check — see `ops/backup-restore-runbook.md` |
| BK-2 | Backup contains secrets/PII in cleartext | Encrypt backups; key management; exclude `.env`/credentials | Planned check |
| BK-3 | Restore fails silently → data loss on incident | Mandatory **non-production restore drill** before pilot; verify restored row counts/markers | Planned check (C-10.4) |
| BK-4 | Backup/restore used to move data across tenants | Restore is scoped to the owning school's DB; no cross-tenant merge | Planned check |

## 8. License expiry (data-protection invariant)

| ID | Threat | Control | Check |
|----|--------|---------|-------|
| LIC-1 | Expiry deletes/hides/encrypts school data or blocks export | Expiry may gate updates/support per business rules, but **never** data access or export | Planned check (tenant matrix T-25..T-27); owner decision preserved |

## 9. Residual risk / summary

- **Already verified (executed):** `/health` information-disclosure controls (`HealthTest`, PASS) and CORS config review (`Cors.php` deny-by-default, wildcard rejected). These cover only the health endpoint and static config — **not** a certification of the whole app.
- **Largest residual risk (planned):** authentication, authorization and tenant isolation are untested because they are not implemented. They are the top priority for Batch B (C-10.2) and gate pilot.
- No real data, credentials or secrets were used or produced while authoring this model.
- This document does not certify compliance and does not claim any check that was not executed.

