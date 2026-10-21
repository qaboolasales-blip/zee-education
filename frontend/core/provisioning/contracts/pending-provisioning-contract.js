/**
 * School-registry and provisioning contract dependency record.
 * Tasks: C-O-03 and C-O-04. Updated 2026-10-19 for the billing/connect rebuild.
 *
 * STATUS: backend PUBLISHED for registry, provisioning, QR and connection-code;
 * frontend binding still NOT authorized (no client code, no owner-approved UI scope).
 *
 * What the backend publishes now (all real, backend-tested, documented):
 *   backend/docs/api/openapi-v0.md      39 application routes with guards
 *   backend/docs/api/billing-api.md     Super Admin billing contract (guide 11 shipped)
 *   backend/app/Config/Routes.php       GET/POST /api/admin/schools,
 *                                       POST /admin/schools/provision,
 *                                       POST /api/connect/resolve, GET /api/connect/verify,
 *                                       POST /api/connect/invite, GET /connect/qr
 *   backend/app/Models/                 SchoolsModel, AuditEventModel + SchoolLocal/*
 *   backend/app/Database/Migrations/    16 files incl. licence/billing/invite tables
 *
 * What that gives the frontend: real endpoints and a schema record to validate
 * against (see `../control-plane-schema.js`).
 *
 * What it does NOT give the frontend: authorization to bind. No client code calls
 * these endpoints, and camera/PWA scanning scope has not been owner-approved.
 * Consequently this module still models NO payload shape:
 *   - requestSchema / responseSchema stay pinned to `null` for every capability,
 *     published or not — payload shapes live in the backend documents, and
 *     inventing one here is the exact failure this module exists to prevent;
 *   - `assertNoInventedProvisioningSchemas()` fails the suite if that changes.
 */

/** Contract publication states. */
export const ProvisioningContractStatus = Object.freeze({
  BLOCKED_NOT_CONTRACTED: 'blocked-not-contracted',
  BLOCKED_NO_IMPLEMENTATION: 'blocked-no-backend-implementation',
  PUBLISHED: 'published',
});

export const EXPECTED_PROVISIONING_CONTRACT_DOC = 'backend/docs/api/openapi-v0.md';

/** The published schema exists; the provisioning SURFACE is now published too. */
export const PROVISIONING_SCHEMA_PUBLISHED = true;
export const PROVISIONING_ENDPOINTS_PUBLISHED = true;

/**
 * Current observations about the backend implementation state.
 * NOT contracts; nothing was modelled from them.
 */
export const SOURCE_OBSERVATIONS = Object.freeze([
  Object.freeze({
    area: 'routes',
    observation:
      'backend/app/Config/Routes.php declares the full 39-route control-plane surface: ' +
      'health/setup/installer, school APIs, portal, connect (resolve/verify/invite/qr), ' +
      'admin school registry + provision, and the Super Admin billing API.',
    contract: false,
  }),
  Object.freeze({
    area: 'models',
    observation:
      'backend/app/Models contains AuditEventModel and SchoolsModel (control plane) plus a ' +
      'SchoolLocal/ subdirectory for per-school models — the ADR-001 directory boundary.',
    contract: false,
  }),
  Object.freeze({
    area: 'schema',
    observation:
      'Sixteen control-plane migrations exist: schools, school_domains, provisioning_jobs, ' +
      'platform_audit_events, platform roles seed, schools extensions, user_school_access, ' +
      'and six licence/billing/invite tables (license_plans, school_licenses, ' +
      'license_invoices, license_payments, school_db_credentials, school_invites).',
    contract: false,
  }),
  Object.freeze({
    area: 'isolation',
    observation:
      'The data-boundary document confirms ADR-001: a dedicated database per school, and a ' +
      'shared tenant_id table is explicitly NOT an acceptable substitute. Proven at the ' +
      'privilege layer on a live Hostinger deployment (ERROR 1142 both directions).',
    contract: false,
  }),
]);

/**
 * Capabilities the frontend may one day bind. `implemented: true` records that
 * a real backend endpoint exists; it does NOT authorize client-side binding.
 * `blocker` now names what still blocks the FRONTEND binding.
 *
 * @type {ReadonlyArray<Readonly<{
 *   id: string, capability: string, status: string,
 *   method: string|null, path: string|null, requestSchema: null, responseSchema: null,
 *   implemented: boolean, blocker: string, unblockRequires: string
 * }>>}
 */
