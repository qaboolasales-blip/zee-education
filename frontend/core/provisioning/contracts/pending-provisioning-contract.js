/**
 * School-registry and provisioning contract dependency record.
 * Tasks: C-O-03 and C-O-04.
 *
 * STATUS: BLOCKED for both API tasks.
 *
 * What KiloCode has published so far:
 *   backend/docs/api/openapi-v0.md            v0.1.0 DRAFT — GET /health, GET /setup only
 *   backend/docs/control-plane-data-boundary.md  entity list + field rationale
 *   backend/docs/migration-plan.md            column definitions
 *   backend/app/Database/Migrations/*.php     4 implemented tables
 *
 * What that DOES give the frontend: a real, verifiable SCHEMA to validate
 * against (see `../control-plane-schema.js`).
 *
 * What it does NOT give the frontend: a single ENDPOINT for school registry,
 * provisioning or QR payload. `backend/app/Config/Routes.php` still declares
 * exactly `GET /health`, `GET /setup` and `GET /`, and `backend/app/Models/` is
 * still empty. There is therefore nothing to bind, and nothing to parse.
 *
 * Consequently:
 *   - NO school-registry request or response payload is declared;
 *   - NO provisioning request or response payload is declared;
 *   - NO QR payload format, signature, expiry or revocation rule is declared;
 *   - NO 409 Conflict semantic is declared, so duplicate handling cannot be
 *     interpreted by the client.
 *
 * Every schema field below is pinned to `null` and
 * `assertNoInventedProvisioningSchemas()` fails the test suite if that changes.
 */

/** Contract publication states. */
export const ProvisioningContractStatus = Object.freeze({
  BLOCKED_NOT_CONTRACTED: 'blocked-not-contracted',
  BLOCKED_NO_IMPLEMENTATION: 'blocked-no-backend-implementation',
  PUBLISHED: 'published',
});

export const EXPECTED_PROVISIONING_CONTRACT_DOC = 'backend/docs/api/openapi-v0.md';

/** The published schema exists even though the published endpoints do not. */
export const PROVISIONING_SCHEMA_PUBLISHED = true;
export const PROVISIONING_ENDPOINTS_PUBLISHED = false;

/**
 * Unverified observations about KiloCode's current implementation state.
 * NOT contracts; nothing was modelled from them.
 */
export const SOURCE_OBSERVATIONS = Object.freeze([
  Object.freeze({
    area: 'routes',
    observation:
      'backend/app/Config/Routes.php declares only GET /health, GET /setup and GET /. No ' +
      'school-registry, provisioning, QR or commercial route exists.',
    contract: false,
  }),
  Object.freeze({
    area: 'models',
    observation: 'backend/app/Models contains only .gitkeep — no model for any control-plane entity.',
    contract: false,
  }),
  Object.freeze({
    area: 'schema',
    observation:
      'Four tables are implemented: schools, school_domains, provisioning_jobs, ' +
      'platform_audit_events. commercial_records and support_tickets are documented in the data ' +
      'boundary but have no migration.',
    contract: false,
  }),
  Object.freeze({
    area: 'isolation',
    observation:
      'The data-boundary document confirms ADR-001: a dedicated database per school, and a shared ' +
      'tenant_id table is explicitly NOT an acceptable substitute. There is no column for ' +
      'isolation mode because it is a constant architectural rule.',
    contract: false,
  }),
]);

/**
 * @type {ReadonlyArray<Readonly<{
 *   id: string, capability: string, status: string,
 *   method: null, path: null, requestSchema: null, responseSchema: null,
 *   implemented: boolean, blocker: string, unblockRequires: string
 * }>>}
 */
export const PENDING_PROVISIONING_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'school-registry',
    capability: 'list and read school installation records for the Super Admin registry',
    status: ProvisioningContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'The schools and school_domains tables exist, but no endpoint is published. Pagination, ' +
      'filtering, sorting, plan-label resolution and the renewal/commercial fields that the ' +
      'approved Super Admin table already displays are all undefined.',
    unblockRequires:
      'KiloCode publishes the registry contract: method and path, the response envelope, ' +
      'pagination/filter/sort semantics, and the renewal field the UI column needs.',
  }),
  Object.freeze({
    id: 'school-provisioning',
    capability: 'create a school and provision its dedicated installation and database',
    status: ProvisioningContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'provisioning_jobs exists as a table, but no create/provision endpoint is published. ' +
      'Idempotency, duplicate handling and retry semantics are undefined, and the contract does ' +
      'not even define 409 Conflict. The Batch C exit gate requires that a retry cannot silently ' +
      'create inconsistent duplicate data; that guarantee can only be made and tested server-side.',
    unblockRequires:
      'KiloCode publishes the provisioning contract: method and path, request fields, the ' +
      'idempotency key strategy, duplicate/conflict status semantics (including 409), retry rules, ' +
      'and the job status lifecycle returned to the client.',
  }),
  Object.freeze({
    id: 'qr-payload',
    capability: 'generate and validate the school-connection QR payload',
    status: ProvisioningContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No payload format, signing key, expiry window or revocation rule is published. C-O-03 ' +
      'explicitly forbids writing a parser or validator until this exists, and guessing a payload ' +
      'shape would produce a client that silently rejects valid codes.',
    unblockRequires:
      'KiloCode publishes the QR payload contract (fields, encoding, signature, expiry, revocation) ' +
      'and the owner approves camera/PWA scope for scanning (packet O-10.4, batch L-O-04).',
  }),
  Object.freeze({
    id: 'school-connection-code',
    capability: 'resolve a school from the manual domain + code the approved UI already collects',
    status: ProvisioningContractStatus.BLOCKED_NO_IMPLEMENTATION,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No published column stores a connection code. schools and school_domains have no code ' +
      'field, so "HZ-9246" in the approved UI maps to nothing. There is also no resolution endpoint.',
    unblockRequires:
      'KiloCode publishes where the connection code lives (table, column, hashing, expiry and ' +
      'revocation) plus the resolve endpoint contract. Per the approved reference it must be ' +
      'short-lived and revocable, never a permanent secret.',
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
      'plan_code is VARCHAR(64) and references a plan rather than pricing. No plan table, ' +
      'enumeration or endpoint is published, and PROJECT_MEMORY lists Starter/Growth/Complete only ' +
      'as PROPOSED labels. The approved Super Admin screen already displays those three.',
    unblockRequires:
      'KiloCode publishes the plan catalogue contract and the owner approves the label set. ' +
      'No public hard-coded pricing may ever be introduced.',
  }),
]);

/** No provisioning capability is bindable yet. */
export const PROVISIONING_INTEGRATION_AUTHORIZED = false;

/**
 * Invariant guard: throws if an entry gains an invented schema, endpoint or
 * implementation claim while uncontracted.
 */
export function assertNoInventedProvisioningSchemas(contracts = PENDING_PROVISIONING_CONTRACTS) {
  if (PROVISIONING_INTEGRATION_AUTHORIZED) {
    throw new Error('provisioning integration is authorized without a published contract');
  }
  for (const contract of contracts) {
    for (const field of ['method', 'path', 'requestSchema', 'responseSchema']) {
      if (contract[field] !== null) {
        throw new Error(`provisioning contract '${contract.id}' declares ${field} without a contract`);
      }
    }
    if (contract.implemented !== false) {
      throw new Error(`provisioning contract '${contract.id}' claims implementation without an endpoint`);
    }
    if (contract.status === ProvisioningContractStatus.PUBLISHED) {
      throw new Error(`provisioning contract '${contract.id}' claims to be published; update this module`);
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