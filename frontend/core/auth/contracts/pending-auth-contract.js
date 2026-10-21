/**
 * Auth contract dependency record. Tasks: B-O-01, B-O-02, B-O-03.
 *
 * STATE CHANGES, in order:
 *
 * 1. Batch A — no contract document existed. Every entry was BLOCKED.
 * 2. Batch B review — `backend/docs/api/openapi-v0.md` appeared, but it covered
 *    only `/health` and `/setup` plus a forward-looking auth *policy*. B-O-02 and
 *    B-O-03 stayed BLOCKED: a policy requirement is not a contract.
 * 3. 2026-10-18 — KiloCode added a "Batch B: Authentication Endpoints" section
 *    to the SAME document, plus `docs/auth-endpoints.md` and
 *    `docs/authentication-design.md`. The credential scheme is now defined.
 * 4. 2026-10-18 (second pass) — KiloCode published the rest of the auth
 *    surface: `docs/role-permission-policy.md` enumerates the five roles and
 *    states "Authorization is never trusted from client input"; the migration
 *    seeds `auth_groups` with those five names; `docs/role-filter-implementation.md`
 *    describes `App\Filters\RoleFilter`, which redirects unauthenticated users
 *    to login and checks group membership via `$user->inGroup(...)`; both
 *    `app/Filters/RoleFilter.php` and `app/Policies/RolePolicy.php` exist; and
 *    `docs/auth-session-lifecycle.md` documents the Shield session lifecycle
 *    (Session authenticator default, remember-me, logout invalidates session
 *    and remember token, magic-link lifetime 1 hour, login attempt tracking).
 *    `role-permissions` is therefore PUBLISHED. `current-identity` and
 *    `refresh` stay BLOCKED: there is still no introspection endpoint and no
 *    refresh contract.
 *
 * WHAT THE PUBLISHED CONTRACT NOW SAYS about authentication — transcribed
 * verbatim from `backend/docs/api/openapi-v0.md` §"Batch B: Authentication
 * Endpoints" and `backend/docs/auth-endpoints.md`:
 *
 *   GET/POST /login    — "User login endpoint (provided by Shield). Authenticates
 *                        with valid credentials." Auth: None (public). Responses:
 *                        302 redirect on success (to configured redirect); 200 with
 *                        validation errors on failure.
 *   GET /logout        — "Logout current session." Auth: Required. Responses:
 *                        302 redirect to login.
 *   GET/POST /register — registration, if enabled. Auth: None (configurable).
 *   GET/POST /forgot   — password recovery via email/magic link. Auth: None.
 *   GET/POST /reset-password — password reset. Auth: None (token-based).
 *
 *   Security Notes: "No credentials logged on failure/success · Login attempts
 *   tracked for security · Server-side role enforcement via policies/filters ·
 *   No role trust from client input."
 *
 *   `docs/authentication-design.md` confirms the library: CodeIgniter 4 Shield
 *   (`codeigniter4/shield` ^1.2, MIT), Session authenticator, server-side session
 *   management, CSRF protection enabled by default, no role/school data trusted
 *   from client input.
 *
 * WHAT THE PUBLISHED CONTRACT STILL DOES NOT CONTAIN:
 *
 *   - No refresh endpoint and no token lifecycle. Shield's Session authenticator
 *     is server-side cookie based; there is no bearer token to rotate, so a
 *     refresh flow cannot be implemented and MUST NOT be guessed.
 *   - No identity/introspection endpoint. `auth()->user()` is a server-side
 *     helper, not an HTTP endpoint, so a page load still cannot discover the role
 *     the server assigned from the browser.
 *   - No per-endpoint permission requirement map. The role vocabulary is
 *     published but no endpoint is mapped to a required role, so no endpoint may
 *     be bound.
 *   - No request field names for /login. The contract says "Authenticates with
 *     valid credentials" and "200 with validation errors on failure" but never
 *     names the form fields, so no field may be modelled.
 *   - No response body schema for any auth endpoint. Success is a 302 redirect,
 *     not a JSON payload, so there is no JSON to model.
 *
 * CONSEQUENCE FOR B-O-02 AND B-O-03:
 *
 *   The credential scheme is now defined — form-based login, session cookie set
 *   by the server's 302, no bearer token, no Authorization header, no client-side
 *   storage. The frontend's existing policies already implement exactly that
 *   (`credentials: 'same-origin'`, absolute bans on localStorage/sessionStorage/
 *   indexedDB/document.cookie, no Authorization header, no auto-retry on 401).
 *   They are now CONTRACT-BACKED rather than precautionary.
 *
 *   What stays BLOCKED: refresh, current-identity — and, above all, any UI
 *   binding. There is no approved sign-in screen in any reference (BLK-01), so
 *   even a contracted login endpoint cannot be wired to a control.
 */

