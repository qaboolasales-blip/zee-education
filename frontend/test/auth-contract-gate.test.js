/**
 * Auth contract gate. Tasks: B-O-01, B-O-02, B-O-03.
 *
 * These tests make the block self-enforcing and prove that B-O-02/B-O-03 were
 * not quietly implemented:
 *   - no auth contract document exists (the recorded B-O-01 block);
 *   - no auth contract entry carries an invented endpoint or payload;
 *   - no session storage / token handling exists anywhere in `core/`;
 *   - the API client sends no credential and has no refresh behaviour.
 *
 * If KiloCode publishes the real contract, these tests are expected to fail
 * deliberately, prompting an update of `core/auth/contracts/pending-auth-contract.js`.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  AUTH_INTEGRATION_AUTHORIZED,
  AuthContractStatus,
  AUTH_CONTRACT_DOC_EXISTS,
  AUTH_CONTRACT_DOC_STATUS,
  AUTH_CONTRACT_DOC_VERSION,
  EXPECTED_AUTH_CONTRACT_DOC,
  PENDING_AUTH_CONTRACTS,
  PUBLISHED_AUTH_POLICY,
  SOURCE_OBSERVATIONS,
  assertNoInventedAuthSchemas,
  describeAuthBlock,
  findPendingAuthContract,
} from '../core/auth/contracts/pending-auth-contract.js';
import { createApiClient } from '../core/api/client.js';
import { listSourceFiles, readCode } from './helpers/source-scan.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const CORE_DIR = resolve(HERE, '..', 'core');

describe('B-O-01 — published auth contract state', () => {
  it('has a published contract document', () => {
    // Batch A recorded the ABSENCE of this document. It now exists; asserting
    // absence again would be asserting a falsehood.
    assert.equal(existsSync(resolve(REPO_ROOT, 'backend', 'docs', 'api', 'openapi-v0.md')), true);
    assert.equal(AUTH_CONTRACT_DOC_EXISTS, true);
    assert.equal(AUTH_CONTRACT_DOC_VERSION, '0.1.0');
    assert.equal(AUTH_CONTRACT_DOC_STATUS, 'DRAFT — Batch A baseline');
  });

  it('still publishes no authentication endpoint', () => {
    const doc = readFileSync(
      resolve(REPO_ROOT, 'backend', 'docs', 'api', 'openapi-v0.md'),
      'utf8',
    );

    // Only these three endpoints are documented.
    const documented = [...doc.matchAll(/^###\s+(GET|POST|PUT|PATCH|DELETE)\s+(\S+)/gm)].map((m) => `${m[1]} ${m[2]}`);
    assert.deepEqual(documented, ['GET /health', 'GET /setup']);

    // No auth endpoint is specified, only a forward-looking policy section.
    assert.equal(/#+\s*(GET|POST)\s+\/.*(login|logout|auth|session|token|refresh|sign)/i.test(doc), false);
    assert.match(doc, /All future authenticated endpoints will require/i);
    assert.match(doc, /Valid session or token/);
  });

  it('transcribes the contract policy without inventing a credential scheme', () => {
    assert.equal(PUBLISHED_AUTH_POLICY.credentialScheme, null);
    assert.deepEqual([...PUBLISHED_AUTH_POLICY.authenticatedEndpointRequirements], [
      'Valid session or token',
      'Server-side tenant resolution',
      'Explicit CORS allowlist match (never wildcard)',
    ]);
    assert.equal(PUBLISHED_AUTH_POLICY.errorSemantics[401], 'Unauthenticated');
    assert.equal(PUBLISHED_AUTH_POLICY.errorSemantics[403], 'Forbidden — valid auth but insufficient scope');
  });

  it('has no backend auth implementation', () => {
    // Inspect the declared route PATH only, so unrelated words in a controller
    // name (e.g. "Home") cannot produce a false positive.
    const routes = readFileSync(resolve(REPO_ROOT, 'backend', 'app', 'Config', 'Routes.php'), 'utf8');
    const declaredPaths = [...routes.matchAll(/\$routes->\w+\(\s*'([^']*)'/g)].map((m) => m[1]);
    assert.deepEqual(declaredPaths, ['health', 'setup', '/']);
    for (const path of declaredPaths) {
      assert.equal(
        /login|logout|session|token|auth|refresh|sign|^me$/i.test(path),
        false,
        `an auth route "${path}" now exists; update the contract record`,
      );
    }

    const controllers = readdirSync(resolve(REPO_ROOT, 'backend', 'app', 'Controllers')).join(' ');
    assert.doesNotMatch(controllers, /auth|login|session|token|user|role|permission/i);
    assert.match(controllers, /Health|Home|Setup/);
  });

  it('has no user, role, permission or session table', () => {
    const migrationsDir = resolve(REPO_ROOT, 'backend', 'app', 'Database', 'Migrations');
    const names = readdirSync(migrationsDir).join(' ');
    assert.doesNotMatch(names, /user|role|permission|session|token|account/i);
    assert.match(names, /schools|school_domains/);
  });

  it('names the document KiloCode publishes the contract in', () => {
    assert.equal(EXPECTED_AUTH_CONTRACT_DOC, 'backend/docs/api/openapi-v0.md');
  });
});

describe('B-O-03 — no invented auth contract', () => {
  it('covers the five auth capabilities the packet implies', () => {
    assert.deepEqual(
      PENDING_AUTH_CONTRACTS.map((contract) => contract.id).sort(),
      ['current-identity', 'login', 'logout', 'refresh', 'role-permissions'],
    );
  });

  it('declares no endpoint, method or payload for any capability', () => {
    assert.equal(assertNoInventedAuthSchemas(), true);
    for (const contract of PENDING_AUTH_CONTRACTS) {
      assert.equal(contract.method, null);
      assert.equal(contract.path, null);
      assert.equal(contract.requestSchema, null);
      assert.equal(contract.responseSchema, null);
      assert.equal(contract.implemented, false);
      assert.notEqual(contract.status, AuthContractStatus.PUBLISHED);
    }
  });

  it('does not authorize auth integration', () => {
    assert.equal(AUTH_INTEGRATION_AUTHORIZED, false);
  });

  it('fails closed if a schema or implementation claim is introduced', () => {
    const base = {
      id: 'login',
      status: AuthContractStatus.BLOCKED_NO_IMPLEMENTATION,
      method: null,
      path: null,
      requestSchema: null,
      responseSchema: null,
      implemented: false,
    };
    assert.throws(() => assertNoInventedAuthSchemas([{ ...base, path: '/api/login' }]));
    assert.throws(() => assertNoInventedAuthSchemas([{ ...base, method: 'POST' }]));
    assert.throws(() => assertNoInventedAuthSchemas([{ ...base, requestSchema: { username: 'string' } }]));
    assert.throws(() => assertNoInventedAuthSchemas([{ ...base, responseSchema: { token: 'string' } }]));
    assert.throws(() => assertNoInventedAuthSchemas([{ ...base, implemented: true }]));
    assert.throws(() => assertNoInventedAuthSchemas([{ ...base, status: AuthContractStatus.PUBLISHED }]));
    assert.doesNotThrow(() => assertNoInventedAuthSchemas([base]));
  });

  it('records source observations as non-contracts', () => {
    assert.ok(SOURCE_OBSERVATIONS.length > 0);
    for (const observation of SOURCE_OBSERVATIONS) {
      assert.equal(observation.contract, false);
      assert.ok(observation.observation.length > 0);
    }
  });

  it('summarizes the block without leaking payload detail', () => {
    const summary = describeAuthBlock();
    // The contract document now exists — but it still covers no authentication.
    assert.equal(summary.exists, true);
    assert.equal(summary.contractCoversAuthentication, false);
    assert.equal(summary.backendAuthImplementationPresent, false);
    assert.equal(summary.authIntegrationAuthorized, false);
    assert.equal(summary.capabilities.length, 5);
    const serialized = JSON.stringify(summary);
    assert.doesNotMatch(serialized, /requestSchema|responseSchema|"token"|password/i);
  });

  it('looks capabilities up by id', () => {
    assert.equal(findPendingAuthContract('login').id, 'login');
    assert.equal(findPendingAuthContract('nonexistent'), null);
  });

  it('is deeply frozen', () => {
    for (const contract of PENDING_AUTH_CONTRACTS) {
      assert.equal(Object.isFrozen(contract), true);
    }
    assert.throws(() => {
      'use strict';
      PENDING_AUTH_CONTRACTS[0].implemented = true;
    });
  });
});

describe('B-O-02 — no session storage or token handling anywhere in core/', () => {
  const files = listSourceFiles(CORE_DIR);
  const rel = (file) => file.replace(`${REPO_ROOT}\\`, '').replace(/\//g, '\\');

  /**
   * Files that legitimately contain credential NAMES, because they are the
   * guards that forbid them (a denylist has to name what it denies).
   * These are exempt from the name-based patterns only — never from the
   * storage or logging patterns below.
   */
  const DENYLIST_DECLARERS = new Set([
    'frontend\\core\\api\\config.js',
    'frontend\\core\\auth\\contracts\\pending-auth-contract.js',
  ]);

  /**
   * Unambiguous bans: these can never legitimately appear anywhere, not even in
   * a denylist, and never in prose that is being executed as a string.
   */
  const absolutePatterns = [
    { label: 'localStorage', pattern: /\blocalStorage\b/ },
    { label: 'sessionStorage', pattern: /\bsessionStorage\b/ },
    { label: 'IndexedDB', pattern: /\bindexedDB\b/ },
    { label: 'document.cookie', pattern: /document\s*\.\s*cookie/ },
    { label: 'cookieStore', pattern: /\bcookieStore\b/ },
    { label: 'console output', pattern: /console\s*\./ },
  ];

  /**
   * Name-based bans: a credential name must never be *used*, only *named* by a
   * denylist. Scanned everywhere except the guard files themselves.
   */
  const namePatterns = [
    { label: 'Authorization header', pattern: /\bAuthorization\b/ },
    { label: 'Bearer scheme', pattern: /\bBearer\b/ },
    { label: 'Basic scheme', pattern: /\bBasic\s+[A-Za-z0-9]/ },
    { label: 'access_token', pattern: /access[_-]?token/i },
    { label: 'refresh_token', pattern: /refresh[_-]?token/i },
    { label: 'jwt', pattern: /\bjwt\b/i },
  ];

  it('scans every module of the core tree', () => {
    assert.ok(files.length >= 14, `expected the core tree to be scanned, got ${files.length}`);
    const names = files.map(rel);
    for (const required of [
      'frontend\\core\\api\\client.js',
      'frontend\\core\\api\\config.js',
      'frontend\\core\\api\\errors.js',
      'frontend\\core\\auth\\role-guard.js',
      'frontend\\core\\auth\\screen-registry.js',
      'frontend\\core\\auth\\session-state.js',
      'frontend\\core\\auth\\contracts\\pending-auth-contract.js',
      'frontend\\core\\format\\money.js',
    ]) {
      assert.ok(names.includes(required), `${required} must be covered by the scan`);
    }
  });

  for (const { label, pattern } of absolutePatterns) {
    it(`contains no ${label} in any module`, () => {
      const offenders = files.filter((file) => pattern.test(readCode(file))).map(rel);
      assert.deepEqual(offenders, [], `${label} must not appear in executable code under frontend/core`);
    });
  }

  for (const { label, pattern } of namePatterns) {
    it(`uses ${label} nowhere, only names it in a denylist`, () => {
      const offenders = files
        .filter((file) => !DENYLIST_DECLARERS.has(rel(file)))
        .filter((file) => pattern.test(readCode(file)))
        .map(rel);
      assert.deepEqual(offenders, [], `${label} must not be used outside its own denylist`);
    });
  }

  it('confirms the exempt files really are only denylist declarations', () => {
    for (const guardFile of DENYLIST_DECLARERS) {
      const absolute = absolutePatterns.filter(({ pattern }) =>
        pattern.test(readCode(resolve(REPO_ROOT, guardFile))),
      );
      assert.deepEqual(
        absolute.map((entry) => entry.label),
        [],
        `${guardFile} must still respect the absolute bans`,
      );
    }
  });

  it('has no refresh or login request implementation', () => {
    const offenders = files
      .filter((file) =>
        /\.(post|get)\(\s*['"`][^'"`]*(login|logout|refresh|signin|sign-in|token)/i.test(readCode(file)),
      )
      .map(rel);
    assert.deepEqual(offenders, []);
  });
});

