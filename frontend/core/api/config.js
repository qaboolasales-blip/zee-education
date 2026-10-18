/**
 * Relative-URL and no-secret configuration for the Zee Education frontend.
 * Task: O-01.1.
 *
 * Guarantees enforced here:
 *  - The API base path is ALWAYS a relative, same-origin path. Absolute URLs,
 *    protocol-relative URLs (`//host`), backslashes, `..` traversal, query
 *    strings and fragments are rejected. No `localhost`, no preview URL, no
 *    temporary host string can ever be introduced.
 *  - Only one environment variable is read (`ZEE_API_BASE_PATH`) and it may only
 *    hold a relative path. No other env key is inspected.
 *  - Configuration is allow-listed and deep-scanned. Any key or header that
 *    looks like a credential causes a configuration error, so tokens, database
 *    credentials or school secrets cannot be introduced into browser code.
 */

import { ApiError, ApiErrorKind } from './errors.js';

export const DEFAULT_API_BASE_PATH = '/api';
export const BASE_PATH_ENV_KEY = 'ZEE_API_BASE_PATH';
export const DEFAULT_TIMEOUT_MS = 15000;
export const MAX_TIMEOUT_MS = 120000;

/** Config keys the client understands. Anything else is a configuration error. */
export const ALLOWED_CONFIG_KEYS = Object.freeze([
  'basePath',
  'timeoutMs',
  'headers',
  'credentials',
  'fetchImpl',
  'requestIdHeader',
]);

export const ALLOWED_CREDENTIALS = Object.freeze(['same-origin', 'omit']);

/** Keys that indicate a credential must never live in browser config. */
const SECRET_KEY_PATTERN =
  /(secret|token|password|passwd|pwd|api[-_]?key|apikey|private[-_]?key|credential|authorization|auth[-_]?value|bearer|session[-_]?id|cookie)/i;

/** Header names that must never be set from browser configuration. */
export const FORBIDDEN_HEADERS = Object.freeze([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-access-token',
  'x-csrf-token',
  'x-xsrf-token',
  'x-session-token',
]);

const FORBIDDEN_HEADER_SET = new Set(FORBIDDEN_HEADERS);

/** Long opaque strings and auth schemes are rejected as header values. */
const TOKEN_LIKE_VALUE_PATTERN = /^[A-Za-z0-9_\-.]{40,}$/;
const AUTH_SCHEME_VALUE_PATTERN = /^(bearer|basic|digest|token)\s+\S/i;

const MAX_SCAN_DEPTH = 8;
const MAX_HEADER_VALUE_LENGTH = 512;

/**
 * Base path already normalized by {@link assertRelativeBasePath}: the empty
 * string is the canonical form of `'/'` and must be accepted internally.
 */
function coerceBasePath(value) {
  if (value === '' || value === null || value === undefined) return '';
  return assertRelativeBasePath(value);
}

function configError(reason, extra) {
  const error = new ApiError(ApiErrorKind.CONFIG, { retryable: false });
  error.reason = `config:${reason}`;
  Object.assign(error, extra ?? {});
  return error;
}

/**
 * Validate and normalize a relative base path.
 *
 * @param {unknown} value
 * @returns {string} normalized path with no trailing slash (`'/'` normalizes to `''`)
 */
export function assertRelativeBasePath(value) {
  if (typeof value !== 'string') {
    throw configError('basePath-type', { detail: 'basePath must be a string' });
  }

  const trimmed = value.trim();

  if (trimmed === '') {
    throw configError('basePath-empty', { detail: 'basePath must not be empty' });
  }
  if (/\s/.test(trimmed)) {
    throw configError('basePath-whitespace', { detail: 'basePath must not contain whitespace' });
  }
  if (trimmed.startsWith('//')) {
    throw configError('basePath-protocol-relative', {
      detail: 'basePath must not be protocol-relative',
    });
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    throw configError('basePath-absolute-url', {
      detail: 'basePath must not be an absolute URL',
    });
  }
  if (!trimmed.startsWith('/')) {
    throw configError('basePath-not-rooted', { detail: 'basePath must start with /' });
  }
  if (trimmed.includes('\\')) {
    throw configError('basePath-backslash', { detail: 'basePath must not contain a backslash' });
  }
  if (trimmed.includes('..')) {
    throw configError('basePath-traversal', { detail: 'basePath must not contain ..' });
  }
  if (trimmed.includes('?') || trimmed.includes('#')) {
    throw configError('basePath-query-or-fragment', {
      detail: 'basePath must not contain a query string or fragment',
    });
  }

  const withoutTrailing = trimmed.replace(/\/+$/, '');
  return withoutTrailing === '' ? '' : withoutTrailing;
}

/**
 * Read the API base path from an environment-like object.
 * Only `ZEE_API_BASE_PATH` is read; nothing else is inspected.
 *
 * @param {Record<string, unknown>} [env]
 * @returns {string}
 */
