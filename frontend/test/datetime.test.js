/**
 * Asia/Karachi date/time formatter tests. Task: O-02.2.
 *
 * Every input is SYNTHETIC: fixed ISO instants with an explicit UTC offset.
 * No production timestamp, no student record, no real school data.
 *
 * Asia/Karachi is UTC+05:00 with no daylight saving, so the expected strings
 * below are exact and machine-independent.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  EMPTY_MARKER,
  KARACHI_TIME_ZONE,
  formatDueIn,
  formatKarachiDate,
  formatKarachiDateShort,
  formatKarachiDateTime,
  formatKarachiDayHeading,
  formatKarachiTime,
  formatKarachiWeekday,
  formatMinutesAgo,
  parseDateValue,
  toKarachiParts,
} from '../core/format/datetime.js';

/** 2026-10-16T09:30:00Z === 2026-10-16 14:30 Asia/Karachi (a Friday). */
const FRI_1430 = '2026-10-16T09:30:00Z';
/** 2026-10-20T04:15:00Z === 2026-10-20 09:15 Asia/Karachi (a Tuesday). */
const TUE_0915 = '2026-10-20T04:15:00Z';
/** 2026-10-28T07:00:00Z === 2026-10-28 12:00 Asia/Karachi (a Wednesday). */
const WED_NOON = '2026-10-28T07:00:00Z';

describe('zone configuration', () => {
  it('is pinned to Asia/Karachi', () => {
    assert.equal(KARACHI_TIME_ZONE, 'Asia/Karachi');
  });
});

describe('parseDateValue', () => {
  it('accepts Date, epoch ms and ISO strings', () => {
    assert.ok(parseDateValue(new Date(FRI_1430)) instanceof Date);
    assert.equal(parseDateValue(Date.parse(FRI_1430)).toISOString(), new Date(FRI_1430).toISOString());
    assert.ok(parseDateValue(FRI_1430) instanceof Date);
    assert.ok(parseDateValue(new Date('2026-10-16T14:30:00+05:00')) instanceof Date);
  });

  it('rejects unusable input so "Invalid Date" can never reach the UI', () => {
    for (const value of [null, undefined, Number.NaN, Infinity, '', '   ', 'not-a-date', {}, [], true, new Date('nope')]) {
      assert.equal(parseDateValue(value), null, `${String(value)} must be rejected`);
    }
  });
});

describe('toKarachiParts', () => {
  it('shifts UTC into Asia/Karachi (+05:00)', () => {
    const parts = toKarachiParts(FRI_1430);
    assert.equal(parts.year, 2026);
    assert.equal(parts.month, 10);
    assert.equal(parts.day, 16);
    assert.equal(parts.hour, 14);
    assert.equal(parts.minute, 30);
    assert.equal(parts.weekday, 'Friday');
  });

  it('returns null for unusable input', () => {
    assert.equal(toKarachiParts(null), null);
    assert.equal(toKarachiParts('nope'), null);
  });

  it('does not roll over midnight incorrectly near the UTC day boundary', () => {
    // 2026-10-16T20:00:00Z is already 2026-10-17 01:00 in Karachi.
    const parts = toKarachiParts('2026-10-16T20:00:00Z');
    assert.equal(parts.day, 17);
    assert.equal(parts.month, 10);
    assert.equal(parts.hour, 1);
    // ...and 2026-10-15T20:00:00Z is still 2026-10-16 01:00 in Karachi.
    const earlier = toKarachiParts('2026-10-15T20:00:00Z');
    assert.equal(earlier.day, 16);
    assert.equal(earlier.hour, 1);
  });
});

describe('formatKarachiDate — matches the locked long date', () => {
  it('reproduces "16 October 2026"', () => {
    assert.equal(formatKarachiDate(FRI_1430), '16 October 2026');
  });

  it('renders the empty marker for unusable input', () => {
    for (const value of [null, undefined, '', 'nope', Number.NaN]) {
      assert.equal(formatKarachiDate(value), EMPTY_MARKER);
    }
    assert.equal(formatKarachiDate(null, { empty: '' }), '');
  });
});

describe('formatKarachiDateShort — matches the locked short dates', () => {
  it('reproduces "20 Oct", "28 Oct", "15 Oct"', () => {
    assert.equal(formatKarachiDateShort(TUE_0915), '20 Oct');
    assert.equal(formatKarachiDateShort(WED_NOON), '28 Oct');
    assert.equal(formatKarachiDateShort('2026-10-15T06:00:00Z'), '15 Oct');
  });

  it('can include the year', () => {
    assert.equal(formatKarachiDateShort(WED_NOON, { withYear: true }), '28 Oct 2026');
  });

  it('renders the empty marker for unusable input', () => {
    assert.equal(formatKarachiDateShort(null), EMPTY_MARKER);
  });
});

