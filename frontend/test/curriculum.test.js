/**
 * Curriculum tests. Tasks: G-O-01 … G-O-05.
 * Synthetic data only. No network. No rendering.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { Surface } from '../core/auth/index.js';
import {
  ALLOWED_MEDIA_TYPES,
  APPROVED_NAVIGATION,
  APPROVED_SHARE_TRIGGERS,
  CURRICULUM_BINDINGS,
  CURRICULUM_INTEGRATION_AUTHORIZED,
  CurriculumReject,
  EMPTY_TIMETABLE,
  HomeworkState,
  LOCKED_PERIODS,
  LOCKED_WEEKDAYS,
  NoticeAudience,
  NoticeState,
  PENDING_CURRICULUM_CONTRACTS,
  SUBJECT_ACCENTS,
  SUBJECT_CODES,
  SUBJECT_LABELS,
  ShareKind,
  ShareReject,
  SubjectCode,
  assertCurriculumBindingsMatchReferences,
  assertNoCurriculumElementCreation,
  assertNoInventedCurriculumSchemas,
  assertNoUnofficialAutomation,
  assertSubjectModelMatchesReferences,
  buildTimetable,
  canRoleSeeNotice,
  classifyHomework,
  classifyNotice,
  classifyPdfOutcome,
  curriculumBindingById,
  dayPeriods,
  daySlotCount,
  describeCurriculumBlock,
  findPendingCurriculumContract,
  isApprovedNavEntry,
  isPeriodTime,
  isSubjectCode,
  periodMinutes,
  sortPeriods,
  subjectAccent,
  subjectCellStyle,
  subjectLabel,
  timetableSlot,
  validateNavigationChange,
  validateShareRequest,
} from '../core/curriculum/index.js';
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
  [Surface.SCHOOL_DESKTOP]: readReference('School Dashboard'),
  [Surface.MOBILE_APP]: readReference('Mobile App Preview'),
  [Surface.PLATFORM]: readReference('Super Admin'),
});

const SLOTS = [
  { weekday: 'Mon', period: '08:30', subjectCode: SubjectCode.MATHEMATICS },
  { weekday: 'Mon', period: '09:20', subjectCode: SubjectCode.SCIENCE },
  { weekday: 'Tue', period: '10:10', subjectCode: SubjectCode.ENGLISH },
];

describe('G-O-01 — subject model matches the approved reference exactly', () => {
  it('passes the drift guard', () => {
    assert.equal(assertSubjectModelMatchesReferences(REFERENCES[Surface.SCHOOL_DESKTOP]), true);
  });

  it('carries the four approved subjects with their exact accents', () => {
    assert.deepEqual([...SUBJECT_CODES].sort(), ['E', 'M', 'S', 'U']);
    assert.deepEqual({ ...SUBJECT_LABELS }, {
      M: 'Mathematics',
      S: 'Science',
      E: 'English',
      U: 'Urdu',
    });
    assert.deepEqual({ ...SUBJECT_ACCENTS }, {
      M: '#3b82f6',
      S: '#10b981',
      E: '#8b5cf6',
      U: '#f59e0b',
    });
  });

  it('emits only the --c declaration the reference applies to a cell', () => {
    assert.deepEqual({ ...subjectCellStyle(SubjectCode.SCIENCE) }, { '--c': '#10b981' });
    assert.equal(subjectCellStyle('nope'), null);
    for (const code of SUBJECT_CODES) {
      const style = subjectCellStyle(code);
      assert.deepEqual(Object.keys(style), ['--c']);
    }
  });

  it('never conflates subject accents with school branding', () => {
    // Branding lives in --brand/--brand2 and is handled by the theme module.
    const declared = SUBJECT_CODES.flatMap((code) => Object.keys(subjectCellStyle(code)));
    assert.deepEqual(declared, SUBJECT_CODES.map(() => '--c'));
  });

  it('rejects an unknown subject code', () => {
    for (const value of ['X', 'mathematics', '', null, 42]) {
      assert.equal(isSubjectCode(value), false, String(value));
      assert.equal(subjectLabel(value), null, String(value));
      assert.equal(subjectAccent(value), null, String(value));
    }
  });

  it('validates and orders period times', () => {
    assert.equal(isPeriodTime('08:30'), true);
    for (const value of ['8:30', '24:00', '08:60', '', null]) {
      assert.equal(isPeriodTime(value), false, String(value));
    }
    assert.equal(periodMinutes('08:30'), 510);
    assert.equal(periodMinutes('nope'), null);
    assert.deepEqual([...sortPeriods(['10:10', '08:30', '09:20', 'bad'])], ['08:30', '09:20', '10:10']);
  });

  it('fails if the reference palette or periods change', () => {
    const altered = REFERENCES[Surface.SCHOOL_DESKTOP].replace("M:'#3b82f6'", "M:'#3b82f7'");
    assert.throws(() => assertSubjectModelMatchesReferences(altered));
    assert.throws(() => assertSubjectModelMatchesReferences(''));
  });
});

describe('G-O-01 — timetable model', () => {
  it('keeps the fixed five weekday columns and the locked period set', () => {
    const timetable = buildTimetable(SLOTS);
    assert.equal(timetable.hasTimetable, true);
    assert.deepEqual([...timetable.weekdays], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    assert.equal(LOCKED_WEEKDAYS.length, 5);
    assert.deepEqual([...LOCKED_PERIODS], ['08:30', '09:20', '10:10']);
  });

  it('exposes existing cells and null for empty ones', () => {
    const timetable = buildTimetable(SLOTS);
    assert.equal(timetableSlot(timetable, 'Mon', '08:30').subjectCode, SubjectCode.MATHEMATICS);
    assert.equal(timetableSlot(timetable, 'Wed', '08:30'), null);
    assert.equal(daySlotCount(timetable, 'Mon'), 2);
    assert.equal(daySlotCount(timetable, 'Fri'), 0);
    assert.deepEqual([...dayPeriods(timetable, 'Mon')], ['08:30', '09:20']);
  });

  it('never lets a duplicate fill a cell twice', () => {
    const timetable = buildTimetable([...SLOTS, { weekday: 'Mon', period: '08:30', subjectCode: SubjectCode.URDU }]);
    assert.equal(timetableSlot(timetable, 'Mon', '08:30').subjectCode, SubjectCode.MATHEMATICS);
    assert.equal(timetable.filled, 3);
  });

  it('drops malformed slots rather than rendering them', () => {
    const timetable = buildTimetable([
      ...SLOTS,
      { weekday: 'Sat', period: '08:30', subjectCode: SubjectCode.URDU },
      { weekday: 'Mon', period: '99:99', subjectCode: SubjectCode.URDU },
      { weekday: 'Mon', period: '08:30', subjectCode: 'X' },
      null,
    ]);
    assert.equal(timetable.filled, 3);
  });

  it('reports no timetable as a real, non-empty state', () => {
    assert.deepEqual({ ...EMPTY_TIMETABLE }, {
      hasTimetable: false,
      reason: CurriculumReject.NO_TIMETABLE,
      periods: [],
      weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      slots: [],
      filled: 0,
      capacity: 0,
    });
    assert.equal(buildTimetable([]).hasTimetable, false);
    assert.equal(buildTimetable(null).hasTimetable, false);
    assert.equal(buildTimetable([{ weekday: 'Sat', period: '08:30', subjectCode: 'M' }]).reason, CurriculumReject.EMPTY_TIMETABLE);
    assert.equal(timetableSlot(EMPTY_TIMETABLE, 'Mon', '08:30'), null);
  });

  it('returns a frozen result', () => {
    assert.equal(Object.isFrozen(buildTimetable(SLOTS)), true);
    assert.equal(Object.isFrozen(buildTimetable(SLOTS).slots), true);
  });
});

describe('G-O-04 — homework and notice states', () => {
  const NOW = '2026-10-16T12:00:00Z'; // 17:00 Asia/Karachi

  it('classifies homework against its due date', () => {
    assert.equal(classifyHomework({ dueAt: '2026-10-18T06:00:00Z' }, { now: NOW }).state, HomeworkState.OPEN);
    assert.equal(classifyHomework({ dueAt: '2026-10-16T18:00:00Z' }, { now: NOW }).state, HomeworkState.DUE_SOON);
    assert.equal(classifyHomework({ dueAt: '2026-10-15T06:00:00Z' }, { now: NOW }).state, HomeworkState.OVERDUE);
    assert.equal(classifyHomework({ dueAt: '2026-10-18T06:00:00Z', closedAt: '2026-10-17T00:00:00Z' }, { now: NOW }).state, HomeworkState.CLOSED);
  });

  it('reports unknown rather than guessing when no due date exists', () => {
    const result = classifyHomework({}, { now: NOW });
    assert.equal(result.known, false);
    assert.equal(result.state, null);
  });

  it('computes the remaining time as an exact instant delta', () => {
    // A delta between two instants is timezone-independent by construction, so no
    // bug is possible here — this test pins the exact value. Asia/Karachi matters
    // for DATE rendering and end-of-day cut-offs (covered in
    // core/format/datetime.js), not for elapsed time between two instants.
    const result = classifyHomework({ dueAt: '2026-10-16T19:00:00Z' }, { now: '2026-10-16T18:00:00Z' });
    assert.equal(result.minutesRemaining, 60);
    assert.equal(result.state, HomeworkState.DUE_SOON, 'inside the 24h due-soon window');
  });

  it('still crosses the Karachi midnight boundary correctly', () => {
    // 2026-10-16T19:00Z is 2026-10-17 00:00 in Asia/Karachi.
    const result = classifyHomework({ dueAt: '2026-10-16T19:00:00Z' }, { now: '2026-10-16T18:30:00Z' });
    assert.equal(result.state, HomeworkState.DUE_SOON);
    assert.equal(result.minutesRemaining, 30);
    // One minute earlier it is still ahead, not overdue.
    assert.equal(
      classifyHomework({ dueAt: '2026-10-16T19:00:00Z' }, { now: '2026-10-16T18:58:00Z' }).state,
      HomeworkState.DUE_SOON,
    );
  });

  it('honours a custom due-soon window', () => {
    const soon = { dueAt: '2026-10-16T19:00:00Z' };
    assert.equal(classifyHomework(soon, { now: '2026-10-16T18:00:00Z' }).state, HomeworkState.DUE_SOON);
    assert.equal(
      classifyHomework(soon, { now: '2026-10-16T18:00:00Z', dueSoonHours: 0.5 }).state,
      HomeworkState.OPEN,
    );
  });

  it('flags an expired notice as expired, and never as current', () => {
    const expired = classifyNotice({ publishedAt: '2026-10-01T00:00:00Z', expiresAt: '2026-10-10T00:00:00Z' }, { now: NOW });
    assert.equal(expired.state, NoticeState.EXPIRED);
    assert.equal(expired.expired, true);
  });

  it('handles current, not-yet and no-expiry notices', () => {
    assert.equal(classifyNotice({ publishedAt: '2026-10-01T00:00:00Z', expiresAt: '2026-11-01T00:00:00Z' }, { now: NOW }).state, NoticeState.CURRENT);
    assert.equal(classifyNotice({ publishedAt: '2026-11-01T00:00:00Z', expiresAt: '2026-12-01T00:00:00Z' }, { now: NOW }).state, NoticeState.NOT_YET);
    assert.equal(classifyNotice({}, { now: NOW }).state, NoticeState.NO_EXPIRY);
  });

  it('denies a notice to an unknown audience', () => {
    assert.equal(canRoleSeeNotice('Parent', { audience: 'everyone' }), false);
    assert.equal(canRoleSeeNotice('Parent', {}), false);
  });

  it('applies the approved audience rules', () => {
    assert.equal(canRoleSeeNotice('Parent', { audience: NoticeAudience.ALL_SCHOOL }), true);
    assert.equal(canRoleSeeNotice('Student', { audience: NoticeAudience.STAFF }), false);
    assert.equal(canRoleSeeNotice('Teacher', { audience: NoticeAudience.STAFF }), true);
    assert.equal(canRoleSeeNotice('Parent', { audience: NoticeAudience.GUARDIANS }), true);
    assert.equal(canRoleSeeNotice('Student', { audience: NoticeAudience.GUARDIANS }), false);
    assert.equal(canRoleSeeNotice('Student', { audience: NoticeAudience.STUDENTS }), true);
  });

  it('never assumes class membership for a scoped notice', () => {
    const scoped = { audience: NoticeAudience.CLASS, classRef: 'Grade 6' };
    assert.equal(canRoleSeeNotice('Teacher', scoped), false, 'no assignment scope means deny');
    assert.equal(canRoleSeeNotice('Teacher', scoped, { assignedClassRefs: [] }), false);
    assert.equal(canRoleSeeNotice('Teacher', scoped, { assignedClassRefs: ['Grade 6'] }), true);
    assert.equal(canRoleSeeNotice('Teacher', scoped, { assignedClassRefs: ['Grade 5'] }), false);
  });

  it('also needs a section for a section-scoped notice', () => {
    const scoped = { audience: NoticeAudience.SECTION, classRef: 'Grade 6', sectionRef: 'A' };
    assert.equal(canRoleSeeNotice('Teacher', scoped, { assignedClassRefs: ['Grade 6'] }), false);
    assert.equal(
      canRoleSeeNotice('Teacher', scoped, { assignedClassRefs: ['Grade 6'], assignedSectionRefs: ['A'] }),
      true,
    );
    assert.equal(
      canRoleSeeNotice('Teacher', scoped, { assignedClassRefs: ['Grade 6'], assignedSectionRefs: ['B'] }),
      false,
    );
  });
});

describe('G-O-03 — manual PDF share boundary (V1)', () => {
  const base = {
    triggerId: 'TRG-03',
    kind: ShareKind.PDF_USER_SHARE,
    userInitiated: true,
    mediaType: 'application/pdf',
    documentRef: 'result:student:2026-10',
  };

  it('permits a user-initiated PDF share from an approved control', () => {
    const result = validateShareRequest(base);
    assert.equal(result.allowed, true);
    assert.equal(result.value.manual, true);
    assert.equal(result.value.userInitiated, true);
    assert.equal(Object.isFrozen(result), true);
  });

  it('refuses anything that is not user initiated — the defining V1 property', () => {
    for (const value of [undefined, false, null, 'yes', 1]) {
      const result = validateShareRequest({ ...base, userInitiated: value });
      assert.equal(result.allowed, false, String(value));
      assert.equal(result.reason, ShareReject.NOT_USER_INITIATED, String(value));
    }
  });

  it('refuses any named destination, so code never chooses the channel', () => {
    for (const destination of ['whatsapp', 'WhatsApp', 'sms', 'email', 'telegram']) {
      const result = validateShareRequest({ ...base, destination });
      assert.equal(result.allowed, false, destination);
      assert.equal(result.reason, ShareReject.AUTOMATION_FORBIDDEN, destination);
    }
  });

  it('refuses a non-PDF media type', () => {
    for (const mediaType of ['image/png', 'text/plain', 'application/json', '']) {
      const result = validateShareRequest({ ...base, mediaType });
      assert.equal(result.allowed, false, mediaType);
      assert.equal(result.reason, ShareReject.MEDIA_TYPE_NOT_ALLOWED, mediaType);
    }
    assert.deepEqual([...ALLOWED_MEDIA_TYPES], ['application/pdf']);
  });

  it('refuses an unknown trigger or a kind that control does not offer', () => {
    assert.equal(validateShareRequest({ ...base, triggerId: 'TRG-99' }).reason, ShareReject.UNKNOWN_TRIGGER);
    assert.equal(validateShareRequest({ ...base, kind: 'sms' }).reason, ShareReject.UNKNOWN_KIND);
    assert.equal(validateShareRequest({ ...base, kind: ShareKind.PRINT }).reason, ShareReject.KIND_NOT_ALLOWED_HERE);
  });

  it('requires a document reference', () => {
    assert.equal(validateShareRequest({ ...base, documentRef: '' }).reason, ShareReject.NO_DOCUMENT);
    assert.equal(validateShareRequest({ ...base, documentRef: null }).reason, ShareReject.NO_DOCUMENT);
  });

  it('exposes only the four approved user-initiated triggers', () => {
    assert.equal(APPROVED_SHARE_TRIGGERS.length, 4);
    for (const trigger of APPROVED_SHARE_TRIGGERS) {
      assert.ok(trigger.kinds.length > 0, trigger.id);
    }
  });
});

describe('G-O-04 — PDF generation failure', () => {
  it('treats a 200 with bytes as usable', () => {
    assert.equal(classifyPdfOutcome({ status: 200, bytes: 4096 }).shareable, true);
    assert.equal(classifyPdfOutcome({ status: 200 }).shareable, true);
  });

  it('refuses a zero-byte document', () => {
    for (const bytes of [0, -1]) {
      const result = classifyPdfOutcome({ status: 200, bytes });
      assert.equal(result.shareable, false, String(bytes));
      assert.equal(result.reason, 'empty-document', String(bytes));
    }
  });

  it('separates forbidden, missing, throttled and failed generation', () => {
    assert.equal(classifyPdfOutcome({ status: 403 }).reason, 'forbidden');
    assert.equal(classifyPdfOutcome({ status: 401 }).reason, 'forbidden');
    assert.equal(classifyPdfOutcome({ status: 404 }).reason, 'not-found');
    assert.equal(classifyPdfOutcome({ status: 429 }).reason, 'rate-limited');
    assert.equal(classifyPdfOutcome({ status: 500 }).reason, 'generation-failed');
    assert.equal(classifyPdfOutcome({ errorKind: 'network' }).reason, 'transport');
    assert.equal(classifyPdfOutcome({}).reason, 'unknown');
  });

  it('never reports shareable for any failure', () => {
    for (const outcome of [{ status: 403 }, { status: 500 }, { errorKind: 'timeout' }, {}, { status: 200, bytes: 0 }]) {
      assert.equal(classifyPdfOutcome(outcome).shareable, false, JSON.stringify(outcome));
    }
  });
});

describe('G-O-05 — no unofficial WhatsApp automation anywhere', () => {
  const files = listSourceFiles(CORE_DIR);
  const rel = (file) => file.replace(`${REPO_ROOT}\\`, '').replace(/\//g, '\\');

  it('scans the whole core tree', () => {
    assert.ok(files.length >= 40, `expected the full core tree, got ${files.length}`);
  });

  it('finds no messaging or automation reference in executable code', () => {
    const sources = files.map((file) => ({ path: rel(file), code: readCode(file) }));
    assert.equal(assertNoUnofficialAutomation(sources), true);
  });

  it('would fail if one appeared', () => {
    assert.throws(() => assertNoUnofficialAutomation([{ path: 'x.js', code: "fetch('https://api.whatsapp.com/v1/messages')" }]));
    assert.throws(() => assertNoUnofficialAutomation([{ path: 'x.js', code: "const u='https://api.twilio.com/2010/x'" }]));
    assert.throws(() => assertNoUnofficialAutomation([{ path: 'x.js', code: "send('mailto:a@b.c')" }]));
    assert.throws(() => assertNoUnofficialAutomation([{ path: 'x.js', code: "require('puppeteer')" }]));
    assert.throws(() => assertNoUnofficialAutomation([{ path: 'x.js', code: "fetch('https://evil.example.test/x')" }]));
  });

  it('tolerates an empty or malformed source list', () => {
    assert.equal(assertNoUnofficialAutomation([]), true);
    assert.equal(assertNoUnofficialAutomation(null), true);
    assert.equal(assertNoUnofficialAutomation([{ path: 'x.js' }]), true);
  });
});

describe('G-O-02 — navigation may not change', () => {
  it('passes the drift guard', () => {
    assert.equal(assertCurriculumBindingsMatchReferences(REFERENCES), true);
  });

  it('knows the approved entries per surface', () => {
    assert.ok(APPROVED_NAVIGATION[Surface.SCHOOL_DESKTOP].sidebar.includes('Timetable'));
    assert.deepEqual([...APPROVED_NAVIGATION[Surface.MOBILE_APP].bottomBar], ['Home', 'Attendance', 'Results', 'Tasks', 'Profile']);
    assert.equal(isApprovedNavEntry(Surface.SCHOOL_DESKTOP, 'Timetable'), true);
    assert.equal(isApprovedNavEntry(Surface.SCHOOL_DESKTOP, 'Payroll'), false);
    assert.equal(isApprovedNavEntry('nope', 'Timetable'), false);
  });

  it('refuses every navigation change, even for an entry that surface already has', () => {
    for (const [surface, config] of Object.entries(APPROVED_NAVIGATION)) {
      const approved = [
        ...(config.sidebar ?? []),
        ...(config.bottomBar ?? []),
        ...(config.drawerControl ? [config.drawerControl] : []),
      ];
      for (const entry of approved) {
        const result = validateNavigationChange({ surface, entry });
        assert.equal(result.allowed, false, `${surface}/${entry}`);
        assert.equal(result.reason, 'navigation-is-fixed-by-the-ui-lock', `${surface}/${entry}`);
      }
    }
  });

  it('refuses an entry that belongs to a different surface', () => {
    // Timetable is a school-desktop nav entry, not a mobile tab.
    assert.equal(validateNavigationChange({ surface: Surface.MOBILE_APP, entry: 'Timetable' }).reason, 'not-an-approved-entry');
    assert.equal(validateNavigationChange({ surface: Surface.SCHOOL_DESKTOP, entry: 'Billing & Renewals' }).reason, 'not-an-approved-entry');
  });

  it('refuses a new entry and an unknown surface', () => {
    assert.equal(validateNavigationChange({ surface: Surface.SCHOOL_DESKTOP, entry: 'Payroll' }).reason, 'not-an-approved-entry');
    assert.equal(validateNavigationChange({ surface: 'nope', entry: 'Home' }).reason, 'unknown-surface');
  });

  it('never authorises creating UI', () => {
    assert.equal(assertNoCurriculumElementCreation(), true);
    for (const binding of CURRICULUM_BINDINGS) {
      assert.notEqual(binding.kind, 'creates-element');
    }
  });

  it('marks every element unpublished and blocks the four actions', () => {
    for (const binding of CURRICULUM_BINDINGS) {
      assert.equal(binding.state, 'unpublished', binding.id);
      assert.equal(binding.field, null, binding.id);
    }
    assert.deepEqual(
      CURRICULUM_BINDINGS.filter((b) => b.kind === 'blocked-no-approved-hook').map((b) => b.id),
      ['GCB-05', 'GCB-09', 'GCB-10', 'GCB-11', 'GCB-12'],
    );
  });

  it('records that a WhatsApp share button is still manual', () => {
    assert.match(curriculumBindingById('GCB-12').note, /user-chosen destination/);
  });
});

describe('no invented curriculum contract', () => {
  it('confirms nothing is authorized', () => {
    assert.equal(CURRICULUM_INTEGRATION_AUTHORIZED, false);
    assert.equal(describeCurriculumBlock().schemaPublished, false);
    assert.equal(describeCurriculumBlock().endpointsPublished, false);
  });

  it('covers every Batch G capability', () => {
    assert.deepEqual(
      PENDING_CURRICULUM_CONTRACTS.map((c) => c.id).sort(),
      ['exports', 'homework', 'notices', 'pdf-render', 'timetable-read'],
    );
  });

  it('declares no endpoint or payload and fails closed otherwise', () => {
    assert.equal(assertNoInventedCurriculumSchemas(), true);
    const base = {
      id: 'notices',
      status: 'blocked-needs-provisioning-path',
      method: null,
      path: null,
      requestSchema: null,
      responseSchema: null,
      implemented: false,
    };
    assert.throws(() => assertNoInventedCurriculumSchemas([{ ...base, path: '/notices' }]));
    assert.throws(() => assertNoInventedCurriculumSchemas([{ ...base, method: 'GET' }]));
    assert.throws(() => assertNoInventedCurriculumSchemas([{ ...base, implemented: true }]));
    assert.doesNotThrow(() => assertNoInventedCurriculumSchemas([base]));
  });

  it('records that a browser must never synthesise a document', () => {
    assert.match(findPendingCurriculumContract('pdf-render').blocker, /never synthesise/);
  });
});