/** Contract publication states. */
export const AuthContractStatus = Object.freeze({
  BLOCKED_NOT_CONTRACTED: 'blocked-not-contracted',
  BLOCKED_NO_IMPLEMENTATION: 'blocked-no-backend-implementation',
  PUBLISHED: 'published',
});

export const EXPECTED_AUTH_CONTRACT_DOC = 'backend/docs/api/openapi-v0.md';
export const EXPECTED_AUTH_ENDPOINTS_DOC = 'backend/docs/auth-endpoints.md';
export const EXPECTED_AUTH_DESIGN_DOC = 'backend/docs/authentication-design.md';
export const EXPECTED_ROLE_POLICY_DOC = 'backend/docs/role-permission-policy.md';
export const EXPECTED_ROLE_FILTER_DOC = 'backend/docs/role-filter-implementation.md';
export const EXPECTED_SESSION_LIFECYCLE_DOC = 'backend/docs/auth-session-lifecycle.md';
export const EXPECTED_ROLE_FILTER_IMPL = 'backend/app/Filters/RoleFilter.php';
export const EXPECTED_ROLE_POLICY_IMPL = 'backend/app/Policies/RolePolicy.php';

/** The contract document exists as of the Batch B review. */
export const AUTH_CONTRACT_DOC_EXISTS = true;
export const AUTH_CONTRACT_DOC_VERSION = '0.1.0';
export const AUTH_CONTRACT_DOC_STATUS = 'DRAFT — Batch A baseline';

/**
 * The contract's Batch B section now publishes real authentication endpoints.
 * This is the single fact the rest of this module derives from.
 */
export const AUTH_CONTRACT_AUTH_ENDPOINTS_PUBLISHED = true;

/**
 * Published auth endpoints, transcribed verbatim from
 * `backend/docs/api/openapi-v0.md` §"Batch B: Authentication Endpoints" and
 * `backend/docs/auth-endpoints.md`.
 *
 * Every entry is read-only metadata. No request field name, no response body
 * schema and no JSON payload is published for any of them — success is a 302
 * redirect, not a JSON body — so `requestSchema` and `responseSchema` stay
 * `null` for all of them and the guard enforces that.
 *
 * @type {ReadonlyArray<Readonly<{
 *   path: string, methods: ReadonlyArray<string>, auth: string,
 *   success: string, failure: string, schemaPublished: boolean
 * }>>}
 */
