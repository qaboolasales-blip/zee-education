/**
 * Provisioning contract gate. Tasks: C-O-03 / C-O-04.
 *
 * Proves the block is self-enforcing and that neither a QR parser nor a
 * provisioning API call was quietly implemented.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  DOCUMENTED_BUT_UNIMPLEMENTED_ENTITIES,
  EXPECTED_PROVISIONING_CONTRACT_DOC,
  PENDING_PROVISIONING_CONTRACTS,
  PROVISIONING_ENDPOINTS_PUBLISHED,
  PROVISIONING_INTEGRATION_AUTHORIZED,
  PROVISIONING_SCHEMA_PUBLISHED,
  ProvisioningContractStatus,
  SOURCE_OBSERVATIONS,
  assertNoInventedProvisioningSchemas,
  describeProvisioningBlock,
  findPendingProvisioningContract,
} from '../core/provisioning/index.js';
import { listSourceFiles, readCode } from './helpers/source-scan.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const CORE_DIR = resolve(HERE, '..', 'core');

describe('C-O-04 — no provisioning endpoint is published', () => {
  it('publishes only health, setup and home', () => {
    const routes = readFileSync(resolve(REPO_ROOT, 'backend', 'app', 'Config', 'Routes.php'), 'utf8');
    const paths = [...routes.matchAll(/\$routes->\w+\(\s*'([^']*)'/g)].map((m) => m[1]);
    assert.deepEqual(paths, ['health', 'setup', '/']);
    assert.equal(PROVISIONING_ENDPOINTS_PUBLISHED, false);
  });

  it('has no model layer yet', () => {
    assert.deepEqual(readdirSync(resolve(REPO_ROOT, 'backend', 'app', 'Models')), ['.gitkeep']);
  });

  it('documents the schema and endpoints separately', () => {
    assert.equal(PROVISIONING_SCHEMA_PUBLISHED, true);
    assert.equal(PROVISIONING_INTEGRATION_AUTHORIZED, false);
    assert.equal(existsSync(resolve(REPO_ROOT, EXPECTED_PROVISIONING_CONTRACT_DOC)), true);
  });
});

describe('C-O-03/C-O-04 — no invented provisioning contract', () => {
  it('covers every capability Batch C needs', () => {
    assert.deepEqual(
      PENDING_PROVISIONING_CONTRACTS.map((contract) => contract.id).sort(),
      ['plan-catalogue', 'qr-payload', 'school-connection-code', 'school-provisioning', 'school-registry'],
    );
  });

  it('declares no endpoint or payload for any capability', () => {
    assert.equal(assertNoInventedProvisioningSchemas(), true);
    for (const contract of PENDING_PROVISIONING_CONTRACTS) {
      assert.equal(contract.method, null);
      assert.equal(contract.path, null);
      assert.equal(contract.requestSchema, null);
      assert.equal(contract.responseSchema, null);
      assert.equal(contract.implemented, false);
      assert.notEqual(contract.status, ProvisioningContractStatus.PUBLISHED);
    }
  });

  it('fails closed if a schema or implementation claim is introduced', () => {
    const base = {
      id: 'school-registry',
      status: ProvisioningContractStatus.BLOCKED_NOT_CONTRACTED,
      method: null,
      path: null,
      requestSchema: null,
      responseSchema: null,
      implemented: false,
    };
    assert.throws(() => assertNoInventedProvisioningSchemas([{ ...base, path: '/schools' }]));
    assert.throws(() => assertNoInventedProvisioningSchemas([{ ...base, method: 'POST' }]));
    assert.throws(() => assertNoInventedProvisioningSchemas([{ ...base, requestSchema: { name: 'string' } }]));
    assert.throws(() => assertNoInventedProvisioningSchemas([{ ...base, responseSchema: { data: [] } }]));
    assert.throws(() => assertNoInventedProvisioningSchemas([{ ...base, implemented: true }]));
    assert.doesNotThrow(() => assertNoInventedProvisioningSchemas([base]));
  });

  it('records source observations as non-contracts', () => {
    assert.ok(SOURCE_OBSERVATIONS.length >= 3);
    for (const observation of SOURCE_OBSERVATIONS) {
      assert.equal(observation.contract, false);
    }
  });

  it('looks capabilities up by id', () => {
    assert.equal(findPendingProvisioningContract('qr-payload').id, 'qr-payload');
    assert.equal(findPendingProvisioningContract('nope'), null);
  });

  it('summarizes the block without leaking payload data', () => {
    const summary = describeProvisioningBlock();
    assert.equal(summary.schemaPublished, true);
    assert.equal(summary.endpointsPublished, false);
    assert.equal(summary.integrationAuthorized, false);
    assert.equal(summary.capabilities.length, 5);
    assert.doesNotMatch(JSON.stringify(summary), /requestSchema|responseSchema|password/i);
  });

  it('is deeply frozen', () => {
    for (const contract of PENDING_PROVISIONING_CONTRACTS) {
      assert.equal(Object.isFrozen(contract), true);
    }
    assert.throws(() => {
      'use strict';
      PENDING_PROVISIONING_CONTRACTS[0].implemented = true;
    });
  });
});

describe('no QR parser or provisioning call was implemented', () => {
  const files = listSourceFiles(resolve(CORE_DIR, 'provisioning'));
  const rel = (file) => file.replace(`${REPO_ROOT}\\`, '').replace(/\//g, '\\');

  it('scans the provisioning modules', () => {
    assert.ok(files.length >= 4, `expected the provisioning tree, got ${files.length}`);
  });

  it('contains no QR decoding or payload parsing', () => {
    const offenders = files
      .filter((file) =>
        /\b(jwt|qrcode|qr_decode|decodeQr|parseQr|jimp|zxing|crypto\.subtle|atob|btoa)\b/i.test(readCode(file)),
      )
      .map(rel);
    assert.deepEqual(offenders, []);
  });

  it('performs no cryptography and verifies no signature', () => {
    // Matches actual crypto API usage, not the word "signature" in a blocker
    // description. An uncontracted QR payload must not be signed or verified here.
    const cryptoUsage =
      /\b(crypto\.subtle|node:crypto|createHmac|createSign|createVerify|timingSafeEqual|new\s+HMAC|jwt\.|jose|subtle\.)/i;
    const offenders = files.filter((file) => cryptoUsage.test(readCode(file))).map(rel);
    assert.deepEqual(offenders, []);
  });

  it('contains no transport call to an uncontracted provisioning endpoint', () => {
    const offenders = files
      .filter((file) =>
        /\.(post|get|put|patch|delete)\(\s*['"`][^'"`]*(school|provision|qr|install|registry|decommission)/i.test(
          readCode(file),
        ),
      )
      .map(rel);
    assert.deepEqual(offenders, []);
  });

  it('contains no database name, credential or audit column access', () => {
    const offenders = files
      .filter((file) =>
        new RegExp('\\b(password|db_password|dbpasswd|mysql:|mariadb:|dsn)\\b', 'i').test(readCode(file)),
      )
      .map(rel);
    assert.deepEqual(offenders, []);
  });
});

describe('ADR-001 is respected by the published schema record', () => {
  it('does not model any shared-tenant arrangement', () => {
    const text = Object.values(DOCUMENTED_BUT_UNIMPLEMENTED_ENTITIES).map((e) => e.holds).join(' ');
    assert.doesNotMatch(text, /tenant_id/i);
  });
});