export function readEnvBasePath(env = {}) {
  if (!env || typeof env !== 'object') {
    return DEFAULT_API_BASE_PATH;
  }
  const raw = env[BASE_PATH_ENV_KEY];
  if (typeof raw !== 'string' || raw.trim() === '') {
    return DEFAULT_API_BASE_PATH;
  }
  return assertRelativeBasePath(raw.trim());
}

/**
 * Config keys whose name trips the credential heuristic but whose value is
 * strictly validated elsewhere, so they can never carry a secret.
 * `credentials` is the fetch *mode* ('same-origin' | 'omit'), not a credential.
 */
const VALUE_VALIDATED_CONFIG_KEYS = new Set(['credentials']);

function scanForSecrets(value, path, depth) {
  if (depth > MAX_SCAN_DEPTH) return;
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForSecrets(item, `${path}[${index}]`, depth + 1));
    return;
  }

  if (typeof value !== 'object') return;
  if (typeof value === 'function') return;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (SECRET_KEY_PATTERN.test(key) && !VALUE_VALIDATED_CONFIG_KEYS.has(key)) {
      throw configError('secret-key', { detail: `secret-like key is not allowed at ${childPath}` });
    }
    scanForSecrets(child, childPath, depth + 1);
  }
}

/**
 * Reject any configuration object that looks like it carries a credential.
 *
 * @param {unknown} value
 * @param {string} [path]
 */
export function assertNoSecrets(value, path = 'config') {
  scanForSecrets(value, path, 0);
}

/**
 * Validate a plain header bag. Returns a frozen normalized copy.
 *
 * @param {unknown} headers
 * @returns {Readonly<Record<string, string>>}
 */
export function assertSafeHeaders(headers) {
  if (headers === undefined || headers === null) return Object.freeze({});

  if (typeof headers !== 'object' || Array.isArray(headers)) {
    throw configError('headers-type', { detail: 'headers must be a plain object' });
  }

  const normalized = {};

  for (const [rawName, rawValue] of Object.entries(headers)) {
    const name = String(rawName).trim().toLowerCase();

    if (!/^[a-z0-9-]+$/.test(name)) {
      throw configError('header-name-invalid', { detail: `invalid header name: ${rawName}` });
    }
    if (FORBIDDEN_HEADER_SET.has(name) || SECRET_KEY_PATTERN.test(name)) {
      throw configError('header-forbidden', { detail: `header not allowed: ${name}` });
    }
    if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
      throw configError('header-value-type', { detail: `header value must be a string: ${name}` });
    }

    const value = String(rawValue).trim();

    if (value.length > MAX_HEADER_VALUE_LENGTH) {
      throw configError('header-value-too-long', { detail: `header value too long: ${name}` });
    }
    if (AUTH_SCHEME_VALUE_PATTERN.test(value)) {
      throw configError('header-auth-scheme', {
        detail: `auth-scheme header values are not allowed: ${name}`,
      });
    }
    if (TOKEN_LIKE_VALUE_PATTERN.test(value)) {
      throw configError('header-token-like', {
        detail: `token-like header value is not allowed: ${name}`,
      });
    }

    normalized[name] = value;
  }

  return Object.freeze(normalized);
}

/**
 * Build a fully relative request URL.
 *
 * @param {string} basePath relative base path, e.g. `''` or `'/api'`
 * @param {string} path absolute API path, e.g. `'/health'`
 * @param {Record<string, unknown>|URLSearchParams|null} [query]
 * @returns {string} always starts with `/`
 */
export function buildApiUrl(basePath, path, query = null) {
  const base = coerceBasePath(basePath);
  const joined = joinApiPath(base, path);
  const search = buildQueryString(query);
  const url = search === '' ? joined : `${joined}?${search}`;
  return assertRelativeResult(url);
}

/** Final guard: the produced URL can never be absolute or protocol-relative. */
function assertRelativeResult(url) {
  if (url.startsWith('//')) {
    throw configError('result-protocol-relative', {
      detail: 'the produced URL must be same-origin relative',
    });
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    throw configError('result-absolute-url', { detail: 'the produced URL must not be absolute' });
  }
  if (!url.startsWith('/')) {
    throw configError('result-not-rooted', { detail: 'the produced URL must start with /' });
  }
  return url;
}

/** Join a base path and an API path into a single relative path. */
export function joinApiPath(basePath, path) {
  const base = coerceBasePath(basePath);

  if (path === undefined || path === null || path === '') {
    return base === '' ? '/' : `${base}/`;
  }
  if (typeof path !== 'string') {
    throw configError('path-type', { detail: 'path must be a string' });
  }

  const candidate = path.trim();

  if (/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
    throw configError('path-absolute-url', { detail: 'path must be relative to the API base' });
  }
  // `///health///` is a rooted path, not a protocol-relative URL. It is only a
  // protocol-relative URL when no base path would be prepended in front of it.
  if (base === '' && candidate.startsWith('//')) {
    throw configError('path-protocol-relative', {
      detail: 'path must be relative to the API base',
    });
  }
  if (candidate.includes('\\')) {
    throw configError('path-backslash', { detail: 'path must not contain a backslash' });
  }
  if (candidate.includes('..')) {
    throw configError('path-traversal', { detail: 'path must not contain ..' });
  }
  if (candidate.includes('?')) {
    throw configError('path-query', {
      detail: 'use the query option instead of embedding a query string',
    });
  }

  const segments = candidate
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment !== '');

  const suffix = segments
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  if (base === '') {
    return suffix === '' ? '/' : `/${suffix}`;
  }
  return suffix === '' ? `${base}/` : `${base}/${suffix}`;
}

