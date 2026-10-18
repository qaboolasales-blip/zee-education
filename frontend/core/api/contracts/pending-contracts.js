/**
 * KiloCode Batch A endpoint contract registry. Task: O-01.4.
 *
 * SUPERSEDED STATE NOTE — read this first.
 *   During Batch A no contract document existed and every entry here was
 *   recorded as BLOCKED. KiloCode has since published
 *   `backend/docs/api/openapi-v0.md` (version 0.1.0, status DRAFT — Batch A
 *   baseline). This module now reflects the published document.
 *
 * What the published contract actually contains:
 *   - `GET /health` — full response schema, allowed-key list and enum values.
 *   - `GET /setup`  — confirmed as a display-only **HTML** placeholder. There is
 *     still no JSON payload to model, so /setup stays unmodelable BY DESIGN,
 *     not merely undocumented.
 *   - an error status table (400/401/403/404/429/500) with meanings.
 *   - future tenant route conventions and an authentication *policy* statement.
 *
 * What it does NOT contain: any tenant, auth or provisioning endpoint, and no
 * school/student/attendance/fee data surface.
 *
 * Every schema below is transcribed from the published document. No field, type
 * or enum value is invented, and `assertNoInventedSchemas()` fails the test
 * suite if an entry claims a schema without the contract backing it.
 */

/** Contract publication states. */
export const ContractStatus = Object.freeze({
  BLOCKED_MISSING_CONTRACT: 'blocked-missing-contract',
  BLOCKED_NOT_JSON: 'blocked-not-a-json-api',
  PUBLISHED: 'published',
});

/** The document KiloCode publishes the contract in. */
export const EXPECTED_CONTRACT_DOC = 'backend/docs/api/openapi-v0.md';

export const CONTRACT_DOC_VERSION = '0.1.0';
export const CONTRACT_DOC_STATUS = 'DRAFT — Batch A baseline';

/**
 * Published error status table, transcribed verbatim from the contract's
 * "Error responses" section.
 */
export const PUBLISHED_ERROR_STATUS = Object.freeze({
  400: 'Bad request — validation failed',
  401: 'Unauthenticated',
  403: 'Forbidden — valid auth but insufficient scope',
  404: 'Not found',
  429: 'Too many requests',
  500: 'Internal server error',
});

/**
 * Published `status` enum for `GET /health`.
 */
export const HEALTH_STATUS_VALUES = Object.freeze(['ok', 'degraded']);

/**
 * Published `database` enum for `GET /health`.
 */
export const HEALTH_DATABASE_VALUES = Object.freeze(['connected', 'unreachable', 'not_configured']);

/**
 * Published response schema for `GET /health`.
 *
 * The contract states: "Allowed keys only: status, app, plane, environment,
 * version, milestone, database, time, timezone, currency. No other keys may be
 * added without contract review." This object mirrors that list exactly, and
 * `HEALTH_ALLOWED_KEYS` is asserted against it by the test suite so the two
 * cannot drift.
 *
 * @typedef {{
 *   status: 'ok' | 'degraded',
 *   app: string,
 *   plane: string,
 *   environment: string,
 *   version: string,
 *   milestone: string,
 *   database: 'connected' | 'unreachable' | 'not_configured',
 *   time: string,
 *   timezone: string,
 *   currency: string,
 * }} HealthResponse
 */
export const HEALTH_RESPONSE_SCHEMA = Object.freeze({
  status: 'ok | degraded',
  app: 'string',
  plane: 'string',
  environment: 'string',
  version: 'string',
  milestone: 'string',
  database: 'connected | unreachable | not_configured',
  time: 'string',
  timezone: 'string',
  currency: 'string',
});

export const HEALTH_ALLOWED_KEYS = Object.freeze(Object.keys(HEALTH_RESPONSE_SCHEMA));

/**
 * Batch A endpoints named by the agent packet.
 * @type {ReadonlyArray<Readonly<{
 *   id: string, method: string, path: string, status: string,
 *   expectedIn: string, requestSchema: null, responseSchema: object|null,
 *   frontendBindingAllowed: boolean, sourceObservation: string,
 *   blocker: string|null, unblockRequires: string|null
 * }>>}
 */
