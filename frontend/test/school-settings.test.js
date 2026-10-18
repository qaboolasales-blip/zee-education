/**
 * School settings, availability and binding-contract tests.
 * Tasks: D-O-01, D-O-02, D-O-04, D-O-05.
 * Synthetic values only. No network. No storage. No rendering.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  APPROVED_SCHOOL_CURRENCIES,
  APPROVED_SCHOOL_TIMEZONES,
  ACADEMIC_SCHEMA_PUBLISHED,
  BINDINGS,
  DEFAULT_SCHOOL_SETTINGS,
  HookKind,
  MISSING_ACADEMIC_ENTITIES,
  PENDING_SETTINGS_CONTRACTS,
  READONLY_SETTING_FIELDS,
  SETTINGS_ENDPOINTS_PUBLISHED,
  SETTINGS_INTEGRATION_AUTHORIZED,
  SETTINGS_SCHEMA_PUBLISHED,
  SettingReject,
  WRITABLE_SETTING_FIELDS,
  AcademicContractStatus,
  applySchoolSettingDefaults,
  assertBindingsMatchReference,
  assertNoInventedAcademicSchemas,
  assertNoElementCreation,
  bindingById,
  bindingsForScreen,
  blockedBindings,
  classifySchoolAvailability,
  describeSettingsBlock,
  findPendingSettingsContract,
  isSchoolActive,
  publishableBindings,
  settingText,
  validateSchoolCurrency,
  validateSchoolLocale,
  validateSchoolName,
  validateSchoolTimezone,
  validateSettingsPatch,
} from '../core/settings/index.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REF_DIR = resolve(
  REPO_ROOT,
  'zee_education_multi_agent_handoff',
  'agents',
  'opencode',
  'reference_ui',
);

/**
 * Resolve the reference by ASCII prefix rather than by literal filename.
 * The approved filenames contain an em dash, which is easy to corrupt through a
 * shell round-trip; matching on an ASCII-only prefix keeps this test encoding
 * independent.
 */
function readReference(fragment) {
  const matches = readdirSync(REF_DIR).filter((name) => name.includes(fragment));
  assert.equal(matches.length, 1, `exactly one reference containing "${fragment}" must exist`);
  return readFileSync(resolve(REF_DIR, matches[0]), 'utf8');
}

const SCHOOL_DASHBOARD = readReference('School Dashboard');
const EMPTY_MARKER = '—';

describe('published settings columns', () => {
  it('records the column defaults, not guesses', () => {
    assert.deepEqual({ ...DEFAULT_SCHOOL_SETTINGS }, {
      timezone: 'Asia/Karachi',
      currency: 'PKR',
      locale: 'en',
    });
    assert.equal(SETTINGS_SCHEMA_PUBLISHED, true);
  });

  it('records that no academic structure and no endpoints exist', () => {
    assert.equal(ACADEMIC_SCHEMA_PUBLISHED, false);
    assert.equal(SETTINGS_ENDPOINTS_PUBLISHED, false);
    assert.equal(SETTINGS_INTEGRATION_AUTHORIZED, false);
  });

  it('lists every academic entity Batch D needs but the schema lacks', () => {
    assert.ok(MISSING_ACADEMIC_ENTITIES.length >= 12);
    for (const entry of MISSING_ACADEMIC_ENTITIES) {
      assert.ok(entry.entity.length > 0);
      assert.ok(entry.need.length > 0);
    }
    assert.equal(MISSING_ACADEMIC_ENTITIES.some((e) => e.entity === 'teacher_assignments'), true);
  });
});