export const PENDING_PROVISIONING_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'school-registry',
    capability: 'list and read school installation records for the Super Admin registry',
    status: ProvisioningContractStatus.PUBLISHED,
    method: 'GET',
    path: '/api/admin/schools',
    requestSchema: null,
    responseSchema: null,
    implemented: true,
    blocker:
      'Backend endpoint is live and Super Admin guarded. The frontend has no registry client ' +
      'and no owner-approved registry screen scope for this build.',
    unblockRequires:
      'Owner approves the Super Admin registry UI scope; the client then binds the documented ' +
      'response envelope without modelling a payload shape in this module.',
  }),
  Object.freeze({
    id: 'school-provisioning',
    capability: 'create a school and provision its dedicated installation and database',
    status: ProvisioningContractStatus.PUBLISHED,
    method: 'POST',
    path: '/admin/schools/provision',
    requestSchema: null,
    responseSchema: null,
    implemented: true,
    blocker:
      'Backend endpoint is live (Super Admin guarded), with an idempotent state machine that ' +
      'is backend-tested and was exercised on a real Hostinger deployment. The frontend has ' +
      'no provisioning client; binding it is not authorized in this build.',
    unblockRequires:
      'Owner approves the provisioning UI scope. The client must use the documented ' +
      'idempotency/duplicate semantics; this module still models no payload.',
  }),
  Object.freeze({
    id: 'qr-payload',
    capability: 'generate and validate the school-connection QR payload',
    status: ProvisioningContractStatus.PUBLISHED,
    method: 'GET',
    path: '/connect/qr',
    requestSchema: null,
    responseSchema: null,
    implemented: true,
    blocker:
      'Backend renders a short-lived invite token as SVG (no user id, no school id, no ' +
      'credential inside). Expired, revoked or exhausted invites return 410, not a code. ' +
      'The frontend still contains no QR parser or validator, per C-O-03.',
    unblockRequires:
      'Owner approves camera/PWA scanning scope (packet O-10.4, batch L-O-04). Any scanner ' +
      'must validate against the backend contract, never a shape guessed here.',
  }),
  Object.freeze({
    id: 'school-connection-code',
    capability: 'resolve a school from the manual domain + code the approved UI already collects',
    status: ProvisioningContractStatus.PUBLISHED,
    method: 'POST',
    path: '/api/connect/resolve',
    requestSchema: null,
    responseSchema: null,
    implemented: true,
    blocker:
      'Backend resolves a domain or invite code to a sign-in location, with an identical ' +
      'response whether or not the school exists (no enumeration oracle) and per-IP ' +
      'throttling. GET /api/connect/verify checks an invite. The frontend has no resolve ' +
      'client of its own yet.',
    unblockRequires:
      'Owner approves the connect UI scope; the client binds the documented response shape ' +
      'without modelling a payload here.',
  }),
  Object.freeze({
    id: 'plan-catalogue',
    capability: 'resolve schools.plan_code to an approved plan label',
    status: ProvisioningContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'license_plans exists as a seeded control-plane table and BillingService resolves ' +
      'plan_code server-side, but NO endpoint publishes the catalogue. Plan labels remain ' +
      'owner-negotiated; no public hard-coded pricing exists, by design.',
    unblockRequires:
      'Owner approves a published plan catalogue contract and the label set. No pricing may ' +
      'ever be hard-coded into the product.',
  }),
]);

/** The frontend is not bound to any of these capabilities yet. */
export const PROVISIONING_INTEGRATION_AUTHORIZED = false;

/**
 * Invariant guard: published entries must carry a real method/path and claim
 * implementation; unpublished entries must carry none. Payload schemas are
 * NEVER allowed here, published or not.
 */
export function assertNoInventedProvisioningSchemas(contracts = PENDING_PROVISIONING_CONTRACTS) {
  if (PROVISIONING_INTEGRATION_AUTHORIZED) {
    const unpublished = contracts.filter(
      (contract) => contract.status !== ProvisioningContractStatus.PUBLISHED,
    );
    if (unpublished.length > 0) {
      throw new Error(
        'provisioning integration is authorized while capabilities remain unpublished: '
        + unpublished.map((contract) => contract.id).join(', '),
      );
    }
  }
  for (const contract of contracts) {
    if (contract.requestSchema !== null) {
      throw new Error(
        `provisioning contract '${contract.id}' declares requestSchema; `
        + 'payload shapes belong in the backend documents, not here',
      );
    }
    if (contract.responseSchema !== null) {
      throw new Error(
        `provisioning contract '${contract.id}' declares responseSchema; `
        + 'payload shapes belong in the backend documents, not here',
      );
    }
    if (contract.status === ProvisioningContractStatus.PUBLISHED) {
      if (contract.method === null || contract.path === null) {
        throw new Error(`published contract '${contract.id}' lacks a method or path`);
      }
      if (contract.implemented !== true) {
        throw new Error(`published contract '${contract.id}' must claim implementation`);
      }
    } else {
      if (contract.method !== null || contract.path !== null) {
        throw new Error(`uncontracted '${contract.id}' declares an endpoint`);
      }
      if (contract.implemented !== false) {
        throw new Error(`uncontracted '${contract.id}' claims implementation without an endpoint`);
      }
    }
  }
  return true;
}

export function findPendingProvisioningContract(id) {
  return PENDING_PROVISIONING_CONTRACTS.find((contract) => contract.id === id) ?? null;
}

/** Safe summary for the tracker. Contains no payload data. */
export function describeProvisioningBlock() {
  return {
    schemaPublished: PROVISIONING_SCHEMA_PUBLISHED,
    endpointsPublished: PROVISIONING_ENDPOINTS_PUBLISHED,
    integrationAuthorized: PROVISIONING_INTEGRATION_AUTHORIZED,
    capabilities: PENDING_PROVISIONING_CONTRACTS.map((contract) => ({
      id: contract.id,
      status: contract.status,
      blocker: contract.blocker,
    })),
  };
}
