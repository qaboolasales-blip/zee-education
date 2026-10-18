/**
 * Public surface of the Zee Education frontend hardening layer (Batch M).
 *
 * Nothing here renders UI or calls the network. Importing it has no side effects.
 */

export {
  FORBIDDEN_STATE_SURFACES,
  APPROVED_STATE_SURFACES,
  assertNoCustomStateSurface,
  assertApprovedStateSurfacesOnly,
  assertStateSurfacesMatchReferences,
} from './ui-state-audit.js';

export {
  DEVELOPMENT_URL_PATTERNS,
  SECRET_IDENTIFIERS,
  DEBUG_CALLS,
  SecurityReject,
  assertNoDevelopmentUrls,
  assertNoSecretIdentifiers,
  assertNoDebugArtifacts,
  auditReleaseSource,
} from './security-scan.js';

export {
  IntegrationContractStatus,
  INTEGRATION_AUTHORIZED,
  PENDING_INTEGRATION_CONTRACTS,
  assertNoInventedIntegrationSchemas,
  describeIntegrationBlock,
} from './contracts/pending-integration-contract.js';
