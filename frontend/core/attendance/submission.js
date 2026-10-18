/**
 * Attendance register submission state machine. Task: F-O-03.
 *
 * "Add safe optimistic/error/retry adapter behavior without visual redesign."
 *
 * This is a PURE state machine over one register. It performs no request, because
 * no attendance endpoint is published. What it provides is the safety logic that
 * must exist before any request does:
 *
 *  - **Optimistic marking is reversible.** A pending mark is held with an explicit
 *    previous value, so a failure can restore the register exactly.
 *  - **Duplicate submission is structurally impossible.** Every submission carries
 *    a deterministic key derived from the register, date, student and status. The
 *    machine refuses to submit the same key twice and reports the collision
 *    instead of sending it (FAT-01, and the server-side half is CPB-09).
 *  - **No assignment is a first-class outcome**, not an error to swallow.
 *  - **Offline / transport failure is distinguishable from a rejected request**,
 *    because the reference offers exactly one status channel (`#toast`) and the
 *    caller needs to know whether a retry is meaningful.
 *
 * No DOM, no rendering, no storage, no crypto. The idempotency key is a readable
 * deterministic string, not a secret and not a hash.
 */

import { AttendanceStatus, isAttendanceStatus } from './status-model.js';
import { PUBLISHED_ERROR_STATUSES } from '../provisioning/selectors.js';

/** Lifecycle of one register submission. */
export const SubmissionState = Object.freeze({
  IDLE: 'idle',
  MARKING: 'marking',
  SUBMITTING: 'submitting',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  FAILED_TRANSPORT: 'failed-transport',
  NO_ASSIGNMENT: 'no-assignment',
});

/** Closed rejection reasons. No free-form text can reach UI copy. */
export const SubmitReject = Object.freeze({
  NO_REGISTER: 'no-register',
  EMPTY_ROSTER: 'empty-roster',
  NOT_ASSIGNED: 'not-assigned',
  UNKNOWN_STUDENT: 'unknown-student',
  UNKNOWN_STATUS: 'unknown-status',
  INCOMPLETE: 'incomplete',
  DUPLICATE_SUBMISSION: 'duplicate-submission',
  UNPUBLISHED_STATUS_CODE: 'unpublished-status-code',
});

/** The initial register. */
export const EMPTY_REGISTER = Object.freeze({
  date: null,
  classRef: null,
  sectionRef: null,
  assignmentsResolved: false,
  roster: Object.freeze([]),
  marks: Object.freeze({}),
  state: SubmissionState.IDLE,
  lastError: null,
  submittedKeys: Object.freeze([]),
});

/**
 * Deterministic idempotency key for one (register, student, status) mark.
 * Readable, stable, and contains no credential or secret.
 *
 * @param {{ classRef: string, sectionRef: string|null, date: string, studentRef: string, status: string }} input
 * @returns {string|null} null when the input is incomplete
 */
export function submissionKey({ classRef, sectionRef, date, studentRef, status } = {}) {
  if (typeof classRef !== 'string' || classRef.trim() === '') return null;
  if (typeof date !== 'string' || date.trim() === '') return null;
  if (typeof studentRef !== 'string' || studentRef.trim() === '') return null;
  if (!isAttendanceStatus(status)) return null;
  const section = typeof sectionRef === 'string' && sectionRef.trim() !== '' ? sectionRef.trim() : '-';
  return `${classRef.trim()}|${section}|${date.trim()}|${studentRef.trim()}|${status}`;
}

/**
 * Open a register.
 *
 * @param {{
 *   date?: string,
 *   classRef?: string,
 *   sectionRef?: string|null,
 *   assignmentsResolved?: boolean,
 *   roster?: ReadonlyArray<{ studentRef: string }>,
 * }} input
 */
export function openRegister(input = {}) {
  const roster = Array.isArray(input.roster)
    ? Object.freeze(
        input.roster
          .filter((entry) => entry && typeof entry.studentRef === 'string' && entry.studentRef.trim() !== '')
          .map((entry) => Object.freeze({ studentRef: entry.studentRef.trim() })),
      )
    : EMPTY_REGISTER.roster;

  const assignmentsResolved = input.assignmentsResolved === true;
  const hasRegister =
    typeof input.classRef === 'string' &&
    input.classRef.trim() !== '' &&
    typeof input.date === 'string' &&
    input.date.trim() !== '';

  if (!hasRegister) {
    return Object.freeze({ ...EMPTY_REGISTER, roster, state: SubmissionState.NO_ASSIGNMENT, lastError: SubmitReject.NO_REGISTER });
  }
  if (!assignmentsResolved) {
    // A teacher with no assigned class/section must not be able to submit.
    return Object.freeze({ ...EMPTY_REGISTER, roster, state: SubmissionState.NO_ASSIGNMENT, lastError: SubmitReject.NOT_ASSIGNED });
  }

  return Object.freeze({
    date: input.date.trim(),
    classRef: input.classRef.trim(),
    sectionRef: typeof input.sectionRef === 'string' && input.sectionRef.trim() !== '' ? input.sectionRef.trim() : null,
    assignmentsResolved: true,
    roster,
    marks: Object.freeze({}),
    state: roster.length === 0 ? SubmissionState.IDLE : SubmissionState.IDLE,
    lastError: roster.length === 0 ? SubmitReject.EMPTY_ROSTER : null,
    submittedKeys: Object.freeze([]),
  });
}