/** Serialize a query object into a URL-encoded search string. */
export function buildQueryString(query) {
  if (query === null || query === undefined) return '';

  const params = new URLSearchParams();

  const append = (key, value) => {
    if (value === null || value === undefined) return;
    params.append(key, typeof value === 'boolean' ? String(value) : String(value));
  };

  if (typeof URLSearchParams !== 'undefined' && query instanceof URLSearchParams) {
    for (const [key, value] of query.entries()) append(key, value);
    return params.toString();
  }

  if (typeof query !== 'object' || Array.isArray(query)) {
    throw configError('query-type', { detail: 'query must be a plain object or URLSearchParams' });
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) append(key, item);
      continue;
    }
    append(key, value);
  }

  return params.toString();
}

/**
 * Normalize and validate client configuration.
 *
 * @param {Record<string, unknown>} [rawConfig]
 * @param {{ env?: Record<string, unknown>, fetchImpl?: Function, globalScope?: object }} [deps]
 */
export function resolveApiConfig(rawConfig = {}, deps = {}) {
  if (rawConfig === null || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
    throw configError('config-type', { detail: 'config must be a plain object' });
  }

  assertNoSecrets(rawConfig, 'config');
  assertNoSecrets(deps.env ?? {}, 'config.env');

  for (const key of Object.keys(rawConfig)) {
    if (!ALLOWED_CONFIG_KEYS.includes(key)) {
      throw configError('config-unknown-key', { detail: `unsupported config key: ${key}` });
    }
  }

  const basePath =
    rawConfig.basePath === undefined
      ? readEnvBasePath(deps.env ?? defaultEnv())
      : assertRelativeBasePath(rawConfig.basePath);

  const timeoutMs = normalizeTimeout(rawConfig.timeoutMs);
  const headers = assertSafeHeaders(rawConfig.headers);
  const credentials = normalizeCredentials(rawConfig.credentials);
  const requestIdHeader = normalizeRequestIdHeader(rawConfig.requestIdHeader);

  const fetchImpl = resolveFetchImpl(rawConfig.fetchImpl, deps);

  return Object.freeze({ basePath, timeoutMs, headers, credentials, requestIdHeader, fetchImpl });
}

function defaultEnv() {
  return typeof process !== 'undefined' && process.env ? process.env : {};
}

function normalizeTimeout(value) {
  if (value === undefined) return DEFAULT_TIMEOUT_MS;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw configError('timeout-invalid', { detail: 'timeoutMs must be a positive number' });
  }
  if (value > MAX_TIMEOUT_MS) {
    throw configError('timeout-too-large', { detail: `timeoutMs must not exceed ${MAX_TIMEOUT_MS}` });
  }
  return Math.floor(value);
}

function normalizeCredentials(value) {
  if (value === undefined) return 'same-origin';
  if (!ALLOWED_CREDENTIALS.includes(value)) {
    throw configError('credentials-invalid', {
      detail: `credentials must be one of ${ALLOWED_CREDENTIALS.join(', ')}`,
    });
  }
  return value;
}

function normalizeRequestIdHeader(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || !/^[A-Za-z0-9-]+$/.test(value.trim())) {
    throw configError('request-id-header-invalid', {
      detail: 'requestIdHeader must be a simple header name',
    });
  }
  // Reuse the header allow-list so a forbidden name can never be opted in here.
  assertSafeHeaders({ [value]: 'application/json' });
  return value.trim();
}

function resolveFetchImpl(configured, deps) {
  let candidate = configured ?? deps.fetchImpl;
  // An explicitly supplied global scope that lacks fetch must fail closed
  // rather than silently falling back to the ambient global.
  if (candidate === undefined && deps.globalScope !== undefined) {
    candidate = deps.globalScope.fetch;
  } else if (candidate === undefined) {
    candidate = globalThis?.fetch;
  }
  if (typeof candidate !== 'function') {
    throw configError('fetch-unavailable', {
      detail: 'no fetch implementation available',
    });
  }
  return candidate;
}

/**
 * Build the outbound header bag. Client-authored headers only; credentials are
 * never added here (the browser manages cookies for `same-origin` requests).
 *
 * @param {{ base?: Readonly<Record<string, string>>, extra?: unknown, hasBody?: boolean, accept?: string }} input
 */
export function buildRequestHeaders({ base = {}, extra, hasBody = false, accept = 'application/json' } = {}) {
  const safeBase = assertSafeHeaders(base);
  const safeExtra = assertSafeHeaders(extra);

  const merged = { accept, ...safeBase, ...safeExtra };
  if (hasBody) merged['content-type'] = 'application/json';

  return assertSafeHeaders(merged);
}