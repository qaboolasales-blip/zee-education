/**
 * Approved subject and period model. Task: G-O-01.
 *
 * The School Dashboard timetable is the only place subject colours are defined:
 *
 *   const C = {M:'#3b82f6', S:'#10b981', E:'#8b5cf6', U:'#f59e0b'}
 *   const nm = {M:'Mathematics', S:'Science', E:'English', U:'Urdu'}
 *   const R = [['08:30','MSEUM'], ['09:20','SMUES'], ['10:10','EUMSU']]
 *
 * The colours are category accents applied through the per-cell `--c` custom
 * property, which the reference already styles:
 *   .sl{border-radius:10px;font-weight:600;background:color-mix(in srgb,var(--c) 14%,transparent);color:var(--c)}
 *
 * Four subjects, four colours. That is a closed set in the approved UI: a fifth
 * subject would need either a fifth colour (a visual change) or an unstyled cell.
 *
 * `assertSubjectModelMatchesReferences()` re-reads the reference so the mapping
 * cannot drift. No DOM, no CSS, no rendering.
 */

import { Surface } from '../auth/screen-registry.js';

/** The four subject codes present in the locked timetable. */
export const SubjectCode = Object.freeze({
  MATHEMATICS: 'M',
  SCIENCE: 'S',
  ENGLISH: 'E',
  URDU: 'U',
});

/** Code -> display label, verbatim from the reference `nm` map. */
export const SUBJECT_LABELS = Object.freeze({
  [SubjectCode.MATHEMATICS]: 'Mathematics',
  [SubjectCode.SCIENCE]: 'Science',
  [SubjectCode.ENGLISH]: 'English',
  [SubjectCode.URDU]: 'Urdu',
});

/**
 * Code -> category accent, verbatim from the reference `C` map.
 * These are category accents for timetable cells, NOT school branding: branding
 * is `--brand`/`--brand2` and is handled by core/settings/theme-tokens.js.
 */
export const SUBJECT_ACCENTS = Object.freeze({
  [SubjectCode.MATHEMATICS]: '#3b82f6',
  [SubjectCode.SCIENCE]: '#10b981',
  [SubjectCode.ENGLISH]: '#8b5cf6',
  [SubjectCode.URDU]: '#f59e0b',
});

export const SUBJECT_CODES = Object.freeze(Object.keys(SUBJECT_LABELS));

/** The three periods the locked timetable renders, in locked order. */
export const LOCKED_PERIODS = Object.freeze(['08:30', '09:20', '10:10']);

/** The weekday columns of the locked `.sch` grid. */
export const LOCKED_WEEKDAYS = Object.freeze(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

export function isSubjectCode(value) {
  return typeof value === 'string' && SUBJECT_CODES.includes(value);
}

export function subjectLabel(value) {
  return isSubjectCode(value) ? SUBJECT_LABELS[value] : null;
}

export function subjectAccent(value) {
  return isSubjectCode(value) ? SUBJECT_ACCENTS[value] : null;
}

/**
 * The exact inline custom-property declaration the reference applies to a `.sl`
 * cell: `style="--c:${C[k]}"`. Anything else would restyle a locked cell.
 *
 * @param {string} code
 * @returns {{ '--c': string } | null}
 */
export function subjectCellStyle(code) {
  const accent = subjectAccent(code);
  return accent === null ? null : Object.freeze({ '--c': accent });
}

/** `HH:MM` in 24-hour form, exactly as the reference renders periods. */
const PERIOD_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isPeriodTime(value) {
  return typeof value === 'string' && PERIOD_PATTERN.test(value);
}

/** Minutes since midnight, for ordering only. */
export function periodMinutes(value) {
  if (!isPeriodTime(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Order periods chronologically. The locked order is already chronological, so
 * this normally returns the input unchanged — it exists so a server-supplied
 * timetable cannot silently reorder the grid.
 */
export function sortPeriods(periods) {
  const list = Array.isArray(periods) ? periods.filter(isPeriodTime) : [];
  return Object.freeze([...list].sort((a, b) => periodMinutes(a) - periodMinutes(b)));
}

/**
 * Drift guard: the subject map, accents and locked period times must still match
 * the approved reference byte-for-byte.
 *
 * @param {string} schoolDashboardSource
 */
export function assertSubjectModelMatchesReferences(schoolDashboardSource) {
  if (typeof schoolDashboardSource !== 'string' || schoolDashboardSource === '') {
    throw new Error('no School Dashboard reference supplied');
  }
  const problems = [];

  for (const code of SUBJECT_CODES) {
    if (!schoolDashboardSource.includes(`${code}:'${SUBJECT_ACCENTS[code]}'`)) {
      problems.push(`accent for ${code} (${SUBJECT_ACCENTS[code]}) is not in the reference`);
    }
    if (!schoolDashboardSource.includes(`${code}:'${SUBJECT_LABELS[code]}'`)) {
      problems.push(`label for ${code} (${SUBJECT_LABELS[code]}) is not in the reference`);
    }
  }

  for (const period of LOCKED_PERIODS) {
    if (!schoolDashboardSource.includes(`'${period}'`)) {
      problems.push(`period ${period} is not in the reference`);
    }
  }

  for (const day of LOCKED_WEEKDAYS) {
    if (!schoolDashboardSource.includes(`'${day}'`)) {
      problems.push(`weekday ${day} is not in the reference`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`subject model drifted from the reference:\n  ${problems.join('\n  ')}`);
  }
  return true;
}