describe('formatKarachiWeekday', () => {
  it('reproduces "Friday" and the short form', () => {
    assert.equal(formatKarachiWeekday(FRI_1430), 'Friday');
    assert.equal(formatKarachiWeekday(FRI_1430, { short: true }), 'Fri');
    assert.equal(formatKarachiWeekday(TUE_0915), 'Tuesday');
  });
});

describe('formatKarachiTime — matches the locked "10:00 AM" / "02:00 PM"', () => {
  it('zero-pads the 12-hour clock exactly as the locked UI does', () => {
    assert.equal(formatKarachiTime('2026-10-16T05:00:00Z'), '10:00 AM');
    assert.equal(formatKarachiTime('2026-10-16T09:00:00Z'), '02:00 PM');
    assert.equal(formatKarachiTime(FRI_1430), '02:30 PM');
  });

  it('handles midnight and noon correctly', () => {
    assert.equal(formatKarachiTime('2026-10-15T19:00:00Z'), '12:00 AM');
    assert.equal(formatKarachiTime('2026-10-16T07:00:00Z'), '12:00 PM');
  });

  it('supports a 24-hour form without leading ambiguity', () => {
    assert.equal(formatKarachiTime(FRI_1430, { hour12: false }), '14:30');
    assert.equal(formatKarachiTime('2026-10-15T19:00:00Z', { hour12: false }), '00:00');
  });

  it('can drop the hour zero padding', () => {
    assert.equal(formatKarachiTime(FRI_1430, { padHour: false }), '2:30 PM');
  });

  it('renders the empty marker for unusable input', () => {
    assert.equal(formatKarachiTime(null), EMPTY_MARKER);
    assert.equal(formatKarachiTime(undefined, { empty: '' }), '');
  });
});

describe('formatKarachiDateTime', () => {
  it('composes a date, time and PKT label', () => {
    assert.equal(formatKarachiDateTime(FRI_1430), '16 Oct 2026, 02:30 PM PKT');
  });

  it('renders the empty marker for unusable input', () => {
    assert.equal(formatKarachiDateTime('nope'), EMPTY_MARKER);
  });
});

describe('formatKarachiDayHeading — matches the locked dashboard eyebrow', () => {
  it('reproduces "Friday · 16 October 2026"', () => {
    assert.equal(formatKarachiDayHeading(FRI_1430), 'Friday · 16 October 2026');
  });

  it('accepts a different separator', () => {
    assert.equal(formatKarachiDayHeading(FRI_1430, { separator: ' ' }), 'Friday 16 October 2026');
  });

  it('renders the empty marker for unusable input', () => {
    assert.equal(formatKarachiDayHeading(null), EMPTY_MARKER);
  });
});

describe('formatMinutesAgo — matches the locked activity feed', () => {
  it('reproduces "2m ago", "12m ago", "24m ago", "37m ago", "1h ago"', () => {
    assert.equal(formatMinutesAgo(2), '2m ago');
    assert.equal(formatMinutesAgo(12), '12m ago');
    assert.equal(formatMinutesAgo(24), '24m ago');
    assert.equal(formatMinutesAgo(37), '37m ago');
    assert.equal(formatMinutesAgo(60), '1h ago');
    assert.equal(formatMinutesAgo(59), '59m ago');
  });

  it('rolls up to days and months', () => {
    assert.equal(formatMinutesAgo(119), '1h ago');
    assert.equal(formatMinutesAgo(1440), '1d ago');
    assert.equal(formatMinutesAgo(43200), '1mo ago');
  });

  it('uses the now label below one minute', () => {
    assert.equal(formatMinutesAgo(0), 'now');
    assert.equal(formatMinutesAgo(0.4), 'now');
    assert.equal(formatMinutesAgo(0, { nowLabel: '' }), '');
  });

  it('rejects negatives and unusable input', () => {
    assert.equal(formatMinutesAgo(-1), EMPTY_MARKER);
    assert.equal(formatMinutesAgo(null), EMPTY_MARKER);
    assert.equal(formatMinutesAgo(undefined), EMPTY_MARKER);
    assert.equal(formatMinutesAgo('abc'), EMPTY_MARKER);
    assert.equal(formatMinutesAgo(Number.NaN), EMPTY_MARKER);
  });
});

describe('formatDueIn — matches the locked renewal rows', () => {
  it('reproduces "Due in 4d", "Due in 19d", "Due in 26d"', () => {
    assert.equal(formatDueIn(4 * 1440), 'Due in 4d');
    assert.equal(formatDueIn(19 * 1440), 'Due in 19d');
    assert.equal(formatDueIn(26 * 1440), 'Due in 26d');
  });

  it('falls back to hours and to an overdue label', () => {
    assert.equal(formatDueIn(180), 'Due in 3h');
    assert.equal(formatDueIn(30), 'Due in <1h');
    assert.equal(formatDueIn(-60), 'Due');
  });

  it('renders the empty marker for unusable input', () => {
    assert.equal(formatDueIn(null), EMPTY_MARKER);
    assert.equal(formatDueIn('abc'), EMPTY_MARKER);
  });
});