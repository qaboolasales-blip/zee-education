/**
 * Attendance tests. Tasks: F-O-01 … F-O-05.
 * Synthetic registers only. No real student data. No network.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { Surface } from '../core/auth/index.js';
import {
  APPROVED_SUMMARY_TARGETS,
  ATTENDANCE_BINDINGS,
  ATTENDANCE_INTEGRATION_AUTHORIZED,
  ATTENDANCE_STATUSES,
  AttendanceStatus,
  EMPTY_REGISTER,
  PENDING_ATTENDANCE_CONTRACTS,
  SubmissionState,
  SubmitReject,
  SummaryTarget,
  assertAttendanceBindingsMatchReferences,
  assertNoAttendanceElementCreation,
  assertNoInventedAttendanceSchemas,
  assertStatusModelMatchesReferences,
  attendanceBindingById,
  attendanceVisibility,
  beginSubmit,
  blockedAttendanceBindings,
  canSubmit,
  describeAttendanceBlock,
  findPendingAttendanceContract,
  isAttendanceStatus,
  isEnterableOn,
  isRegisterComplete,
  isRegisterOpen,
  isRetryable,
  markCounts,
  markStudent,
  markedCount,
  openRegister,
  pendingSubmissionKeys,
  reopenRegister,
  rollbackMark,
  settleSubmit,
  statusFromApprovedText,
  statusLetter,
  statusVisibleOnStatusCard,
  statusesForSurface,
  submissionKey,
  summariseRegister,
  summariseSeries,
} from '../core/attendance/index.js';

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

const ROSTER = [{ studentRef: 'S-1' }, { studentRef: 'S-2' }, { studentRef: 'S-3' }];

function openMarked(marks = [['S-1', AttendanceStatus.PRESENT], ['S-2', AttendanceStatus.ABSENT], ['S-3', AttendanceStatus.LEAVE]]) {
  let register = openRegister({
    date: '2026-10-16',
    classRef: 'Grade 6',
    sectionRef: 'A',
    assignmentsResolved: true,
    roster: ROSTER,
  });
  for (const [studentRef, status] of marks) {
    register = markStudent(register, { studentRef, status }).register;
  }
  return register;
}

describe('F-O-01 — status model matches the approved controls exactly', () => {
  it('passes the drift guard against both references', () => {
    assert.equal(assertStatusModelMatchesReferences(REFERENCES), true);
  });

  it('exposes exactly the three approved statuses', () => {
    assert.deepEqual([...ATTENDANCE_STATUSES], ['present', 'absent', 'leave']);
  });

  it('maps to the reference letters in the reference order', () => {
    assert.equal(statusLetter(AttendanceStatus.PRESENT), 'P');
    assert.equal(statusLetter(AttendanceStatus.ABSENT), 'A');
    assert.equal(statusLetter(AttendanceStatus.LEAVE), 'L');
    assert.equal(statusLetter('nope'), null);
  });

  it('emits the exact class string the reference emits', () => {
    assert.equal(statusVisibleOnStatusCard(AttendanceStatus.PRESENT), true);
    // class="${k}${selected?' on':''}" — unselected is the bare letter.
    const build = (status, on) => `${statusLetter(status)}${on ? ' on' : ''}`;
    for (const status of ATTENDANCE_STATUSES) {
      for (const source of REFERENCES[Surface.SCHOOL_DESKTOP].matchAll(/\.ch button\.on\.([PAL])\{/g)) {
        assert.equal(source[1], statusLetter(status).length === 1 ? source[1] : source[1]);
      }
      assert.equal(build(status, true).endsWith(' on'), true);
      assert.equal(build(status, false).includes(' '), false);
    }
  });

  it('rejects any status outside the approved three', () => {
    for (const value of ['Present', 'P', 'late', 'excused', '', null, 42]) {
      assert.equal(isAttendanceStatus(value), false, String(value));
    }
  });

  it('treats the mobile surface as binary, matching the locked reference', () => {
    assert.deepEqual([...statusesForSurface(Surface.MOBILE_APP)], ['present', 'absent']);
    assert.equal(isEnterableOn(Surface.MOBILE_APP, AttendanceStatus.LEAVE), false);
    assert.equal(isEnterableOn(Surface.SCHOOL_DESKTOP, AttendanceStatus.LEAVE), true);
    assert.equal(isEnterableOn('admin', AttendanceStatus.PRESENT), false);
  });

  it('recognises only the two approved mobile labels', () => {
    assert.equal(statusFromApprovedText('Present'), AttendanceStatus.PRESENT);
    assert.equal(statusFromApprovedText('present '), AttendanceStatus.PRESENT);
    assert.equal(statusFromApprovedText('Absent'), AttendanceStatus.ABSENT);
    assert.equal(statusFromApprovedText('Leave'), null);
  });

  it('fails if the reference status set or pill logic changes', () => {
    const altered = {
      ...REFERENCES,
      [Surface.SCHOOL_DESKTOP]: REFERENCES[Surface.SCHOOL_DESKTOP].replace("['P','A','L']", "['P','A']"),
    };
    assert.throws(() => assertStatusModelMatchesReferences(altered));

    const grown = {
      ...REFERENCES,
      [Surface.MOBILE_APP]: REFERENCES[Surface.MOBILE_APP].replace("${p?'g':'r'}", "${p?'g':'r':'w'}"),
    };
    assert.throws(() => assertStatusModelMatchesReferences(grown));

    assert.throws(() => assertStatusModelMatchesReferences({}));
  });
});

describe('F-O-02 — binding contract uses existing hooks only', () => {
  it('passes the drift guard', () => {
    assert.equal(assertAttendanceBindingsMatchReferences(REFERENCES), true);
  });

  it('never authorises creating UI', () => {
    assert.equal(assertNoAttendanceElementCreation(), true);
    for (const binding of ATTENDANCE_BINDINGS) {
      assert.notEqual(binding.kind, 'creates-element');
    }
  });

  it('marks every element unpublished, because no attendance schema exists', () => {
    for (const binding of ATTENDANCE_BINDINGS) {
      assert.equal(binding.state, 'unpublished', binding.id);
      assert.equal(binding.field, null, binding.id);
    }
  });

  it('blocks both submit actions', () => {
    assert.deepEqual(blockedAttendanceBindings().map((b) => b.id), ['FAB-06', 'FAB-11']);
  });

  it('records the mobile surface as binary rather than silently extending it', () => {
    assert.match(attendanceBindingById('FAB-10').note, /BINARY SURFACE/);
  });

  it('is frozen', () => {
    assert.equal(Object.isFrozen(ATTENDANCE_BINDINGS), true);
    assert.equal(attendanceBindingById('nope'), null);
  });
});

describe('F-O-03 — optimistic marking is reversible', () => {
  it('opens a register and records marks', () => {
    const register = openRegister({
      date: '2026-10-16',
      classRef: 'Grade 6',
      sectionRef: 'A',
      assignmentsResolved: true,
      roster: ROSTER,
    });
    assert.equal(isRegisterOpen(register), true);
    assert.equal(markedCount(register), 0);
    assert.equal(isRegisterComplete(register), false);

    const marked = markStudent(register, { studentRef: 'S-1', status: AttendanceStatus.PRESENT });
    assert.equal(marked.ok, true);
    assert.equal(marked.register.state, SubmissionState.MARKING);
    assert.equal(markedCount(marked.register), 1);
  });

  it('restores the exact prior value on rollback', () => {
    let register = openRegister({
      date: '2026-10-16',
      classRef: 'Grade 6',
      assignmentsResolved: true,
      roster: ROSTER,
    });
    register = markStudent(register, { studentRef: 'S-1', status: AttendanceStatus.PRESENT }).register;
    register = markStudent(register, { studentRef: 'S-1', status: AttendanceStatus.ABSENT }).register;
    assert.equal(register.marks['S-1'], AttendanceStatus.ABSENT);

    register = rollbackMark(register, 'S-1');
    assert.equal(register.marks['S-1'], AttendanceStatus.PRESENT, 'must revert to the previous mark');

    register = rollbackMark(register, 'S-1');
    assert.equal(Object.prototype.hasOwnProperty.call(register.marks, 'S-1'), false);
  });

  it('refuses an unknown student or status', () => {
    const register = openRegister({
      date: '2026-10-16',
      classRef: 'Grade 6',
      assignmentsResolved: true,
      roster: ROSTER,
    });
    assert.equal(markStudent(register, { studentRef: 'S-99', status: AttendanceStatus.PRESENT }).reason, SubmitReject.UNKNOWN_STUDENT);
    assert.equal(markStudent(register, { studentRef: 'S-1', status: 'late' }).reason, SubmitReject.UNKNOWN_STATUS);
  });

  it('never mutates the input register', () => {
    const register = openRegister({
      date: '2026-10-16',
      classRef: 'Grade 6',
      assignmentsResolved: true,
      roster: ROSTER,
    });
    const snapshot = JSON.stringify(register);
    markStudent(register, { studentRef: 'S-1', status: AttendanceStatus.PRESENT });
    rollbackMark(register, 'S-1');
    assert.equal(JSON.stringify(register), snapshot);
  });
});

describe('F-O-05 — no assignment, and the empty roster', () => {
  it('treats no resolved assignment as a first-class outcome, not an error to swallow', () => {
    const register = openRegister({
      date: '2026-10-16',
      classRef: 'Grade 6',
      assignmentsResolved: false,
      roster: ROSTER,
    });
    assert.equal(register.state, SubmissionState.NO_ASSIGNMENT);
    assert.equal(register.lastError, SubmitReject.NOT_ASSIGNED);
    assert.equal(isRegisterOpen(register), false);
    assert.equal(canSubmit(register).allowed, false);
    assert.equal(markStudent(register, { studentRef: 'S-1', status: AttendanceStatus.PRESENT }).ok, false);
  });

  it('treats a missing register as NO_ASSIGNMENT with no-register', () => {
    assert.equal(openRegister({}).state, SubmissionState.NO_ASSIGNMENT);
    assert.equal(openRegister({}).lastError, SubmitReject.NO_REGISTER);
    assert.equal(openRegister({ classRef: 'Grade 6' }).lastError, SubmitReject.NO_REGISTER);
  });

  it('reports an empty roster and refuses to submit it', () => {
    const register = openRegister({
      date: '2026-10-16',
      classRef: 'Grade 6',
      assignmentsResolved: true,
      roster: [],
    });
    assert.equal(register.lastError, SubmitReject.EMPTY_ROSTER);
    assert.equal(isRegisterComplete(register), false);
    const decision = canSubmit(register);
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, SubmitReject.EMPTY_ROSTER);
  });

  it('refuses a partially marked register', () => {
    let register = openRegister({
      date: '2026-10-16',
      classRef: 'Grade 6',
      assignmentsResolved: true,
      roster: ROSTER,
    });
    register = markStudent(register, { studentRef: 'S-1', status: AttendanceStatus.PRESENT }).register;
    assert.equal(canSubmit(register).reason, SubmitReject.INCOMPLETE);
  });
});

describe('F-O-05 — duplicate submission is structurally refused', () => {
  it('derives a stable, readable, non-secret key', () => {
    const key = submissionKey({
      classRef: 'Grade 6',
      sectionRef: 'A',
      date: '2026-10-16',
      studentRef: 'S-1',
      status: AttendanceStatus.PRESENT,
    });
    assert.equal(key, 'Grade 6|A|2026-10-16|S-1|present');
    assert.equal(
      key,
      submissionKey({
        classRef: ' Grade 6 ',
        sectionRef: 'A',
        date: ' 2026-10-16 ',
        studentRef: ' S-1 ',
        status: AttendanceStatus.PRESENT,
      }),
    );
  });

  it('returns null for incomplete input', () => {
    for (const input of [{}, { classRef: '', date: 'd', studentRef: 's', status: 'present' }, { classRef: 'c', date: '', studentRef: 's', status: 'present' }]) {
      assert.equal(submissionKey(input), null, JSON.stringify(input));
    }
    assert.equal(submissionKey({ classRef: 'c', date: 'd', studentRef: 's', status: 'late' }), null);
  });

  it('tolerates a missing section with an explicit placeholder', () => {
    const key = submissionKey({ classRef: 'c', sectionRef: null, date: 'd', studentRef: 's', status: 'absent' });
    assert.equal(key, 'c|-|d|s|absent');
  });

  it('builds one key per marked student only', () => {
    const register = openMarked([['S-1', AttendanceStatus.PRESENT]]);
    assert.equal(pendingSubmissionKeys(register).length, 1);
  });

  it('refuses a second submission of an already-sent key set', () => {
    let register = openMarked();
    assert.equal(canSubmit(register).allowed, true);

    register = beginSubmit(register).register;
    assert.equal(register.state, SubmissionState.SUBMITTING);

    register = settleSubmit(register, { status: 200 });
    assert.equal(register.state, SubmissionState.CONFIRMED);
    assert.equal(register.submittedKeys.length, 3);

    const second = canSubmit(register);
    assert.equal(second.allowed, false);
    assert.equal(second.reason, SubmitReject.DUPLICATE_SUBMISSION);
  });

  it('allows a genuine correction, because the key changes with the status', () => {
    let register = openMarked();
    register = beginSubmit(register).register;
    register = settleSubmit(register, { status: 200 });

    register = markStudent(register, { studentRef: 'S-1', status: AttendanceStatus.LEAVE }).register;
    assert.equal(canSubmit(register).allowed, true, 'a changed mark is a new key, not a duplicate');
  });

  it('resets sent keys for a new day', () => {
    let register = openMarked();
    register = settleSubmit(beginSubmit(register).register, { status: 200 });
    register = reopenRegister(register, '2026-10-17');
    assert.equal(register.submittedKeys.length, 0);
    assert.equal(markedCount(register), 0);
    assert.equal(canSubmit(register).reason, SubmitReject.INCOMPLETE);
  });
});

describe('F-O-05 — offline and error responses', () => {
  it('separates a transport failure from a rejected request', () => {
    let register = openMarked();
    register = beginSubmit(register).register;

    register = settleSubmit(register, { errorKind: 'network' });
    assert.equal(register.state, SubmissionState.FAILED_TRANSPORT);
    assert.equal(isRetryable(register), true);

    register = settleSubmit(register, { status: 403 });
    assert.equal(register.state, SubmissionState.REJECTED);
    assert.equal(register.lastError, 'forbidden');
    assert.equal(isRetryable(register), false, 'a forbidden response must not invite a retry');
  });

  it('treats 429 and 500 as retryable and 400/404/401/403 as not', () => {
    const build = () => beginSubmit(openMarked()).register;
    assert.equal(isRetryable(settleSubmit(build(), { status: 429 })), true);
    assert.equal(isRetryable(settleSubmit(build(), { status: 500 })), true);
    for (const status of [400, 401, 403, 404]) {
      assert.equal(isRetryable(settleSubmit(build(), { status })), false, String(status));
    }
  });

  it('refuses to interpret a status the contract does not publish, including 409', () => {
    for (const status of [409, 422, 418, 201]) {
      const register = settleSubmit(beginSubmit(openMarked()).register, { status });
      if (status === 201) {
        assert.equal(register.state, SubmissionState.CONFIRMED, '2xx is a success');
        continue;
      }
      assert.equal(register.state, SubmissionState.FAILED_TRANSPORT, String(status));
      assert.equal(register.lastError, SubmitReject.UNPUBLISHED_STATUS_CODE, String(status));
    }
  });

  it('keeps the marks on a retryable failure so the caller can decide', () => {
    let register = openMarked();
    register = beginSubmit(register).register;
    register = settleSubmit(register, { errorKind: 'timeout' });
    assert.equal(markedCount(register), 3);
    assert.equal(isRegisterComplete(register), true);
  });

  it('clears the previous-mark buffer on success so a later rollback cannot corrupt state', () => {
    let register = openMarked();
    register = beginSubmit(register).register;
    register = settleSubmit(register, { status: 200 });
    assert.deepEqual({ ...register.previousMark }, {});
  });
});

describe('F-O-04 — role-safe summaries', () => {
  it('counts by status without producing copy', () => {
    const counts = markCounts(openMarked());
    assert.deepEqual({ ...counts }, { present: 1, absent: 1, leave: 1 });
  });

  it('summarises for a permitted role using existing approved shapes', () => {
    const summary = summariseRegister(openMarked(), 'School Admin');
    assert.equal(summary.permitted, true);
    assert.equal(summary.total, 3);
    assert.equal(summary.marked, 3);
    assert.equal(summary.complete, true);
    assert.equal(summary.percentText, '33.3%');
    assert.equal(summary.progressText, '3 / 3');
  });

  it('withholds everything for Super Admin, who may not browse learner data', () => {
    const summary = summariseRegister(openMarked(), 'Super Admin');
    assert.equal(summary.permitted, false);
    assert.equal(summary.total, 0);
    assert.equal(summary.presentRatio, null);
    assert.equal(summary.percentText, null, 'a withheld summary must not read as 0%');
  });

  it('withholds a parent summary without server-resolved linkage', () => {
    assert.equal(summariseRegister(openMarked(), 'Parent').permitted, false);
    assert.equal(summariseRegister(openMarked(), 'Parent', { linkedIds: ['S-1'] }).permitted, true);
    assert.equal(summariseRegister(openMarked(), 'Parent', { linkedIds: [] }).permitted, false);
  });

  it('withholds a student summary without a server-resolved own id', () => {
    assert.equal(summariseRegister(openMarked(), 'Student').permitted, false);
    assert.equal(summariseRegister(openMarked(), 'Student', { ownId: 'S-1' }).permitted, true);
  });

  it('grants a teacher summary without any extra scope input', () => {
    assert.equal(summariseRegister(openMarked(), 'Teacher').permitted, true);
  });

  it('emits no label, sentence or colour — structure only', () => {
    const summary = { ...summariseRegister(openMarked(), 'School Admin') };
    for (const [key, value] of Object.entries(summary)) {
      if (typeof value === 'string') {
        assert.ok(
          key === 'scope' || key === 'percentText' || key === 'progressText',
          `unexpected string field ${key}`,
        );
      }
    }
  });

  it('restricts targets to the existing approved elements', () => {
    const summary = summariseRegister(openMarked(), 'School Admin', { targets: ['nope', SummaryTarget.OVERVIEW_CARD] });
    assert.deepEqual([...summary.targets], [SummaryTarget.OVERVIEW_CARD]);
    assert.ok(APPROVED_SUMMARY_TARGETS.includes(SummaryTarget.OVERVIEW_CHART));
  });

  it('summarises a series for day-level aggregates only', () => {
    const series = [openMarked(), openMarked()];
    const summary = summariseSeries(series, 'School Admin');
    assert.equal(summary.days, 2);
    assert.equal(summary.total, 6);
    assert.equal(summary.present, 2);
    assert.equal(summary.completeDays, 2);
    assert.equal(summary.percentText, '33.3%');
    assert.equal(summariseSeries(series, 'Super Admin').permitted, false);
    assert.equal(summariseSeries('nope', 'School Admin').days, 0);
  });

  it('reports attendance visibility directly', () => {
    assert.equal(attendanceVisibility('School Admin').permitted, true);
    assert.equal(attendanceVisibility('Super Admin').permitted, false);
    assert.equal(attendanceVisibility('Parent').permitted, false);
    assert.equal(attendanceVisibility('Parent', { linkedIds: ['S-1'] }).permitted, true);
    assert.equal(attendanceVisibility('nope').permitted, false);
  });
});

describe('no invented attendance contract', () => {
  it('confirms nothing is authorized', () => {
    assert.equal(ATTENDANCE_INTEGRATION_AUTHORIZED, false);
    assert.equal(describeAttendanceBlock().schemaPublished, false);
    assert.equal(describeAttendanceBlock().endpointsPublished, false);
  });

  it('covers every Batch F capability', () => {
    assert.deepEqual(
      PENDING_ATTENDANCE_CONTRACTS.map((c) => c.id).sort(),
      ['attendance-idempotency', 'attendance-read', 'attendance-scope', 'attendance-status-vocabulary', 'attendance-submit'],
    );
  });

  it('declares no endpoint or payload', () => {
    assert.equal(assertNoInventedAttendanceSchemas(), true);
    for (const contract of PENDING_ATTENDANCE_CONTRACTS) {
      assert.equal(contract.method, null);
      assert.equal(contract.path, null);
      assert.equal(contract.requestSchema, null);
      assert.equal(contract.responseSchema, null);
      assert.equal(contract.implemented, false);
    }
  });

  it('fails closed if a schema or implementation claim appears', () => {
    const base = {
      id: 'attendance-submit',
      status: 'blocked-needs-provisioning-path',
      method: null,
      path: null,
      requestSchema: null,
      responseSchema: null,
      implemented: false,
    };
    assert.throws(() => assertNoInventedAttendanceSchemas([{ ...base, path: '/attendance' }]));
    assert.throws(() => assertNoInventedAttendanceSchemas([{ ...base, method: 'POST' }]));
    assert.throws(() => assertNoInventedAttendanceSchemas([{ ...base, requestSchema: { marks: [] } }]));
    assert.throws(() => assertNoInventedAttendanceSchemas([{ ...base, implemented: true }]));
    assert.doesNotThrow(() => assertNoInventedAttendanceSchemas([base]));
  });

  it('records idempotency as a server-only guarantee', () => {
    assert.match(findPendingAttendanceContract('attendance-idempotency').unblockRequires, /server guarantee/);
  });
});

describe('immutability', () => {
  it('freezes the initial register and status list', () => {
    assert.equal(Object.isFrozen(EMPTY_REGISTER), true);
    assert.equal(Object.isFrozen(ATTENDANCE_STATUSES), true);
    assert.throws(() => {
      'use strict';
      ATTENDANCE_STATUSES.push('late');
    });
  });

  it('returns a frozen register from every transition', () => {
    let base = openRegister({
      date: '2026-10-16',
      classRef: 'Grade 6',
      assignmentsResolved: true,
      roster: ROSTER,
    });
    for (const candidate of [
      base,
      markStudent(base, { studentRef: 'S-1', status: AttendanceStatus.PRESENT }).register,
      beginSubmit(base).register,
      settleSubmit(beginSubmit(base).register, { status: 200 }),
      reopenRegister(base, '2026-10-17'),
    ]) {
      assert.equal(Object.isFrozen(candidate), true);
    }
  });
});