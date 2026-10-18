/**
 * Minimal framework-agnostic API client for the Zee Education frontend.
 * Task: O-01.1 (transport) + O-01.2 (response/error normalization).
 *
 * Boundaries:
 *  - Relative, same-origin URLs only. No absolute or protocol-relative URL can
 *    be produced (enforced in `config.js`).
 *  - No UI code, no DOM, no framework import. This module returns data; it never
 *    touches a node, a class or a style.
 *  - It never claims to be a live integration. There is no published backend
 *    contract yet (see `frontend/docs/backend-contract-dependency.md`), so this
 *    module deliberately models NO endpoint payload. Binding is a later task.
 *  - It never reads, stores or transmits a token. Browser-managed same-origin
 *    cookies are the only credential mechanism.
 */

import {
  buildApiUrl,
  buildRequestHeaders,
  resolveApiConfig,
} from './config.js';
import {
  ApiError,
  ApiErrorKind,
  normalizeError,
  normalizeResponse,
} from './errors.js';

/** Only these verbs are exposed; anything else is a programming error. */
const ALLOWED_METHODS = Object.freeze(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']);

function assertMethod(method) {
  const upper = String(method ?? 'GET').toUpperCase();
  if (!ALLOWED_METHODS.includes(upper)) {
    throw new ApiError(ApiErrorKind.CONFIG, { retryable: false });
  }
  return upper;
}

function linkSignals(signals) {
  const present = signals.filter((signal) => signal && typeof signal === 'object');
  if (present.length === 0) return null;
  if (present.length === 1) return present[0];
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
    return AbortSignal.any(present);
  }
  return present[0];
}

function safeRequestId(response, requestIdHeader) {
  if (!requestIdHeader || typeof response?.headers?.get !== 'function') return null;
  const raw = response.headers.get(requestIdHeader);
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim();
  if (cleaned === '' || cleaned.length > 128) return null;
  return /^[A-Za-z0-9._:-]+$/.test(cleaned) ? cleaned : null;
}

/**
 * Create an API client bound to a relative base path.
 *
 * @param {{
 *   basePath?: string,
 *   timeoutMs?: number,
 *   headers?: Record<string, string>,
 *   credentials?: 'same-origin' | 'omit',
 *   requestIdHeader?: string | null,
 *   fetchImpl?: Function,
 * }} [config]
 * @param {{ env?: Record<string, unknown>, fetchImpl?: Function, globalScope?: object }} [deps]
 */
export function createApiClient(config = {}, deps = {}) {
  const resolved = resolveApiConfig(config, deps);

  /**
   * Build a relative URL without performing a request. Useful for tests and for
   * link/redirect hooks that already exist in the approved UI.
   *
   * @param {string} path
   * @param {Record<string, unknown>|URLSearchParams|null} [query]
   */
  function buildUrl(path, query = null) {
    return buildApiUrl(resolved.basePath, path, query);
  }

  /**
   * Perform a request and return a normalized envelope.
   *
   * @param {string} method
   * @param {string} path relative API path, e.g. `'/health'`
   * @param {{
   *   query?: Record<string, unknown>|URLSearchParams|null,
   *   json?: unknown,
   *   headers?: Record<string, string>,
   *   signal?: AbortSignal,
   *   timeoutMs?: number,
   * }} [options]
   * @returns {Promise<{ status: number, ok: true, data: unknown, contentType: string|null, requestId: string|null }>}
   * @throws {ApiError} CONFIG | NETWORK | TIMEOUT | ABORT | HTTP | PARSE
   */
  async function request(method, path, options = {}) {
    const verb = assertMethod(method);
    const url = buildUrl(path, options.query ?? null);
    const hasBody = options.json !== undefined;
    const headers = buildRequestHeaders({
      base: resolved.headers,
      extra: options.headers,
      hasBody,
    });

    const timeoutMs = options.timeoutMs ?? resolved.timeoutMs;
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const signal = linkSignals([controller?.signal, options.signal]);

    let timedOut = false;
    const timer =
      controller && Number.isFinite(timeoutMs) && timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, timeoutMs)
        : null;

    let response;
    try {
      response = await resolved.fetchImpl(url, {
        method: verb,
        headers,
        credentials: resolved.credentials,
        signal,
        ...(hasBody ? { body: JSON.stringify(options.json) } : {}),
      });
    } catch (cause) {
      throw normalizeError(cause, { timedOut });
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (!response || typeof response.status !== 'number') {
      throw normalizeError(new Error('invalid-response'), { timedOut });
    }

    if (!response.ok) {
      // The body is deliberately never read into an error message: it may carry
      // server text that must not reach browser UI copy.
      throw normalizeError(null, { status: response.status });
    }

    let body = '';
    try {
      body = typeof response.text === 'function' ? await response.text() : '';
    } catch (cause) {
      throw normalizeError(cause, { timedOut, status: response.status });
    }

    return normalizeResponse({
      status: response.status,
      body,
      contentType:
        typeof response.headers?.get === 'function' ? response.headers.get('content-type') : null,
      requestId: safeRequestId(response, resolved.requestIdHeader),
    });
  }

  /** GET helper. */
  function get(path, options = {}) {
    return request('GET', path, options);
  }

  /** POST helper. Bodies are JSON-encoded by the client. */
  function post(path, options = {}) {
    return request('POST', path, options);
  }

  return Object.freeze({
    basePath: resolved.basePath,
    timeoutMs: resolved.timeoutMs,
    credentials: resolved.credentials,
    buildUrl,
    request,
    get,
    post,
  });
}