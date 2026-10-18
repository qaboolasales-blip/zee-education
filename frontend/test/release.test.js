/**
 * Release configuration tests. Tasks: N-O-01, N-O-03.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  NON_PRODUCTION_ENV_VALUES,
  PENDING_RELEASE_CONTRACTS,
  RELEASE_AUTHORIZED,
  ReleaseReject,
  assertNoInventedReleaseSchemas,
  assertProductionConfig,
  assertReleaseShareBoundary,
  describeReleaseBlock,
  productionReadiness,
} from '../core/release/index.js';

describe('N-O-01 — a production build uses relative endpoints', () => {
  it('accepts a default production configuration', () => {
    const readiness = productionReadiness({}, {});
    assert.equal(readiness.ready, true);
    assert.equal(readiness.basePath, '/api');
    assert.deepEqual([...readiness.reasons], []);
    assert.equal(assertProductionConfig({}, {}).ready, true);
    assert.equal(assertProductionConfig({}, {}).basePath, '/api');
  });

  it('rejects an absolute base path', () => {
    const readiness = productionReadiness({ basePath: 'http://api.example.com' }, {});
    assert.equal(readiness.ready, false);
    assert.ok(readiness.reasons.includes(ReleaseReject.ABSOLUTE_BASE_PATH));
    assert.throws(() => assertProductionConfig({ basePath: 'http://api.example.com' }, {}));
  });

  it('rejects a protocol-relative base path', () => {
    const readiness = productionReadiness({ basePath: '//api.example.com' }, {});
    assert.equal(readiness.ready, false);
    assert.ok(readiness.reasons.includes(ReleaseReject.ABSOLUTE_BASE_PATH));
  });

  it('rejects a non-production environment', () => {
    const readiness = productionReadiness({}, { NODE_ENV: 'development' });
    assert.equal(readiness.ready, false);
    assert.ok(readiness.reasons.includes(ReleaseReject.NON_PRODUCTION_ENV));
    assert.equal(productionReadiness({}, { NODE_ENV: 'production' }).ready, true);
    assert.equal(productionReadiness({}, { NODE_ENV: 'staging' }).ready, false);
  });

  it('rejects a debug flag and an unknown config key', () => {
    assert.ok(productionReadiness({ debug: true }, {}).reasons.includes(ReleaseReject.DEBUG_FLAG));
    assert.ok(
      productionReadiness({ basePath: '/api', apiSecret: 'x' }, {}).reasons.includes(
        ReleaseReject.UNKNOWN_CONFIG_KEY,
      ),
    );
  });

  it('rejects a disallowed credentials mode', () => {
    assert.ok(
      productionReadiness({ credentials: 'include' }, {}).reasons.includes(
        ReleaseReject.CREDENTIALS_NOT_ALLOWED,
      ),
    );
    assert.equal(productionReadiness({ credentials: 'omit' }, {}).ready, true);
  });

  it('rejects an absolute base path supplied through the environment', () => {
    const readiness = productionReadiness({}, { ZEE_API_BASE_PATH: 'https://dev.example.com' });
    assert.ok(readiness.reasons.includes(ReleaseReject.ABSOLUTE_BASE_PATH));
  });

  it('refuses a non-object configuration', () => {
    for (const bad of [null, undefined, 'x', 42, []]) {
      const readiness = productionReadiness(bad, {});
      assert.equal(readiness.ready, false, JSON.stringify(bad));
      assert.ok(readiness.reasons.includes(ReleaseReject.NOT_AN_OBJECT), JSON.stringify(bad));
    }
  });

  it('keeps the non-production value list closed', () => {
    assert.deepEqual(
      [...NON_PRODUCTION_ENV_VALUES],
      ['development', 'dev', 'localhost', 'staging', 'stg', 'test', 'local', 'debug'],
    );
  });
});

describe('N-O-03 — the manual share boundary still holds in a release build', () => {
  it('accepts a user-initiated PDF download from an approved trigger', () => {
    const result = assertReleaseShareBoundary({
      triggerId: 'TRG-01',
      kind: 'pdf-download',
      userInitiated: true,
      mediaType: 'application/pdf',
      documentRef: 'INV-1024',
    });
    assert.equal(result.allowed, true);
  });

  it('refuses a share the code initiated', () => {
    const result = assertReleaseShareBoundary({
      triggerId: 'TRG-01',
      kind: 'pdf-download',
      userInitiated: false,
    });
    assert.equal(result.allowed, false);
  });

  it('refuses a share that names a destination', () => {
    const result = assertReleaseShareBoundary({
      triggerId: 'TRG-01',
      kind: 'pdf-download',
      userInitiated: true,
      destination: 'whatsapp',
    });
    assert.equal(result.allowed, false);
  });

  it('refuses an unknown trigger', () => {
    const result = assertReleaseShareBoundary({
      triggerId: 'TRG-99',
      kind: 'pdf-download',
      userInitiated: true,
    });
    assert.equal(result.allowed, false);
  });
});

describe('no invented release contract', () => {
  it('confirms nothing is authorized', () => {
    assert.equal(RELEASE_AUTHORIZED, false);
    assert.equal(describeReleaseBlock().schemaPublished, false);
  });

  it('covers the pilot capabilities', () => {
    assert.deepEqual(
      PENDING_RELEASE_CONTRACTS.map((c) => c.id),
      ['pilot-ui-comparison', 'pilot-pdf-sharing'],
    );
  });

  it('declares no endpoint or payload and fails closed otherwise', () => {
    assert.equal(assertNoInventedReleaseSchemas(), true);
    const base = {
      id: 'pilot-ui-comparison',
      status: 'blocked-not-contracted',
      method: null,
      path: null,
      requestSchema: null,
      responseSchema: null,
      implemented: false,
    };
    assert.throws(() => assertNoInventedReleaseSchemas([{ ...base, path: '/deploy' }]));
    assert.throws(() => assertNoInventedReleaseSchemas([{ ...base, implemented: true }]));
  });
});