describe('setting validation', () => {
  it('accepts the timezone the approved select already offers', () => {
    assert.deepEqual([...APPROVED_SCHOOL_TIMEZONES], ['Asia/Karachi']);
    assert.equal(validateSchoolTimezone('Asia/Karachi').valid, true);
  });

  it('refuses any other timezone, because adding a <option> would be a visual change', () => {
    for (const zone of ['UTC', 'Asia/Dubai', 'Europe/London', 'Asia/Karachi ', 'asia/karachi']) {
      const result = validateSchoolTimezone(zone);
      if (zone === 'Asia/Karachi ') {
        assert.equal(result.valid, true, 'trailing whitespace is trimmed, not rejected');
        continue;
      }
      assert.equal(result.valid, false, zone);
      assert.equal(result.reason, SettingReject.NOT_APPROVED_TIMEZONE, zone);
    }
  });

  it('accepts only PKR', () => {
    assert.deepEqual([...APPROVED_SCHOOL_CURRENCIES], ['PKR']);
    assert.equal(validateSchoolCurrency('PKR').valid, true);
    for (const currency of ['USD', 'pkr', 'PKR ', 'EUR']) {
      const result = validateSchoolCurrency(currency);
      if (currency === 'PKR ') {
        assert.equal(result.valid, true);
        continue;
      }
      assert.equal(result.valid, false, currency);
      assert.equal(result.reason, SettingReject.NOT_APPROVED_CURRENCY, currency);
    }
  });

  it('checks only the published locale FORMAT, never an invented vocabulary', () => {
    // Deliberate: only the VARCHAR(8) column shape is checkable. A subtag
    // registry would be an invented vocabulary, so `en-PAK` passes the format
    // even though it is not a real script subtag. Validating real codes is
    // KiloCode's job once the vocabulary is published (DSB-03).
    for (const value of ['en', 'ur', 'en-PK', 'ur-PK', 'zh-Hant', 'en-PAK']) {
      assert.equal(validateSchoolLocale(value).valid, true, value);
    }
    for (const value of ['', '   ', 'e', 'english_language', 'en_US', '12', '-en', 'en-']) {
      assert.equal(validateSchoolLocale(value).valid, false, String(value));
    }
    assert.equal(validateSchoolLocale('en_US').reason, SettingReject.BAD_LOCALE_FORMAT);
    // schools.locale is VARCHAR(8), so a longer tag genuinely does not fit.
    assert.equal(validateSchoolLocale('en-PAKISTAN').reason, SettingReject.TOO_LONG);
    assert.equal(validateSchoolLocale('zh-Hant-TW').reason, SettingReject.TOO_LONG);
  });

  it('enforces the published name length', () => {
    assert.equal(validateSchoolName('Horizon Public School').valid, true);
    assert.equal(validateSchoolName('  Horizon  ').value, 'Horizon');
    assert.equal(validateSchoolName('x'.repeat(191)).valid, true);
    assert.equal(validateSchoolName('x'.repeat(192)).reason, SettingReject.TOO_LONG);
    for (const value of [null, undefined, '', '   ', 42, {}]) {
      assert.equal(validateSchoolName(value).valid, false, String(value));
    }
  });
});

describe('settings patch', () => {
  it('accepts a contract-shaped patch', () => {
    const result = validateSettingsPatch({
      name: 'Horizon Public School',
      timezone: 'Asia/Karachi',
      currency: 'PKR',
      locale: 'en',
    });
    assert.equal(result.valid, true);
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.value), true);
  });

  it('rejects a browser-supplied school id or lifecycle status', () => {
    for (const patch of [
      { id: 7 },
      { school_id: 7 },
      { status: 'active' },
      { created_at: '2026-01-01 00:00:00' },
      { plan_code: 'Growth' },
    ]) {
      const result = validateSettingsPatch(patch);
      assert.equal(result.valid, false, JSON.stringify(patch));
      assert.equal(result.reason, SettingReject.FORBIDDEN_FIELD, JSON.stringify(patch));
    }
  });

  it('collects per-field errors instead of failing on the first one', () => {
    const result = validateSettingsPatch({ name: '', timezone: 'UTC', locale: 'en' });
    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 2);
    assert.deepEqual(
      result.errors.map((entry) => entry.field).sort(),
      ['name', 'timezone'],
    );
    assert.deepEqual({ ...result.value }, {});
  });

  it('exposes exactly the writable and read-only column sets', () => {
    assert.deepEqual([...WRITABLE_SETTING_FIELDS], ['name', 'timezone', 'currency', 'locale']);
    assert.deepEqual([...READONLY_SETTING_FIELDS], ['plan_code', 'status']);
    const overlap = WRITABLE_SETTING_FIELDS.filter((field) => READONLY_SETTING_FIELDS.includes(field));
    assert.deepEqual(overlap, []);
  });

  it('rejects a non-object patch', () => {
    for (const value of [null, 'x', 42, []]) {
      assert.equal(validateSettingsPatch(value).valid, false);
    }
  });
});