export const PUBLISHED_AUTH_ENDPOINTS = Object.freeze([
  Object.freeze({
    path: '/login',
    methods: Object.freeze(['GET', 'POST']),
    auth: 'None (public)',
    success: '302 redirect to configured redirect',
    failure: '200 with validation errors',
    schemaPublished: false,
  }),
  Object.freeze({
    path: '/logout',
    methods: Object.freeze(['GET']),
    auth: 'Required',
    success: '302 redirect to login',
    failure: null,
    schemaPublished: false,
  }),
  Object.freeze({
    path: '/register',
    methods: Object.freeze(['GET', 'POST']),
    auth: 'None (configurable)',
    success: null,
    failure: null,
    schemaPublished: false,
  }),
  Object.freeze({
    path: '/forgot',
    methods: Object.freeze(['GET', 'POST']),
    auth: 'None',
    success: null,
    failure: null,
    schemaPublished: false,
  }),
  Object.freeze({
    path: '/reset-password',
    methods: Object.freeze(['GET', 'POST']),
    auth: 'None (token-based)',
    success: null,
    failure: null,
    schemaPublished: false,
  }),
]);

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
  /**
   * Now defined. The contract names the library and the authenticator:
   *   `codeigniter4/shield` ^1.2 (MIT), Session authenticator.
   * It is server-side cookie based: the server sets the session cookie as part
   * of the 302 that /login returns on success. There is no bearer token, no
   * Authorization header and no client-side storage.
   */
  credentialScheme: 'form-based login via CodeIgniter Shield Session authenticator; session cookie set by the server on the /login 302; no bearer token, no Authorization header, no client-side storage',
  sessionOrToken: 'session cookie only. The contract requires "a valid session or token" for future endpoints but the published auth endpoints use a Shield session cookie; no token endpoint exists.',
  tenantResolution:
    'school_slug is resolved server-side from an authenticated session or token; a browser-supplied ' +
    'slug is never trusted for authorization (ADR-003).',
  errorSemantics: Object.freeze({
    401: 'Unauthenticated',
    403: 'Forbidden — valid auth but insufficient scope',
  }),
  publishedSecurityNotes: Object.freeze([
    'No credentials logged on failure/success',
    'Login attempts tracked for security',
    'Server-side role enforcement via policies/filters',
    'No role trust from client input',
  ]),
  scope: 'Batch A control plane only — the contract states tenant/auth endpoints come in later batches',
});

/**
 * Unverified observations about what currently exists in KiloCode's tree.
 * These are NOT contracts and nothing was modelled from them. Two entries that
 * ARE contracts (the role policy and the role filter) live separately in
 * `PUBLISHED_ROLE_CONTRACTS` below so this list stays purely observational.
 */
