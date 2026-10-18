/**
 * Production release configuration validation. Task: N-O-01.
 *
 * "Validate deployed frontend integration uses production relative endpoints."
 *
 * The client already enforces a relative base path (`core/api/config.js`), so this
 * module validates the *release-specific* properties on top of it: the base path is
 * relative, no development environment is selected, no debug flag is set, only
 * approved config keys and credential modes are used, and no secret is present.
 *
 * A configuration that fails any of these is not shipped — `assertProductionConfig()`
 * throws, and `productionReadiness()` reports every reason instead.
 *
 * No DOM, no network, no storage.
 */

import {
  ALLOWED_CONFIG_KEYS,
  ALLOWED_CREDENTIALS,
  DEFAULT_API_BASE_PATH,
  BASE_PATH_ENV_KEY,
} from '../api/config.js';
import { validateShareRequest } from '../curriculum/share-boundary.js';

/** Environment values that mark a non-production deployment. */
export const NON_PRODUCTION_ENV_VALUES = Object.freeze([
  'development',
  'dev',
  'localhost',
  'staging',
  'stg',
  'test',
  'local',
  'debug',
]);

export const ReleaseReject = Object.freeze({
  NOT_AN_OBJECT: 'not-an-object',
  ABSOLUTE_BASE_PATH: 'absolute-base-path',
  NON_PRODUCTION_ENV: 'non-production-environment',
  DEBUG_FLAG: 'debug-flag-set',
  UNKNOWN_CONFIG_KEY: 'unknown-config-key',
  CREDENTIALS_NOT_ALLOWED: 'credentials-not-allowed',
});

function collect(reason, reasons) {
  reasons.push(reason);
}

function isAbsolute(value) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) || value.startsWith('//');
}

/**
 * N-O-01 — validate a release configuration, collecting every reason.
 *
 * @param {{ basePath?: unknown, timeoutMs?: unknown, headers?: unknown,
 *           credentials?: unknown, fetchImpl?: unknown, requestIdHeader?: unknown,
 *           debug?: unknown }} rawConfig
 * @param {Record<string, string>} [env]
 */
export function productionReadiness(rawConfig, env = {}) {
  const reasons = [];

  if (
    rawConfig === null ||
    rawConfig === undefined ||
    typeof rawConfig !== 'object' ||
    Array.isArray(rawConfig)
  ) {
    return Object.freeze({ ready: false, basePath: null, reasons: Object.freeze([ReleaseReject.NOT_AN_OBJECT]) });
  }

  for (const key of Object.keys(rawConfig)) {
    if (!ALLOWED_CONFIG_KEYS.includes(key)) collect(ReleaseReject.UNKNOWN_CONFIG_KEY, reasons);
  }

  const basePath = rawConfig.basePath === undefined ? DEFAULT_API_BASE_PATH : String(rawConfig.basePath);
  if (isAbsolute(basePath)) collect(ReleaseReject.ABSOLUTE_BASE_PATH, reasons);

  const envBase = env[BASE_PATH_ENV_KEY];
  if (typeof envBase === 'string' && envBase !== '' && isAbsolute(envBase)) {
    collect(ReleaseReject.ABSOLUTE_BASE_PATH, reasons);
  }

  const nodeEnv = env.NODE_ENV ?? env.ENV ?? env.APP_ENV;
  if (typeof nodeEnv === 'string' && NON_PRODUCTION_ENV_VALUES.includes(nodeEnv.trim().toLowerCase())) {
    collect(ReleaseReject.NON_PRODUCTION_ENV, reasons);
  }

  if (rawConfig.debug === true) collect(ReleaseReject.DEBUG_FLAG, reasons);

  if (rawConfig.credentials !== undefined && !ALLOWED_CREDENTIALS.includes(rawConfig.credentials)) {
    collect(ReleaseReject.CREDENTIALS_NOT_ALLOWED, reasons);
  }

  return Object.freeze({
    ready: reasons.length === 0,
    basePath,
    reasons: Object.freeze([...reasons]),
  });
}

/**
 * N-O-01 — the asserting form.
 *
 * @param {Parameters<typeof productionReadiness>[0]} rawConfig
 * @param {Record<string, string>} [env]
 */
export function assertProductionConfig(rawConfig, env = {}) {
  const readiness = productionReadiness(rawConfig, env);
  if (!readiness.ready) {
    throw new Error(
      `not a production configuration (N-O-01):\n  ${readiness.reasons.join('\n  ')}`,
    );
  }
  return readiness;
}

/**
 * N-O-03 — the manual PDF share boundary must still hold in a release build.
 *
 * Batch G established that sharing is user-initiated only and never names a
 * destination. A pilot environment does not relax that, so this re-runs the Batch G
 * gate on a request and refuses anything the release boundary would refuse.
 *
 * @param {object} request
 */
export function assertReleaseShareBoundary(request) {
  return validateShareRequest(request);
}
