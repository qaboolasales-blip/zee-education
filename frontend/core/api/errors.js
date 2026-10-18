/**
 * Safe error and response normalization for the Zee Education frontend.
 * Task: O-01.2. Framework-agnostic, dependency-free, no DOM requirement.
 *
 * Design rules (see UNIVERSAL_RULES.md LAW 4):
 *  - A caller always receives an `ApiError`, never a raw transport exception.
 *  - `message` is fixed, operator-approved copy. It never embeds a URL, a
 *    server-supplied string, an exception message or a response body, so no
 *    secret, token or student data can ever reach UI copy through an error.
 *  - The raw cause is kept only on the non-enumerable `cause` property for
 *    developer debugging and is not part of the normalized surface.
 */

/** Canonical error kinds. */
export const ApiErrorKind = Object.freeze({
  CONFIG: 'config',
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  ABORT: 'abort',
  HTTP: 'http',
  PARSE: 'parse',
});

/**
 * Fixed, safe copy. Never parameterised with server or transport text; the only
 * variable part is the integer HTTP status.
 */
const SAFE_MESSAGES = Object.freeze({
  [ApiErrorKind.CONFIG]: 'API client configuration is invalid.',
  [ApiErrorKind.NETWORK]: 'Network request failed.',
  [ApiErrorKind.TIMEOUT]: 'Request timed out.',
  [ApiErrorKind.ABORT]: 'Request was cancelled.',
  [ApiErrorKind.PARSE]: 'Response could not be read as JSON.',
});

function resolveMessage(kind, status) {
  if (kind === ApiErrorKind.HTTP) {
    return Number.isInteger(status)
      ? `Request failed with HTTP status ${status}.`
      : SAFE_MESSAGES[ApiErrorKind.NETWORK];
  }
  return SAFE_MESSAGES[kind] ?? SAFE_MESSAGES[ApiErrorKind.NETWORK];
}

/** HTTP statuses that are worth retrying. */
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Normalized transport/protocol error.
 *
 * @property {'config'|'network'|'timeout'|'abort'|'http'|'parse'} kind
 * @property {number|null} status HTTP status when `kind === 'http'`, else null
 * @property {boolean} retryable
 */
export class ApiError extends Error {
  #status;
  #retryable;

  constructor(kind, { status = null, retryable = false, cause } = {}) {
    const resolvedKind = Object.values(ApiErrorKind).includes(kind) ? kind : ApiErrorKind.NETWORK;
    const resolvedStatus = Number.isInteger(status) ? status : null;
    super(resolveMessage(resolvedKind, resolvedStatus));
    this.name = 'ApiError';
    this.kind = resolvedKind;
    this.#status = resolvedStatus;
    this.#retryable = Boolean(retryable);
    if (cause !== undefined) {
      Object.defineProperty(this, 'cause', {
        value: cause,
        enumerable: false,
        writable: false,
        configurable: false,
      });
    }
  }

  get status() {
    return this.#status;
  }

  get retryable() {
    return this.#retryable;
  }

  /** Safe, loggable, secret-free shape. */
  toJSON() {
    return {
      name: this.name,
      kind: this.kind,
      status: this.#status,
      message: this.message,
      retryable: this.#retryable,
    };
  }
}

export function isRetryableStatus(status) {
  return Number.isInteger(status) && RETRYABLE_STATUSES.has(status);
}

function isAbortLike(value) {
  if (!value || typeof value !== 'object') return false;
  return (
    value.name === 'AbortError' ||
    value.code === 'ABORT_ERR' ||
    value.name === 'TimeoutError'
  );
}

function statusOf(value) {
  if (!value || typeof value !== 'object') return null;
  if (Number.isInteger(value.status)) return value.status;
  return null;
}

/**
 * Normalize anything thrown by the transport into an {@link ApiError}.
 *
 * @param {unknown} error
 * @param {{ timedOut?: boolean, status?: number }} [context]
 * @returns {ApiError}
 */
export function normalizeError(error, context = {}) {
  const status = context.status ?? statusOf(error);

  if (error instanceof ApiError) {
    if (status !== null && status !== undefined && error.status === null) {
      // A status only becomes known from the transport envelope; from then on
      // the failure is an HTTP failure, not a generic transport failure.
      return new ApiError(ApiErrorKind.HTTP, {
        status,
        retryable: isRetryableStatus(status) || error.retryable,
        cause: error,
      });
    }
    return error;
  }

  if (context.timedOut === true) {
    return new ApiError(ApiErrorKind.TIMEOUT, { status: null, retryable: true, cause: error });
  }

  if (isAbortLike(error)) {
    return new ApiError(ApiErrorKind.ABORT, { status: null, retryable: false, cause: error });
  }

  if (Number.isInteger(status)) {
    return new ApiError(ApiErrorKind.HTTP, {
      status,
      retryable: isRetryableStatus(status),
      cause: error,
    });
  }

  return new ApiError(ApiErrorKind.NETWORK, { status: null, retryable: true, cause: error });
}

/**
 * Normalize a successful HTTP response envelope.
 *
 * The envelope is intentionally minimal and contains no payload assumptions:
 * `data` is the parsed JSON body only when the response actually declared a
 * JSON media type, otherwise `null` with `contentType` retained. A non-JSON
 * response (for example an HTML page) is never coerced into an object.
 *
 * @param {{ status: number, body: string, contentType: string|null, requestId?: string|null }} input
 * @returns {{ status: number, ok: true, data: unknown, contentType: string|null, requestId: string|null }}
 */
export function normalizeResponse({ status, body, contentType, requestId = null }) {
  const mediaType = (contentType ?? '').toLowerCase();
  const isJson = mediaType.includes('application/json') || mediaType.includes('+json');
  const trimmed = typeof body === 'string' ? body.trim() : '';

  if (!isJson || trimmed === '') {
    return { status, ok: true, data: null, contentType: contentType ?? null, requestId };
  }

  let data;
  try {
    data = JSON.parse(trimmed);
  } catch (cause) {
    throw new ApiError(ApiErrorKind.PARSE, { status, retryable: false, cause });
  }

  return { status, ok: true, data, contentType: contentType ?? null, requestId };
}