export const SOURCE_OBSERVATIONS = Object.freeze([
  Object.freeze({
    area: 'routes',
    observation:
      'backend/app/Config/Routes.php declares exactly three string-literal routes: ' +
      'GET /health, GET /setup, GET /. A fourth line, `service(\'auth\')->routes($routes)`, ' +
      'delegates to CodeIgniter Shield, which reads `config(\'AuthRoutes\')->routes` and ' +
      'registers its own controllers under the `CodeIgniter\\Shield\\Controllers` namespace. ' +
      'No `AuthRoutes` config exists in app/Config (only Auth.php, AuthGroups.php, ' +
      'AuthToken.php were found), and no Shield auth controller has been wired into this ' +
      'application, so the delegation is inert. The string-literal path scan still ' +
      'returns exactly [\'health\', \'setup\', \'/\'].',
    contract: false,
  }),
  Object.freeze({
    area: 'controllers',
    observation:
      'backend/app/Controllers still contains only BaseController, Health, Home and Setup. ' +
      'There is no Auth, Login, Session, Token, User, Permission or Role controller. The ' +
      'auth controllers that the contract names are Shield\'s, not this application\'s.',
    contract: false,
  }),
  Object.freeze({
    area: 'migrations',
    observation:
      'backend/app/Database/Migrations contains the four control-plane tables ' +
      '(schools, school_domains, provisioning_jobs, platform_audit_events) plus a ' +
      'fifth migration, 2026-10-18_000005_create_platform_roles.php, which is a SEED ' +
      'of the existing Shield `auth_groups` table — it calls table("auth_groups")' +
      '->insertBatch(...) and creates no table of its own. It is legitimate Batch B ' +
      'work (B-K-03). There is still no user, session, token, permission, account or ' +
      'auth_identity table of any kind, and no migration creates one.',
    contract: false,
  }),
  Object.freeze({
    area: 'session',
    observation:
      'backend/app/Config/Session.php remains unmodified CodeIgniter 4 framework default ' +
      "(driver FileHandler, cookieName 'ci_session', expiration 7200, regenerateDestroy false). " +
      'It is a framework default, not a Zee Education session decision, so the frontend must not ' +
      'infer any session semantics from it. `docs/auth-session-lifecycle.md` documents the ' +
      'Shield lifecycle separately: Session authenticator default, remember-me enabled ' +
      '(cookie name `remember`, 30 days), logout invalidates session and remember token, ' +
      'magic-link lifetime 1 hour, login attempt tracking via `auth_logins`.',
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
 * KiloCode-published contracts that are not part of the OpenAPI document but
 * are nonetheless real: the role vocabulary and the server-side enforcement
 * mechanism. These are CONTRACTS, so they are recorded separately from
 * `SOURCE_OBSERVATIONS` (which stays purely observational) and are asserted
 * separately in the gate test.
 */
export const PUBLISHED_ROLE_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'role-vocabulary',
    doc: EXPECTED_ROLE_POLICY_DOC,
    observation:
      'Enumerates the five roles (super_admin, school_admin, teacher, parent, student) ' +
      'and states "Authorization is never trusted from client input". Seeded into the ' +
      'existing Shield `auth_groups` table by migration 2026-10-18_000005.',
    contract: true,
  }),
  Object.freeze({
    id: 'role-filter',
    doc: EXPECTED_ROLE_FILTER_DOC,
    impl: EXPECTED_ROLE_FILTER_IMPL,
    observation:
      '`App\\Filters\\RoleFilter` redirects unauthenticated users to `login`, checks ' +
      'group membership via `$user->inGroup(...)`, and redirects with an error on denial. ' +
      'Registered in the Filters config under the alias `role`.',
    contract: true,
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
    status: AuthContractStatus.PUBLISHED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'The endpoint and the credential scheme ARE now published (GET/POST /login ' +
      'via CodeIgniter Shield Session authenticator, 302 on success, 200 with ' +
      'validation errors on failure). What is still missing is (a) the request ' +
      'field names — the contract says "Authenticates with valid credentials" and ' +
      'never names the form fields, so none may be modelled; (b) a response body ' +
      'schema — success is a redirect, not JSON, so there is no JSON to model; and ' +
      '(c) any approved UI control. BLK-01: no sign-in screen exists in any ' +
      'reference, so even a contracted login endpoint cannot be wired to a control. ' +
      'Binding is a separate owner task and needs Cline UI-lock approval.',
    unblockRequires:
      'KiloCode publishes the /login request field names and any JSON error body; ' +
      'the owner resolves BLK-01 (an approved sign-in screen) and Cline approves the ' +
      'UI-lock harness. Until then the endpoint is known but unmodelled and unbuilt.',
  }),
  Object.freeze({
    id: 'logout',
    capability: 'terminate the current session server-side',
    status: AuthContractStatus.PUBLISHED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'The endpoint is published (GET /logout, auth required, 302 redirect to ' +
      'login) and the scheme is a server-side Shield session cookie, so a client ' +
      'call is possible. What is still missing is (a) any approved UI control — ' +
      'BLK-03, grep-confirmed zero logout controls in all three references; and ' +
      '(b) the idempotency and server-side revocation semantics, which the ' +
      'contract states only as "Logout current session". A client can drop its own ' +
      'session locally (session-state.js already does) but must not claim the server ' +
      'session is terminated without the contracted endpoint.',
    unblockRequires:
      'KiloCode publishes whether /logout revokes server-side and is idempotent; ' +
      'the owner resolves BLK-03 (an approved logout control) and Cline approves the ' +
      'UI-lock harness.',
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
      'No refresh endpoint and no token model exists. The published auth scheme is ' +
      'a Shield session cookie with no bearer token, so there is nothing to rotate ' +
      'or renew from the browser. An invented refresh flow would be a security ' +
      'defect, not a convenience.',
    unblockRequires:
      'KiloCode publishes a refresh contract and the token lifecycle: storage medium, ' +
      'rotation policy, absolute vs idle expiry, and revocation behaviour.',
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
      'No "me"/profile/session-introspection endpoint exists. `auth()->user()` is a ' +
      'server-side helper documented in `docs/auth-endpoints.md`, not an HTTP ' +
      'endpoint, so a page load still cannot discover the role the server assigned ' +
      'from the browser. The contract promises server-side tenant resolution from the ' +
      'session but publishes no way to read it. The Mobile App Preview role selector ' +
      'is a PREVIEW control and is explicitly documented in the reference as not being ' +
      'how production identifies a role.',
    unblockRequires:
      'KiloCode publishes the identity/session-introspection contract, including the ' +
      'exact role vocabulary. frontend/core/auth/role-guard.js will then map that ' +
      'vocabulary onto the approved screens already registered in ' +
      'core/auth/screen-registry.js.',
  }),
  Object.freeze({
    id: 'role-permissions',
    capability: 'server-side authorization per module',
    status: AuthContractStatus.PUBLISHED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'The role vocabulary and the server-side enforcement ARE now published. ' +
      '`docs/role-permission-policy.md` enumerates the five roles ' +
      '(super_admin, school_admin, teacher, parent, student) and states "Authorization ' +
      'is never trusted from client input"; `docs/role-filter-implementation.md` ' +
      'describes `App\\Filters\\RoleFilter`, which redirects unauthenticated users ' +
      'to login and checks group membership via `$user->inGroup(...)`; both ' +
      '`app/Filters/RoleFilter.php` and `app/Policies/RolePolicy.php` exist; and ' +
      '`docs/auth-session-lifecycle.md` documents the Shield session lifecycle ' +
      '(Session authenticator default, remember-me, logout invalidates session ' +
      'and remember token, magic-link lifetime 1 hour, login attempt tracking). ' +
      'What is STILL missing is (a) the per-endpoint permission requirement map — ' +
      'the policy says policies enforce checks but does not say which endpoint ' +
      'requires which role, so no endpoint may be bound; (b) the 403 response ' +
      'contract — the filter redirects rather than returning 403, so the ' +
      'contract-backed 403 semantic has no published body to model; and (c) any ' +
      'approved UI control, because the browser still cannot read the role the ' +
      'server assigned (no introspection endpoint). `role-guard.js` remains a ' +
      'client-side least-privilege convenience and must never be treated as a ' +
      'security boundary.',
    unblockRequires:
      'KiloCode publishes the per-endpoint permission requirement map and the 403 ' +
      'response contract, plus an introspection endpoint so the browser can read ' +
      'the role. Never trust a browser-supplied school id or slug for authorization.',
  }),
]);

