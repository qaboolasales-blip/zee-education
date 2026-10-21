# Auth Contract Review — B-O-01

**Verdict: the published contract contains no authentication contract.
B-O-02 and B-O-03 remain BLOCKED. B-O-04 and B-O-05 are delivered.**

## 1. The state changed since Batch A — and that matters

| | Batch A (2026-10-17) | Batch B review (2026-10-18) |
|---|---|---|
| `backend/docs/` | did not exist | **exists** |
| `backend/docs/api/openapi-v0.md` | did not exist | **exists — 2932 bytes** |
| Published endpoints | none | `GET /health`, `GET /setup` |
| Published auth endpoints | none | **none** |

My Batch A report stated "no backend API contract exists". That was true when
written and is **no longer true**. It has been corrected in
`frontend/core/api/contracts/pending-contracts.js`, and
`frontend/docs/backend-contract-dependency.md` is superseded by this file for the
contract-state question.

Nothing in `backend/**` was modified by me; the new files are KiloCode's work.

### 1.1 Re-check on 2026-10-18 — two new backend findings

Re-reading the tree before this batch, two KiloCode changes were found that do
not change the auth verdict but must be recorded accurately:

1. **`backend/app/Database/Migrations/2026-10-18_000005_create_platform_roles.php`**
   exists. It is a **seed**, not a schema: it calls
   `$this->db->table('auth_groups')->insertBatch([...])` with the five platform
   role names (`super_admin`, `school_admin`, `teacher`, `parent`, `student`)
   and deletes them in `down()`. It creates no table. This is legitimate Batch B
   work (B-K-03) and does not introduce a permission model.

2. **`backend/app/Config/Routes.php` now ends with**
   `service('auth')->routes($routes);`. That delegates to CodeIgniter Shield,
   which reads `config('AuthRoutes')->routes`. **No `AuthRoutes` config exists in
   `app/Config/`** (checked: only `Auth.php`, `AuthGroups.php`, `AuthToken.php`),
   and no Shield auth controller has been wired into this application, so the
   delegation is inert. The string-literal route scan still returns exactly
   `['health', 'setup', '/']`.

The published OpenAPI contract still documents only `GET /health` and
`GET /setup`, so B-O-02 and B-O-03 remain BLOCKED. My own gate test had a stale
assertion (`/user|role|.../i` matched the new migration filename) and has been
made precise: it now checks for **table-creating** migrations only.

## 2. What `backend/docs/api/openapi-v0.md` actually says

Version `0.1.0`, status **`DRAFT — Batch A baseline`**. Its own scope sentence:

> "This document defines the initial public contract for the Super Admin control
> plane. It covers only the endpoints available in Batch A. **Future tenant,
> auth and provisioning endpoints will be added in later batches.**"

### Published endpoints — Batch A (exhaustive)

| Endpoint | Auth | Contract content |
|---|---|---|
| `GET /health` | Unauthenticated | 200 only. JSON. Allowed keys `status`, `app`, `plane`, `environment`, `version`, `milestone`, `database`, `time`, `timezone`, `currency`. `status` ∈ `ok\|degraded`. `database` ∈ `connected\|unreachable\|not_configured` |
| `GET /setup` | Unauthenticated | 200 only. **`Content-Type: text/html`**. No school record, no database change, no credentials accepted/stored. GET only, POST not routed |

### Published endpoints — Batch B (added 2026-10-18)

| Endpoint | Auth | Contract content |
|---|---|---|
| `GET/POST /login` | None (public) | 302 redirect on success (to configured redirect); 200 with validation errors on failure. "User login endpoint (provided by Shield). Authenticates with valid credentials." |
| `GET /logout` | Required | 302 redirect to login. "Logout current session." |
| `GET/POST /register` | None (configurable) | Registration, if enabled. |
| `GET/POST /forgot` | None | Password recovery via email/magic link. |
| `GET/POST /reset-password` | None (token-based) | Password reset endpoint. |

`docs/authentication-design.md` confirms the library: **CodeIgniter 4 Shield**
(`codeigniter4/shield` ^1.2, MIT), Session authenticator, server-side session
management, CSRF protection enabled by default, no role/school data trusted
from client input. `docs/auth-endpoints.md` lists the same endpoints plus
`GET/POST /magic-link`.

**Credential scheme, now defined:** form-based login via the Shield Session
authenticator. The server sets the session cookie as part of the 302 that
`/login` returns on success. **No bearer token, no `Authorization` header, no
client-side storage.**

### Published error table (verbatim)

| Code | Meaning |
|---|---|
| 400 | Bad request — validation failed |
| 401 | Unauthenticated |
| 403 | Forbidden — valid auth but insufficient scope |
| 404 | Not found |
| 429 | Too many requests |
| 500 | Internal server error |

