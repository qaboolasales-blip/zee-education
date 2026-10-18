/**
 * KiloCode Batch A contract-registry tests. Tasks: O-01.3 / O-01.4.
 *
 * STATE CHANGE: during Batch A no contract document existed and these tests
 * asserted its ABSENCE. KiloCode has since published
 * `backend/docs/api/openapi-v0.md` (v0.1.0, DRAFT). The registry now models
 * `/health` strictly from that document and keeps `/setup` unmodelled because
 * the contract confirms it is HTML, not JSON.
 *
 * These tests fail deliberately if the contract changes, so the transcription
 * can never silently drift away from the source document.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  BATCH_A_CONTRACTS,
  CONTRACT_DOC_STATUS,
  CONTRACT_DOC_VERSION,
  ContractStatus,
  EXPECTED_CONTRACT_DOC,
  HEALTH_ALLOWED_KEYS,
  HEALTH_DATABASE_VALUES,
  HEALTH_RESPONSE_SCHEMA,
  HEALTH_STATUS_VALUES,
  LIVE_BINDING_AUTHORIZED,
  PENDING_CONTRACTS,
  PUBLISHED_ERROR_STATUS,
  PUBLISHED_FUTURE_CONVENTIONS,
  assertHealthSchemaMatchesContract,
  assertNoInventedSchemas,
  describeContractBlock,
  findContract,
} from '../core/api/contracts/pending-contracts.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTRACT_PATH = resolve(REPO_ROOT, 'backend', 'docs', 'api', 'openapi-v0.md');

describe('backend contract publication state', () => {
  it('has the published contract document', () => {
    assert.equal(existsSync(CONTRACT_PATH), true);
    assert.equal(existsSync(resolve(REPO_ROOT, 'backend', 'docs')), true);
  });

  it('records the document version and status', () => {
    assert.equal(CONTRACT_DOC_VERSION, '0.1.0');
    assert.match(CONTRACT_DOC_STATUS, /^DRAFT/);
    assert.equal(EXPECTED_CONTRACT_DOC, 'backend/docs/api/openapi-v0.md');
  });
});

describe('registry shape', () => {
  it('covers exactly the two Batch A endpoints named in the packet', () => {
    assert.deepEqual(
      BATCH_A_CONTRACTS.map((contract) => `${contract.method} ${contract.path}`).sort(),
      ['GET /health', 'GET /setup'],
    );
    assert.equal(PENDING_CONTRACTS, BATCH_A_CONTRACTS);
  });

  it('is deeply frozen', () => {
    for (const contract of BATCH_A_CONTRACTS) {
      assert.equal(Object.isFrozen(contract), true);
    }
    assert.throws(() => {
      'use strict';
      BATCH_A_CONTRACTS[0].status = 'blocked';
    });
  });

  it('looks contracts up by id', () => {
    assert.equal(findContract('health').path, '/health');
    assert.equal(findContract('setup').path, '/setup');
    assert.equal(findContract('students'), null);
  });
});

describe('GET /health — transcribed from the published contract', () => {
  it('is marked published and modelled', () => {
    const health = findContract('health');
    assert.equal(health.status, ContractStatus.PUBLISHED);
    assert.notEqual(health.responseSchema, null);
    assert.equal(health.requestSchema, null, 'GET /health defines no request payload');
  });

  it('keeps the schema key list identical to the contract', () => {
    assert.equal(assertHealthSchemaMatchesContract(), true);
    assert.deepEqual([...HEALTH_ALLOWED_KEYS], [
      'status',
      'app',
      'plane',
      'environment',
      'version',
      'milestone',
      'database',
      'time',
      'timezone',
      'currency',
    ]);
  });

  it('matches the allowed-keys sentence in the contract document itself', () => {
    const doc = readFileSync(CONTRACT_PATH, 'utf8');
    const sentence = doc
      .split('\n')
      .find((line) => line.includes('Allowed keys only'));
    assert.ok(sentence, 'the contract must still state an allowed-keys list');

    const declared = [...sentence.matchAll(/`([a-z]+)`/g)].map((m) => m[1]);
    assert.deepEqual(declared, [...HEALTH_ALLOWED_KEYS]);
  });

  it('carries no key the contract does not declare', () => {
    const doc = readFileSync(CONTRACT_PATH, 'utf8');
    for (const key of HEALTH_ALLOWED_KEYS) {
      assert.ok(doc.includes(`\`${key}\``), `${key} must appear in the contract`);
    }
    assert.equal(Object.isFrozen(HEALTH_RESPONSE_SCHEMA), true);
  });

  it('keeps the published enum values', () => {
    const doc = readFileSync(CONTRACT_PATH, 'utf8');
    assert.deepEqual([...HEALTH_STATUS_VALUES], ['ok', 'degraded']);
    assert.deepEqual([...HEALTH_DATABASE_VALUES], ['connected', 'unreachable', 'not_configured']);
    for (const value of [...HEALTH_STATUS_VALUES, ...HEALTH_DATABASE_VALUES]) {
      assert.ok(doc.includes(`\`${value}\``), `${value} must appear in the contract`);
    }
  });
});

describe('GET /setup — contract-confirmed as not a JSON API', () => {
  it('stays unmodelled, and says why', () => {
    const setup = findContract('setup');
    assert.equal(setup.status, ContractStatus.BLOCKED_NOT_JSON);
    assert.equal(setup.responseSchema, null);
    assert.equal(setup.requestSchema, null);
    assert.match(setup.sourceObservation, /text\/html/);
  });

  it('matches what the contract actually documents', () => {
    const doc = readFileSync(CONTRACT_PATH, 'utf8');
    assert.match(doc, /### GET \/setup/);
    assert.match(doc, /Content-Type:\*\* `text\/html; charset=UTF-8`/);
  });
});

describe('published error status table', () => {
  it('matches the contract document exactly', () => {
    assert.deepEqual(
      Object.keys(PUBLISHED_ERROR_STATUS).map(Number).sort((a, b) => a - b),
      [400, 401, 403, 404, 429, 500],
    );
    const doc = readFileSync(CONTRACT_PATH, 'utf8');
    for (const [code, meaning] of Object.entries(PUBLISHED_ERROR_STATUS)) {
      assert.ok(
        doc.includes(`| ${code} | ${meaning} |`),
        `status ${code} must appear verbatim in the contract`,
      );
    }
  });

  it('agrees with the auth policy view of 401 and 403', async () => {
    const { PUBLISHED_AUTH_POLICY } = await import('../core/auth/contracts/pending-auth-contract.js');
    assert.equal(PUBLISHED_AUTH_POLICY.errorSemantics[401], PUBLISHED_ERROR_STATUS[401]);
    assert.equal(PUBLISHED_AUTH_POLICY.errorSemantics[403], PUBLISHED_ERROR_STATUS[403]);
  });
});

describe('binding authorization', () => {
  it('does not authorize binding, even though the contract is published', () => {
    // Modelling is not binding. Binding is a separate approved Batch B task and
    // still needs Cline's UI-lock regression evidence.
    assert.equal(LIVE_BINDING_AUTHORIZED, false);
    for (const contract of BATCH_A_CONTRACTS) {
      assert.equal(contract.frontendBindingAllowed, false);
    }
  });

  it('throws if binding is claimed', () => {
    assert.equal(assertNoInventedSchemas(), true);
  });
});

describe('published future conventions', () => {
  it('records the tenant route prefixes without implementing them', () => {
    assert.deepEqual(
      [...PUBLISHED_FUTURE_CONVENTIONS.tenantRoutePrefixes],
      ['/academic/{school_slug}', '/fee/{school_slug}', '/attendance/{school_slug}'],
    );
    assert.equal(PUBLISHED_FUTURE_CONVENTIONS.implemented, false);
    assert.match(PUBLISHED_FUTURE_CONVENTIONS.tenantResolutionRule, /never trusted/);
  });

  it('matches the contract document', () => {
    const doc = readFileSync(CONTRACT_PATH, 'utf8');
    for (const prefix of PUBLISHED_FUTURE_CONVENTIONS.tenantRoutePrefixes) {
      assert.ok(doc.includes(prefix), `${prefix} must appear in the contract`);
    }
  });
});

describe('describeContractBlock', () => {
  it('reports the published state without leaking payload data', () => {
    const summary = describeContractBlock();
    assert.equal(summary.exists, true);
    assert.equal(summary.version, '0.1.0');
    assert.equal(summary.liveBindingAuthorized, false);
    assert.equal(summary.endpoints.length, 2);

    const health = summary.endpoints.find((entry) => entry.id === 'health');
    assert.equal(health.status, ContractStatus.PUBLISHED);
    assert.equal(health.modeled, true);

    const setup = summary.endpoints.find((entry) => entry.id === 'setup');
    assert.equal(setup.modeled, false);

    assert.doesNotMatch(JSON.stringify(summary), /password|secret|"token"/i);
  });
});