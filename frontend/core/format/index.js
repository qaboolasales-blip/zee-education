/**
 * Public surface of the Zee Education frontend formatter layer.
 *
 * These utilities only produce strings and numbers. They never touch the DOM,
 * never add a node and never change a style, so binding them to the approved
 * UI cannot alter a single pixel on its own.
 *
 * The `—` empty marker and every string shape produced here are recorded in
 * `frontend/docs/reference-ui-audit.md` so the locked reference strings stay
 * reproducible.
 */

export {
  PKR,
  EMPTY_MARKER,
  toFiniteNumber,
  groupDigits,
  formatNumber,
  formatPkr,
  formatPkrCompact,
  formatPercent,
} from './money.js';

export {
  KARACHI_TIME_ZONE,
  KARACHI_UTC_OFFSET_LABEL,
  MONTH_NAMES_LONG,
  MONTH_NAMES_SHORT,
  WEEKDAY_NAMES_LONG,
  WEEKDAY_NAMES_SHORT,
  parseDateValue,
  toKarachiParts,
  formatKarachiDate,
  formatKarachiDateShort,
  formatKarachiWeekday,
  formatKarachiTime,
  formatKarachiDateTime,
  formatKarachiDayHeading,
  formatMinutesAgo,
  formatDueIn,
} from './datetime.js';

export {
  isEmptyValue,
  safeText,
  safeNumber,
  safePercent,
  safeList,
  safeInitials,
  firstPresent,
  joinPresent,
  safeFlag,
} from './empty.js';