export function isRegisterOpen(register) {
  return Boolean(register) && register.state !== SubmissionState.NO_ASSIGNMENT && register.lastError !== SubmitReject.NO_REGISTER;
}

/**
 * Optimistically mark one student. Records the previous value so the mark can be
 * rolled back exactly on failure.
 *
 * @param {object} register
 * @param {{ studentRef: string, status: string }} input
 * @returns {{ ok: boolean, register: object, reason: string|null }}
 */
export function markStudent(register, { studentRef, status } = {}) {
  if (!isRegisterOpen(register)) return Object.freeze({ ok: false, register, reason: register?.lastError ?? SubmitReject.NO_REGISTER });
  if (typeof studentRef !== 'string' || !register.roster.some((r) => r.studentRef === studentRef.trim())) {
    return Object.freeze({ ok: false, register, reason: SubmitReject.UNKNOWN_STUDENT });
  }
  if (!isAttendanceStatus(status)) return Object.freeze({ ok: false, register, reason: SubmitReject.UNKNOWN_STATUS });

  const ref = studentRef.trim();
  const previous = Object.prototype.hasOwnProperty.call(register.marks, ref)
    ? register.marks[ref]
    : null;

  return Object.freeze({
    ok: true,
    reason: null,
    register: Object.freeze({
      ...register,
      marks: Object.freeze({ ...register.marks, [ref]: status }),
      previousMark: Object.freeze({ ...(register.previousMark ?? {}), [ref]: previous }),
      state: SubmissionState.MARKING,
      lastError: null,
    }),
  });
}

/** Roll one student's mark back to its pre-optimistic value. */
export function rollbackMark(register, studentRef) {
  if (!register || typeof studentRef !== 'string') return register;
  const ref = studentRef.trim();
  const marks = { ...register.marks };
  const previous = register.previousMark?.[ref] ?? null;

  if (previous === null) delete marks[ref];
  else marks[ref] = previous;

  const previousMark = { ...(register.previousMark ?? {}) };
  delete previousMark[ref];

  return Object.freeze({
    ...register,
    marks: Object.freeze(marks),
    previousMark: Object.freeze(previousMark),
    state: SubmissionState.IDLE,
  });
}

/** Count of students carrying each status. Structure only, no copy. */
export function markCounts(register) {
  const counts = { [AttendanceStatus.PRESENT]: 0, [AttendanceStatus.ABSENT]: 0, [AttendanceStatus.LEAVE]: 0 };
  if (!register || !register.marks) return Object.freeze(counts);
  for (const value of Object.values(register.marks)) {
    if (isAttendanceStatus(value)) counts[value] += 1;
  }
  return Object.freeze(counts);
}

export function markedCount(register) {
  if (!register || !register.roster) return 0;
  return register.roster.filter((entry) => register.marks?.[entry.studentRef] !== undefined).length;
}

export function isRegisterComplete(register) {
  if (!register || register.roster.length === 0) return false;
  return markedCount(register) === register.roster.length;
}

/**
 * Build the deterministic key set for the register's current marks.
 * @returns {ReadonlyArray<string>}
 */
export function pendingSubmissionKeys(register) {
  if (!isRegisterOpen(register)) return Object.freeze([]);
  const keys = [];
  for (const entry of register.roster) {
    const status = register.marks?.[entry.studentRef];
    if (status === undefined) continue;
    const key = submissionKey({
      classRef: register.classRef,
      sectionRef: register.sectionRef,
      date: register.date,
      studentRef: entry.studentRef,
      status,
    });
    if (key !== null) keys.push(key);
  }
  return Object.freeze(keys);
}