describe('defaults application (EMPTY_MARKER responses)', () => {
  it('fills every missing setting with its published column default', () => {
    assert.deepEqual({ ...applySchoolSettingDefaults({}) }, {
      timezone: 'Asia/Karachi',
      currency: 'PKR',
      locale: 'en',
    });
  });

  it('keeps supplied values untouched', () => {
    assert.deepEqual({ ...applySchoolSettingDefaults({ timezone: 'Asia/Karachi', locale: 'ur' }) }, {
      timezone: 'Asia/Karachi',
      currency: 'PKR',
      locale: 'ur',
    });
  });

  it('treats blank strings as absent rather than storing them', () => {
    assert.deepEqual({ ...applySchoolSettingDefaults({ timezone: '   ', currency: '' }) }, {
      timezone: 'Asia/Karachi',
      currency: 'PKR',
      locale: 'en',
    });
  });

  it('survives a null record without throwing', () => {
    assert.equal(applySchoolSettingDefaults(null).timezone, 'Asia/Karachi');
    assert.equal(applySchoolSettingDefaults('nope').locale, 'en');
  });
});

describe('school availability (inactive-session and lifecycle)', () => {
  it('treats only "active" as operational', () => {
    assert.equal(isSchoolActive('active'), true);
    for (const status of ['pending', 'suspended', 'decommissioned']) {
      assert.equal(isSchoolActive(status), false, status);
    }
  });

  it('defaults to inactive for anything unknown, including a missing status', () => {
    for (const status of [null, undefined, '', 'ACTIVE', 'Active', 'enabled', 42, {}]) {
      assert.equal(isSchoolActive(status), false, String(status));
    }
  });

  it('keeps school data accessible in every non-decommissioned state', () => {
    // Data-boundary override: a licence state may restrict access but must never
    // hide, encrypt or block export of a school's own data.
    assert.equal(classifySchoolAvailability('suspended').dataStillAccessible, true);
    assert.equal(classifySchoolAvailability('pending').dataStillAccessible, true);
    assert.equal(classifySchoolAvailability('active').dataStillAccessible, true);
    assert.equal(classifySchoolAvailability('decommissioned').dataStillAccessible, false);
  });

  it('never lets an unknown status imply data loss', () => {
    assert.equal(classifySchoolAvailability('nonsense').dataStillAccessible, true);
    assert.equal(classifySchoolAvailability(null).dataStillAccessible, true);
  });

  it('returns a frozen result with a closed shape', () => {
    const result = classifySchoolAvailability('active');
    assert.equal(Object.isFrozen(result), true);
    assert.deepEqual(Object.keys(result).sort(), ['active', 'dataStillAccessible', 'status']);
  });
});

describe('approved-element binding contract', () => {
  it('passes the drift guard against the locked School Dashboard', () => {
    assert.equal(assertBindingsMatchReference(SCHOOL_DASHBOARD), true);
  });

  it('never authorises creating UI', () => {
    assert.equal(assertNoElementCreation(), true);
    for (const binding of BINDINGS) {
      assert.equal(binding.kind.startsWith('existing-') || binding.kind === HookKind.BLOCKED, true);
      assert.notEqual(binding.kind, 'creates-element');
    }
  });

  it('covers Settings, Academics, Timetable and Students', () => {
    assert.deepEqual(
      [...new Set(BINDINGS.map((b) => b.screen))].sort(),
      ['Academics', 'Settings', 'Students', 'Timetable'],
    );
    assert.ok(bindingsForScreen('Settings').length >= 7);
  });

  it('marks exactly two elements as directly bindable to a published field', () => {
    const publishable = publishableBindings().map((b) => b.id);
    assert.deepEqual(publishable, ['DB-04', 'DB-05']);
    assert.equal(bindingById('DB-04').field, 'schools.timezone');
    assert.equal(bindingById('DB-05').field, 'school_domains.domain');
  });

  it('marks the QR button blocked rather than adding a control', () => {
    assert.equal(bindingById('DB-07').kind, HookKind.BLOCKED);
    assert.equal(bindingById('DB-07').field, null);
    assert.equal(blockedBindings().length, 1);
  });

  it('marks governance copy as static, never bindable', () => {
    for (const id of ['DB-02', 'DB-08']) {
      const binding = bindingById(id);
      assert.equal(binding.state, 'static', id);
      assert.equal(binding.field, null, id);
    }
  });

  it('records every academic element as unpublished because no table exists', () => {
    for (const id of ['DB-09', 'DB-10', 'DB-11', 'DB-12', 'DB-13', 'DB-14', 'DB-15']) {
      assert.equal(bindingById(id).state, 'unpublished', id);
      assert.equal(bindingById(id).field, null, id);
    }
  });

  it('is frozen and cannot gain a new descriptor at runtime', () => {
    assert.equal(Object.isFrozen(BINDINGS), true);
    assert.throws(() => {
      'use strict';
      BINDINGS.push({ id: 'DB-99' });
    });
    assert.equal(bindingById('nope'), null);
  });
});