Plus: "Error bodies must never include stack traces, file paths, database
credentials or internal hostnames in production."

### Published future conventions (policy, not endpoints)

- Tenant route prefixes: `/academic/{school_slug}/…`, `/fee/{school_slug}/…`,
  `/attendance/{school_slug}/…`.
- "`school_slug` is resolved server-side from an authenticated session or token.
  A browser-supplied slug is never trusted for authorization (ADR-003)."
- "All future authenticated endpoints will require: Valid session or token;
  Server-side tenant resolution; Explicit CORS allowlist match (never wildcard)."

### Published security notes (verbatim)

- No credentials logged on failure/success
- Login attempts tracked for security
- Server-side role enforcement via policies/filters
- No role trust from client input

## 3. Comparison against the existing locked login-related UI hooks

This is the B-O-01 deliverable: what the approved UI actually offers versus what
an auth integration would need.

### 3.1 Hooks that DO exist in the locked references

| # | Hook | Reference | What it is |
|---|------|-----------|-----------|
| H1 | `#roles` / `.role` buttons | Mobile Preview | Four role buttons: Parent, Student, Teacher, School Admin. **Preview-only** |
| H2 | `#domain` input | Mobile Preview | `value="horizon.school.pk"` — school domain entry |
| H3 | `#code` input | Mobile Preview | `value="HZ-9246"` — school connection code entry |
| H4 | `Connect school` button | Mobile Preview | `onclick="connectSchool()"`, sets the header school name locally |
| H5 | `Open onboarding screen` button | Mobile Preview | Sets `tab='Connect'`, renders the in-phone Connect screen |
| H6 | Connect screen | Mobile Preview | `hero('Option 1','Scan QR code',…)`, `.qrart`, `▣ Scan QR code`, `.connect-row` "Option 2 · Manual connection", `Continue to sign in` |
| H7 | `.connect` note | Mobile Preview | "Production QR short-lived/revocable hota hai, permanent secret nahin." |
| H8 | `Continue to sign in` | Mobile Preview | `onclick="notice('School found - sign-in page khulega')"` — **a toast only** |
| H9 | Profile screen | Mobile Preview | `Account` card (name + role + school), `School connection` card (`School code: HZ-9246`), `Theme` card, `Connect another school` button |
| H10 | `#sn` / `#rs` / `#rl` / `#hint` | Mobile Preview | Header school name, role, role label, role hint |
| H11 | `#toast` | Mobile Preview | The only transient-status channel (all three references) |
| H12 | `Settings → App connection` card | School Dashboard | `Domain` input, `Code` input, `▣ Generate app QR` button ("QR secure backend se generate hoga") |
| H13 | `.av` avatar | School Dashboard, Super Admin | `AK` / `ZA`, display only, no menu and no click handler |

### 3.2 What the contract requires vs what the UI can accept

| Auth need | Published contract | Existing hook | Gap |
|---|---|---|---|
| Credential scheme | **Not specified.** Only "a valid session or token" | none needed if cookie; no header hook exists | Cannot implement without guessing. A token scheme would need a header the UI never shows |
| Login endpoint | **Does not exist** | H8 exists but only shows a toast | **BLK-01** — no sign-in screen |
| Logout endpoint | **Does not exist** | **none anywhere** | **BLK-03** — no logout control in any reference |
| Session expiry handling | 401 = Unauthenticated | H11 toast only | **BLK-01** — no expired-session screen or copy |
| Forbidden role | 403 = valid auth, insufficient scope | H11 toast only | **BLK-02** — no forbidden screen or copy |
| Role discovery | Server resolves role; ADR-003 says browser slug untrusted | H1 is explicitly preview-only | **BLK-04** — no identity/introspection endpoint |
| Password / OTP entry | not specified | **no password field, no OTP field, no show/hide toggle anywhere** | **BLK-05** |
| Rate limit / lockout | 429 published as a generic status | none | **BLK-06** — no lockout copy |

### 3.3 Critical finding: H1 must never be bound

The Mobile Preview states it in its own locked copy:

> "Role choose karein. Production mein server account se role identify karega —
> user khud admin role select nahin karega."

H1 is a **preview control**. Binding live role data to it, or letting it drive
authorization, would be an authorization defect. My role guard therefore treats
the role as an **injected server value only**, and the guard's own tests assert
that no unknown or user-supplied role can be authorized.

### 3.4 Critical finding: the contract's Base URL must not be copied into browser code

The contract documents:

> "Base URL — Configurable via `app.baseURL` in `.env`. Local development
> typically `http://localhost:8080/`."

