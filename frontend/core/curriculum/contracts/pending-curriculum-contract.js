/**
 * Curriculum contract dependency record. Tasks: G-O-01, G-O-03.
 *
 * STATUS: BLOCKED. No timetable, homework or notice table, no endpoint, and no
 * school database to hold them. `backend/docs/control-plane-data-boundary.md`
 * lists "Timetable, homework, notices" as school-local data that is **never**
 * stored in the control plane.
 *
 * G-O-02 and G-O-05 ARE complete: both are constraints on the frontend, and both
 * are enforced and tested without any backend.
 *
 * Every schema below is pinned to `null` and
 * `assertNoInventedCurriculumSchemas()` fails the suite if that changes.
 */

/** Contract publication states. */
export const CurriculumContractStatus = Object.freeze({
  BLOCKED_NOT_CONTRACTED: 'blocked-not-contracted',
  BLOCKED_NEEDS_PROVISIONING: 'blocked-needs-provisioning-path',
  PUBLISHED: 'published',
});

export const CURRICULUM_SCHEMA_PUBLISHED = false;
export const CURRICULUM_ENDPOINTS_PUBLISHED = false;

/** Entities Batch G needs inside a school database. */
export const MISSING_CURRICULUM_ENTITIES = Object.freeze([
  Object.freeze({ entity: 'timetable_slots', need: 'Weekday x period x subject x room for a class/section' }),
  Object.freeze({ entity: 'academic_weeks', need: 'The "Week of 19 Oct" header' }),
  Object.freeze({ entity: 'homework', need: 'Title, class, subject, due date' }),
  Object.freeze({ entity: 'notices', need: 'Title, audience, publish and expiry window' }),
]);

/** @type {ReadonlyArray<Readonly<object>>} */
export const PENDING_CURRICULUM_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'timetable-read',
    capability: 'read a class/section timetable for a week',
    status: CurriculumContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No timetable table, no academic week, and no class or section to address it (DSB-04 / ' +
      'FAT-07). No school database exists.',
    unblockRequires:
      'KiloCode implements academic structure and timetable in a dedicated school database and ' +
      'publishes the read contract, including room allocation and teacher assignment.',
  }),
  Object.freeze({
    id: 'homework',
    capability: 'list and create homework with a due date',
    status: CurriculumContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker: 'No homework table and no composer layout (GCB-05).',
    unblockRequires:
      'KiloCode publishes the homework contract and the owner approves a composer layout, since ' +
      'the reference offers only a preview button.',
  }),
  Object.freeze({
    id: 'notices',
    capability: 'list notices by audience and create School Admin notices',
    status: CurriculumContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No notices table. Critically, the expiry window is uncontracted, so "expired" cannot be ' +
      'derived server-side either.',
    unblockRequires:
      'KiloCode publishes the notice contract: audience vocabulary, publish/expiry semantics, ' +
      'and the 403 case for a forbidden audience.',
  }),
  Object.freeze({
    id: 'pdf-render',
    capability: 'server-side PDF rendering for print and result cards',
    status: CurriculumContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No render endpoint and no template contract. The reference already states the server must ' +
      'generate the QR and templates; a browser must never synthesise a document.',
    unblockRequires:
      'KiloCode publishes the render contract: endpoint, template identifiers, media type and ' +
      'the failure semantics for a failed or empty document.',
  }),
  Object.freeze({
    id: 'exports',
    capability: 'Excel / CSV export',
    status: CurriculumContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker: 'No export endpoint and no column/permission contract.',
    unblockRequires: 'KiloCode publishes the export contract, permission-scoped per role.',
  }),
]);

/** No curriculum request may be made. */
export const CURRICULUM_INTEGRATION_AUTHORIZED = false;

export function assertNoInventedCurriculumSchemas(contracts = PENDING_CURRICULUM_CONTRACTS) {
  if (CURRICULUM_INTEGRATION_AUTHORIZED) {
    throw new Error('curriculum integration is authorized without a published contract');
  }
  for (const contract of contracts) {
    for (const field of ['method', 'path', 'requestSchema', 'responseSchema']) {
      if (contract[field] !== null) {
        throw new Error(`curriculum contract '${contract.id}' declares ${field} without a contract`);
      }
    }
    if (contract.implemented !== false) {
      throw new Error(`curriculum contract '${contract.id}' claims implementation without an endpoint`);
    }
    if (contract.status === CurriculumContractStatus.PUBLISHED) {
      throw new Error(`curriculum contract '${contract.id}' claims to be published; update this module`);
    }
  }
  return true;
}

export function findPendingCurriculumContract(id) {
  return PENDING_CURRICULUM_CONTRACTS.find((contract) => contract.id === id) ?? null;
}

export function describeCurriculumBlock() {
  return {
    schemaPublished: CURRICULUM_SCHEMA_PUBLISHED,
    endpointsPublished: CURRICULUM_ENDPOINTS_PUBLISHED,
    integrationAuthorized: CURRICULUM_INTEGRATION_AUTHORIZED,
    missingEntities: MISSING_CURRICULUM_ENTITIES.length,
    capabilities: PENDING_CURRICULUM_CONTRACTS.map((contract) => ({
      id: contract.id,
      status: contract.status,
    })),
  };
}