/**
 * The role vocabulary the server uses, transcribed verbatim from
 * `backend/docs/role-permission-policy.md` §"Roles Defined". The keys are the
 * Shield group names the migration seeds; the values are the exact labels the
 * locked references already use, so mapping server roles to approved screens
 * introduces no new user-visible string.
 *
 * This is a CONTRACT (the vocabulary is published), not a schema (no endpoint
 * returns it and no request carries it). It exists so the guard can translate
 * between the two without guessing. The labels are plain strings here rather
 * than imported from `role-guard.js` to keep this contract record
 * dependency-free; `role-guard.js` re-derives its `Role` constants from the
 * same locked references and the test cross-checks both.
 */
export const SERVER_ROLE_VOCABULARY = Object.freeze({
  super_admin: 'Super Admin',
  school_admin: 'School Admin',
  teacher: 'Teacher',
  parent: 'Parent',
  student: 'Student',
});

/** No auth capability is usable for binding yet, so no credential may be attached. */
export const AUTH_INTEGRATION_AUTHORIZED = false;

/**
 * Invariant guard. Throws if any entry ever claims an invented schema, endpoint
 * or implementation claim that the published contract does not back.
 *
 * Three capabilities are now PUBLISHED — `login`, `logout` and `role-permissions`
 * — because the contract genuinely publishes those endpoints and that vocabulary.
 * What is NOT legal is claiming a schema or an implementation alongside them:
 * the contract publishes **no request field names and no JSON response body for
 * any auth endpoint** (success is a 302 redirect, not a payload), and it publishes
 * **no per-endpoint permission map**. So every entry stays
 * `method: null, path: null, requestSchema: null, responseSchema: null,
 * implemented: false`, and this guard enforces that.
 *
 * @param {ReadonlyArray<object>} [contracts]
 */
