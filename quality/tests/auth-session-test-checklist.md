# Auth & Session Security Test Checklist — B-C-02

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **B-C-02** (Batch B)
- Created: 2026-10-17
- Threat refs: `quality/docs/security-threat-model.md` §2 (SEC-1..SEC-6).
- Status: **Planned checklist — BLOCKED from execution.** No login, password-reset, session or logout implementation exists in `backend/` yet (Controllers = Health/Home/Setup; `app/Filters`/`Models` empty; no auth routes — verified 2026-10-17). Each item is written so a later agent can execute it unambiguously the moment auth ships. No value below is claimed as tested.

## 0. Execution prerequisites

- A login endpoint, password-reset flow, server-side session, and logout must exist.
- Synthetic users only (one per role, School A). No real credentials.
- Assert on **HTTP status + server-side state**, never on UI. Cookie flags read from real `Set-Cookie` headers.

## 1. Login brute-force / credential-stuffing (SEC-4)

| ID | Case | Steps | Expected |
|----|------|-------|----------|
| BF-01 | Rate limit by IP | Submit N wrong passwords from one IP in a short window | After threshold: **429**; further attempts blocked/backed off |
| BF-02 | Account lockout/backoff | Repeated wrong password for one valid user | Lockout or exponential backoff after threshold; **429/423**, not unlimited tries |
| BF-03 | No user enumeration | Compare response (status/body/timing) for a **valid** vs **non-existent** username on a failed login | Identical observable response — no "user exists" signal |
| BF-04 | Generic error message | Failed login body | Generic ("invalid credentials"), never reveals which of user/password was wrong |
| BF-05 | Success path unaffected | Correct password within limits | **200**/302 to authenticated landing; session established server-side |
| BF-06 | Lockout is per-account+per-IP | Lock user via one IP; login from another identity/IP | No bypass of per-account lockout; no global DoS on a shared IP |
| BF-07 | No credential logging | Trigger failed + successful logins | Password/secret never written to logs, responses or `/health` |

## 2. Password reset (SEC-4/SEC-1)

| ID | Case | Steps | Expected |
|----|------|-------|----------|
| PR-01 | Reset request does not enumerate | Request reset for valid vs invalid account | Identical response; no "account not found" leak |
| PR-02 | Reset token single-use | Use a valid reset token twice | First **200/302**, second **400/410** — token invalidated |
| PR-03 | Reset token expiry | Use an expired reset token | **400/410**, rejected |
| PR-04 | Token not guessable/sequential | Inspect issued tokens | High-entropy, non-sequential; cannot be enumerated |
| PR-05 | Token secrecy | Inspect reset delivery + logs | Token never appears in logs; not leaked in a Referer/URL to third parties |
| PR-06 | Reset invalidates existing sessions | Complete a reset while another session is active | Old sessions/tokens revoked; must re-authenticate |
| PR-07 | Password stored hashed | Inspect storage at rest | Salted adaptive hash (e.g. bcrypt/argon2), never plaintext |

## 3. Session fixation (SEC-1/SEC-2)

| ID | Case | Steps | Expected |
|----|------|-------|----------|
| SF-01 | ID regenerated on login | Capture pre-login session cookie; log in | Post-login session id **differs** from pre-login id (fixation defeated) |
| SF-02 | Pre-login cookie rejected after login | Replay the pre-login session id post-login | Not accepted as an authenticated session |
| SF-03 | Auto-rotation | Hold a session across `timeToUpdate` (config = 300s) | Session id rotates; session stays valid (config already sets 300s) |
| SF-04 | Old id invalid after rotation | Use the pre-rotation session id | Rejected (or treated as anonymous), not a parallel authenticated session |
| SF-05 | Cookie flags | Read `Set-Cookie` for the session cookie | `HttpOnly` (config `Cookie::$httponly=true`), `SameSite=Lax` (config), and `Secure=true` in production (see B-C-04: currently `secure=false`) |
| SF-06 | Cookie scope | Inspect session cookie Path/Domain | Minimal scope; not superflously broad |

## 4. Logout (SEC-1)

| ID | Case | Steps | Expected |
|----|------|-------|----------|
| LO-01 | Server-side invalidation | Log out, then reuse the session id on a protected `<EP>` | **401** — session destroyed server-side, not just client-side |
| LO-02 | Cookie cleared | Log out | Session cookie cleared/expired on the response |
| LO-03 | Reuse of logged-out id | Present the logged-out session id again | Not authenticated |
| LO-04 | Logout is CSRF-safe | Log out via cross-site forged request | Protected by CSRF (once enabled) or not state-changing in a harmful way |
| LO-05 | All-sessions logout (if offered) | Trigger "sign out everywhere" | Every outstanding session for that user revoked |

## 5. Session expiry & idle/absolute timeout (SEC-1, exit gate "session-expiry")

| ID | Case | Steps | Expected |
|----|------|-------|----------|
| SE-01 | Idle expiry | Leave a session idle beyond configured expiration (config `Session::$expiration` = 7200s) | Next request **401** |
| SE-02 | Absolute expiry | Hold an active-but-old session past max lifetime | **401** regardless of activity (if absolute timeout is configured) |
| SE-03 | Expiry is server-side | Present an expired session id | Rejected server-side; not merely hidden in UI |
| SE-04 | Refresh does not extend beyond limits | Activity near expiry | Extends idle window only; never bypasses absolute cap |

## 6. State-change protection / CSRF (SEC-3, ties to B-C-04)

| ID | Case | Steps | Expected |
|----|------|-------|----------|
| CS-01 | CSRF enforced on mutations | POST/PUT/DELETE to a state-changing `<EP>` without a valid CSRF token | **403** once CSRF is enabled (today `Filters::$globals.before` has `csrf` commented out — see B-C-04 SC-2) |
| CS-02 | Token per-session | Use a CSRF token from another session | Rejected |
| CS-03 | Token rotation | Submit twice with the same token | Regeneration enforced (`Security::$regenerate=true`) prevents replay |

## 7. Coverage vs Batch B exit gate

- Brute-force (BF-*), reset (PR-*), fixation (SF-*), logout (LO-*) and expiry (SE-*) together cover the exit-gate item *"login/logout/session-expiry behaviors are tested."*
- CS-* + B-C-04 cover state-change and cookie/security-header posture.
- **Execution status: BLOCKED (planned).** No auth/session/logout code exists to run these against; ties to `ops/release-gates.md` G1/G6. Nothing here is claimed as passing. The only auth-adjacent code that exists today (`ExampleSessionTest`) exercises the framework session, not a login flow.

## 8. Note on existing session config (informational, verified)

`Config/Session.php` (read 2026-10-17) already sets: `FileHandler` driver, `expiration=7200`, `timeToUpdate=300`, `regenerateDestroy=false`. `regenerateDestroy=false` means auto-rotation does **not** destroy the old session record (GC will). For strong fixation defense, SF-01/SF-04 require the **login** action to explicitly regenerate (and destroy) the id — an application-level responsibility that does not exist yet.

