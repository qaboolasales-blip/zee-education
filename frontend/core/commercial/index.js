/**
 * Public surface of the Zee Education frontend commercial layer (Batch K).
 *
 * Nothing here reads commercial data, sends a reminder or opens a ticket.
 * Importing it has no side effects.
 */

export {
  LicenseStatus,
  LICENSE_STATUS_BADGE,
  NEUTRAL_BADGE,
  DatabaseKind,
  DATABASE_BADGE,
  DATABASE_BADGE_FALLBACK,
  LicenseReject,
  licenseBadge,
  databaseBadge,
  normaliseCommercialRecord,
  parseRenewal,
  licenseStateFor,
  commercialSummary,
  assertLicenseStatesMatchReferences,
} from './license-state.js';

export {
  SupportScope,
  SUPPORT_SCOPES,
  SUPPORT_FORBIDDEN_CATEGORIES,
  SupportReject,
  SUPPORT_ACTIONS,
  isSupportAction,
  scopeForSupportAction,
  authoriseSupportAction,
  prepareRenewalReminder,
  assertSupportIsolation,
  assertSupportRulesMatchReferences,
} from './support-boundary.js';

export {
  HookKind,
  COMMERCIAL_BINDINGS,
  commercialBindingById,
  blockedCommercialBindings,
  assertNoCommercialElementCreation,
  assertCommercialBindingsMatchReferences,
} from './element-bindings.js';

export {
  CommercialContractStatus,
  COMMERCIAL_INTEGRATION_AUTHORIZED,
  MISSING_COMMERCIAL_ENTITIES,
  PENDING_COMMERCIAL_CONTRACTS,
  assertNoInventedCommercialSchemas,
  findPendingCommercialContract,
  describeCommercialBlock,
} from './contracts/pending-commercial-contract.js';
