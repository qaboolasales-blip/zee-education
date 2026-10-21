# OpenAPI v0 — Zee Education Control Plane

Version: 0.1.0
Status: IMPLEMENTED — Batch A baseline

This document lists the endpoints that are actually implemented and routed in this build. Every endpoint below resolves to a real controller method.

## Base URL

Configurable via `app.baseURL` in `.env`. Local development typically `http://localhost:8080/`.

## Common headers

| Header | Value | Notes |
|---|---|---|
| `Content-Type` | `application/json` | For JSON responses. |
| `Access-Control-Allow-Origin` | Explicit origin only | Never `*` on authenticated APIs (ADR-008). |

## Paths

### GET /health

Environment-safe health probe. Unauthenticated. Returns no credentials, no detailed server information, no tenant or learner data.

**Responses:**

| Code | Description |
|---|---|
| 200 | OK — service is reachable |

**200 Response:**

```json
{
  "status": "ok",
  "app": "Zee Education",
  "plane": "control-plane",
  "environment": "production",
  "version": "0.1.0",
  "milestone": "M1.2",
  "database": "connected",
  "time": "2026-10-18T04:00:00+00:00",
  "timezone": "Asia/Karachi",
  "currency": "PKR"
}
```

**Allowed keys only:** `status`, `app`, `plane`, `environment`, `version`, `milestone`, `database`, `time`, `timezone`, `currency`. No other keys may be added without contract review.

**`status` values:** `ok`, `degraded`

**`database` values:** `connected`, `unreachable`, `not_configured`

### GET /setup

Display-only installer placeholder. Unauthenticated. Writes nothing to any database. Returns HTML.

**Responses:**

| Code | Description |
|---|---|
| 200 | OK — placeholder page rendered |

**Content-Type:** `text/html; charset=UTF-8`

**Guarantees:**
- No school record created
- No database created or modified
- No credentials accepted or stored
- GET only — POST is not routed

## Batch B: Authentication Endpoints

### GET/POST /login

User login endpoint (provided by Shield). Authenticates with valid credentials.

**Authentication:** None (public)

**Responses:**
- 302 redirect on success (to configured redirect)
- 200 with validation errors on failure

### GET /logout

Logout current session.

**Authentication:** Required

**Responses:**
- 302 redirect to login

### GET/POST /register

User registration endpoint (if enabled). Creates new platform user.

**Authentication:** None (configurable)

### GET/POST /forgot

Password recovery via email/magic link.

**Authentication:** None

### GET/POST /reset-password

Password reset endpoint.

**Authentication:** None (token-based)

**Security Notes:**
- No credentials logged on failure/success
- Login attempts tracked for security
- Server-side role enforcement via policies/filters
- No role trust from client input

## Future endpoint conventions

### Tenant routes

All future endpoints carrying school or learner data MUST follow this convention:

```
/academic/{school_slug}/...
/fee/{school_slug}/...
/attendance/{school_slug}/...
```

Where `school_slug` is resolved server-side from an authenticated session or token. A browser-supplied slug is never trusted for authorization (ADR-003).

### Authentication

All future authenticated endpoints will require:
- Valid session or token
- Server-side tenant resolution
- Explicit CORS allowlist match (never wildcard)

### Error responses

| Code | Meaning |
|---|---|
| 400 | Bad request — validation failed |
| 401 | Unauthenticated |
| 403 | Forbidden — valid auth but insufficient scope |
| 404 | Not found |
| 429 | Too many requests |
| 500 | Internal server error |

Error bodies must never include stack traces, file paths, database credentials or internal hostnames in production.

## See also

- `docs/control-plane-data-boundary.md`
- `docs/migration-plan.md`
- `docs/environment-audit.md`
- `docs/authentication-design.md`
- `docs/auth-endpoints.md`

## Implemented surfaces in this build

Every route below is real and resolves to a controller method.
39 application routes (plus Shield's own sign-in/sign-out routes, which Shield
registers itself and which this document does not restate).

