/**
 * Public surface of the Zee Education frontend provisioning layer (Batch C).
 *
 * Nothing here provisions, registers, resolves or scans anything. Importing it
 * has no side effects.
 *
 *  - `control-plane-schema.js`            transcription of the 4 published tables
 *  - `selectors.js`                       validators/selectors over published values
 *  - `contracts/pending-provisioning-contract.js`  C-O-03 / C-O-04 block record
 */

export {
  SCHOOL_STATUS_VALUES,
  PROVISIONING_JOB_TYPES,
  PROVISIONING_JOB_STATUSES,
  AUDIT_ACTOR_TYPES,
  SCHEMA_DEFAULTS,
  CONTROL_PLANE_ENTITIES,
  IMPLEMENTED_ENTITIES,
  DOCUMENTED_BUT_UNIMPLEMENTED_ENTITIES,
  UNPUBLISHED_FIELDS,
  PROPOSED_PLAN_LABELS,
  assertSchemaMatchesMigrations,
  entityMeta,
  columnMeta,
} from './control-plane-schema.js';

export {
  PUBLISHED_ERROR_STATUSES,
  RejectReason,
  FORBIDDEN_CLIENT_FIELDS,
  isValidSchoolDomain,
  validateSchoolDomain,
  validateEnum,
  validateSchoolStatus,
  validateProvisioningJobType,
  validateProvisioningJobStatus,
  validateAuditActorType,
  validateIsPrimary,
  validateAttempts,
  validateClientPayload,
  classifyProvisioningJob,
  classifyProvisioningOutcome,
  schoolNameFor,
  domainFor,
} from './selectors.js';

export {
  ProvisioningContractStatus,
  EXPECTED_PROVISIONING_CONTRACT_DOC,
  PROVISIONING_SCHEMA_PUBLISHED,
  PROVISIONING_ENDPOINTS_PUBLISHED,
  SOURCE_OBSERVATIONS,
  PENDING_PROVISIONING_CONTRACTS,
  PROVISIONING_INTEGRATION_AUTHORIZED,
  assertNoInventedProvisioningSchemas,
  findPendingProvisioningContract,
  describeProvisioningBlock,
} from './contracts/pending-provisioning-contract.js';