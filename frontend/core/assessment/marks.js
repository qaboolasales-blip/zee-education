/**
 * Mark entry, result shape and chart-safe progress. Tasks: H-O-01, H-O-03, H-O-04.
 *
 * SCOPE DISCIPLINE
 *  No assessment, mark or grade schema is published, so **no field name and no
 *  grade band is invented here**. What this module does is validate values
 *  arithmetically, and refuse to grade at all.
 *
 *  The references display `18 / 20`, `88 / 100` and the letters `A`, `A+`. No
 *  grading policy (boundaries, pass mark, +/- scheme) is published, so
 *  `gradeFor()` deliberately returns `unknown` — inventing a grade band would
 *  fabricate assessment policy and could fail or pass a real child wrongly
 *  (HAB-01).
 *
 * CHART SAFETY
 *  The published result chart is a `.prog` bar whose only variable is the inline
 *  `width` of `.prog i`. `progressWidth()` clamps to 0–100 so a malformed mark can
 *  never emit a width outside the bar's own geometry (HAB-04).
 *
 * No DOM, no CSS, no rendering.
 */

import { ResultStage, canRoleViewResult } from './lifecycle.js';
import { formatNumber } from '../format/money.js';

export const MarkReject = Object.freeze({
  NOT_A_NUMBER: 'not-a-number',
  NEGATIVE: 'negative',
  NOT_FINITE: 'not-finite',
  EXCEEDS_MAX: 'exceeds-max',
  ZERO_MAX: 'zero-max',
  NO_MARKS: 'no-marks',
  UNKNOWN_GRADE_BAND: 'unknown-grade-band',
  NOT_PUBLISHED: 'not-published',
});

function ok(value) {
  return Object.freeze({ valid: true, reason: null, value, errors: Object.freeze([]) });
}

function fail(reason, value) {
  return Object.freeze({ valid: false, reason, value, errors: Object.freeze([]) });
}

/** Accepts a number or a strict numeric string, as a form input would supply. */
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || !/^[+-]?\d+(\.\d+)?$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Validate one mark against its maximum. Arithmetic only.
 *
 * @param {{ score?: unknown, max?: unknown }} mark
 */
export function validateMark(mark) {
  const max = toNumber(mark?.max);
  if (max === null) return fail(MarkReject.NOT_A_NUMBER, null);
  if (max <= 0) return fail(MarkReject.ZERO_MAX, null);

  const score = toNumber(mark?.score);
  if (score === null) return fail(MarkReject.NOT_A_NUMBER, null);
  if (score < 0) return fail(MarkReject.NEGATIVE, score);
  if (score > max) return fail(MarkReject.EXCEEDS_MAX, score);

  return ok(Object.freeze({ score, max, percent: (score / max) * 100 }));
}

/**
 * Progress width for the existing `.prog i`, clamped to the bar's own geometry.
 * Returns a number between 0 and 100 inclusive, or `null` for an invalid mark.
 */
export function progressWidth(mark) {
  const validated = validateMark(mark);
  if (!validated.valid) return null;
  const clamped = Math.min(100, Math.max(0, validated.value.percent));
  return Math.round(clamped * 100) / 100;
}

/**
 * Grade letter.
 *
 * NOT IMPLEMENTED, deliberately. The references display `A` and `A+`, but no
 * grading policy is published: there are no boundaries, no pass mark and no +/- or
 * letter scheme. Returning `unknown` is the only honest result.
 *
 * @returns {{ known: false, grade: null, reason: string }}
 */
export function gradeFor() {
  return Object.freeze({ known: false, grade: null, reason: MarkReject.UNKNOWN_GRADE_BAND });
}

/**
 * Format the existing `18 / 20` shape for an approved text node.
 * Uses the existing numeric formatter; no new copy.
 */
export function formatMarkScore(mark) {
  const validated = validateMark(mark);
  if (!validated.valid) return '—';
  return `${formatNumber(validated.value.score)} / ${formatNumber(validated.value.max)}`;
}

/** Format the existing percentage shape, e.g. `88%`. */
export function formatMarkPercent(mark) {
  const validated = validateMark(mark);
  if (!validated.valid) return '—';
  return `${formatNumber(validated.value.percent, { decimals: 1 })}%`;
}

/**
 * A result set for the approved subject rows (`88 / 100 · A`).
 *
 * Each subject row is validated independently; an invalid row yields `null` so the
 * caller renders the existing empty marker rather than a fabricated number.
 *
 * @param {ReadonlyArray<{ subjectLabel?: unknown, score?: unknown, max?: unknown }>} rows
 */
export function buildResultRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return Object.freeze(
    list.map((row) => {
      const validated = validateMark(row);
      if (!validated.valid) {
        return Object.freeze({ valid: false, reason: validated.reason, label: null, text: null, width: null });
      }
      return Object.freeze({
        valid: true,
        reason: null,
        label: typeof row?.subjectLabel === 'string' ? row.subjectLabel.trim() : null,
        text: formatMarkScore(row),
        percentText: formatMarkPercent(row),
        width: progressWidth(row),
        grade: gradeFor().grade,
      });
    }),
  );
}

/**
 * Result-set state for the approved empty/pending areas (H-O-04).
 *
 * Structure only — the references contain no approved copy for "no result yet" or
 * "not published", so none is produced (HAB-05).
 *
 * @param {{ stage?: unknown, rows?: unknown }} resultSet
 * @param {string} role
 * @param {object} [viewerScope]
 */
export function resultSetState(resultSet, role, viewerScope = {}) {
  const stage = resultSet?.stage;
  const rows = Array.isArray(resultSet?.rows) ? resultSet.rows : [];

  if (!Object.values(ResultStage).includes(stage)) {
    return Object.freeze({
      viewable: false,
      reason: 'no-result',
      isEmpty: true,
      isPending: false,
      isUnpublished: false,
      rowCount: 0,
    });
  }

  const decision = canRoleViewResult(role, { stage }, viewerScope);
  if (!decision.allowed) {
    return Object.freeze({
      viewable: false,
      reason: decision.reason,
      isEmpty: false,
      isPending: false,
      isUnpublished: stage !== ResultStage.PUBLISHED,
      rowCount: 0,
    });
  }

  return Object.freeze({
    viewable: true,
    reason: null,
    isEmpty: rows.length === 0,
    isPending: stage !== ResultStage.PUBLISHED,
    isUnpublished: false,
    rowCount: rows.length,
  });
}

/**
 * Aggregate for the existing `hero` on the mobile Results screen.
 * Withheld whenever the caller may not view the result set.
 */
export function aggregateResult(resultSet, role, viewerScope = {}) {
  const state = resultSetState(resultSet, role, viewerScope);
  if (!state.viewable) {
    return Object.freeze({ permitted: false, total: 0, average: null, percentText: null });
  }
  const rows = Array.isArray(resultSet?.rows) ? resultSet.rows : [];
  const validated = rows.map(validateMark).filter((entry) => entry.valid);
  if (validated.length === 0) {
    return Object.freeze({ permitted: true, total: 0, average: null, percentText: null });
  }
  const total = validated.reduce((sum, entry) => sum + entry.value.percent, 0) / validated.length;
  return Object.freeze({
    permitted: true,
    total: validated.length,
    average: Math.round(total * 100) / 100,
    percentText: `${formatNumber(total, { decimals: 1 })}%`,
  });
}