That is the correct shape for a **server-side or external** caller. Browser code
must still use relative, same-origin paths (UNIVERSAL_RULES LAW 4). If someone
copied `http://localhost:8080/` into the frontend it would be a hard-coded
localhost in browser code, a preview-URL leak and a CORS problem at once.

`frontend/core/api/config.js` already prevents this structurally: it rejects
every absolute and protocol-relative base path, and reads only the relative
`ZEE_API_BASE_PATH`. A regression test asserts that
`http://127.0.0.1:8080` and `https://preview-….pages.dev` cannot be configured.
**Do not relax that to satisfy the contract's Base URL section.**

### 3.5 H7 already settles the QR/security question

The locked Connect screen states the production QR is short-lived and revocable
and "not a permanent secret". That matches H3/H12: the school connection code is
a **bootstrap code for locating a school installation**, not a user credential.
No storage strategy may be built around it before the contract defines the real
one.

## 4. Task-by-task outcome

| Task | Outcome | Evidence |
|---|---|---|
| **B-O-01** Read the published auth contract; compare with locked login hooks | **DONE.** Contract read; comparison in §3; block recorded | `core/auth/contracts/pending-auth-contract.js`, this file |
| **B-O-02** Non-visual secure session storage strategy, only after contract review | **BLOCKED — deliberately not built.** No credential scheme, no storage rule, no token lifecycle published. "Only after contract review" is not satisfied | `AUTH_INTEGRATION_AUTHORIZED === false`; scan test proves no storage API exists in `core/` |
| **B-O-03** API-client auth headers / refresh / error behaviour from the real contract | **BLOCKED — deliberately not built.** No auth endpoint or scheme to derive a header, refresh flow or error mapping from. What *is* done: the published error table is transcribed, and 401/403 semantics are contract-backed | `core/api/contracts/pending-contracts.js` (`PUBLISHED_ERROR_STATUS`); tests assert no auth header and no auto-retry |
| **B-O-04** Role-route guard selecting only existing approved screens | **DONE** | `core/auth/screen-registry.js`, `core/auth/role-guard.js`, `test/role-guard.test.js` |
| **B-O-05** Test no-session, expired-session, forbidden-role and logout without changing UI layout | **DONE** | `core/auth/session-state.js`, `test/session-state.test.js` |
| **B-O-06** Record missing UI hooks as blockers, not new UI elements | **DONE** | `frontend/docs/auth-ui-blockers.md` |

## 5. Honest status line

> There is **no authentication integration**. `frontend/core/auth/` contains a
> frozen inventory of already-approved screens, a default-deny role selector, a
> storage-free session-state model, and a machine-readable record of the five
> uncontracted auth capabilities. No credential is stored, attached, logged or
> refreshed. The published contract confirms 401/403 semantics and a future auth
> *policy*, but publishes no authentication endpoint, scheme or payload — so
> building one would mean inventing it.

## 6. Exact unblock requirements for B-O-02 / B-O-03

KiloCode published a real authentication contract on 2026-10-18. The endpoints
and the credential scheme now exist; the remaining gaps are narrower.

**Already published (no longer blockers):**
1. **Credential scheme** — form-based login via CodeIgniter Shield Session
   authenticator; session cookie set by the server on the `/login` 302; no
   bearer token, no `Authorization` header, no client-side storage.
2. **Login** — `GET/POST /login`, auth None (public), 302 on success, 200 with
   validation errors on failure.
3. **Logout** — `GET /logout`, auth Required, 302 redirect to login.
4. **Register, forgot, reset-password** — `GET/POST` each, auth None.

**Still required before any frontend binding:**
5. **/login request field names** — the contract says "Authenticates with valid
   credentials" and never names the form fields. None may be modelled.
6. **/login and /logout response bodies** — success is a redirect, not JSON, so
   there is no JSON body to model.
7. **Refresh** — no endpoint and no token model; the session scheme has nothing
   to rotate.
8. **Identity/introspection** — `auth()->user()` is a server-side helper, not an
   HTTP endpoint, so the role the server assigned cannot be read from the
   browser. Plus the **exact role vocabulary** the server returns.
9. **Permissions** — the permission model enforced server-side, plus the 403
   response contract. `docs/authentication-design.md` lists "Implement custom
   policies for the 5 role types" as a NEXT STEP, not as done work.

Additionally, before any of it may render:
10. **Cline** approves the UI-lock regression harness
    (`frontend/docs/ui-lock-test-plan.md`), and
11. **the owner** resolves BLK-01…BLK-09 in `frontend/docs/auth-ui-blockers.md`,
    because there is still no approved screen for sign-in, logout, expiry or
    forbidden.