export const BATCH_A_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'health',
    method: 'GET',
    path: '/health',
    status: ContractStatus.PUBLISHED,
    expectedIn: EXPECTED_CONTRACT_DOC,
    // The contract defines no request parameters and no request body for GET.
    requestSchema: null,
    responseSchema: HEALTH_RESPONSE_SCHEMA,
    // The contract exists, but binding it into a runtime page is Batch B work
    // that has not been assigned, and Cline's UI-lock regression harness is not
    // approved yet. See LIVE_BINDING_AUTHORIZED.
    frontendBindingAllowed: false,
    sourceObservation:
      'Published. Contract section "GET /health": unauthenticated, 200 only, JSON, ' +
      'allowed keys status/app/plane/environment/version/milestone/database/time/timezone/currency, ' +
      'status enum ok|degraded, database enum connected|unreachable|not_configured.',
    blocker:
      'Binding is blocked, not modelling. The model is complete and transcribed from the contract; ' +
      'what is missing is (a) an assigned Batch B microtask and (b) Cline-approved UI-lock ' +
      'regression evidence proving a binding cannot move a pixel.',
    unblockRequires:
      'Owner assigns the binding microtask and Cline approves the UI-lock harness from ' +
      'frontend/docs/ui-lock-test-plan.md. No new schema is needed.',
  }),
  Object.freeze({
    id: 'setup',
    method: 'GET',
    path: '/setup',
    status: ContractStatus.BLOCKED_NOT_JSON,
    expectedIn: EXPECTED_CONTRACT_DOC,
    requestSchema: null,
    responseSchema: null,
    frontendBindingAllowed: false,
    sourceObservation:
      'Published, and it confirms the route is not a JSON API. Contract section "GET /setup": ' +
      'display-only installer placeholder, unauthenticated, 200 only, Content-Type text/html; ' +
      'no school record created, no database created or modified, no credentials accepted or ' +
      'stored, GET only (POST is not routed).',
    blocker:
      'There is no request/response payload to model. A JSON setup model would contradict the ' +
      'published contract, and the real installer is Phase P3.',
    unblockRequires:
      'KiloCode publishes a separate JSON installer API contract when the Phase P3 wizard is ' +
      'implemented. Per-school credentials are encrypted at rest (ADR-108) and must never reach ' +
      'browser code.',
  }),
]);

/** Kept as the historical export name; Batch A tracked /health and /setup. */
export const PENDING_CONTRACTS = BATCH_A_CONTRACTS;

/**
 * The contract for /health is published, but binding it into a runtime page is
 * not authorized yet: no Batch B microtask has been assigned for it and Cline's
 * UI-lock regression harness is not approved. Modelling is not binding.
 */
export const LIVE_BINDING_AUTHORIZED = false;

/**
 * Invariant guard. Throws if an entry claims a schema or binding without the
 * published contract backing it.
 *
 * @param {ReadonlyArray<object>} [contracts]
 */
export function assertNoInventedSchemas(contracts = BATCH_A_CONTRACTS) {
  if (LIVE_BINDING_AUTHORIZED) {
    throw new Error('live binding is authorized without an assigned Batch B task');
  }
  for (const contract of contracts) {
    if (contract.status !== ContractStatus.PUBLISHED) {
      if (contract.requestSchema !== null || contract.responseSchema !== null) {
        throw new Error(
          `contract '${contract.id}' declares a schema while the published contract defines none`,
        );
      }
      if (contract.frontendBindingAllowed !== false) {
        throw new Error(`contract '${contract.id}' authorizes binding without a published contract`);
      }
    }
    if (contract.frontendBindingAllowed !== false) {
      throw new Error(
        `contract '${contract.id}' authorizes frontend binding; binding is a separate approved task`,
      );
    }
  }
  return true;
}

/**
 * Guard against contract drift: the transcribed health schema must keep exactly
 * the allowed-key list the contract states.
 */
export function assertHealthSchemaMatchesContract(allowedKeys = HEALTH_ALLOWED_KEYS) {
  const expected = [
    'status',
    'app',
    'plane',
    'environment',
    'version',
    'milestone',
    'database',
    'time',
    'timezone',
    'currency',
  ];
  assertNoInventedSchemas();
  if (allowedKeys.length !== expected.length || allowedKeys.some((key, i) => key !== expected[i])) {
    throw new Error(`GET /health schema drifted from the published contract: ${allowedKeys.join(',')}`);
  }
  return true;
}

export function findContract(id) {
  return BATCH_A_CONTRACTS.find((contract) => contract.id === id) ?? null;
}

/**
 * Published future conventions. Recorded because they shape how binding must
 * work, but NOT implemented: no such endpoint exists.
 */
export const PUBLISHED_FUTURE_CONVENTIONS = Object.freeze({
  tenantRoutePrefixes: Object.freeze(['/academic/{school_slug}', '/fee/{school_slug}', '/attendance/{school_slug}']),
  tenantResolutionRule:
    'school_slug is resolved server-side from an authenticated session or token; a browser-supplied ' +
    'slug is never trusted for authorization (ADR-003).',
  authenticatedEndpointRequirements: Object.freeze([
    'Valid session or token',
    'Server-side tenant resolution',
    'Explicit CORS allowlist match (never wildcard)',
  ]),
  implemented: false,
});

/**
 * Safe summary for the tracker. Contains no payload data.
 */
export function describeContractBlock() {
  return {
    expectedIn: EXPECTED_CONTRACT_DOC,
    exists: true,
    version: CONTRACT_DOC_VERSION,
    docStatus: CONTRACT_DOC_STATUS,
    endpoints: BATCH_A_CONTRACTS.map((contract) => ({
      id: contract.id,
      method: contract.method,
      path: contract.path,
      status: contract.status,
      modeled: contract.responseSchema !== null,
      blocker: contract.blocker,
    })),
    liveBindingAuthorized: LIVE_BINDING_AUTHORIZED,
  };
}