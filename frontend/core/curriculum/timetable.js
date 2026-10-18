/**
 * Timetable, homework and notice behaviour. Tasks: G-O-01, G-O-04.
 *
 * Pure logic over data the caller supplies. No request, no rendering, no storage.
 *
 * Three rules are enforced here:
 *
 *  1. **The grid shape is fixed.** The approved `.sch` is
 *     `grid-template-columns:70px repeat(5,1fr)` and always renders five weekday
 *     columns. A timetable may fill or leave blank any existing cell, but the
 *     weekday columns and the `--c` accents are the only things that may vary.
 *
 *  2. **"No timetable" is a real, non-empty state.** A school with no timetable
 *     must produce zero slots rather than a fabricated row, and must not invent
 *     copy for it (GCB-03).
 *
 *  3. **Notices expire.** A notice past its expiry is still renderable by an
 *     authorised viewer but must be flagged expired, so a stale notice can never
 *     be presented as current. Expiry is evaluated in Asia/Karachi, the locked
 *     deployment timezone.
 */

import {
  LOCKED_PERIODS,
  LOCKED_WEEKDAYS,
  isPeriodTime,
  isSubjectCode,
  sortPeriods,
  subjectLabel,
} from './subject-model.js';
import { KARACHI_TIME_ZONE, toKarachiParts } from '../format/datetime.js';

/** Closed reasons. No free-form text can reach UI copy. */
export const CurriculumReject = Object.freeze({
  UNKNOWN_SUBJECT: 'unknown-subject',
  UNKNOWN_WEEKDAY: 'unknown-weekday',
  UNKNOWN_PERIOD: 'unknown-period',
  DUPLICATE_SLOT: 'duplicate-slot',
  NO_TIMETABLE: 'no-timetable',
  EMPTY_TIMETABLE: 'empty-timetable',
  UNKNOWN_ATTENDANCE_SCOPE: 'unknown-attendance-scope',
});

/** An empty timetable. Structure only, no copy. */
export const EMPTY_TIMETABLE = Object.freeze({
  hasTimetable: false,
  reason: CurriculumReject.NO_TIMETABLE,
  periods: Object.freeze([]),
  weekdays: Object.freeze([...LOCKED_WEEKDAYS]),
  slots: Object.freeze([]),
  filled: 0,
  capacity: 0,
});

/**
 * Build a timetable from slots.
 *
 * @param {ReadonlyArray<{ weekday: string, period: string, subjectCode: string }>} slots
 * @returns {Readonly<{ hasTimetable: boolean, reason: string|null, periods: readonly string[],
 *   weekdays: readonly string[], slots: readonly object[], filled: number, capacity: number }>}
 */
export function buildTimetable(slots) {
  if (!Array.isArray(slots) || slots.length === 0) {
    return EMPTY_TIMETABLE;
  }

  const accepted = [];
  const seen = new Set();
  for (const slot of slots) {
    if (!slot || typeof slot !== 'object') continue;
    const weekday = typeof slot.weekday === 'string' ? slot.weekday.trim() : '';
    const period = typeof slot.period === 'string' ? slot.period.trim() : '';
    const subjectCode = typeof slot.subjectCode === 'string' ? slot.subjectCode.trim() : '';

    if (!LOCKED_WEEKDAYS.includes(weekday)) continue;
    if (!isPeriodTime(period)) continue;
    if (!isSubjectCode(subjectCode)) continue;

    const key = `${weekday}|${period}`;
    if (seen.has(key)) continue; // first wins; a duplicate cannot double-fill a cell
    seen.add(key);

    accepted.push(Object.freeze({ weekday, period, subjectCode, label: subjectLabel(subjectCode) }));
  }

  if (accepted.length === 0) {
    return Object.freeze({ ...EMPTY_TIMETABLE, reason: CurriculumReject.EMPTY_TIMETABLE });
  }

  const periods = sortPeriods([...new Set(accepted.map((slot) => slot.period))]);
  const capacity = LOCKED_WEEKDAYS.length * periods.length;

  return Object.freeze({
    hasTimetable: true,
    reason: null,
    periods,
    weekdays: Object.freeze([...LOCKED_WEEKDAYS]),
    slots: Object.freeze(accepted),
    filled: accepted.length,
    capacity,
  });
}

/** Look up one cell. Returns `null` when the cell is empty. */
export function timetableSlot(timetable, weekday, period) {
  if (!timetable || timetable.hasTimetable !== true) return null;
  const match = timetable.slots.find((slot) => slot.weekday === weekday && slot.period === period);
  return match ?? null;
}

/** How many slots a given day has — the mobile `.list .row` count. */
export function daySlotCount(timetable, weekday) {
  if (!timetable || timetable.hasTimetable !== true) return 0;
  return timetable.slots.filter((slot) => slot.weekday === weekday).length;
}

/** The periods a day has, chronologically. */
export function dayPeriods(timetable, weekday) {
  if (!timetable || timetable.hasTimetable !== true) return Object.freeze([]);
  return Object.freeze(
    sortPeriods(timetable.slots.filter((slot) => slot.weekday === weekday).map((slot) => slot.period)),
  );
}

/** Homework state. Structure only. */
export const HomeworkState = Object.freeze({
  OPEN: 'open',
  DUE_SOON: 'due-soon',
  OVERDUE: 'overdue',
  CLOSED: 'closed',
});

