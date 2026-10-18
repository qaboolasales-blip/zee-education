/**
 * Public surface of the Zee Education frontend auth-adapter layer (Batch B).
 *
 * Nothing here authenticates, stores a credential, attaches an auth header,
 * refreshes a token or renders UI. Importing this module has no side effects.
 *
 *  - `pending-auth-contract.js` is the BLOCKED record for B-O-01 / B-O-03.
 *  - `screen-registry.js` is the allow-list of already-approved screens (B-O-04).
 *  - `role-guard.js` selects among those screens with default deny (B-O-04).
 *  - `session-state.js` models observable session state with no storage (B-O-05).
 */

export {
  Surface,
  SURFACES,
  SCHOOL_DESKTOP_SCREENS,
  MOBILE_APP_TABS,
  MOBILE_APP_FEATURES,
  MOBILE_APP_PRE_AUTH_SCREEN,
  PLATFORM_SCREENS,
  FIXED_TAB_COUNT,
  NAV_ENTRIES_MAY_NOT_BE_HIDDEN,
  SCREEN_PROVENANCE,
  isApprovedSurface,
  approvedScreens,
  isApprovedScreen,
  screenKind,
  assertApprovedScreen,
} from './screen-registry.js';

export {
  Role,
  ROLES,
  isKnownRole,
  roleSource,
  allowedScreens,
  allowedMobileFeatures,
  canOpen,
  openDecision,
} from './role-guard.js';

export {
  SessionState,
  INITIAL_SESSION,
  CONNECT_SCREEN,
  TOAST_HOOK,
  isKnownSessionState,
  bindingFor,
  classifySessionState,
  reduceSession,
  canOpenScreen,
} from './session-state.js';

export {
  AuthContractStatus,
  EXPECTED_AUTH_CONTRACT_DOC,
  SOURCE_OBSERVATIONS,
  PENDING_AUTH_CONTRACTS,
  AUTH_INTEGRATION_AUTHORIZED,
  assertNoInventedAuthSchemas,
  findPendingAuthContract,
  describeAuthBlock,
} from './contracts/pending-auth-contract.js';