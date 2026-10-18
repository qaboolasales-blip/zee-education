/**
 * Public surface of the Zee Education frontend people layer (Batch E).
 *
 * Nothing here reads or writes a person record, stores a credential or renders
 * anything. The layer is a privacy POLICY plus redacting SELECTORS, so that when
 * the endpoints arrive the correct data shape is already enforced.
 */

export {
  DataCategory,
  DATA_CATEGORIES,
  Scope,
  PRIVACY_MATRIX,
  PRIVACY_ROLES,
  ANONYMOUS,
  isKnownPrivacyRole,
  scopeFor,
  mayView,
  visibleCategories,
  hiddenCategories,
  requiresServerScope,
  assertSuperAdminCannotBrowseLearners,
  assertParentLimitedToLinkedChildren,
} from './privacy-policy.js';

export {
  REDACTED,
  selectPersonForRole,
  selectPeopleForRole,
  redactCategory,
  redactedCategories,
  selectLinkedChildren,
  selectOwnRecord,
  describeChildCount,
  classifyChildStatus,
  describeOptionalMedia,
  describeContact,
  describeAccess,
} from './selectors.js';

export {
  LANDING_HOME,
  LANDING_CONNECT,
  ROLE_LANDING,
  resolveRoleLanding,
  roleLandingTab,
  landingCandidates,
  assertLandingsAreApproved,
} from './role-landing.js';

export {
  HookKind,
  PEOPLE_BINDINGS,
  peopleBindingById,
  peopleBindingsForSurface,
  blockedPeopleBindings,
  assertNoPeopleElementCreation,
  assertPeopleBindingsMatchReferences,
} from './element-bindings.js';

export {
  PeopleContractStatus,
  SCHOOL_DATABASE_EXISTS,
  PEOPLE_SCHEMA_PUBLISHED,
  PEOPLE_ENDPOINTS_PUBLISHED,
  PEOPLE_INTEGRATION_AUTHORIZED,
  MISSING_PEOPLE_ENTITIES,
  PENDING_PEOPLE_CONTRACTS,
  assertNoInventedPeopleSchemas,
  findPendingPeopleContract,
  describePeopleBlock,
} from './contracts/pending-people-contract.js';