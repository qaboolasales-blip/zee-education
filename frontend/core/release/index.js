/**
 * Public surface of the Zee Education frontend release layer (Batch N).
 *
 * Nothing here deploys, renders or shares a document. Importing it has no side effects.
 */

export {
  NON_PRODUCTION_ENV_VALUES,
  ReleaseReject,
  productionReadiness,
  assertProductionConfig,
  assertReleaseShareBoundary,
} from './production-config.js';

export {
  ReleaseContractStatus,
  RELEASE_AUTHORIZED,
  PENDING_RELEASE_CONTRACTS,
  assertNoInventedReleaseSchemas,
  describeReleaseBlock,
} from './contracts/pending-release-contract.js';
