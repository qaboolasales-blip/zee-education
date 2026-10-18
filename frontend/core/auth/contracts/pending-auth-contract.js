/**
 * Auth contract dependency record. Tasks: B-O-01 and B-O-03.
 *
 * HEADLINE: a backend API contract NOW EXISTS —
 * `backend/docs/api/openapi-v0.md`, version 0.1.0, status "DRAFT — Batch A
 * baseline". Batch A recorded its absence; that is no longer true and this
 * module reflects the published reality.
 *
 * What the published contract DOES say about authentication — a POLICY
 * statement, transcribed verbatim, plus the error-code semantics:
 *
 *   "All future authenticated endpoints will require:
 *      - Valid session or token
 *      - Server-side tenant resolution
 *      - Explicit CORS allowlist match (never wildcard)"
 *
 *   401 = "Unauthenticated"
 *   403 = "Forbidden — valid auth but insufficient scope"
 *
 *   "Where school_slug is resolved server-side from an authenticated session or
 *    token. A browser-supplied slug is never trusted for authorization
 *    (ADR-003)."
 *
 * What the published contract DOES NOT contain — and this is why B-O-02 and
 * B-O-03 stay BLOCKED:
 *
 *   - No authentication endpoint of any kind (no login, sign-in, logout,
 *     refresh, token, "me", session-introspection or role endpoint).
 *   - No credential scheme: it does not say whether auth is a session cookie,
 *     an Authorization header, a bearer token, or a combination.
 *   - No login/logout/refresh request or response payload.
 *   - No token format, lifetime, idle vs absolute expiry, rotation or
 *     revocation rule.
 *   - No storage guidance for a browser client.
 *   - No role or permission vocabulary, and no per-endpoint auth requirement.
 *
 * The document itself says these are for "later batches". A policy requirement
 * is not a contract: implementing against it would mean inventing the scheme.
 *
 * Therefore every schema below is pinned to `null`, and
 * `assertNoInventedAuthSchemas()` fails the test suite if that changes.
 */

/** Contract publication states. */
export const AuthContractStatus = Object.freeze({
  BLOCKED_NOT_CONTRACTED: 'blocked-not-contracted',
  BLOCKED_NO_IMPLEMENTATION: 'blocked-no-backend-implementation',
  PUBLISHED: 'published',
});

export const EXPECTED_AUTH_CONTRACT_DOC = 'backend/docs/api/openapi-v0.md';

/** The contract document exists as of the Batch B review. */
export const AUTH_CONTRACT_DOC_EXISTS = true;
export const AUTH_CONTRACT_DOC_VERSION = '0.1.0';
export const AUTH_CONTRACT_DOC_STATUS = 'DRAFT — Batch A baseline';

/**
 * Transcribed from the published contract's "Authentication" section.
 * These are requirements on FUTURE endpoints. None has an endpoint yet.
 */
export const PUBLISHED_AUTH_POLICY = Object.freeze({
  authenticatedEndpointRequirements: Object.freeze([
    'Valid session or token',
    'Server-side tenant resolution',
    'Explicit CORS allowlist match (never wildcard)',
  ]),
  credentialScheme: null,
  sessionOrToken: 'the contract requires "a valid session or token" but does not say which, or how it is presented',
  tenantResolution:
    'school_slug is resolved server-side from an authenticated session or token; a browser-supplied ' +
    'slug is never trusted for authorization (ADR-003).',
  errorSemantics: Object.freeze({
    401: 'Unauthenticated',
    403: 'Forbidden — valid auth but insufficient scope',
  }),
  scope: 'Batch A control plane only — the contract states tenant/auth endpoints come in later batches',
});

/**
 * Unverified observations about what currently exists in KiloCode's tree.
 * These are NOT contracts and nothing was modelled from them.
 */
export const SOURCE_OBSERVATIONS = Object.freeze([
  Object.freeze({
    area: 'routes',
    observation:
      'backend/app/Config/Routes.php still declares exactly three routes: GET /health, GET /setup, ' +
      'GET /. There is no login, logout, session, token, auth, me or role endpoint.',
    contract: false,
  }),
  Object.freeze({
    area: 'controllers',
    observation:
      'backend/app/Controllers still contains only BaseController, Health, Home and Setup. ' +
      'There is no Auth, Login, Session, Token, User, Permission or Role class.',
    contract: false,
  }),
  Object.freeze({
    area: 'migrations',
    observation:
      'backend/app/Database/Migrations now contains four control-plane migrations: schools, ' +
      'school_domains, provisioning_jobs, platform_audit_events. There is still no user, role, ' +
      'permission, session or refresh-token table. The control-plane data boundary document lists ' +
      'no auth entity either.',
    contract: false,
  }),
  Object.freeze({
    area: 'session',
    observation:
      'backend/app/Config/Session.php remains unmodified CodeIgniter 4 framework default ' +
      "(driver FileHandler, cookieName 'ci_session', expiration 7200, regenerateDestroy false). " +
      'It is a framework default, not a Zee Education session decision, so the frontend must not ' +
      'infer any session semantics from it.',
    contract: false,
  }),
  Object.freeze({
    area: 'cors',
    observation:
      'backend/app/Config/Cors.php implements an explicit allowlist (ADR-008) and refuses a wildcard ' +
      'origin. supportsCredentials, allowedHeaders and allowedMethods all default to empty/false, ' +
      'driven by app.corsAllowedOrigins / app.corsAllowedHeaders / app.corsAllowedMethods. ' +
      'No credentialed flow is enabled yet, which is consistent with there being no auth endpoint.',
    contract: false,
  }),
]);

