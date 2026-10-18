/**
 * Role-safe attendance summaries. Task: F-O-04.
 *
 * "Format role-safe attendance summaries using existing cards/charts only."
 *
 * Two rules are enforced here:
 *
 *  1. **Role safety.** A summary is computed only for a role that may see the
 *     underlying records. The people privacy matrix decides whether attendance is
 *     even in scope for that role, and parent scoping requires the
 *     server-resolved linked set. A role without scope gets an EMPTY summary, not
 *     a zeroed one — the difference between "no permission" and "nobody was
 *     present" must not be erased.
 *
 *  2. **No new presentation.** This module returns STRUCTURE ONLY — counts,
 *     ratios and existing-state hints. It emits no label, no sentence and no
 *     colour, because the approved summaries live in `.sm` cards and the
 *     `Attendance overview` SVG chart, and their copy is already locked
 *     (`'Attendance today'`, `'91.7%'`, `'above target'`, `'28 / 28'`,
 *     `'Sab entries marked'`). Re-formatting a percentage is fine; writing new
 *     copy is not (FAT-03).
 *
 * No DOM, no rendering, no CSS.
 */

import { AttendanceStatus, isAttendanceStatus } from './status-model.js';
import { markCounts, markedCount } from './submission.js';
import { DataCategory, Scope, mayView, scopeFor } from '../people/privacy-policy.js';
import { formatPercent, formatNumber } from '../format/money.js';

/** Where a summary is allowed to appear, bound to existing approved elements. */
export const SummaryTarget = Object.freeze({
  OVERVIEW_CARD: 'overview-stat-card',
  OVERVIEW_CHART: 'attendance-overview-chart',
  CLASS_PROGRESS_CARD: 'class-progress-card',
  PARENT_ALERTS_CARD: 'parent-alerts-card',
  MOBILE_HERO: 'mobile-hero',
  MOBILE_KPI: 'mobile-kpi',
});

/** The approved targets. Anything else would be a new element. */
export const APPROVED_SUMMARY_TARGETS = Object.freeze([
  SummaryTarget.OVERVIEW_CARD,
  SummaryTarget.OVERVIEW_CHART,
  SummaryTarget.CLASS_PROGRESS_CARD,
  SummaryTarget.PARENT_ALERTS_CARD,
  SummaryTarget.MOBILE_HERO,
  SummaryTarget.MOBILE_KPI,
]);

/**
 * The shape returned when a role may not see the data at all.
 * `permitted: false` must never be rendered as `0`.
 */
const WITHHELD = Object.freeze({
  permitted: false,
  scope: Scope.NONE,
  total: 0,
  marked: 0,
  present: 0,
  absent: 0,
  leave: 0,
  unmarked: 0,
  presentRatio: null,
  percentText: null,
  progressText: null,
  complete: false,
  targets: Object.freeze([]),
});

/**
 * Can this role receive an attendance summary for this record set?
 *
 * @param {string} role
 * @param {{ linkedIds?: readonly unknown[] | null }} [serverScope]
 */
export function attendanceVisibility(role, serverScope = {}) {
  if (!mayView(role, DataCategory.ATTENDANCE)) {
    return Object.freeze({ permitted: false, scope: Scope.NONE });
  }
  const scope = scopeFor(role, DataCategory.ATTENDANCE);

  // Parent may only ever summarise linked children, and the client cannot
  // establish that linkage, so a server-resolved set is mandatory.
  if (scope === Scope.LINKED_CHILDREN) {
    const linked = serverScope.linkedIds;
    if (!Array.isArray(linked) || linked.length === 0) {
      return Object.freeze({ permitted: false, scope });
    }
    return Object.freeze({ permitted: true, scope });
  }

  if (scope === Scope.OWN) {
    const ownId = serverScope.ownId;
    if (ownId === undefined || ownId === null) {
      return Object.freeze({ permitted: false, scope });
    }
    return Object.freeze({ permitted: true, scope });
  }

  return Object.freeze({ permitted: true, scope });
}

/**
 * Summarise one register for one role.
 *
 * @param {object|null} register
 * @param {string} role
 * @param {{ linkedIds?: readonly unknown[]|null, ownId?: unknown, targets?: readonly string[] }} [options]
 */
export function summariseRegister(register, role, options = {}) {
  const visibility = attendanceVisibility(role, options);
  if (!visibility.permitted) return WITHHELD;
  if (!register || !Array.isArray(register.roster)) return WITHHELD;

  const counts = markCounts(register);
  const total = register.roster.length;
  const marked = markedCount(register);
  const unmarked = Math.max(0, total - marked);
  const presentRatio = total > 0 ? counts[AttendanceStatus.PRESENT] / total : null;

  const targets = Object.freeze(
    (Array.isArray(options.targets) ? options.targets : APPROVED_SUMMARY_TARGETS).filter((target) =>
      APPROVED_SUMMARY_TARGETS.includes(target),
    ),
  );

  return Object.freeze({
    permitted: true,
    scope: visibility.scope,
    total,
    marked,
    present: counts[AttendanceStatus.PRESENT],
    absent: counts[AttendanceStatus.ABSENT],
    leave: counts[AttendanceStatus.LEAVE],
    unmarked,
    presentRatio,
    // Text for EXISTING approved elements only, via the existing formatters.
    percentText: presentRatio === null ? null : formatPercent(presentRatio, { ratio: true }),
    // The existing card shows a "28 / 28" shape via formatNumber.
    progressText: `${formatNumber(marked)} / ${formatNumber(total)}`,
    complete: total > 0 && unmarked === 0,
    targets,
  });
}

/**
 * Summarise several registers (e.g. a 7-day chart series) for one role.
 * Only day-level aggregates are exposed — never per-student attendance here,
 * because no chart element has a per-student row.
 *
 * @param {ReadonlyArray<object>} registers
 */
export function summariseSeries(registers, role, options = {}) {
  const visibility = attendanceVisibility(role, options);
  if (!visibility.permitted) return WITHHELD;

  const list = Array.isArray(registers) ? registers : [];
  let present = 0;
  let absent = 0;
  let leave = 0;
  let marked = 0;
  let total = 0;

  for (const register of list) {
    if (!register || !Array.isArray(register.roster)) continue;
    const counts = markCounts(register);
    present += counts[AttendanceStatus.PRESENT];
    absent += counts[AttendanceStatus.ABSENT];
    leave += counts[AttendanceStatus.LEAVE];
    marked += markedCount(register);
    total += register.roster.length;
  }

  const presentRatio = total > 0 ? present / total : null;

  return Object.freeze({
    permitted: true,
    scope: visibility.scope,
    days: list.length,
    total,
    marked,
    present,
    absent,
    leave,
    unmarked: Math.max(0, total - marked),
    presentRatio,
    percentText: presentRatio === null ? null : formatPercent(presentRatio, { ratio: true }),
    // The chart already draws bars by height; a ratio is what it needs.
    completeDays: Object.freeze(
      list.filter((register) => register && Array.isArray(register.roster) && register.roster.length > 0 && markedCount(register) === register.roster.length).length,
    ),
  });
}

/**
 * Does a mark exist for a status on this surface?
 * Used so a caller cannot request a Leave state the mobile UI cannot render.
 */
export function statusVisibleOnStatusCard(status) {
  return isAttendanceStatus(status);
}