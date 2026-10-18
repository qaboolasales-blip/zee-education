# Backend API Contract Dependency (O-01.4)

**Status: BLOCKED.** Frontend has a transport adapter but **no** endpoint models,
and no live integration may be claimed.

## What was checked

| Check | Result |
|---|---|
| `backend/docs/` exists | **No** |
| `backend/docs/api/openapi-v0.md` exists (path named in the agent packet) | **No** |
| Any `*.yaml` / `*.yml` / `*.json` / `*.md` file under `backend/` (excluding `vendor/`) whose name suggests OpenAPI, Swagger, Postman or a contract | **None found** |
| KiloCode agent status file claims any published contract | **No** — `coordination/agent_status/kilocode.md` still reads "Status: Not started" |
| `backend/README.md` published contract section | Not present as an API contract (see note below) |

Verification commands used (read-only):

```powershell
Test-Path "backend/docs"
Test-Path "backend/docs/api/openapi-v0.md"
Get-ChildItem backend -Recurse -File -Include *.md,*.yaml,*.yml,*.json |
  Where-Object { $_.FullName -notmatch '\\vendor\\' }
```

## Consequence for the task as written

O-01.4 says: *"Create typed/documented API model interfaces/contracts only for
KiloCode Batch A endpoints (`/health`, `/setup`) after reading KiloCode
documentation. If absent, document the block; do not invent endpoint payloads."*

Documentation is absent, therefore:

- **No** request interface was written.
- **No** response interface was written.
- **No** field name, type, enum value, status code or envelope was assumed.
- `frontend/core/api/contracts/pending-contracts.js` records the block in code,
  with every schema field pinned to `null`, and ships an invariant guard
  (`assertNoInventedSchemas()`) that fails the test suite if anybody later adds
  an invented schema.

This is the truthful outcome. Writing "plausible" `/health` and `/setup` models
now would be a fabricated contract and would violate UNIVERSAL_RULES LAW 3/4
and the "truthful completion" override.

## Unverified source observations (NOT contracts)

While searching, KiloCode's source was read to make the block report useful.
These are observations about what happens to exist in the source tree right
now. **They are not a contract.** Source is unversioned, unreviewed and may
change; a frontend binding must never be written against them.

| Route | Source file | Observed behaviour |
|---|---|---|
| `GET /health` | `backend/app/Controllers/Health.php` | Returns `200` with a JSON envelope assembled from `Config\ZeeEducation` plus a database reachability string. Its own docblock states the endpoint is intentionally **unauthenticated** for monitoring/load balancers, carries no school or user data, and **MUST NOT** expose database host/port/name/user/password/DSN, PHP version, MySQL version, filesystem paths, hostname, or framework internals beyond the environment name. |
| `GET /setup` | `backend/app/Controllers/Setup.php` | Sets `Content-Type: text/html` and renders a PHP view. Its docblock states it is a **DISPLAY-ONLY** placeholder that performs no database write, creates no school and stores no credentials, and places the real installer at phase P3 with encrypted-at-rest per-school credentials. |

Route table source: `backend/app/Config/Routes.php`
(`get('health', 'Health::index')`, `get('setup', 'Setup::index')`, `get('/', 'Home::index')`).

### The `/setup` finding is a hard blocker, not a documentation gap

`GET /setup` is **not a JSON API**. Even a perfectly published OpenAPI document
for it would describe an HTML page, not a payload the frontend could bind to.
So there are two separate problems for `/setup`:

1. No contract document exists.
2. The route as implemented has no JSON request/response surface to model.

Frontend therefore models nothing for `/setup` and must not present a setup
status card until a real installer API is contracted.

## What frontend delivered instead

| Artefact | Purpose |
|---|---|
| `frontend/core/api/client.js` | Relative-path transport, timeouts, abort, JSON-only body encoding. Models **zero** endpoints. |
| `frontend/core/api/config.js` | Relative base-path enforcement, config allow-list, secret/credential rejection. |
| `frontend/core/api/errors.js` | Fixed safe error copy; no server text, URL or response body can reach UI copy. |
| `frontend/core/api/contracts/pending-contracts.js` | Machine-readable block record + `assertNoInventedSchemas()` invariant. |
| `frontend/test/contracts.test.js` | Fails if an invented schema appears or if binding is authorized while blocked. |

## Exact unblock conditions

| Endpoint | Frontend can proceed only when KiloCode publishes… |
|---|---|
| `GET /health` | `backend/docs/api/openapi-v0.md` documenting the response schema, the exact media type, and every status code the endpoint can return (including the degraded/database-unreachable case). |
| `GET /setup` | A **new JSON installer API** — endpoints, authentication, request/response schemas, provisioning state machine, and the ADR-108 encrypted-credential handling — plus a contract document. Per-school database credentials must never be exposed to browser code. |

Additional conditions before **any** school/user data endpoint (Batch B):

- Explicit CORS allowlist for the production school and app origins. Never
  `Access-Control-Allow-Origin: *` on authenticated APIs (UNIVERSAL_RULES §3).
- Session/cookie contract for login. Browser code must not hold a long-lived
  token, and a school ID supplied by the browser must never be trusted for
  authorization.
- Dedicated database per school confirmed at the contract level; a shared
  `tenant_id` table is not acceptable (UNIVERSAL_RULES §5).
- Cline's approval of the UI-lock regression harness so binding can be proven
  pixel-safe (`frontend/docs/ui-lock-test-plan.md`).

## Honest status line

> There is **no live API integration**. `frontend/core/api/` contains a tested,
> endpoint-agnostic transport adapter and an explicit block record. No request or
> response payload has been defined, because no backend contract has been
> published. Any statement that the frontend is "integrated" would be false.