/**
 * Auth capability gaps that frontend is blocked on. `null` schema everywhere.
 * @type {ReadonlyArray<Readonly<{
 *   id: string, capability: string, status: string,
 *   method: null, path: null, requestSchema: null, responseSchema: null,
 *   implemented: boolean, blocker: string, unblockRequires: string
 * }>>}
 */
export const PENDING_AUTH_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'login',
    capability: 'authenticate a user against a school installation',
    status: AuthContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'The published contract declares NO authentication endpoint. It requires "a valid session or ' +
      'token" for future endpoints but does not define the scheme, the identifier format, the ' +
      'failure codes or any payload. Frontend cannot guess these.',
    unblockRequires:
      'KiloCode publishes an auth endpoint contract: method and path, request fields, response ' +
      'fields, the credential scheme (session cookie vs Authorization header vs both), every ' +
      'failure status, and rate-limit/lockout behaviour.',
  }),
  Object.freeze({
    id: 'logout',
    capability: 'terminate the current session server-side',
    status: AuthContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No endpoint exists. A client can always drop its own session locally, but it must not claim ' +
      'the server session is terminated without a contracted endpoint.',
    unblockRequires:
      'KiloCode publishes the logout contract, including whether server-side session and refresh-token ' +
      'revocation occurs and whether the response is idempotent.',
  }),
  Object.freeze({
    id: 'refresh',
    capability: 'renew an expired session without re-authentication',
    status: AuthContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No endpoint and no token model exists, so refresh cannot be implemented and MUST NOT be ' +
      'guessed. An invented refresh flow is a security defect, not a convenience.',
    unblockRequires:
      'KiloCode publishes the refresh contract and the token lifecycle: storage medium, rotation ' +
      'policy, absolute vs idle expiry, and revocation behaviour.',
  }),
  Object.freeze({
    id: 'current-identity',
    capability: 'read the authenticated role, school and data scope on page load',
    status: AuthContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No "me"/profile/session-introspection endpoint exists, so a page load cannot discover the role ' +
      'the server assigned. The contract promises server-side tenant resolution from the session but ' +
      'publishes no way to read it. The Mobile App Preview role selector is a PREVIEW control and is ' +
      'explicitly documented in the reference as not being how production identifies a role.',
    unblockRequires:
      'KiloCode publishes the identity/session-introspection contract, including the exact role ' +
      'vocabulary. frontend/core/auth/role-guard.js will then map that vocabulary onto the approved ' +
      'screens already registered in core/auth/screen-registry.js.',
  }),
  Object.freeze({
    id: 'role-permissions',
    capability: 'server-side authorization per module',
    status: AuthContractStatus.BLOCKED_NO_IMPLEMENTATION,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No permission model, role table or guard filter exists. The published contract does define ' +
      '403 as "valid auth but insufficient scope", which confirms the semantic the frontend uses, ' +
      'but it publishes no role vocabulary or per-endpoint requirement. ' +
      'frontend/core/auth/role-guard.js is therefore a client-side least-privilege convenience and ' +
      'must never be treated as a security boundary.',
    unblockRequires:
      'KiloCode publishes the permission model and enforces it server-side, plus the 403 response ' +
      'contract. Never trust a browser-supplied school id or slug for authorization.',
  }),
]);

/** No auth capability is usable yet, so no credential may be attached. */
export const AUTH_INTEGRATION_AUTHORIZED = false;

/**
 * Invariant guard: throws if any entry ever gains an invented schema, endpoint
 * or implementation claim while the capability is uncontracted.
 */
export function assertNoInventedAuthSchemas(contracts = PENDING_AUTH_CONTRACTS) {
  if (AUTH_INTEGRATION_AUTHORIZED) {
    throw new Error('auth integration is marked authorized without a published auth contract');
  }
  for (const contract of contracts) {
    for (const field of ['method', 'path', 'requestSchema', 'responseSchema']) {
      if (contract[field] !== null) {
        throw new Error(`auth contract '${contract.id}' declares ${field} without a published contract`);
      }
    }
    if (contract.implemented !== false) {
      throw new Error(`auth contract '${contract.id}' claims implementation without an endpoint`);
    }
    if (contract.status === AuthContractStatus.PUBLISHED) {
      throw new Error(`auth contract '${contract.id}' claims to be published; update this module`);
    }
  }
  return true;
}

export function findPendingAuthContract(id) {
  return PENDING_AUTH_CONTRACTS.find((contract) => contract.id === id) ?? null;
}

/** Safe summary for the tracker. Contains no payload detail. */
export function describeAuthBlock() {
  return {
    expectedIn: EXPECTED_AUTH_CONTRACT_DOC,
    exists: AUTH_CONTRACT_DOC_EXISTS,
    contractCoversAuthentication: false,
    backendAuthImplementationPresent: false,
    authIntegrationAuthorized: false,
    capabilities: PENDING_AUTH_CONTRACTS.map((contract) => ({
      id: contract.id,
      status: contract.status,
      blocker: contract.blocker,
    })),
  };
}