| Method | Path | Guard | Plane |
|---|---|---|---|
| GET | `/` | none — redirects to `/install` if not installed, `/portal` if signed in, `/login` otherwise (the `superadmin` filter on `/portal` then bounces a non-operator to `/login`) | control plane |
| GET | `/health` | none | control plane |
| GET | `/api/health` | none | control plane (frontend health check) |
| GET | `/setup` | none | control plane |
| GET | `/install` | only while not installed | installer |
| POST | `/install/preflight` | only while not installed | installer |
| GET | `/install/database` | only while not installed | installer |
| POST | `/install/database` | only while not installed | installer |
| GET | `/install/admin` | only while not installed | installer |
| POST | `/install/admin` | only while not installed | installer |
| GET | `/install/done` | only while not installed | installer |
| GET | `/portal` | Super Admin | control plane |
| GET | `/school` | School Admin or Teacher + valid licence | school (dedicated DB) |
| GET | `/m` | School Admin or Teacher + valid licence | school (dedicated DB) |
| GET | `/api/school/students` | School Admin | school (dedicated DB) |
| POST | `/api/school/students` | School Admin | school (dedicated DB) |
| GET | `/api/school/invoices` | School Admin | school (dedicated DB) |
| POST | `/api/school/staff` | School Admin, Teacher | school (dedicated DB) |
| POST | `/api/school/attendance` | School Admin, Teacher | school (dedicated DB) |
| POST | `/api/school/fees/invoices` | School Admin, Teacher | school (dedicated DB) |
| POST | `/api/school/fees/receipts` | School Admin, Teacher | school (dedicated DB) |
| GET | `/admin/schools` | Super Admin | control plane |
| POST | `/admin/schools` | Super Admin | control plane |
| POST | `/admin/schools/provision` | Super Admin | control plane + school DB |
| GET | `/api/admin/schools` | Super Admin | control plane |
| POST | `/api/admin/schools` | Super Admin | control plane |
| POST | `/api/connect/resolve` | none, throttled per IP; identical response whether or not a school exists | control plane (school lookup) |
| GET | `/api/connect/verify` | none, throttled per IP | control plane (invite check) |
| POST | `/api/connect/invite` | session + school role (Super Admin, School Admin or Teacher) | school (dedicated DB) |
| GET | `/connect/qr` | none; only a short-lived token renders, an expired one shows a notice | control plane (QR image) |
| GET | `/api/admin/billing/summary` | Super Admin | control plane |
| GET | `/api/admin/billing/upcomings` | Super Admin | control plane |
| GET | `/api/admin/billing/invoices/{school_id}` | Super Admin | control plane |
| POST | `/api/admin/billing/issue` | Super Admin + CSRF token | control plane |
| POST | `/api/admin/billing/invoice` | Super Admin + CSRF token | control plane |
| POST | `/api/admin/billing/pay` | Super Admin + CSRF token | control plane |
| POST | `/api/admin/billing/void` | Super Admin + CSRF token | control plane |
| POST | `/api/admin/billing/revoke` | Super Admin + CSRF token | control plane |
| POST | `/api/admin/billing/renew` | Super Admin + CSRF token | control plane |

Billing contract with request and response shapes: `backend/docs/api/billing-api.md`.

### Duplicate-provision responses (RB-4)

| Request | Response |
|---|---|
| `POST /admin/schools` or `POST /admin/schools/provision` with a `school_code` already in use | `409 {"ok":false,"message":"That school code is already in use","id":<existing id>}` — no second school row is created |

Application-level duplicate handling is only half the guard: at schema level
migration `2026-10-20_000016` puts a UNIQUE `idempotency_key` on
`provisioning_jobs`, so a duplicated job key is rejected by MySQL itself
(error 1062). A library-level retry against a school whose
`installation_state` is `completed` is also a no-op (`SchoolProvisioningService`
answers `Already provisioned` without running the pipeline); that path is not
reachable over HTTP, because an existing `school_code` short-circuits to the
409 above.

### CSRF coverage (state-changing routes)

| Route group | Application CSRF check |
|---|---|
| `POST /api/admin/billing/*` | **yes** — `ApiCsrfFilter` (kept as the group's only check under the global filter, preserving the JSON `403 {"error":"csrf_required"}` contract) |
| `POST /api/school/*` | **yes** — global `csrf` filter (2026-10-20 build 5): token-less write → `403 SecurityException::forDisallowedAction`; plus `SameSite=Lax` + `HttpOnly` session cookie defence in depth |
| `POST /admin/schools*`, `POST /api/connect/invite` | **yes** — global `csrf` filter (2026-10-20 build 5) + the same cookie defence |
| Shield sign-in / register forms | **yes** — global `csrf` filter (2026-10-20 build 5); views already render `csrf_field()`, token-less login POST → `403` |

### Security notes

- No endpoint accepts a database host, username or password. School database
  credentials come from server-local configuration only (ADR-108).
- No endpoint accepts a school id for learner data. The school is always
  resolved server-side from the signed-in session via `user_school_access`
  (ADR-003). The two deliberate exceptions are `POST /admin/schools/provision`
  (Super Admin creating a school) and `POST /api/admin/billing/*` (Super Admin
  recording a licence invoice for a school), both platform-operator actions
  that never touch learner rows.
- Super Admin is a platform operator and deliberately has no school, so
  platform staff cannot browse learner data.
- `POST /api/connect/resolve` is throttled and returns the same response shape
  whether or not a school exists, so it cannot be used to enumerate customers.