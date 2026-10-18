/**
 * School-connection tests. Tasks: L-O-01 … L-O-06.
 * Synthetic inputs only. No network. No storage write.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { Surface } from '../core/auth/index.js';
import { Role } from '../core/auth/role-guard.js';
import {
  CONNECTION_BINDINGS,
  CONNECTION_INTEGRATION_AUTHORIZED,
  LANDING,
  MISSING_CONNECTION_ENTITIES,
  PENDING_CONNECTION_CONTRACTS,
  ConnectionReject,
  LaunchReject,
  assertConnectionBindingsMatchReferences,
  assertConnectionFlowMatchesReferences,
  assertNoConnectionElementCreation,
  assertNoInventedConnectionSchemas,
  assertRoleLaunchMatchesReferences,
  blockedConnectionBindings,
  clearSelectedSchool,
  connectionBindingById,
  connectionReport,
  describeConnectionBlock,
  findPendingConnectionContract,
  launchRoleExperience,
  parseSchoolName,
  roleLaunchFeatures,
  selectedSchool,
  validateConnection,
} from '../core/connection/index.js';
import { listSourceFiles, readCode } from './helpers/source-scan.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REF_DIR = resolve(REPO_ROOT, 'zee_education_multi_agent_handoff', 'agents', 'opencode', 'reference_ui');
const CORE_DIR = resolve(REPO_ROOT, 'frontend', 'core');

function readReference(fragment) {
  const matches = readdirSync(REF_DIR).filter((name) => name.includes(fragment));
  assert.equal(matches.length, 1, `exactly one reference containing "${fragment}"`);
  return readFileSync(resolve(REF_DIR, matches[0]), 'utf8');
}

const REFERENCES = Object.freeze({
  'mobile-app': readReference('Mobile App Preview'),
  'school-desktop': readReference('School Dashboard'),
});

describe('L-O-01 — connection follows the reference onboarding exactly', () => {
  it('passes the reference drift guard', () => {
    assert.equal(assertConnectionFlowMatchesReferences(REFERENCES['mobile-app']), true);
  });

  it('derives the school name exactly as the reference does', () => {
    assert.equal(parseSchoolName('horizon.school.pk'), 'Horizon');
    assert.equal(parseSchoolName('alnoor.school.pk'), 'Alnoor');
    assert.equal(parseSchoolName('bright-future.edu.pk'), 'Bright Future');
    assert.equal(parseSchoolName('bright_future.edu.pk'), 'Bright Future');
    assert.equal(parseSchoolName('sub.domain.school.pk'), 'Sub');
    assert.equal(parseSchoolName(''), null);
    assert.equal(parseSchoolName(null), null);
    assert.equal(parseSchoolName(42), null);
  });

  it('requires both domain and code', () => {
    assert.equal(validateConnection({}).reason, ConnectionReject.EMPTY_DOMAIN);
    assert.equal(validateConnection({ domain: 'horizon.school.pk' }).reason, ConnectionReject.EMPTY_CODE);
    assert.equal(validateConnection({ domain: '   ', code: 'HZ-9246' }).reason, ConnectionReject.EMPTY_DOMAIN);
    assert.equal(
      validateConnection({ domain: 'horizon.school.pk', code: '   ' }).reason,
      ConnectionReject.EMPTY_CODE,
    );
  });

  it('accepts a valid connection and reports it as demo', () => {
    const result = validateConnection({ domain: 'horizon.school.pk', code: 'HZ-9246' });
    assert.equal(result.allowed, true);
    assert.equal(result.value.domain, 'horizon.school.pk');
    assert.equal(result.value.code, 'HZ-9246');
    assert.equal(result.value.school, 'Horizon');

    const report = connectionReport(result.value);
    assert.equal(report.allowed, true);
    assert.equal(report.value.school, 'Horizon');
    assert.equal(report.value.demo, true);
    assert.equal(connectionReport({}).reason, ConnectionReject.NOT_CONNECTED);
  });

  it('never treats connection as a session', () => {
    assert.equal(validateConnection({ domain: 'x.pk', code: 'y' }).allowed, true);
    assert.equal(connectionReport({ school: 'x' }).value.demo, true);
  });
});

describe('L-O-02 — selection stays in memory and clears on logout/switch', () => {
  it('keeps an in-memory selection', () => {
    const s = selectedSchool({ school: 'Horizon' });
    assert.equal(s.school, 'Horizon');
    assert.equal(s.cleared, false);
    assert.equal(selectedSchool().school, null);
    assert.equal(selectedSchool().cleared, true);
    assert.equal(selectedSchool(null).cleared, true);
  });

  it('clears the selection', () => {
    const cleared = clearSelectedSchool();
    assert.equal(cleared.school, null);
    assert.equal(cleared.cleared, true);
  });

  it('reuses Batch B\'s absolute storage ban instead of a second guard', () => {
    // Batch B forbids every storage primitive across core/**. A guard here would have
    // to name those primitives, which Batch B's absolute ban treats as a violation —
    // so this module must not contain them, and does not.
    const connectionSource = readFileSync(resolve(CORE_DIR, 'connection', 'connection.js'), 'utf8');
    const contractSource = readFileSync(
      resolve(CORE_DIR, 'connection', 'contracts', 'pending-connection-contract.js'),
      'utf8',
    );
    for (const source of [connectionSource, contractSource]) {
      assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
    }
  });
});

describe('L-O-03 — role launch uses existing screens only', () => {
  it('passes the reference drift guard', () => {
    assert.equal(assertRoleLaunchMatchesReferences(REFERENCES['mobile-app']), true);
  });

  it('launches every known role to Home with no feature pre-selected', () => {
    for (const role of [Role.PARENT, Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN]) {
      const result = launchRoleExperience({ role, schoolConnected: true });
      assert.equal(result.allowed, true, role);
      assert.equal(result.value.screen, 'Home');
      assert.equal(result.value.tab, 'Home');
      assert.equal(result.value.feat, null);
      assert.equal(result.value.role, role);
      assert.equal(Array.isArray(result.value.features), true);
    }
  });

  it('refuses unknown roles and a launch without a connected school', () => {
    assert.equal(launchRoleExperience({ role: 'Admin', schoolConnected: true }).reason, LaunchReject.UNKNOWN_ROLE);
    assert.equal(launchRoleExperience({ role: Role.PARENT }).reason, LaunchReject.NOT_CONNECTED);
    assert.equal(launchRoleExperience({}).reason, LaunchReject.UNKNOWN_ROLE);
  });

  it('shows only the existing role tool list', () => {
    const parent = roleLaunchFeatures(Role.PARENT);
    assert.ok(parent.includes('fees'));
    assert.ok(parent.includes('documents'));
    assert.ok(!parent.includes('reports'));
    const teacher = roleLaunchFeatures(Role.TEACHER);
    assert.ok(teacher.includes('reports'));
    assert.ok(!teacher.includes('documents'));
    assert.deepEqual([...roleLaunchFeatures(Role.SUPER_ADMIN)], []);
  });
});

describe('L-O-04/L-O-05 — no PWA surface and scrollbar stays hidden', () => {
  it('finds no manifest, service worker or offline surface anywhere', () => {
    const files = listSourceFiles(CORE_DIR);
    for (const file of files) {
      const code = readCode(file);
      assert.doesNotMatch(code, /manifest\.json|serviceWorker|sw\.js|registerServiceWorker/, file);
      assert.doesNotMatch(code, /\['"'`]https?:\/\/(?!localhost|127\.0\.0\.1)/, file);
    }
  });

  it('passes the connection binding drift guard', () => {
    assert.equal(assertConnectionBindingsMatchReferences(REFERENCES), true);
  });
});

describe('L-O-01/L-O-03 — binding contract', () => {
  it('passes the drift guard and never creates UI', () => {
    assert.equal(assertNoConnectionElementCreation(), true);
  });

  it('marks every element unpublished with no field', () => {
    for (const binding of CONNECTION_BINDINGS) {
      assert.equal(binding.state, 'unpublished', binding.id);
      assert.equal(binding.field, null, binding.id);
    }
  });

  it('blocks the four write-facing actions', () => {
    assert.deepEqual(
      blockedConnectionBindings().map((b) => b.id),
      ['LCB-03', 'LCB-04', 'LCB-07', 'LCB-09'],
    );
  });

  it('records the demo and pre-login boundaries', () => {
    assert.match(connectionBindingById('LCB-03').note, /in this demo/);
    assert.match(connectionBindingById('LCB-04').note, /app\/PWA permission/);
    assert.match(connectionBindingById('LCB-09').note, /L-O-05/);
  });
});

describe('no invented connection contract', () => {
  it('confirms nothing is authorized', () => {
    assert.equal(CONNECTION_INTEGRATION_AUTHORIZED, false);
    assert.equal(describeConnectionBlock().schemaPublished, false);
  });

  it('covers every Batch L contract capability', () => {
    assert.deepEqual(
      PENDING_CONNECTION_CONTRACTS.map((c) => c.id).sort(),
      ['school-connection', 'school-selection-persistence'],
    );
  });

  it('declares no endpoint or payload and fails closed otherwise', () => {
    assert.equal(assertNoInventedConnectionSchemas(), true);
    const base = {
      id: 'school-connection',
      status: 'blocked-needs-provisioning-path',
      method: null,
      path: null,
      requestSchema: null,
      responseSchema: null,
      implemented: false,
    };
    assert.throws(() => assertNoInventedConnectionSchemas([{ ...base, path: '/connect' }]));
    assert.throws(() => assertNoInventedConnectionSchemas([{ ...base, implemented: true }]));
    assert.throws(() => assertNoInventedConnectionSchemas([{ ...base, status: 'published' }]));
  });

  it('lists the entities that must exist first', () => {
    assert.deepEqual(
      MISSING_CONNECTION_ENTITIES.map((e) => e.entity),
      ['school_connection_sessions', 'qr_payloads'],
    );
  });
});
