# OpenAPI v0 — Zee Education Control Plane

Version: 0.1.0
Status: DRAFT — Batch A baseline

This document defines the initial public contract for the Super Admin control plane. It covers only the endpoints available in Batch A. Future tenant, auth and provisioning endpoints will be added in later batches.

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
  "environment": "development",
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