describe('B-O-03 — the API client carries no credential and no refresh behaviour', () => {
  function fakeFetch() {
    throw new Error('fakeFetch must not be called in gate tests');
  }

  it('sends no Authorization, Cookie or token header', async () => {
    let captured = null;
    const api = createApiClient({ basePath: '/api' }, {
      env: {},
      fetchImpl: async (url, init) => {
        captured = { url, init };
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          text: async () => '{}',
        };
      },
    });

    await api.post('/anything', { json: { a: 1 } });

    const headerNames = Object.keys(captured.init.headers);
    for (const name of headerNames) {
      assert.doesNotMatch(name, /authorization|cookie|token|secret|api-key/i, name);
    }
    assert.deepEqual([...headerNames].sort(), ['accept', 'content-type']);
    assert.equal(captured.init.credentials, 'same-origin');
  });

  it('exposes no refresh, login or logout method', () => {
    const api = createApiClient({ basePath: '/api' }, { env: {}, fetchImpl: fakeFetch });
    assert.deepEqual(Object.keys(api).sort(), [
      'basePath',
      'buildUrl',
      'credentials',
      'get',
      'post',
      'request',
      'timeoutMs',
    ]);
    for (const forbidden of ['refresh', 'login', 'logout', 'setToken', 'withAuth']) {
      assert.equal(api[forbidden], undefined, forbidden);
    }
  });

  it('does not retry a 401 automatically', async () => {
    let calls = 0;
    const api = createApiClient({ basePath: '/api' }, {
      env: {},
      fetchImpl: async () => {
        calls += 1;
        return {
          ok: false,
          status: 401,
          headers: { get: () => null },
          text: async () => '',
        };
      },
    });

    await assert.rejects(() => api.get('/anything'), (error) => error.kind === 'http' && error.status === 401);
    assert.equal(calls, 1, 'a 401 must not trigger an automatic retry');
  });
});