describe('permission-denied and duplicate responses', () => {
  it('uses the published 403 semantic', () => {
    const doc = readFileSync(
      resolve(REPO_ROOT, 'backend', 'docs', 'api', 'openapi-v0.md'),
      'utf8',
    );
    // Matched loosely so the assertion survives an em-dash encoding round-trip.
    assert.match(doc, /\| 403 \| Forbidden .* valid auth but insufficient scope \|/);
  });

  it('records that permission-denied cannot be tested without an auth contract', () => {
    const permission = findPendingSettingsContract('permission-denied');
    assert.equal(permission.implemented, false);
    assert.match(permission.blocker, /no auth contract/i);
  });

  it('records that duplicate handling has no published status', () => {
    // 409 is absent from the published error table, so no duplicate semantics.
    const doc = readFileSync(
      resolve(REPO_ROOT, 'backend', 'docs', 'api', 'openapi-v0.md'),
      'utf8',
    );
    assert.equal(/\| 409 \|/.test(doc), false);
    const write = findPendingSettingsContract('school-settings-write');
    assert.match(write.unblockRequires, /400\/409/);
  });
});

describe('no invented settings or academic contract', () => {
  it('covers every Batch D capability', () => {
    assert.deepEqual(
      PENDING_SETTINGS_CONTRACTS.map((c) => c.id).sort(),
      [
        'academic-structure',
        'locale-vocabulary',
        'permission-denied',
        'school-branding-logo',
        'school-settings-read',
        'school-settings-write',
      ],
    );
  });

  it('declares no endpoint or payload', () => {
    assert.equal(assertNoInventedAcademicSchemas(), true);
    for (const contract of PENDING_SETTINGS_CONTRACTS) {
      assert.equal(contract.method, null);
      assert.equal(contract.path, null);
      assert.equal(contract.requestSchema, null);
      assert.equal(contract.responseSchema, null);
      assert.equal(contract.implemented, false);
      assert.notEqual(contract.status, AcademicContractStatus.PUBLISHED);
    }
  });

  it('fails closed if a schema or implementation claim appears', () => {
    const base = {
      id: 'school-settings-write',
      status: AcademicContractStatus.BLOCKED_NOT_CONTRACTED,
      method: null,
      path: null,
      requestSchema: null,
      responseSchema: null,
      implemented: false,
    };
    assert.throws(() => assertNoInventedAcademicSchemas([{ ...base, path: '/school/settings' }]));
    assert.throws(() => assertNoInventedAcademicSchemas([{ ...base, method: 'PATCH' }]));
    assert.throws(() => assertNoInventedAcademicSchemas([{ ...base, requestSchema: { locale: 'string' } }]));
    assert.throws(() => assertNoInventedAcademicSchemas([{ ...base, implemented: true }]));
    assert.doesNotThrow(() => assertNoInventedAcademicSchemas([base]));
  });

  it('summarizes the block without leaking payload data', () => {
    const summary = describeSettingsBlock();
    assert.equal(summary.settingsSchemaPublished, true);
    assert.equal(summary.academicSchemaPublished, false);
    assert.equal(summary.settingsEndpointsPublished, false);
    assert.equal(summary.integrationAuthorized, false);
    assert.doesNotMatch(JSON.stringify(summary), /requestSchema|responseSchema|password/i);
  });
});

describe('safe rendering into approved text nodes', () => {
  it('renders a setting or the EMPTY_MARKER marker', () => {
    assert.equal(settingText('Asia/Karachi'), 'Asia/Karachi');
    assert.equal(settingText('  PKR '), 'PKR');
    for (const value of [null, undefined, '', '   ', 42, {}, []]) {
      assert.equal(settingText(value), EMPTY_MARKER, String(value));
    }
  });

  it('never leaks undefined, NaN or [object Object] into UI copy', () => {
    assert.doesNotMatch(settingText(undefined), /undefined|null|NaN|\[object Object\]/);
  });
});