/**
 * Classify homework by due date.
 *
 * `now` defaults to the current instant. Both dates are evaluated in
 * Asia/Karachi so a due date never flips a day because of the server's clock.
 *
 * @param {{ dueAt?: unknown, closedAt?: unknown }} homework
 * @param {{ now?: unknown, dueSoonHours?: number }} [options]
 */
export function classifyHomework(homework, options = {}) {
  const nowParts = toKarachiParts(options.now ?? Date.now());
  if (!nowParts) return Object.freeze({ state: null, known: false, minutesRemaining: null });

  const dueParts = toKarachiParts(homework?.dueAt);
  const closedParts = toKarachiParts(homework?.closedAt);

  if (closedParts) {
    return Object.freeze({ state: HomeworkState.CLOSED, known: true, minutesRemaining: null });
  }
  if (!dueParts) {
    // No published due vocabulary: report unknown rather than guessing "open".
    return Object.freeze({ state: null, known: false, minutesRemaining: null });
  }

  const minutes = Math.round((karachiMinutes(dueParts) - karachiMinutes(nowParts)) / 60000);
  const dueSoonHours = Number.isFinite(options.dueSoonHours) ? options.dueSoonHours : 24;

  let state;
  if (minutes < 0) state = HomeworkState.OVERDUE;
  else if (minutes <= dueSoonHours * 60) state = HomeworkState.DUE_SOON;
  else state = HomeworkState.OPEN;

  return Object.freeze({ state, known: true, minutesRemaining: minutes });
}

function karachiMinutes(parts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

/** Notice state. */
export const NoticeState = Object.freeze({
  CURRENT: 'current',
  EXPIRED: 'expired',
  NOT_YET: 'not-yet',
  NO_EXPIRY: 'no-expiry',
  UNKNOWN: 'unknown',
});

/**
 * Classify a notice against its publish/expiry window.
 *
 * An expired notice is a first-class state, not an error: it is still a record the
 * server may legitimately return, but it must never read as current.
 *
 * @param {{ publishedAt?: unknown, expiresAt?: unknown }} notice
 * @param {{ now?: unknown }} [options]
 */
export function classifyNotice(notice, options = {}) {
  const nowParts = toKarachiParts(options.now ?? Date.now());
  if (!nowParts) return Object.freeze({ state: NoticeState.UNKNOWN, known: false, expired: true });

  const now = karachiMinutes(nowParts);
  const published = toKarachiParts(notice?.publishedAt);
  const expires = toKarachiParts(notice?.expiresAt);

  if (published && published !== null && now < karachiMinutes(published)) {
    return Object.freeze({ state: NoticeState.NOT_YET, known: true, expired: false });
  }
  if (!expires) {
    return Object.freeze({ state: NoticeState.NO_EXPIRY, known: true, expired: false });
  }
  if (now > karachiMinutes(expires)) {
    return Object.freeze({ state: NoticeState.EXPIRED, known: true, expired: true });
  }
  return Object.freeze({ state: NoticeState.CURRENT, known: true, expired: false });
}

/** Audience scopes a notice may target. Structure only. */
export const NoticeAudience = Object.freeze({
  ALL_SCHOOL: 'all-school',
  CLASS: 'class',
  SECTION: 'section',
  STAFF: 'staff',
  GUARDIANS: 'guardians',
  STUDENTS: 'students',
});

export const NOTICE_AUDIENCES = Object.freeze(Object.values(NoticeAudience));

/**
 * May this role see this notice?
 *
 * Reuses the Batch E privacy model rather than inventing a second ruleset: a
 * notice is school-local academic communication, so it follows the
 * timetable/homework/notices category.
 *
 * @param {string} role
 * @param {{ audience?: unknown, classRef?: unknown, sectionRef?: unknown, assignedClassRefs?: readonly string[]|null }} notice
 * @param {{ assignedClassRefs?: readonly string[]|null }} [viewerScope]
 */
export function canRoleSeeNotice(role, notice, viewerScope = {}) {
  const audience = typeof notice?.audience === 'string' ? notice.audience.trim() : null;
  if (!NOTICE_AUDIENCES.includes(audience)) return false; // unknown audience -> deny

  if (audience === NoticeAudience.ALL_SCHOOL) return true;

  // Staff-only notices require a staff role. Reuse the role vocabulary.
  if (audience === NoticeAudience.STAFF) {
    return role === 'Teacher' || role === 'School Admin';
  }
  if (audience === NoticeAudience.GUARDIANS) {
    return role === 'Parent' || role === 'School Admin';
  }
  if (audience === NoticeAudience.STUDENTS) {
    return role === 'Student' || role === 'School Admin';
  }

  // Class / Section scoped notices need a server-resolved assignment set. The
  // client cannot prove class membership, so it never assumes one.
  const assigned = viewerScope.assignedClassRefs;
  if (!Array.isArray(assigned) || assigned.length === 0) return false;

  if (audience === NoticeAudience.CLASS) {
    return typeof notice?.classRef === 'string' && assigned.includes(notice.classRef.trim());
  }
  if (audience === NoticeAudience.SECTION) {
    if (typeof notice?.classRef !== 'string') return false;
    if (!assigned.includes(notice.classRef.trim())) return false;
    // A section-scoped notice is only safe when the viewer also has that section.
    const sections = viewerScope.assignedSectionRefs;
    if (!Array.isArray(sections) || sections.length === 0) return false;
    return typeof notice?.sectionRef === 'string' && sections.includes(notice.sectionRef.trim());
  }

  return false;
}

export { KARACHI_TIME_ZONE, LOCKED_PERIODS, LOCKED_WEEKDAYS };