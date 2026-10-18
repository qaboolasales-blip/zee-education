/**
 * People privacy policy, selectors, role landing and binding contract tests.
 * Tasks: E-O-02, E-O-03, E-O-04, E-O-05.
 *
 * Synthetic records only. No real student, guardian or staff data. No network.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { MOBILE_APP_TABS, Role, Surface } from '../core/auth/index.js';
import {
  ANONYMOUS,
  DATA_CATEGORIES,
  DataCategory,
  PEOPLE_BINDINGS,
  PEOPLE_INTEGRATION_AUTHORIZED,
  PENDING_PEOPLE_CONTRACTS,
  PRIVACY_MATRIX,
  REDACTED,
  ROLE_LANDING,
  Scope,
  assertLandingsAreApproved,
  assertNoInventedPeopleSchemas,
  assertNoPeopleElementCreation,
  assertParentLimitedToLinkedChildren,
  assertPeopleBindingsMatchReferences,
  assertSuperAdminCannotBrowseLearners,
  blockedPeopleBindings,
  classifyChildStatus,
  describeAccess,
  describeChildCount,
  describeContact,
  describeOptionalMedia,
  describePeopleBlock,
  findPendingPeopleContract,
  hiddenCategories,
  isKnownPrivacyRole,
  mayView,
  peopleBindingById,
  redactCategory,
  redactedCategories,
  requiresServerScope,
  resolveRoleLanding,
  roleLandingTab,
  scopeFor,
  selectLinkedChildren,
  selectOwnRecord,
  selectPeopleForRole,
  selectPersonForRole,
  visibleCategories,
} from '../core/people/index.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REF_DIR = resolve(REPO_ROOT, 'zee_education_multi_agent_handoff', 'agents', 'opencode', 'reference_ui');

function readReference(fragment) {
  const matches = readdirSync(REF_DIR).filter((name) => name.includes(fragment));
  assert.equal(matches.length, 1, `exactly one reference containing "${fragment}"`);
  return readFileSync(resolve(REF_DIR, matches[0]), 'utf8');
}

const REFERENCES = Object.freeze({
  [Surface.SCHOOL_DESKTOP]: readReference('School Dashboard'),
  [Surface.MOBILE_APP]: readReference('Mobile App Preview'),
  [Surface.PLATFORM]: readReference('Super Admin'),
});

const record = () => ({
  [DataCategory.STUDENT_PROFILE]: { name: 'Synthetic One' },
  [DataCategory.GUARDIAN_PROFILE]: { name: 'Synthetic Guardian' },
  [DataCategory.FEE_RECORDS]: { total: 1 },
});

describe('privacy policy — provenance', () => {
  it('uses only the ten categories the data-boundary document lists', () => {
    assert.equal(DATA_CATEGORIES.length, 10);
    const doc = readFileSync(
      resolve(REPO_ROOT, 'backend', 'docs', 'control-plane-data-boundary.md'),
      'utf8',
    );
    assert.match(doc, /Student \/ guardian profiles/);
    assert.match(doc, /Staff \/ teacher profiles and assignments/);
    assert.match(doc, /Fee records, receipts, discounts, fines/);
  });

  it('names no student, guardian or staff FIELD, because none is published', () => {
    const serialized = JSON.stringify(PRIVACY_MATRIX) + DATA_CATEGORIES.join(',');
    assert.doesNotMatch(serialized, /b_form|cnic|nic|phone_number|dob|date_of_birth|blood/i);
  });

  it('confirms the school database does not exist yet', () => {
    assert.equal(PEOPLE_INTEGRATION_AUTHORIZED, false);
    assert.equal(describePeopleBlock().schoolDatabaseExists, false);
  });
});

describe('privacy policy — Super Admin sees nothing', () => {
  it('grants Super Admin zero categories, per PROJECT_MEMORY', () => {
    assert.deepEqual([...visibleCategories('Super Admin')], []);
    assert.equal(assertSuperAdminCannotBrowseLearners('Super Admin'), true);
  });

  it('shows no learner RECORDS in the platform reference', () => {
    const source = REFERENCES[Surface.PLATFORM];
    // No learner identifier and no learner row surface anywhere. (`class="act"` is
// the School Dashboard activity-row marker; a bare `.act` would also match
// unrelated substrings such as `.action`.)
    for (const absent of ['ST-2026-', 'EMP-2026', 'Imran Khan', 'Muhammad Ayan', 'class="act"']) {
      assert.equal(source.includes(absent), false, `platform reference must not contain "${absent}"`);
    }
    // The one table it renders is the school installations table, whose columns
    // are commercial, not personal.
    assert.match(source, /const SH=\['School','Domain','Plan','Database','Status','Renewal',''\]/);
    // The platform does render a `.pe` person cell — but only for SCHOOL identity
    // (schoolsRows()), never a person.
    assert.match(source, /const schoolsRows=\(\)=>SC\.map\(x=>\[`<div class="pe">\$\{ini\(x\[0\],x\[7\]\)\}/);
    // Learner words appear only inside plan-catalogue feature descriptions, which
    // is commercial copy, not learner data. Recorded rather than asserted away.
    assert.match(source, /Student\/staff records/);
    assert.match(source, /Attendance, marks, results/);
  });

  it('hides every category from Super Admin', () => {
    assert.equal(hiddenCategories('Super Admin').length, DATA_CATEGORIES.length);
  });
});

describe('privacy policy — Parent limited to linked children', () => {
  it('grants only linked-children scope, never school-wide', () => {
    assert.equal(assertParentLimitedToLinkedChildren('Parent'), true);
    for (const category of visibleCategories('Parent')) {
      assert.equal(scopeFor('Parent', category), Scope.LINKED_CHILDREN, category);
    }
  });

  it('grants no guardian directory, staff directory or school settings', () => {
    for (const category of [
      DataCategory.STAFF_PROFILE,
      DataCategory.STAFF_ASSIGNMENTS,
      DataCategory.SCHOOL_SETTINGS,
      DataCategory.ACADEMIC_STRUCTURE,
    ]) {
      assert.equal(mayView('Parent', category), false, category);
    }
  });

  it('does grant fees for linked children, matching the reference TL map', () => {
    assert.equal(mayView('Parent', DataCategory.FEE_RECORDS), true);
    assert.equal(scopeFor('Parent', DataCategory.FEE_RECORDS), Scope.LINKED_CHILDREN);
  });
});

describe('privacy policy — Teacher limited to assigned class', () => {
  it('uses assigned-class scope for people data', () => {
    assert.equal(scopeFor('Teacher', DataCategory.STUDENT_PROFILE), Scope.ASSIGNED_CLASS);
    assert.equal(scopeFor('Teacher', DataCategory.ATTENDANCE), Scope.ASSIGNED_CLASS);
    assert.equal(scopeFor('Teacher', DataCategory.ACADEMIC_RESULTS), Scope.ASSIGNED_CLASS);
  });

  it('grants no fees, no guardian profile and no staff directory', () => {
    for (const category of [
      DataCategory.FEE_RECORDS,
      DataCategory.GUARDIAN_PROFILE,
      DataCategory.STAFF_PROFILE,
      DataCategory.SCHOOL_SETTINGS,
    ]) {
      assert.equal(mayView('Teacher', category), false, category);
    }
  });

  it('agrees with the reference Teacher tool list', () => {
    const source = REFERENCES[Surface.MOBILE_APP];
    assert.match(source, /Teacher:\['timetable','attendanceTool','marks','homework','messages','notices','reports','leave'\]/);
    assert.doesNotMatch(source, /Teacher:\[[^\]]*'fees'/);
  });
});

describe('privacy policy — Student limited to own record', () => {
  it('uses own scope and no fees, matching the reference Student tool list', () => {
    assert.equal(scopeFor('Student', DataCategory.STUDENT_PROFILE), Scope.OWN);
    assert.equal(mayView('Student', DataCategory.FEE_RECORDS), false);
    const source = REFERENCES[Surface.MOBILE_APP];
    assert.match(source, /Student:\['timetable','homework','notices','calendar','messages','leave','documents'\]/);
  });

  it('grants no guardian, staff or settings access', () => {
    for (const category of [
      DataCategory.GUARDIAN_PROFILE,
      DataCategory.STAFF_PROFILE,
      DataCategory.SCHOOL_SETTINGS,
    ]) {
      assert.equal(mayView('Student', category), false, category);
    }
  });
});

describe('privacy policy — School Admin', () => {
  it('grants school-wide access to every category', () => {
    assert.equal(visibleCategories('School Admin').length, DATA_CATEGORIES.length);
    for (const category of DATA_CATEGORIES) {
      assert.equal(scopeFor('School Admin', category), Scope.SCHOOL, category);
    }
  });

  it('flags school scope as NOT requiring a client-side ownership check', () => {
    assert.equal(requiresServerScope('School Admin', DataCategory.STUDENT_PROFILE), false);
    assert.equal(requiresServerScope('Parent', DataCategory.STUDENT_PROFILE), true);
    assert.equal(requiresServerScope('Student', DataCategory.STUDENT_PROFILE), true);
  });
});

describe('privacy policy — default deny', () => {
  it('denies every unknown role', () => {
    for (const role of ['Admin', 'parent', 'Head Teacher', '', null, undefined, 42, {}]) {
      assert.equal(isKnownPrivacyRole(role), false, String(role));
      assert.deepEqual([...visibleCategories(role)], [], String(role));
      assert.equal(hiddenCategories(role).length, DATA_CATEGORIES.length, String(role));
    }
  });

  it('denies every unknown category, even for a fully privileged role', () => {
    for (const category of ['salary', 'bank_account', 'nic_number', '', null, 42]) {
      assert.equal(mayView('School Admin', category), false, String(category));
      assert.equal(scopeFor('School Admin', category), Scope.NONE, String(category));
    }
  });

  it('denies anonymous everything', () => {
    assert.deepEqual([...visibleCategories(ANONYMOUS)], []);
    assert.equal(describeAccess(ANONYMOUS).defaultDeny, true);
    assert.equal(describeAccess(ANONYMOUS).denied.length, DATA_CATEGORIES.length);
  });

  it('keeps visible and hidden partitioning total for every known role', () => {
    for (const role of Object.keys(PRIVACY_MATRIX)) {
      assert.equal(
        visibleCategories(role).length + hiddenCategories(role).length,
        DATA_CATEGORIES.length,
        role,
      );
    }
  });
});

describe('selectors — redaction', () => {
  it('redacts denied categories and keeps permitted ones intact', () => {
    const input = record();
    const output = selectPersonForRole(input, 'Parent');
    // Parent may see a linked child's own profile and fee records...
    assert.deepEqual({ ...output[DataCategory.STUDENT_PROFILE] }, { name: 'Synthetic One' });
    assert.deepEqual({ ...output[DataCategory.FEE_RECORDS] }, { total: 1 });
    // ...but never another family's guardian profile.
    assert.equal(output[DataCategory.GUARDIAN_PROFILE], REDACTED);
  });

  it('keeps Student profile visible for Teacher but guardian and fees hidden', () => {
    const output = selectPersonForRole(record(), 'Teacher');
    assert.notEqual(output[DataCategory.STUDENT_PROFILE], REDACTED);
    assert.equal(output[DataCategory.GUARDIAN_PROFILE], REDACTED);
    assert.equal(output[DataCategory.FEE_RECORDS], REDACTED);
  });

  it('redacts everything for Super Admin', () => {
    const output = selectPersonForRole(record(), 'Super Admin');
    for (const key of Object.keys(output)) {
      assert.equal(output[key], REDACTED, key);
    }
  });

  it('never mutates the input record or list', () => {
    const input = record();
    const snapshot = JSON.stringify(input);
    selectPersonForRole(input, 'Parent');
    selectPeopleForRole([input, input], 'Teacher');
    assert.equal(JSON.stringify(input), snapshot);
  });

  it('returns a frozen result', () => {
    assert.equal(Object.isFrozen(selectPersonForRole(record(), 'Parent')), true);
    assert.equal(Object.isFrozen(selectPeopleForRole([record()], 'Parent')), true);
    assert.equal(Object.isFrozen(redactCategory(record(), DataCategory.FEE_RECORDS, 'Parent')), true);
  });

  it('reports exactly which categories were withheld', () => {
    assert.deepEqual([...redactedCategories(record(), 'Parent')], [
      DataCategory.GUARDIAN_PROFILE,
    ]);
    assert.deepEqual([...redactedCategories(record(), 'Teacher')].sort(), [
      DataCategory.FEE_RECORDS,
      DataCategory.GUARDIAN_PROFILE,
    ]);
    assert.deepEqual([...redactedCategories(record(), 'Super Admin')].sort(), [
      DataCategory.FEE_RECORDS,
      DataCategory.GUARDIAN_PROFILE,
      DataCategory.STUDENT_PROFILE,
    ]);
  });

  it('withholds any key that is not a known category, so an uncontracted field cannot leak', () => {
    // Default-deny beats convenience: an unrecognised key is treated as private,
    // because no contract says the role may see it.
    const withExtras = { ...record(), id: 'S-1', salary: 1, cnic: 'x', bank_account: 'y' };
    const output = selectPersonForRole(withExtras, 'School Admin');
    assert.deepEqual([...redactedCategories(withExtras, 'School Admin')], [
      'bank_account',
      'cnic',
      'id',
      'salary',
    ]);
    for (const key of ['salary', 'cnic', 'bank_account']) {
      assert.equal(output[key], REDACTED, key);
    }
    // School Admin still sees every real category.
    assert.notEqual(output[DataCategory.STUDENT_PROFILE], REDACTED);
  });

  it('redactCategory touches only the named category', () => {
    const output = redactCategory(record(), DataCategory.FEE_RECORDS, 'Student');
    assert.equal(output[DataCategory.FEE_RECORDS], REDACTED);
    assert.notEqual(output[DataCategory.STUDENT_PROFILE], REDACTED);
  });

  it('never leaks a denied value anywhere in the serialized output', () => {
    const serialized = JSON.stringify(selectPersonForRole(record(), 'Parent'));
    assert.equal(serialized.includes('Synthetic Guardian'), false);
    // Teacher is denied fee records entirely.
    const teacher = JSON.stringify(selectPersonForRole(record(), 'Teacher'));
    assert.equal(teacher.includes('"total"'), false);
    assert.equal(teacher.includes('Synthetic Guardian'), false);
  });

  it('handles a missing or malformed record without throwing', () => {
    for (const value of [null, undefined, 'x', 42, []]) {
      const output = selectPersonForRole(value, 'Parent');
      assert.equal(Object.isFrozen(output), true);
      assert.deepEqual([...redactedCategories(value, 'Parent')], []);
    }
    assert.deepEqual([...selectPeopleForRole('nope', 'Parent')], []);
  });
});

describe('E-O-04 — parent linkage scoping', () => {
  const children = [
    { id: 'S-1', [DataCategory.STUDENT_PROFILE]: { name: 'A' } },
    { id: 'S-2', [DataCategory.STUDENT_PROFILE]: { name: 'B' } },
    { id: 'S-3', [DataCategory.STUDENT_PROFILE]: { name: 'C' } },
  ];

  it('returns nothing without a server-resolved scope', () => {
    assert.deepEqual([...selectLinkedChildren(children)], []);
    assert.deepEqual([...selectLinkedChildren(children, {})], []);
    assert.deepEqual([...selectLinkedChildren(children, { linkedIds: null })], []);
    assert.deepEqual([...selectLinkedChildren(children, { linkedIds: [] })], []);
  });

  it('keeps only the linked child for the one-child case', () => {
    const selected = selectLinkedChildren(children, { linkedIds: ['S-2'] });
    assert.equal(selected.length, 1);
    assert.equal(selected[0].id, 'S-2');
  });

  it('keeps several linked children for the many-children case', () => {
    const selected = selectLinkedChildren(children, { linkedIds: ['S-1', 'S-3'] });
    assert.deepEqual(selected.map((c) => c.id), ['S-1', 'S-3']);
  });

  it('ignores an unlinked id that is not present in the list', () => {
    const selected = selectLinkedChildren(children, { linkedIds: ['S-1', 'S-99'] });
    assert.deepEqual(selected.map((c) => c.id), ['S-1']);
  });

  it('returns a frozen result', () => {
    assert.equal(Object.isFrozen(selectLinkedChildren(children, { linkedIds: ['S-1'] })), true);
  });
});

describe('E-O-04 — own-record scoping for the student role', () => {
  it('returns nothing without a server-resolved own id', () => {
    assert.equal(selectOwnRecord({ id: 'S-1' }), null);
    assert.equal(selectOwnRecord({ id: 'S-1' }, {}), null);
  });

  it('returns the record only when the ids match', () => {
    assert.equal(selectOwnRecord({ id: 'S-1' }, { ownId: 'S-1' }).id, 'S-1');
    assert.equal(selectOwnRecord({ id: 'S-1' }, { ownId: 'S-2' }), null);
  });

  it('handles a malformed record', () => {
    for (const value of [null, undefined, 'x', 42, []]) {
      assert.equal(selectOwnRecord(value, { ownId: 'S-1' }), null, String(value));
    }
  });
});

describe('E-O-04 — zero, one, many children (structure only)', () => {
  it('describes the zero case', () => {
    const result = describeChildCount([]);
    assert.deepEqual({ ...result }, { count: 0, isEmpty: true, isSingle: false, isMany: false });
  });

  it('describes the one case', () => {
    const result = describeChildCount([{ id: 'S-1' }]);
    assert.deepEqual({ ...result }, { count: 1, isEmpty: false, isSingle: true, isMany: false });
  });

  it('describes the many case', () => {
    const result = describeChildCount([{ id: 'S-1' }, { id: 'S-2' }, { id: 'S-3' }]);
    assert.deepEqual({ ...result }, { count: 3, isEmpty: false, isSingle: false, isMany: true });
  });

  it('produces NO display copy, because none is approved', () => {
    // A "No children yet" string would be a new locked string.
    const result = describeChildCount([]);
    assert.deepEqual(Object.keys(result).sort(), ['count', 'isEmpty', 'isMany', 'isSingle']);
    for (const value of Object.values(result)) {
      assert.ok(
        typeof value === 'boolean' || typeof value === 'number',
        `unexpected display copy: ${String(value)}`,
      );
    }
  });

  it('treats a non-array as empty', () => {
    for (const value of [null, undefined, 'x', 42, {}]) {
      assert.equal(describeChildCount(value).isEmpty, true, String(value));
    }
  });
});

describe('E-O-04 — inactive student', () => {
  it('stays unknown unless the caller supplies the active vocabulary', () => {
    // No enrollment status enum is published, so none may be assumed.
    assert.deepEqual({ ...classifyChildStatus({ status: 'Active' }) }, {
      known: false,
      status: 'Active',
      active: false,
    });
  });

  it('classifies only against a caller-supplied vocabulary', () => {
    const options = { activeValues: ['Active'] };
    assert.equal(classifyChildStatus({ status: 'Active' }, options).active, true);
    assert.equal(classifyChildStatus({ status: 'Inactive' }, options).active, false);
    assert.equal(classifyChildStatus({ status: 'Inactive' }, options).known, true);
  });

  it('never treats an unknown status as active', () => {
    const options = { activeValues: ['Active'] };
    for (const status of ['', '   ', null, undefined, 'active', 'ACTIVE', 'unknown']) {
      const result = classifyChildStatus({ status }, options);
      assert.equal(result.active, false, String(status));
    }
  });

  it('handles a malformed record', () => {
    for (const value of [null, undefined, 'x', 42, []]) {
      assert.deepEqual({ ...classifyChildStatus(value) }, { known: false, status: null, active: false });
    }
  });
});

describe('E-O-04 — missing photo and contact', () => {
  it('reports a photo as structurally unsupported by the locked UI', () => {
    assert.deepEqual({ ...describeOptionalMedia(null) }, {
      present: false,
      kind: 'unsupported-by-locked-ui',
    });
    assert.equal(describeOptionalMedia('photo.jpg').present, true);
  });

  it('confirms no approved reference contains a photo element', () => {
    for (const [surface, source] of Object.entries(REFERENCES)) {
      assert.equal(/<img\b/.test(source), false, `${surface} must not contain an <img> element`);
    }
    // The person cell is a text initial, not an image.
    assert.match(REFERENCES[Surface.SCHOOL_DESKTOP], /const ini=n=>n\.split\(' '\)\.map\(x=>x\[0\]\)/);
  });

  it('reports contact as present-but-not-renderable outside the Staff table', () => {
    assert.deepEqual({ ...describeContact('0300 1234567') }, {
      present: true,
      renderable: false,
      reason: 'no-approved-contact-surface',
    });
    assert.equal(describeContact(null).present, false);
  });
});

describe('E-O-04 — forbidden response', () => {
  it('uses the published 403 semantic from the contract', () => {
    const doc = readFileSync(resolve(REPO_ROOT, 'backend', 'docs', 'api', 'openapi-v0.md'), 'utf8');
    assert.match(doc, /\| 403 \| Forbidden .* valid auth but insufficient scope \|/);
  });

  it('records that a real forbidden test still needs the auth contract', () => {
    assert.match(findPendingPeopleContract('guardian-linkage').blocker, /cannot establish/i);
    assert.equal(PEOPLE_INTEGRATION_AUTHORIZED, false);
  });

  it('describeAccess never includes person data', () => {
    const access = describeAccess('Parent');
    assert.doesNotMatch(JSON.stringify(access), /Synthetic|S-|name/i);
  });
});

describe('E-O-05 — mobile role landing uses only approved screens', () => {
  it('passes the drift guard', () => {
    assert.equal(assertLandingsAreApproved(), true);
  });

  it('lands every authenticated role on Home, matching the reference default', () => {
    for (const role of [Role.PARENT, Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN]) {
      assert.equal(ROLE_LANDING[role], 'Home', role);
    }
    assert.equal(ROLE_LANDING[Role.ANONYMOUS], 'Connect');
  });

  it('only ever lands on one of the five approved tabs, or the pre-auth screen', () => {
    for (const tab of Object.values(ROLE_LANDING)) {
      assert.ok(MOBILE_APP_TABS.includes(tab) || tab === 'Connect', tab);
    }
  });

  it('default-denies an unknown role', () => {
    for (const role of ['Admin', 'parent', '', null, undefined, 42]) {
      const result = resolveRoleLanding(role);
      assert.equal(result.allowed, false, String(role));
      assert.equal(result.tab, null, String(role));
      assert.equal(result.reason, 'unknown-role', String(role));
    }
  });

  it('never lands a role on a tab its own guard would refuse', () => {
    for (const role of [Role.PARENT, Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN]) {
      assert.equal(resolveRoleLanding(role).allowed, true, role);
    }
  });

  it('does not land a school role on the platform surface', () => {
    const result = resolveRoleLanding(Role.SCHOOL_ADMIN, Surface.PLATFORM);
    assert.equal(result.allowed, false);
    assert.equal(result.tab, null);
  });

  it('agrees with the reference render fallback to HOME[role]', () => {
    assert.match(REFERENCES[Surface.MOBILE_APP], /HOME\[role\]/);
  });
});

describe('E-O-03 — people binding contract', () => {
  it('passes the drift guard against all three references', () => {
    assert.equal(assertPeopleBindingsMatchReferences(REFERENCES), true);
  });

  it('never authorises creating UI', () => {
    assert.equal(assertNoPeopleElementCreation(), true);
    for (const binding of PEOPLE_BINDINGS) {
      assert.notEqual(binding.kind, 'creates-element');
    }
  });

  it('covers Students, Staff & HR and the mobile people features', () => {
    const screens = new Set(PEOPLE_BINDINGS.map((b) => b.screen));
    assert.equal(screens.has('Students'), true);
    assert.equal(screens.has('Staff & HR'), true);
    assert.equal(screens.has('students'), true);
    assert.equal(screens.has('staff'), true);
    assert.equal(screens.has('admissions'), true);
  });

  it('marks every element unpublished, because no people schema exists', () => {
    for (const binding of PEOPLE_BINDINGS) {
      assert.equal(binding.state, 'unpublished', binding.id);
      assert.equal(binding.field, null, binding.id);
    }
  });

  it('blocks the three create/detail actions rather than adding controls', () => {
    assert.deepEqual(
      blockedPeopleBindings().map((b) => b.id),
      ['PB-06', 'PB-09', 'PB-13'],
    );
  });

  it('is frozen', () => {
    assert.equal(Object.isFrozen(PEOPLE_BINDINGS), true);
    assert.throws(() => {
      'use strict';
      PEOPLE_BINDINGS.push({ id: 'PB-99' });
    });
    assert.equal(peopleBindingById('nope'), null);
  });
});

describe('no invented people contract', () => {
  it('covers every Batch E capability', () => {
    assert.deepEqual(
      PENDING_PEOPLE_CONTRACTS.map((c) => c.id).sort(),
      ['enrollment-history', 'guardian-linkage', 'staff-directory', 'student-detail', 'student-list', 'student-photo'],
    );
  });

  it('declares no endpoint or payload', () => {
    assert.equal(assertNoInventedPeopleSchemas(), true);
    for (const contract of PENDING_PEOPLE_CONTRACTS) {
      assert.equal(contract.method, null);
      assert.equal(contract.path, null);
      assert.equal(contract.requestSchema, null);
      assert.equal(contract.responseSchema, null);
      assert.equal(contract.implemented, false);
    }
  });

  it('fails closed if a schema or implementation claim appears', () => {
    const base = {
      id: 'student-list',
      status: 'blocked-needs-provisioning',
      method: null,
      path: null,
      requestSchema: null,
      responseSchema: null,
      implemented: false,
    };
    assert.throws(() => assertNoInventedPeopleSchemas([{ ...base, path: '/students' }]));
    assert.throws(() => assertNoInventedPeopleSchemas([{ ...base, method: 'GET' }]));
    assert.throws(() => assertNoInventedPeopleSchemas([{ ...base, responseSchema: { data: [] } }]));
    assert.throws(() => assertNoInventedPeopleSchemas([{ ...base, implemented: true }]));
    assert.doesNotThrow(() => assertNoInventedPeopleSchemas([base]));
  });

  it('records the guardian linkage as the critical privacy dependency', () => {
    const linkage = findPendingPeopleContract('guardian-linkage');
    assert.equal(linkage.implemented, false);
    assert.match(linkage.blocker, /most important privacy dependency/);
  });
});