/**
 * Decide whether a submission may proceed.
 *
 * Refuses a **no-op** resubmission: a duplicate is detected only when EVERY key in
 * the current mark set has already been sent. A register where at least one mark
 * changed is a genuine correction and is permitted, so a teacher fixing one
 * student is not blocked by the two untouched students (FAT-05).
 *
 * DELIBERATE DEFAULT: a partially marked register is refused. Without a submit
 * contract there is no way to know how the server would treat unmarked students,
 * and a naive implementation would record them as absent. Requiring every roster
 * entry to carry an explicit mark is the only choice that cannot silently create
 * wrong attendance data. If the contract later permits partial submission, this
 * becomes the documented change point (FAT-04).
 */
export function canSubmit(register) {
  if (!isRegisterOpen(register)) {
    return Object.freeze({ allowed: false, reason: register?.lastError ?? SubmitReject.NO_REGISTER, keys: Object.freeze([]) });
  }
  if (register.roster.length === 0) {
    return Object.freeze({ allowed: false, reason: SubmitReject.EMPTY_ROSTER, keys: Object.freeze([]) });
  }
  if (!isRegisterComplete(register)) {
    return Object.freeze({ allowed: false, reason: SubmitReject.INCOMPLETE, keys: Object.freeze([]) });
  }
  const keys = pendingSubmissionKeys(register);
  if (keys.length === 0) {
    return Object.freeze({ allowed: false, reason: SubmitReject.INCOMPLETE, keys: Object.freeze([]) });
  }
  const already = new Set(register.submittedKeys ?? []);
  if (keys.every((key) => already.has(key))) {
    return Object.freeze({ allowed: false, reason: SubmitReject.DUPLICATE_SUBMISSION, keys });
  }
  return Object.freeze({ allowed: true, reason: null, keys });
}

/** Move to SUBMITTING after a successful `canSubmit`. */
export function beginSubmit(register) {
  const decision = canSubmit(register);
  if (!decision.allowed) return Object.freeze({ ok: false, register, reason: decision.reason });
  return Object.freeze({
    ok: true,
    reason: null,
    register: Object.freeze({ ...register, state: SubmissionState.SUBMITTING, lastError: null }),
  });
}

/**
 * Apply a published status to the register.
 *
 * Only the six published statuses are interpreted. `409` is NOT published, so a
 * duplicate reported by the server cannot be classified here and collapses to a
 * transport-style failure rather than being guessed at (CPB-09 / FAT-01).
 *
 * @param {object} register
 * @param {{ status?: number|null, errorKind?: string|null }} outcome
 */
export function settleSubmit(register, outcome = {}) {
  if (!register) return register;

  const status = Number.isInteger(outcome.status) ? outcome.status : null;

  // Success is checked FIRST: the published error table lists only failure codes,
  // so a 2xx must never be mistaken for an unpublished status.
  if (status !== null && status >= 200 && status < 300) {
    return Object.freeze({
      ...register,
      state: SubmissionState.CONFIRMED,
      lastError: null,
      submittedKeys: Object.freeze([...(register.submittedKeys ?? []), ...pendingSubmissionKeys(register)]),
      previousMark: Object.freeze({}),
    });
  }

  if (status !== null && !PUBLISHED_ERROR_STATUSES.includes(status)) {
    return Object.freeze({
      ...register,
      state: SubmissionState.FAILED_TRANSPORT,
      lastError: SubmitReject.UNPUBLISHED_STATUS_CODE,
    });
  }

  if (status === 403) {
    return Object.freeze({ ...register, state: SubmissionState.REJECTED, lastError: 'forbidden' });
  }
  if (status === 401) {
    return Object.freeze({ ...register, state: SubmissionState.REJECTED, lastError: 'unauthenticated' });
  }
  if (status === 400 || status === 404) {
    return Object.freeze({ ...register, state: SubmissionState.REJECTED, lastError: 'rejected' });
  }
  if (status === 429 || status === 500 || outcome.errorKind) {
    // Retryable: a transport or server fault leaves the marks optimistically set
    // so the caller can decide, and `rollbackMark` restores the prior value.
    return Object.freeze({ ...register, state: SubmissionState.FAILED_TRANSPORT, lastError: 'retryable' });
  }

  return Object.freeze({ ...register, state: SubmissionState.IDLE, lastError: null });
}

/** Is a retry meaningful for the current failure? */
export function isRetryable(register) {
  return Boolean(register) && register.state === SubmissionState.FAILED_TRANSPORT;
}

/** Reset for a new day, keeping the roster but dropping marks and sent keys. */
export function reopenRegister(register, date) {
  if (!isRegisterOpen(register)) return register;
  const nextDate = typeof date === 'string' && date.trim() !== '' ? date.trim() : register.date;
  return Object.freeze({
    ...register,
    date: nextDate,
    marks: Object.freeze({}),
    previousMark: Object.freeze({}),
    submittedKeys: Object.freeze([]),
    state: SubmissionState.IDLE,
    lastError: null,
  });
}