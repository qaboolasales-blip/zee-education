/**
 * Attendance status model. Task: F-O-01.
 *
 * "Map existing attendance UI controls/status visuals to Present/Absent/Leave
 * exactly."
 *
 * The approved model is Present, Absent and Leave (PROJECT_MEMORY: "Attendance:
 * Present, Absent, Leave"). The School Dashboard renders exactly three controls
 * and exactly three approved colour states:
 *
 *   const c=['P','A','L'];
 *   <button class="${k}${att[i]===j?' on':''}">${k}</button>
 *
 *   .ch button.on.P{background:#10b981;…}   /* green  *\/
 *   .ch button.on.A{background:#ef4444;…}   /* red    *\/
 *   .ch button.on.L{background:#f59e0b;…}   /* amber  *\/
 *
 * The mobile read-only list uses only two of them:
 *
 *   <span class="pill ${p?'g':'r'}">${p?'Present':'Absent'}</span>
 *
 * So there is a real, locked divergence between the two surfaces, recorded as
 * FAT-02 rather than "fixed" by adding a Leave pill.
 *
 * `assertStatusModelMatchesReferences()` re-reads both references so the mapping
 * cannot drift from the approved CSS or markup.
 *
 * No DOM, no rendering, no CSS.
 */

import { Surface } from '../auth/screen-registry.js';

/** The approved attendance vocabulary. */
export const AttendanceStatus = Object.freeze({
  PRESENT: 'present',
  ABSENT: 'absent',
  LEAVE: 'leave',
});

export const ATTENDANCE_STATUSES = Object.freeze([
  AttendanceStatus.PRESENT,
  AttendanceStatus.ABSENT,
  AttendanceStatus.LEAVE,
]);

/**
 * Letter rendered inside each School Dashboard `.ch button`.
 * Order is the reference order: `const c=['P','A','L']`.
 */
export const STATUS_LETTERS = Object.freeze({
  [AttendanceStatus.PRESENT]: 'P',
  [AttendanceStatus.ABSENT]: 'A',
  [AttendanceStatus.LEAVE]: 'L',
});

/**
 * The class string the School Dashboard toggles on a control.
 * Unselected: just the letter. Selected: the letter plus the space-separated
 * `on` class, which is what the reference emits.
 */
export function statusButtonClass(status, selected) {
  const letter = STATUS_LETTERS[status];
  if (letter === undefined) return null;
  return selected ? `${letter} on` : letter;
}

/** The three CSS selectors that colour a selected control. */
export const STATUS_SELECTORS = Object.freeze({
  [AttendanceStatus.PRESENT]: '.ch button.on.P',
  [AttendanceStatus.ABSENT]: '.ch button.on.A',
  [AttendanceStatus.LEAVE]: '.ch button.on.L',
});

/**
 * The mobile read-only pill classes that exist in the reference.
 * Only `g` (Present) and `r` (Absent) are rendered there — there is no Leave pill
 * on that surface, which is the locked divergence (FAT-02).
 */
export const MOBILE_STATUS_PILL = Object.freeze({
  [AttendanceStatus.PRESENT]: 'g',
  [AttendanceStatus.ABSENT]: 'r',
});

/** Generic badge classes available on every surface. `.n` is the safe unknown. */
export const BADGE_UNKNOWN_CLASS = 'n';

export function isAttendanceStatus(value) {
  return typeof value === 'string' && ATTENDANCE_STATUSES.includes(value);
}

export function statusLetter(value) {
  return STATUS_LETTERS[value] ?? null;
}

/**
 * Whether a status may be *entered* by a teacher.
 *
 * All three are enterable on the School Dashboard. On the mobile surface the
 * reference toggle is binary (`att[i]=att[i]===0?1:0`), so only Present and
 * Absent are enterable there — a fact of the locked UI, not a policy choice.
 */
export function isEnterableOn(surface, status) {
  if (!isAttendanceStatus(status)) return false;
  if (surface === Surface.SCHOOL_DESKTOP) return true;
  if (surface === Surface.MOBILE_APP) {
    return status === AttendanceStatus.PRESENT || status === AttendanceStatus.ABSENT;
  }
  return false;
}

/** Every status the given surface can actually show. */
export function statusesForSurface(surface) {
  return Object.freeze(ATTENDANCE_STATUSES.filter((status) => isEnterableOn(surface, status)));
}

/**
 * Reverse mapping used only for values that already exist as approved text in
 * the references ('Present' / 'Absent'). Deliberately has no Leave branch: the
 * mobile surface never renders Leave, so accepting the word would invent a state
 * the locked UI cannot show.
 */
export function statusFromApprovedText(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim().toLowerCase();
  if (trimmed === 'present') return AttendanceStatus.PRESENT;
  if (trimmed === 'absent') return AttendanceStatus.ABSENT;
  return null;
}

/**
 * Drift guard. Asserts the model still matches the approved references:
 *  - the three letters exist in the School Dashboard's `c=[...]` array;
 *  - the three `.ch button.on.X` selectors exist;
 *  - the mobile surface renders only the `g`/`r` pills.
 */
export function assertStatusModelMatchesReferences(referenceSources) {
  const dashboard = referenceSources?.[Surface.SCHOOL_DESKTOP];
  const mobile = referenceSources?.[Surface.MOBILE_APP];
  const problems = [];

  if (typeof dashboard !== 'string' || dashboard === '') {
    problems.push('no School Dashboard reference supplied');
  } else {
    for (const status of ATTENDANCE_STATUSES) {
      const letter = STATUS_LETTERS[status];
      if (!dashboard.includes(`'${letter}'`)) {
        problems.push(`letter ${letter} for "${status}" is missing from the reference`);
      }
      const selector = STATUS_SELECTORS[status];
      if (!dashboard.includes(`${selector}{`)) {
        problems.push(`selector ${selector}{ is missing from the reference`);
      }
    }
    if (!dashboard.includes("['P','A','L']")) {
      problems.push('the reference status-letter order changed');
    }
  }

  if (typeof mobile !== 'string' || mobile === '') {
    problems.push('no Mobile Preview reference supplied');
  } else {
    if (!mobile.includes("${p?'g':'r'}")) {
      problems.push('the mobile present/absent pill toggle changed');
    }
    if (!mobile.includes("${p?'Present':'Absent'}")) {
      problems.push('the mobile Present/Absent label pair changed');
    }
    // The mobile surface must NOT have grown a Leave control.
    if (/pill[^"'`]*leave/i.test(mobile) || mobile.includes("'g':'r':'w'")) {
      problems.push('the mobile surface now renders a third status pill — that is a UI change');
    }
  }

  if (problems.length > 0) {
    throw new Error(`attendance status model drifted from the references:\n  ${problems.join('\n  ')}`);
  }
  return true;
}