/**
 * Relative URL construction and no-secret configuration tests. Task: O-01.3.
 * Synthetic inputs only. No network access. No real endpoint is called.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BASE_PATH_ENV_KEY,
  DEFAULT_API_BASE_PATH,
  DEFAULT_TIMEOUT_MS,
  ALLOWED_CREDENTIALS,
  assertNoSecrets,
  assertRelativeBasePath,
  assertSafeHeaders,
  buildApiUrl,
  buildQueryString,
  buildRequestHeaders,
  joinApiPath,
  readEnvBasePath,
  resolveApiConfig,
} from '../core/api/config.js';

const fakeFetch = () => {
  throw new Error('fakeFetch must never be called in configuration tests');
};

describe('assertRelativeBasePath — relative only', () => {
  it('accepts rooted relative paths and normalizes trailing slashes', () => {
    assert.equal(assertRelativeBasePath('/api'), '/api');
    assert.equal(assertRelativeBasePath('/api/'), '/api');
    assert.equal(assertRelativeBasePath('/api///'), '/api');
    assert.equal(assertRelativeBasePath('  /api/v1  '), '/api/v1');
  });

  it("normalizes '/' to an empty base so joined paths stay rooted", () => {
    assert.equal(assertRelativeBasePath('/'), '');
  });

  it('rejects every absolute or protocol-relative form', () => {
    const rejected = [
      'http://localhost:8080',
      'https://api.example.test',
      'HTTP://LOCALHOST',
      '//api.example.test',
      '//',
      'api',
      './api',
      '../api',
      'localhost:8080',
    ];
    for (const value of rejected) {
      assert.throws(
        () => assertRelativeBasePath(value),
        (error) => error.kind === 'config',
        `expected rejection for ${value}`,
      );
    }
  });

  it('rejects traversal, backslash, query, fragment, whitespace and empty input', () => {
    for (const value of ['/api/../admin', '/api\\admin', '/api?x=1', '/api#frag', '/api /v1', '', '   ']) {
      assert.throws(() => assertRelativeBasePath(value), (error) => error.kind === 'config');
    }
  });

  it('rejects non-string input', () => {
    for (const value of [null, undefined, 1, {}, [], true]) {
      assert.throws(() => assertRelativeBasePath(value), (error) => error.kind === 'config');
    }
  });

  it('never leaks a temporary or preview host, because such strings cannot be configured', () => {
    for (const value of [
      'http://127.0.0.1:8080',
      'https://preview-abc123.pages.dev',
      '//localhost',
    ]) {
      assert.throws(() => assertRelativeBasePath(value));
    }
  });
});

describe('readEnvBasePath — reads exactly one key', () => {
  it('defaults when the key is absent or blank', () => {
    assert.equal(readEnvBasePath({}), DEFAULT_API_BASE_PATH);
    assert.equal(readEnvBasePath({ [BASE_PATH_ENV_KEY]: '   ' }), DEFAULT_API_BASE_PATH);
    assert.equal(readEnvBasePath(null), DEFAULT_API_BASE_PATH);
  });

  it('uses the configured relative value', () => {
    assert.equal(readEnvBasePath({ [BASE_PATH_ENV_KEY]: '/backend/api' }), '/backend/api');
  });

  it('ignores every other environment variable', () => {
    const env = {
      ZEE_API_URL: 'https://elsewhere.example.test',
      API_BASE_URL: 'https://elsewhere.example.test',
      DB_PASSWORD: 'super-secret',
      JWT_SECRET: 'super-secret',
    };
    assert.equal(readEnvBasePath(env), DEFAULT_API_BASE_PATH);
  });

  it('rejects an absolute value coming from the environment', () => {
    assert.throws(
      () => readEnvBasePath({ [BASE_PATH_ENV_KEY]: 'https://api.example.test' }),
      (error) => error.kind === 'config',
    );
  });
});

describe('assertNoSecrets — credentials can never enter browser config', () => {
  it('rejects secret-like keys at any depth', () => {
    for (const key of [
      'apiKey',
      'api_key',
      'API-KEY',
      'token',
      'accessToken',
      'password',
      'passwd',
      'pwd',
      'clientSecret',
      'privateKey',
      'authorization',
      'sessionId',
      'cookie',
    ]) {
      assert.throws(
        () => assertNoSecrets({ [key]: 'x' }),
        (error) => error.kind === 'config',
        `expected rejection for key ${key}`,
      );
    }
  });

  it('exempts only "credentials", whose value is strictly validated elsewhere', () => {
    assert.doesNotThrow(() => assertNoSecrets({ credentials: 'same-origin' }));
    for (const value of ['include', 'cross-origin', 'Bearer abc']) {
      assert.throws(
        () => resolveApiConfig({ credentials: value }, { env: {}, fetchImpl: fakeFetch }),
        (error) => error.kind === 'config',
      );
    }
  });

  it('rejects nested occurrences', () => {
    assert.throws(() => assertNoSecrets({ a: { b: { c: { dbPassword: 'x' } } } }));
    assert.throws(() => assertNoSecrets({ list: [{ jwtToken: 'x' }] }));
  });

  it('accepts ordinary operational config', () => {
    assert.doesNotThrow(() =>
      assertNoSecrets({ basePath: '/api', timeoutMs: 5000, headers: { accept: 'application/json' } }),
    );
  });
});

describe('assertSafeHeaders', () => {
  it('normalizes names and returns a frozen copy', () => {
    const headers = assertSafeHeaders({ 'X-Request-Scope': '  school  ' });
    assert.deepEqual({ ...headers }, { 'x-request-scope': 'school' });
    assert.equal(Object.isFrozen(headers), true);
  });

  it('rejects credential-bearing header names', () => {
    for (const name of [
      'Authorization',
      'authorization',
      'Cookie',
      'Proxy-Authorization',
      'X-Api-Key',
      'X-Auth-Token',
      'X-CSRF-Token',
    ]) {
      assert.throws(() => assertSafeHeaders({ [name]: 'anything' }));
    }
  });

  it('rejects auth-scheme and token-like values', () => {
    assert.throws(() => assertSafeHeaders({ 'x-scope': 'Bearer abc' }));
    assert.throws(() => assertSafeHeaders({ 'x-scope': 'Basic abc' }));
    assert.throws(
      () => assertSafeHeaders({ 'x-scope': 'A'.repeat(64) }),
      (error) => error.kind === 'config',
    );
  });

  it('rejects invalid names, wrong value types and oversized values', () => {
    assert.throws(() => assertSafeHeaders({ 'bad header': 'x' }));
    assert.throws(() => assertSafeHeaders({ 'x-scope': { nested: true } }));
    assert.throws(() => assertSafeHeaders({ 'x-scope': 'v'.repeat(513) }));
    assert.throws(() => assertSafeHeaders(['a']));
  });

  it('accepts an ordinary JSON Accept header', () => {
    assert.doesNotThrow(() => assertSafeHeaders({ Accept: 'application/json' }));
  });
});

describe('joinApiPath / buildApiUrl', () => {
  it('always produces a rooted relative path', () => {
    assert.equal(joinApiPath('/api', '/health'), '/api/health');
    assert.equal(joinApiPath('/api', 'health'), '/api/health');
    assert.equal(joinApiPath('', '/health'), '/health');
    assert.equal(joinApiPath('/', 'health'), '/health');
    assert.equal(joinApiPath('/api/v1', 'students/list'), '/api/v1/students/list');
  });

  it('never doubles or drops slashes', () => {
    assert.equal(joinApiPath('/api/', '///health///'), '/api/health');
    assert.equal(joinApiPath('/api', '/'), '/api/');
    assert.equal(joinApiPath('', ''), '/');
  });

  it('percent-encodes path segments', () => {
    assert.equal(joinApiPath('/api', '/a b/c#d'), '/api/a%20b/c%23d');
  });

  it('rejects absolute, protocol-relative, traversing and query-bearing paths', () => {
    for (const path of [
      'https://elsewhere.example.test/health',
      'http://localhost:8080/health',
      '/../admin',
      '/a/../../b',
      '/health?x=1',
    ]) {
      assert.throws(() => joinApiPath('/api', path), (error) => error.kind === 'config');
    }
  });

  it('rejects a protocol-relative path when no base path would precede it', () => {
    assert.throws(() => joinApiPath('', '//elsewhere.example.test/health'));
    assert.throws(() => buildApiUrl('', '//elsewhere.example.test/health'));
  });

  it('builds a URL with a serialized query', () => {
    assert.equal(buildApiUrl('/api', '/health'), '/api/health');
    assert.equal(
      buildApiUrl('/api', '/students', { page: 2, per_page: 25 }),
      '/api/students?page=2&per_page=25',
    );
    assert.equal(buildApiUrl('', '/health'), '/health');
  });

  it('produces only relative URLs for every accepted input combination', () => {
    const bases = ['/', '', '/api', '/api/v1', '/backend/api'];
    const paths = ['/health', 'health', '/a/b/c'];
    for (const base of bases) {
      for (const path of paths) {
        const url = buildApiUrl(base, path);
        assert.ok(url.startsWith('/'), `${url} must start with /`);
        assert.ok(!url.startsWith('//'), `${url} must not be protocol-relative`);
        assert.ok(!/^[a-z][a-z0-9+.-]*:/i.test(url), `${url} must not be absolute`);
      }
    }
  });
});

describe('buildQueryString', () => {
  it('skips null and undefined, keeps false and 0', () => {
    assert.equal(buildQueryString({ a: 1, b: null, c: undefined, d: false, e: 0 }), 'a=1&d=false&e=0');
  });

  it('expands arrays into repeated keys', () => {
    assert.equal(buildQueryString({ status: ['paid', 'due'] }), 'status=paid&status=due');
  });

  it('encodes keys and values', () => {
    assert.equal(buildQueryString({ 'q name': 'a&b=c' }), 'q+name=a%26b%3Dc');
  });

  it('accepts URLSearchParams and rejects other types', () => {
    assert.equal(buildQueryString(new URLSearchParams({ a: '1' })), 'a=1');
    assert.equal(buildQueryString(null), '');
    assert.throws(() => buildQueryString(['a']), (error) => error.kind === 'config');
  });
});

describe('resolveApiConfig', () => {
  it('applies defaults', () => {
    const config = resolveApiConfig({}, { env: {}, fetchImpl: fakeFetch });
    assert.equal(config.basePath, DEFAULT_API_BASE_PATH);
    assert.equal(config.timeoutMs, DEFAULT_TIMEOUT_MS);
    assert.equal(config.credentials, 'same-origin');
    assert.equal(config.requestIdHeader, null);
    assert.equal(config.fetchImpl, fakeFetch);
    assert.equal(Object.isFrozen(config), true);
  });

  it('reads the base path from the injected environment', () => {
    const config = resolveApiConfig({}, { env: { [BASE_PATH_ENV_KEY]: '/api' }, fetchImpl: fakeFetch });
    assert.equal(config.basePath, '/api');
  });

  it('rejects unknown config keys so nothing can be smuggled in', () => {
    assert.throws(
      () => resolveApiConfig({ secretThing: 'x' }, { env: {}, fetchImpl: fakeFetch }),
      (error) => error.kind === 'config',
    );
    assert.throws(
      () => resolveApiConfig({ somethingElse: 1 }, { env: {}, fetchImpl: fakeFetch }),
      (error) => error.kind === 'config',
    );
  });

  it('refuses cross-origin credential sending', () => {
    for (const value of ['include', 'cross-origin', true, null]) {
      assert.throws(
        () => resolveApiConfig({ credentials: value }, { env: {}, fetchImpl: fakeFetch }),
        (error) => error.kind === 'config',
      );
    }
    for (const value of ALLOWED_CREDENTIALS) {
      assert.equal(resolveApiConfig({ credentials: value }, { env: {}, fetchImpl: fakeFetch }).credentials, value);
    }
  });

  it('validates timeout bounds', () => {
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, '5000']) {
      assert.throws(() => resolveApiConfig({ timeoutMs: value }, { env: {}, fetchImpl: fakeFetch }));
    }
    assert.throws(() => resolveApiConfig({ timeoutMs: 120001 }, { env: {}, fetchImpl: fakeFetch }));
    assert.equal(resolveApiConfig({ timeoutMs: 250 }, { env: {}, fetchImpl: fakeFetch }).timeoutMs, 250);
  });

  it('rejects secret-bearing headers and env payloads', () => {
    assert.throws(() =>
      resolveApiConfig({ headers: { Authorization: 'Bearer x' } }, { env: {}, fetchImpl: fakeFetch }),
    );
    assert.throws(() =>
      resolveApiConfig({}, { env: { ZEE_DB_PASSWORD: 'x' }, fetchImpl: fakeFetch }),
    );
  });

  it('validates the optional request-id header name', () => {
    assert.equal(
      resolveApiConfig({ requestIdHeader: 'X-Request-Id' }, { env: {}, fetchImpl: fakeFetch }).requestIdHeader,
      'X-Request-Id',
    );
    assert.throws(() =>
      resolveApiConfig({ requestIdHeader: 'Authorization' }, { env: {}, fetchImpl: fakeFetch }),
    );
    assert.throws(() =>
      resolveApiConfig({ requestIdHeader: 'bad header' }, { env: {}, fetchImpl: fakeFetch }),
    );
  });

  it('fails closed when no fetch implementation exists', () => {
    assert.throws(
      () => resolveApiConfig({}, { env: {}, globalScope: { fetch: undefined }, fetchImpl: undefined }),
      (error) => error.kind === 'config',
    );
  });
});

describe('buildRequestHeaders', () => {
  it('adds only Accept and Content-Type, plus caller-allowed extras', () => {
    assert.deepEqual({ ...buildRequestHeaders({}) }, { accept: 'application/json' });
    assert.deepEqual({ ...buildRequestHeaders({ hasBody: true }) }, {
      accept: 'application/json',
      'content-type': 'application/json',
    });
    assert.deepEqual({ ...buildRequestHeaders({ base: { 'x-scope': 'school' }, extra: { 'x-trace': 'abc' } }) }, {
      accept: 'application/json',
      'x-scope': 'school',
      'x-trace': 'abc',
    });
  });

  it('never emits an authorization or cookie header', () => {
    const headers = buildRequestHeaders({ base: { 'x-scope': 'school' }, extra: { accept: 'text/plain' } });
    for (const name of Object.keys(headers)) {
      assert.doesNotMatch(name, /authorization|cookie|token|secret/i);
    }
    assert.throws(() => buildRequestHeaders({ extra: { Cookie: 'session=abc' } }));
  });
});