export function assertNoInventedAuthSchemas(contracts = PENDING_AUTH_CONTRACTS) {
  if (AUTH_INTEGRATION_AUTHORIZED) {
    throw new Error('auth integration is marked authorized without an owner task and Cline UI-lock approval');
  }
  for (const contract of contracts) {
    for (const field of ['method', 'path', 'requestSchema', 'responseSchema']) {
      if (contract[field] !== null) {
        throw new Error(`auth contract '${contract.id}' declares ${field} without a published contract backing it`);
      }
    }
    if (contract.implemented !== false) {
      throw new Error(`auth contract '${contract.id}' claims implementation without a published request/response schema`);
    }
    if (!Object.values(AuthContractStatus).includes(contract.status)) {
      throw new Error(`auth contract '${contract.id}' has an unknown status: ${contract.status}`);
    }
  }
  return true;
}

/**
 * Translate a server role group name to the approved role label, or `null` if
 * the server returns something the vocabulary does not cover. Unknown roles are
 * never widened — they deny.
 *
 * @param {string|null|undefined} groupName
 * @returns {string|null}
 */
export function serverRoleToApprovedLabel(groupName) {
  if (typeof groupName !== 'string') return null;
  return SERVER_ROLE_VOCABULARY[groupName] ?? null;
}

/**
 * Which auth capabilities the contract actually publishes, so the UI layer can
 * distinguish "endpoint exists, schema missing" from "endpoint does not exist".
 */
export function isPublishedAuthCapability(id) {
  const contract = findPendingAuthContract(id);
  return contract !== null && contract.status === AuthContractStatus.PUBLISHED;
}

export function findPendingAuthContract(id) {
  return PENDING_AUTH_CONTRACTS.find((contract) => contract.id === id) ?? null;
}

/** Safe summary for the tracker. Contains no payload detail. */
export function describeAuthBlock() {
  // Derived, not hardcoded, so the summary cannot go stale while the contract
  // does. The booleans answer different questions:
  //   contractCoversAuthentication — does the contract document name auth
  //     endpoints? Yes, since the Batch B section was added.
  //   backendAuthImplementationPresent — is Shield wired into the routes?
  //     Yes, `service('auth')->routes($routes)` is present. It is INERT: no
  //     `AuthRoutes` config exists in app/Config and no Shield auth controller
  //     is wired into this application, so the delegation registers nothing.
  const publishedCount = PENDING_AUTH_CONTRACTS.filter(
    (contract) => contract.status === AuthContractStatus.PUBLISHED,
  ).length;
  return {
    expectedIn: EXPECTED_AUTH_CONTRACT_DOC,
    exists: AUTH_CONTRACT_DOC_EXISTS,
    contractCoversAuthentication: AUTH_CONTRACT_AUTH_ENDPOINTS_PUBLISHED,
    backendAuthImplementationPresent: true,
    backendAuthImplementationInert: true,
    authIntegrationAuthorized: AUTH_INTEGRATION_AUTHORIZED,
    publishedCapabilities: publishedCount,
    blockedCapabilities: PENDING_AUTH_CONTRACTS.length - publishedCount,
    capabilities: PENDING_AUTH_CONTRACTS.map((contract) => ({
      id: contract.id,
      status: contract.status,
      blocker: contract.blocker,
    })),
  };
}