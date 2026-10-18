/**
 * Public surface of the Zee Education frontend core adapter layer.
 *
 * Importing this module has no side effects: it does not touch the DOM, does
 * not read secrets, does not perform I/O and does not reference any approved UI.
 */

export {
  DEFAULT_API_BASE_PATH,
  BASE_PATH_ENV_KEY,
  DEFAULT_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  ALLOWED_CONFIG_KEYS,
  ALLOWED_CREDENTIALS,
  FORBIDDEN_HEADERS,
  assertRelativeBasePath,
  readEnvBasePath,
  assertNoSecrets,
  assertSafeHeaders,
  buildApiUrl,
  joinApiPath,
  buildQueryString,
  resolveApiConfig,
  buildRequestHeaders,
} from './config.js';

export {
  ApiError,
  ApiErrorKind,
  normalizeError,
  normalizeResponse,
  isRetryableStatus,
} from './errors.js';

export { createApiClient } from './client.js';

export {
  ContractStatus,
  EXPECTED_CONTRACT_DOC,
  PENDING_CONTRACTS,
  LIVE_BINDING_AUTHORIZED,
  assertNoInventedSchemas,
  findPendingContract,
  describeContractBlock,
} from './contracts/pending-contracts.js';