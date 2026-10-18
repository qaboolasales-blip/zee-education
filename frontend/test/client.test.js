/**
 * API client transport tests. Task: O-01.3.
 *
 * Every response here is SYNTHETIC and produced by an injected `fetchImpl`
 * stub. No backend endpoint is contacted and no network call leaves the
 * process. This proves transport behaviour only — it does NOT prove live
 * integration (none exists yet; see docs/backend-contract-dependency.md).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createApiClient } from '../core/api/client.js';
import { ApiErrorKind } from '../core/api/errors.js';

function jsonResponse(body, { status = 200, contentType = 'application/json' } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => text,
  };
}

function htmlResponse(body = '<!doctype html><html></html>', { status = 200 } = {}) {
  return jsonResponse(body, { status, contentType: 'text/html; charset=UTF-8' });
}

function recordingFetch(response, { delayMs = 0, rejectWith = null } = {}) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    if (rejectWith) throw rejectWith;

    if (delayMs > 0) {
      // Honour the abort signal exactly like a real transport does.
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, delayMs);
        const signal = init?.signal;
        if (signal) {
          if (signal.aborted) {
            clearTimeout(timer);
            reject(abortError());
            return;
          }
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              reject(abortError());
            },
            { once: true },
          );
        }
      });
    }

    return typeof response === 'function' ? response(url, init) : response;
  };
  impl.calls = calls;
  return impl;
}

function abortError() {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

function client(fetchImpl, config = {}) {
  return createApiClient(config, { env: {}, fetchImpl });
}

describe('URL construction through the client', () => {
  it('requests only relative, same-origin paths', async () => {
    const fetchImpl = recordingFetch(jsonResponse({ ok: true }));
    const api = client(fetchImpl, { basePath: '/api' });
    await api.get('/health');
    assert.equal(fetchImpl.calls[0].url, '/api/health');

    await api.get('/students', { query: { page: 2, per_page: 25 } });
    assert.equal(fetchImpl.calls[1].url, '/api/students?page=2&per_page=25');
  });

  it('sends no cookies cross-origin and no Authorization header by default', async () => {
    const fetchImpl = recordingFetch(jsonResponse({}));
    await client(fetchImpl, { basePath: '/api' }).get('/health');
    const { init } = fetchImpl.calls[0];
    assert.equal(init.credentials, 'same-origin');
    assert.equal('headers' in init && 'authorization' in init.headers, false);
    assert.equal(init.headers.accept, 'application/json');
    assert.equal(init.headers.Authorization, undefined);
  });

it('rejects any attempt to escape the relative base', async () => {
    const fetchImpl = recordingFetch(jsonResponse({ ok: true }));
    const api = client(fetchImpl, { basePath: '/api' });
    for (const path of ['https://elsewhere.example.test/health', 'http://localhost:8080/health', '/../admin']) {
      await assert.rejects(() => api.get(path), (error) => error.kind === ApiErrorKind.CONFIG);
    }
    assert.equal(fetchImpl.calls.length, 0);
  });

  it('keeps a protocol-relative path same-origin when a base path precedes it', async () => {
    const fetchImpl = recordingFetch(jsonResponse({ ok: true }));
    await client(fetchImpl, { basePath: '/api' }).get('//elsewhere.example.test/health');
    const url = fetchImpl.calls[0].url;
    assert.equal(url, '/api/elsewhere.example.test/health');
    assert.ok(url.startsWith('/') && !url.startsWith('//'));
  });

  it('buildUrl does not perform a request', () => {
    const fetchImpl = recordingFetch(jsonResponse({}));
    const api = client(fetchImpl, { basePath: '/api/v1' });
    assert.equal(api.buildUrl('/health'), '/api/v1/health');
    assert.equal(fetchImpl.calls.length, 0);
  });
});

describe('response handling', () => {
  it('returns a normalized envelope for a JSON response', async () => {
    const api = client(recordingFetch(jsonResponse({ status: 'ok', version: '0.1.0' })));
    const result = await api.get('/health');
    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.deepEqual(result.data, { status: 'ok', version: '0.1.0' });
    assert.match(result.contentType, /application\/json/);
  });

  it('returns data:null for an HTML response instead of coercing it', async () => {
    const api = client(recordingFetch(htmlResponse()));
    const result = await api.get('/setup');
    assert.equal(result.data, null);
    assert.match(result.contentType, /text\/html/);
  });

  it('raises PARSE for a truncated JSON body', async () => {
    const api = client(recordingFetch(jsonResponse('{"a":')));
    await assert.rejects(() => api.get('/health'), (error) => error.kind === ApiErrorKind.PARSE);
  });

  it('surfaces an HTTP error with status and retryability, and never the body', async () => {
    const api = client(recordingFetch(jsonResponse('db password=supersecret', { status: 500 })));
    await assert.rejects(
      () => api.get('/health'),
      (error) => {
        assert.equal(error.kind, ApiErrorKind.HTTP);
        assert.equal(error.status, 500);
        assert.equal(error.retryable, true);
        assert.equal(error.message, 'Request failed with HTTP status 500.');
        assert.equal(JSON.stringify(error).includes('supersecret'), false);
        return true;
      },
    );
  });

  it('marks 401/403/404 as non-retryable', async () => {
    for (const status of [401, 403, 404]) {
      const api = client(recordingFetch(jsonResponse({}, { status })));
      await assert.rejects(
        () => api.get('/health'),
        (error) => error.kind === ApiErrorKind.HTTP && error.retryable === false,
      );
    }
  });

  it('does not read the body of a failed response', async () => {
    let bodyRead = false;
    const response = {
      ok: false,
      status: 403,
      headers: { get: () => null },
      text: async () => {
        bodyRead = true;
        return '{"secret":"x"}';
      },
    };
    const api = client(recordingFetch(response));
    await assert.rejects(() => api.get('/health'));
    assert.equal(bodyRead, false);
  });

  it('extracts a sanitized request id only when a header is configured', async () => {
    const withHeader = (id) => ({
      ok: true,
      status: 200,
      headers: {
        get: (name) => {
          const key = name.toLowerCase();
          if (key === 'content-type') return 'application/json';
          if (key === 'x-request-id') return id;
          return null;
        },
      },
      text: async () => '{}',
    });

    const plain = await client(recordingFetch(withHeader('abc-123'))).get('/health');
    assert.equal(plain.requestId, null);

    const tracked = await client(recordingFetch(withHeader('abc-123')), {
      requestIdHeader: 'X-Request-Id',
    }).get('/health');
    assert.equal(tracked.requestId, 'abc-123');

    const dirty = await client(recordingFetch(withHeader('bad id with spaces')), {
      requestIdHeader: 'X-Request-Id',
    }).get('/health');
    assert.equal(dirty.requestId, null);
  });
});

describe('error paths', () => {
  it('maps a transport failure to a NETWORK error', async () => {
    const api = client(recordingFetch(null, { rejectWith: new TypeError('Failed to fetch') }));
    await assert.rejects(
      () => api.get('/health'),
      (error) => error.kind === ApiErrorKind.NETWORK && error.retryable === true,
    );
  });

  it('aborts and raises TIMEOUT when the request exceeds timeoutMs', async () => {
    const api = client(recordingFetch(jsonResponse({}), { delayMs: 60 }), { timeoutMs: 10 });
    await assert.rejects(
      () => api.get('/health'),
      (error) => error.kind === ApiErrorKind.TIMEOUT && error.retryable === true,
    );
  });

  it('honours a caller-supplied abort signal', async () => {
    const controller = new AbortController();
    const api = client(recordingFetch(jsonResponse({}), { delayMs: 60 }), { timeoutMs: 5000 });
    const promise = api.get('/health', { signal: controller.signal });
    controller.abort();
    await assert.rejects(
      () => promise,
      (error) => error.kind === ApiErrorKind.ABORT,
    );
  });

  it('rejects an unusable verb and a non-object config', async () => {
    const api = client(recordingFetch(jsonResponse({})));
    await assert.rejects(() => api.request('TRACE', '/health'), (error) => error.kind === ApiErrorKind.CONFIG);
    assert.throws(
      () => createApiClient('https://elsewhere.example.test', { env: {} }),
      (error) => error.kind === ApiErrorKind.CONFIG,
    );
  });

  it('rejects a response that is not a Response-like object', async () => {
    const api = client(recordingFetch({ nope: true }));
    await assert.rejects(() => api.get('/health'), (error) => error.kind === ApiErrorKind.NETWORK);
  });
});

describe('request body handling', () => {
  it('JSON-encodes a body and sets the content type', async () => {
    const fetchImpl = recordingFetch(jsonResponse({ ok: true }));
    await client(fetchImpl, { basePath: '/api' }).post('/setup', { json: { a: 1 } });
    const { init } = fetchImpl.calls[0];
    assert.equal(init.method, 'POST');
    assert.equal(init.body, '{"a":1}');
    assert.equal(init.headers['content-type'], 'application/json');
  });

  it('sends no body and no content-type when no json option is given', async () => {
    const fetchImpl = recordingFetch(jsonResponse({}));
    await client(fetchImpl).post('/setup');
    const { init } = fetchImpl.calls[0];
    assert.equal('body' in init, false);
    assert.equal(init.headers['content-type'], undefined);
  });

  it('rejects credential-bearing per-request headers', async () => {
    const api = client(recordingFetch(jsonResponse({})));
    await assert.rejects(
      () => api.get('/health', { headers: { Authorization: 'Bearer abc' } }),
      (error) => error.kind === ApiErrorKind.CONFIG,
    );
  });
});

describe('frozen surface', () => {
  it('exposes a frozen client with no secret-bearing property', () => {
    const api = client(recordingFetch(jsonResponse({})), { basePath: '/api' });
    assert.equal(Object.isFrozen(api), true);
    for (const key of Object.keys(api)) {
      assert.doesNotMatch(key, /token|secret|password|apikey|api_key|authorization|cookie/i);
    }
    assert.deepEqual(Object.keys(api).sort(), [
      'basePath',
      'buildUrl',
      'credentials',
      'get',
      'post',
      'request',
      'timeoutMs',
    ]);
  });
});