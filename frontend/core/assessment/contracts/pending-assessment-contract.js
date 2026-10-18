/**
 * Assessment / results contract dependency record. Task: H-O-01.
 *
 * STATUS: BLOCKED. No assessment or mark table, no endpoint, no academic structure
 * to hang an assessment on, and no school database.
 *
 * `backend/docs/control-plane-data-boundary.md` lists "Academic results" as
 * school-local data that is **never** stored in the control plane.
 *
 * HIGHEST-CONSEQUENCE BLOCK IN THE PROJECT SO FAR: the Batch H exit gate requires
 * that only reviewed/published results reach parent and student views. Nothing can
 * be verified about that until the endpoint exists — but the client-side gate that
 * enforces it is built and tested (see `../lifecycle.js`), so a server mistake
 * cannot become a visible leak.
 *
 * Every schema below is pinned to `null` and `assertNoInventedAssessmentSchemas()`
 * fails the suite if that changes.
 */

/** Contract publication states. */
export const AssessmentContractStatus = Object.freeze({
  BLOCKED_NOT_CONTRACTED: 'blocked-not-contracted',
  BLOCKED_NEEDS_PROVISIONING: 'blocked-needs-provisioning-path',
  PUBLISHED: 'published',
});

export const ASSESSMENT_SCHEMA_PUBLISHED = false;
export const ASSESSMENT_ENDPOINTS_PUBLISHED = false;

/** Entities Batch H needs inside a school database. */
export const MISSING_ASSESSMENT_ENTITIES = Object.freeze([
  Object.freeze({ entity: 'assessments', need: 'Name, class, subject, term, max marks' }),
  Object.freeze({ entity: 'assessment_marks', need: 'Per-student score plus its lifecycle stage' }),
  Object.freeze({ entity: 'mark_revisions', need: 'Who entered or changed a mark, and when — traceability' }),
  Object.freeze({ entity: 'result_publication', need: 'Who published which result set, and when' }),
  Object.freeze({ entity: 'grading_policy', need: 'Grade boundaries, pass mark and the letter scheme' }),
]);

/** @type {ReadonlyArray<Readonly<object>>} */
export const PENDING_ASSESSMENT_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'assessment-read',
    capability: 'read an assessment and its marks for a class/subject',
    status: AssessmentContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No assessment or mark table, no class/section/subject to address it (DSB-04), and no ' +
      'school database.',
    unblockRequires:
      'KiloCode implements academic structure and assessments in a dedicated school database and ' +
      'publishes the read contract, including teacher assignment scope.',
  }),
  Object.freeze({
    id: 'mark-entry',
    capability: 'enter or revise draft marks as the assigned teacher',
    status: AssessmentContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker: 'No endpoint and no revision/traceability contract.',
    unblockRequires:
      'KiloCode publishes the entry contract including who may revise, and the audit record it ' +
      'writes for each change.',
  }),
  Object.freeze({
    id: 'review-and-publish',
    capability: 'School Admin review and publication of a result set',
    status: AssessmentContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No endpoint. The publication action is the highest-consequence write in the product, so ' +
      'the contract must define it precisely rather than be inferred.',
    unblockRequires:
      'KiloCode publishes: the review action, the publish action, the return-for-changes action ' +
      '(which has no approved UI control today, HAB-03), the 403 case for a reviewer without ' +
      'scope, and the exact publication audit record.',
  }),
  Object.freeze({
    id: 'published-result-read',
    capability: 'read a published result as a parent or student',
    status: AssessmentContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No endpoint. Critically, the server must itself refuse to return an unpublished result; ' +
      'the client gate is a second line of defence, not the guarantee.',
    unblockRequires:
      'KiloCode publishes the read contract and confirms server-side filtering of unpublished ' +
      'results, plus the parent-linkage resolution this depends on (PEB-06).',
  }),
  Object.freeze({
    id: 'grading-policy',
    capability: 'map a score to a grade letter',
    status: AssessmentContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'The references display `A` and `A+`, but no grading policy exists: no boundaries, no pass ' +
      'mark, no letter or +/- scheme. Inventing a band could pass or fail a real child wrongly.',
    unblockRequires:
      'The owner approves the grading policy and KiloCode publishes it. Until then the frontend ' +
      'reports grade as unknown rather than guessing (HAB-01).',
  }),
  Object.freeze({
    id: 'result-export-protection',
    capability: 'export or print a published result with permission enforcement',
    status: AssessmentContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No export or render endpoint. The Batch H exit gate requires results to be export-protected, ' +
      'which is a server property.',
    unblockRequires:
      'KiloCode publishes the export contract with explicit per-role permission rules. Export ' +
      'must additionally respect the Batch G manual-share boundary.',
  }),
]);

/** No assessment request may be made. */
export const ASSESSMENT_INTEGRATION_AUTHORIZED = false;

export function assertNoInventedAssessmentSchemas(contracts = PENDING_ASSESSMENT_CONTRACTS) {
  if (ASSESSMENT_INTEGRATION_AUTHORIZED) {
    throw new Error('assessment integration is authorized without a published contract');
  }
  for (const contract of contracts) {
    for (const field of ['method', 'path', 'requestSchema', 'responseSchema']) {
      if (contract[field] !== null) {
        throw new Error(`assessment contract '${contract.id}' declares ${field} without a contract`);
      }
    }
    if (contract.implemented !== false) {
      throw new Error(`assessment contract '${contract.id}' claims implementation without an endpoint`);
    }
    if (contract.status === AssessmentContractStatus.PUBLISHED) {
      throw new Error(`assessment contract '${contract.id}' claims to be published; update this module`);
    }
  }
  return true;
}

export function findPendingAssessmentContract(id) {
  return PENDING_ASSESSMENT_CONTRACTS.find((contract) => contract.id === id) ?? null;
}

export function describeAssessmentBlock() {
  return {
    schemaPublished: ASSESSMENT_SCHEMA_PUBLISHED,
    endpointsPublished: ASSESSMENT_ENDPOINTS_PUBLISHED,
    integrationAuthorized: ASSESSMENT_INTEGRATION_AUTHORIZED,
    missingEntities: MISSING_ASSESSMENT_ENTITIES.length,
    capabilities: PENDING_ASSESSMENT_CONTRACTS.map((contract) => ({
      id: contract.id,
      status: contract.status,
    })),
  };
}