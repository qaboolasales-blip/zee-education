/**
 * Public surface of the Zee Education frontend connection layer (Batch L).
 *
 * Nothing here connects a school, persists a selection or launches a session.
 * Importing it has no side effects.
 */

export {
  ConnectionReject,
  parseSchoolName,
  validateConnection,
  connectionReport,
  selectedSchool,
  clearSelectedSchool,
  assertConnectionFlowMatchesReferences,
} from './connection.js';

export {
  LaunchReject,
  LANDING,
  launchRoleExperience,
  roleLaunchFeatures,
  assertRoleLaunchMatchesReferences,
} from './role-launch.js';

export {
  HookKind,
  CONNECTION_BINDINGS,
  connectionBindingById,
  blockedConnectionBindings,
  assertNoConnectionElementCreation,
  assertConnectionBindingsMatchReferences,
} from './element-bindings.js';

export {
  ConnectionContractStatus,
  CONNECTION_INTEGRATION_AUTHORIZED,
  MISSING_CONNECTION_ENTITIES,
  PENDING_CONNECTION_CONTRACTS,
  assertNoInventedConnectionSchemas,
  findPendingConnectionContract,
  describeConnectionBlock,
} from './contracts/pending-connection-contract.js';
