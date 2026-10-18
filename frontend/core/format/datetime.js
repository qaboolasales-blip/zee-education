/**
 * Asia/Karachi date and time formatting. Task: O-02.1.
 *
 * Zee Education is a Pakistan deployment pinned to `Asia/Karachi`
 * (UTC+05:00, no daylight saving). Formatting is done with `Intl` in an
 * explicit time zone so the result is correct regardless of the machine's local
 * clock — but month names and meridiem assembly are produced locally (from
 * `formatToParts` + constant tables) so output stays deterministic across ICU
 * builds, exactly as the digits are in `money.js`.
 */

import { EMPTY_MARKER } from './money.js';

export { EMPTY_MARKER };

export const KARACHI_TIME_ZONE = 'Asia/Karachi';
export const KARACHI_UTC_OFFSET_LABEL = 'PKT';

export const MONTH_NAMES_LONG = Object.freeze([
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]);

export const MONTH_NAMES_SHORT = Object.freeze([
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]);

const WEEKDAY_NAMES_LONG = Object.freeze([
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]);

const WEEKDAY_NAMES_SHORT = Object.freeze(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: KARACHI_TIME_ZONE,
  calendar: 'gregory',
  numberingSystem: 'latn',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const weekdayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: KARACHI_TIME_ZONE,
  calendar: 'gregory',
  numberingSystem: 'latn',
  weekday: 'long',
});

const weekdayShortFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: KARACHI_TIME_ZONE,
  calendar: 'gregory',
  numberingSystem: 'latn',
  weekday: 'short',
});

/**
 * Coerce a value to a valid `Date`, or `null`.
 * Accepts `Date`, epoch milliseconds and ISO-8601 strings.
 * Rejects `null`, `undefined`, booleans, objects, empty strings and invalid
 * dates, so `new Date(undefined)` can never leak "Invalid Date" into the UI.
 *
 * @param {unknown} value
 * @returns {Date|null}
 */
export function parseDateValue(value) {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const fromNumber = new Date(value);
    return Number.isFinite(fromNumber.getTime()) ? fromNumber : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = new Date(trimmed);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  return null;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

/** Decompose an instant into Asia/Karachi calendar parts. */
export function toKarachiParts(value) {
  const date = parseDateValue(value);
  if (date === null) return null;

  const parts = {};
  for (const part of partsFormatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour) % 24;

  if (![year, month, day].every(Number.isFinite)) return null;

  return {
    date,
    year,
    month,
    day,
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: weekdayFormatter.format(date),
    weekdayShort: weekdayShortFormatter.format(date),
  };
}

/**
 * Long date, matching the locked `"16 October 2026"`.
 * @param {unknown} value
 * @param {{ empty?: string }} [options]
 */
export function formatKarachiDate(value, { empty = EMPTY_MARKER } = {}) {
  const parts = toKarachiParts(value);
  if (parts === null) return empty;
  return `${parts.day} ${MONTH_NAMES_LONG[parts.month - 1]} ${parts.year}`;
}

/** Short date, matching the locked `"28 Oct"`, `"20 Oct"`, `"15 Oct"`. */
export function formatKarachiDateShort(value, { empty = EMPTY_MARKER, withYear = false } = {}) {
  const parts = toKarachiParts(value);
  if (parts === null) return empty;
  const base = `${parts.day} ${MONTH_NAMES_SHORT[parts.month - 1]}`;
  return withYear ? `${base} ${parts.year}` : base;
}

/** Weekday name, matching the locked `"Friday"`. */
export function formatKarachiWeekday(value, { empty = EMPTY_MARKER, short = false } = {}) {
  const parts = toKarachiParts(value);
  if (parts === null) return empty;
  return short ? parts.weekdayShort : parts.weekday;
}

/**
 * 12-hour time, matching the locked `"10:00 AM"` / `"02:00 PM"`.
 * The hour is zero-padded because that is exactly how the locked strings render.
 *
 * @param {unknown} value
 * @param {{ empty?: string, hour12?: boolean, padHour?: boolean }} [options]
 */
export function formatKarachiTime(
  value,
  { empty = EMPTY_MARKER, hour12 = true, padHour = true } = {},
) {
  const parts = toKarachiParts(value);
  if (parts === null) return empty;

  const minute = pad2(parts.minute);

  if (!hour12) {
    return `${pad2(parts.hour)}:${minute}`;
  }

  const meridiem = parts.hour < 12 ? 'AM' : 'PM';
  const hour12Value = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
  const hour = padHour ? pad2(hour12Value) : String(hour12Value);

  return `${hour}:${minute} ${meridiem}`;
}

/**
 * Date + time, e.g. `"16 Oct 2026, 02:00 PM PKT"`.
 * @param {unknown} value
 * @param {{ empty?: string, hour12?: boolean }} [options]
 */
export function formatKarachiDateTime(value, { empty = EMPTY_MARKER, hour12 = true } = {}) {
  const date = formatKarachiDateShort(value, { empty: null, withYear: true });
  if (date === null) return empty;
  return `${date}, ${formatKarachiTime(value, { empty: '', hour12 })} ${KARACHI_UTC_OFFSET_LABEL}`;
}

/**
 * Day heading for the locked screen headers, e.g. `"Friday · 16 October 2026"`.
 * @param {unknown} value
 * @param {{ empty?: string, separator?: string }} [options]
 */
export function formatKarachiDayHeading(
  value,
  { empty = EMPTY_MARKER, separator = ' · ' } = {}) {
  const parts = toKarachiParts(value);
  if (parts === null) return empty;
  return `${parts.weekday}${separator}${parts.day} ${MONTH_NAMES_LONG[parts.month - 1]} ${parts.year}`;
}

/**
 * Relative age, matching the locked activity feed (`"2m ago"`, `"1h ago"`).
 * Input is an elapsed duration in minutes, NOT a timestamp, so the caller stays
 * in control of the clock.
 *
 * @param {unknown} minutes
 * @param {{ empty?: string, nowLabel?: string }} [options]
 * @returns {string}
 */
export function formatMinutesAgo(minutes, { empty = EMPTY_MARKER, nowLabel = 'now' } = {}) {
  const numeric = typeof minutes === 'number' ? minutes : Number(minutes);
  if (minutes === null || minutes === undefined || minutes === '' || !Number.isFinite(numeric)) {
    return empty;
  }
  if (numeric < 0) return empty;

  const total = Math.floor(numeric);
  if (total < 1) return nowLabel;
  if (total < 60) return `${total}m ago`;
  if (total < 1440) return `${Math.floor(total / 60)}h ago`;
  if (total < 43200) return `${Math.floor(total / 1440)}d ago`;
  return `${Math.floor(total / 43200)}mo ago`;
}

/**
 * Countdown text, matching the locked renewal rows (`"Due in 4d"`, `"Due in 19d"`).
 * @param {unknown} minutes
 * @param {{ empty?: string, overdueLabel?: string, unit?: string }} [options]
 */
export function formatDueIn(minutes, { empty = EMPTY_MARKER, overdueLabel = 'Due', unit = 'd' } = {}) {
  const numeric = typeof minutes === 'number' ? minutes : Number(minutes);
  if (minutes === null || minutes === undefined || minutes === '' || !Number.isFinite(numeric)) {
    return empty;
  }
  if (numeric < 0) return overdueLabel;
  const days = Math.floor(numeric / 1440);
  if (days < 1) {
    const hours = Math.floor(numeric / 60);
    if (hours < 1) return 'Due in <1h';
    return `Due in ${hours}h`;
  }
  return `Due in ${days}${unit}`;
}