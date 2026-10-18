/**
 * Error and response normalization tests. Task: O-01.3.
 * Synthetic inputs only. No network access. No real endpoint is called.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ApiError,
  ApiErrorKind,
  isRetryableStatus,
  normalizeError,
  normalizeResponse,
} from '../core/api/errors.js';

describe('ApiError shape', () => {
  it('exposes a fixed, safe message per kind', () => {
    const messages = {
      config: 'API client configuration is invalid.',
      network: 'Network request failed.',
      timeout: 'Request timed out.',
      abort: 'Request was cancelled.',
      parse: 'Response could not be read as JSON.',
    };
    for (const [kind, expected] of Object.entries(messages)) {
      assert.equal(new ApiError(kind).message, expected);
    }
  });

  it('keeps status and retryable accessible but immutable through the public surface', () => {
    const error = new ApiError(ApiErrorKind.HTTP, { status: 503, retryable: true });
    assert.equal(error.status, 503);
    assert.equal(error.retryable, true);
    assert.deepEqual(error.toJSON(), {
      name: 'ApiError',
      kind: 'http',
      status: 503,
      message: 'Request failed with HTTP status 503.',
      retryable: true,
    });
  });

  it('hides the cause from enumeration and serialization', () => {
    const error = new ApiError(ApiErrorKind.NETWORK, { cause: new Error('token=abc leaked') });
    assert.equal(Object.keys(error).includes('cause'), false);
    assert.equal(JSON.stringify(error).includes('leaked'), false);
  });

  it('falls back to the network kind for an unknown kind', () => {
    const error = new ApiError('something-else');
    assert.equal(error.kind, ApiErrorKind.NETWORK);
  });
});

describe('normalizeError', () => {
  it('passes an existing ApiError through unchanged', () => {
    const original = new ApiError(ApiErrorKind.HTTP, { status: 404 });
    assert.equal(normalizeError(original), original);
  });

  it('upgrades a status-less ApiError when a status becomes known', () => {
    const upgraded = normalizeError(new ApiError(ApiErrorKind.NETWORK), { status: 500 });
    assert.equal(upgraded.kind, ApiErrorKind.HTTP);
    assert.equal(upgraded.status, 500);
    assert.equal(upgraded.retryable, true);
  });

  it('maps a fetch TypeError to a retryable network error', () => {
    const error = normalizeError(new TypeError('Failed to fetch'));
    assert.equal(error.kind, ApiErrorKind.NETWORK);
    assert.equal(error.retryable, true);
  });

  it('maps abort signals to ABORT, and a timeout flag to TIMEOUT', () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    assert.equal(normalizeError(abort).kind, ApiErrorKind.ABORT);

    const timeout = new Error('aborted');
    timeout.name = 'AbortError';
    const timedOut = normalizeError(timeout, { timedOut: true });
    assert.equal(timedOut.kind, ApiErrorKind.TIMEOUT);
    assert.equal(timedOut.retryable, true);
  });

  it('maps a Response-like value to an HTTP error with retry semantics', () => {
    assert.equal(normalizeError(null, { status: 401 }).kind, ApiErrorKind.HTTP);
    assert.equal(normalizeError(null, { status: 401 }).retryable, false);
    assert.equal(normalizeError(null, { status: 429 }).retryable, true);
    assert.equal(normalizeError({ status: 404 }, {}).status, 404);
  });

  it('never copies transport or server text into the message', () => {
    const messages = [
      'http://user:supersecret@internal.example.test/api',
      'mysql password=supersecret',
      'student ST-2026-041 belongs to another school',
      'Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature',
    ];
    for (const raw of messages) {
      const error = normalizeError(new Error(raw));
      assert.equal(error.message, 'Network request failed.');
      assert.equal(JSON.stringify(error).includes('supersecret'), false);
      assert.equal(error.message.includes('ST-2026-041'), false);
    }
  });

  it('handles null and undefined causes', () => {
    assert.equal(normalizeError(null).kind, ApiErrorKind.NETWORK);
    assert.equal(normalizeError(undefined).kind, ApiErrorKind.NETWORK);
    assert.equal(normalizeError('a string').kind, ApiErrorKind.NETWORK);
    assert.equal(normalizeError(42).kind, ApiErrorKind.NETWORK);
  });
});

describe('isRetryableStatus', () => {
  it('marks only transient statuses as retryable', () => {
    for (const status of [408, 425, 429, 500, 502, 503, 504]) {
      assert.equal(isRetryableStatus(status), true, `${status} should be retryable`);
    }
    for (const status of [200, 201, 301, 400, 401, 403, 404, 409, 422, 501]) {
      assert.equal(isRetryableStatus(status), false, `${status} should not be retryable`);
    }
    assert.equal(isRetryableStatus(null), false);
    assert.equal(isRetryableStatus('500'), false);
  });
});

describe('normalizeResponse', () => {
  it('parses JSON only when the media type declares JSON', () => {
    const parsed = normalizeResponse({
      status: 200,
      body: '{"status":"ok"}',
      contentType: 'application/json; charset=utf-8',
    });
    assert.deepEqual(parsed, {
      status: 200,
      ok: true,
      data: { status: 'ok' },
      contentType: 'application/json; charset=utf-8',
      requestId: null,
    });
  });

  it('accepts +json suffixed media types', () => {
    const parsed = normalizeResponse({ status: 200, body: '{"a":1}', contentType: 'application/vnd.zee+json' });
    assert.deepEqual(parsed.data, { a: 1 });
  });

  it('never coerces a non-JSON body — an HTML page stays data:null', () => {
    const parsed = normalizeResponse({
      status: 200,
      body: '<!doctype html><html><body>setup</body></html>',
      contentType: 'text/html; charset=UTF-8',
    });
    assert.equal(parsed.data, null);
    assert.equal(parsed.status, 200);
  });

  it('returns data:null for an empty body or a missing content type', () => {
    assert.equal(normalizeResponse({ status: 204, body: '', contentType: null }).data, null);
    assert.equal(normalizeResponse({ status: 200, body: '{"a":1}', contentType: null }).data, null);
    assert.equal(normalizeResponse({ status: 200, body: '   ', contentType: 'application/json' }).data, null);
  });

  it('raises PARSE rather than returning a half-read object', () => {
    assert.throws(
      () => normalizeResponse({ status: 200, body: '{"a":', contentType: 'application/json' }),
      (error) => error.kind === ApiErrorKind.PARSE && error.retryable === false,
    );
  });

  it('preserves JSON scalars without inventing a shape', () => {
    assert.equal(normalizeResponse({ status: 200, body: '0', contentType: 'application/json' }).data, 0);
    assert.equal(normalizeResponse({ status: 200, body: 'null', contentType: 'application/json' }).data, null);
    assert.equal(normalizeResponse({ status: 200, body: '"PKR"', contentType: 'application/json' }).data, 'PKR');
  });
});