/**
 * Safe empty-value formatter tests. Task: O-02.2.
 * Synthetic inputs only.
 *
 * Core rule under test: an approved DOM text node must never receive
 * "undefined", "null", "NaN" or "[object Object]".
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  EMPTY_MARKER,
  firstPresent,
  isEmptyValue,
  joinPresent,
  safeFlag,
  safeInitials,
  safeList,
  safeNumber,
  safePercent,
  safeText,
} from '../core/format/empty.js';

const JUNK_VALUES = [null, undefined, '', '   ', Number.NaN, [], {}, new Date('nope')];

describe('empty marker', () => {
  it('is the em dash already used inside the approved references', () => {
    assert.equal(EMPTY_MARKER, '—');
  });
});

describe('isEmptyValue', () => {
  it('detects absent values', () => {
    for (const value of JUNK_VALUES) {
      assert.equal(isEmptyValue(value), true, `${String(value)} must count as empty`);
    }
  });

  it('does not treat falsy-but-present values as empty', () => {
    for (const value of [0, '0', false, true, 'x', [0], { a: 1 }]) {
      assert.equal(isEmptyValue(value), false, `${String(value)} must not count as empty`);
    }
  });
});

describe('safeText', () => {
  it('renders present values and trims them', () => {
    assert.equal(safeText('Grade 6 · A'), 'Grade 6 · A');
    assert.equal(safeText('  Grade 6  '), 'Grade 6');
    assert.equal(safeText(842), '842');
    assert.equal(safeText(0), '0');
    assert.equal(safeText(false), 'false');
  });

  it('never renders undefined, null, NaN or [object Object]', () => {
    for (const value of JUNK_VALUES) {
      const rendered = safeText(value);
      assert.equal(rendered, EMPTY_MARKER);
      assert.doesNotMatch(rendered, /undefined|null|NaN|\[object Object\]/);
    }
  });

  it('honours a custom fallback', () => {
    assert.equal(safeText(null, { empty: '0' }), '0');
    assert.equal(safeText(undefined, { empty: 'Not set' }), 'Not set');
  });

  it('truncates only when explicitly asked, using an ellipsis', () => {
    assert.equal(safeText('Muhammad Ayan Khan', { maxLength: 10 }), 'Muhammad …');
    assert.equal(safeText('Short', { maxLength: 10 }), 'Short');
  });
});

describe('safeNumber', () => {
  it('renders present numeric values', () => {
    assert.equal(safeNumber(842), '842');
    assert.equal(safeNumber('842'), '842');
    assert.equal(safeNumber(0), '0');
  });

  it('falls back for absent values', () => {
    assert.equal(safeNumber(null), EMPTY_MARKER);
    assert.equal(safeNumber('abc'), EMPTY_MARKER);
    assert.equal(safeNumber(null, { fallback: 0 }), '0');
  });
});

describe('safePercent', () => {
  it('renders and clamps percentages', () => {
    assert.equal(safePercent(91.7), '91.7%');
    assert.equal(safePercent(93), '93.0%');
    assert.equal(safePercent(93, { decimals: 0 }), '93%');
    assert.equal(safePercent(140), '100.0%');
    assert.equal(safePercent(-3), '0.0%');
    assert.equal(safePercent(0.942, { ratio: true }), '94.2%');
  });

  it('falls back for absent values', () => {
    assert.equal(safePercent(null), EMPTY_MARKER);
    assert.equal(safePercent('abc'), EMPTY_MARKER);
  });
});

describe('safeList', () => {
  it('always returns an array', () => {
    assert.deepEqual(safeList(['a', 'b']), ['a', 'b']);
    assert.deepEqual(safeList('a'), ['a']);
    assert.deepEqual(safeList(null), []);
    assert.deepEqual(safeList(undefined), []);
    assert.deepEqual(safeList([]), []);
  });
});

describe('safeInitials — mirrors the existing reference avatar helper', () => {
  it('reproduces the reference initials rule', () => {
    assert.equal(safeInitials('Horizon Public School'), 'HP');
    assert.equal(safeInitials('Ms. Sara Ahmed'), 'MS');
    assert.equal(safeInitials('Ayesha Khan'), 'AK');
    assert.equal(safeInitials('Platform'), 'P');
  });

  it('handles messy whitespace', () => {
    assert.equal(safeInitials('  Muhammad   Ayan  '), 'MA');
  });

  it('falls back for absent values', () => {
    assert.equal(safeInitials(null), EMPTY_MARKER);
    assert.equal(safeInitials('   '), EMPTY_MARKER);
  });
});

describe('firstPresent', () => {
  it('returns the first non-empty candidate', () => {
    assert.equal(firstPresent([null, '', undefined, 'INV-1024', 'INV-1025']), 'INV-1024');
    assert.equal(firstPresent([0, 5]), 0);
  });

  it('returns the fallback when nothing is present', () => {
    assert.equal(firstPresent([null, '', undefined]), EMPTY_MARKER);
    assert.equal(firstPresent([], 'none'), 'none');
  });
});

describe('joinPresent — mirrors the reference subtitle composition', () => {
  it('joins only present parts with the locked separator', () => {
    assert.equal(joinPresent(['Grade 6', 'A']), 'Grade 6 · A');
    assert.equal(joinPresent(['Grade 6', null, '', 'A']), 'Grade 6 · A');
    assert.equal(joinPresent(['Islamabad', 'School workspace']), 'Islamabad · School workspace');
  });

  it('falls back when nothing is present', () => {
    assert.equal(joinPresent([null, '']), EMPTY_MARKER);
    assert.equal(joinPresent([]), EMPTY_MARKER);
  });
});

describe('safeFlag', () => {
  it('uses only caller-supplied wording', () => {
    assert.equal(safeFlag(true, { truthy: 'Paid', falsy: 'Due' }), 'Paid');
    assert.equal(safeFlag(false, { truthy: 'Paid', falsy: 'Due' }), 'Due');
    assert.equal(safeFlag(null, { truthy: 'Paid', falsy: 'Due' }), 'Due');
  });

  it('never invents wording', () => {
    assert.equal(safeFlag(true, {}), EMPTY_MARKER);
  });
});