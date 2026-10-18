/**
 * PKR formatter tests. Task: O-02.2.
 * Synthetic inputs only. No real student, fee or commercial record is used.
 *
 * Expected values that matter are the strings already visible in the approved
 * references (see frontend/docs/reference-ui-audit.md).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  EMPTY_MARKER,
  formatNumber,
  formatPkr,
  formatPkrCompact,
  formatPercent,
  groupDigits,
  toFiniteNumber,
} from '../core/format/money.js';

describe('toFiniteNumber', () => {
  it('accepts finite numbers and strict numeric strings', () => {
    assert.equal(toFiniteNumber(12500), 12500);
    assert.equal(toFiniteNumber(0), 0);
    assert.equal(toFiniteNumber(-4), -4);
    assert.equal(toFiniteNumber('12500'), 12500);
    assert.equal(toFiniteNumber('  12,5 '), null, 'lakh-style commas must not be silently parsed');
    assert.equal(toFiniteNumber('12.75'), 12.75);
    assert.equal(toFiniteNumber('.5'), 0.5);
    assert.equal(toFiniteNumber('-0.5'), -0.5);
  });

  it('rejects everything else', () => {
    for (const value of [null, undefined, Number.NaN, Infinity, -Infinity, '', '   ', 'abc', '12px', '1,234', true, false, [], {}, () => 1]) {
      assert.equal(toFiniteNumber(value), null, `${String(value)} must be rejected`);
    }
  });
});

describe('groupDigits — Western 3-digit grouping, independent of ICU', () => {
  it('groups from the right', () => {
    assert.equal(groupDigits('1'), '1');
    assert.equal(groupDigits('123'), '123');
    assert.equal(groupDigits('1234'), '1,234');
    assert.equal(groupDigits('12345'), '12,345');
    assert.equal(groupDigits('123456'), '123,456');
    assert.equal(groupDigits('1234567'), '1,234,567');
    assert.equal(groupDigits('1234567890'), '1,234,567,890');
  });

  it('never applies South-Asian lakh grouping', () => {
    assert.equal(formatNumber(1080000), '1,080,000');
    assert.notEqual(formatNumber(1080000), '10,80,000');
  });
});

describe('formatNumber', () => {
  it('formats the reference-shaped values', () => {
    assert.equal(formatNumber(842), '842');
    assert.equal(formatNumber(12500), '12,500');
    assert.equal(formatNumber(65000), '65,000');
    assert.equal(formatNumber(42000), '42,000');
    assert.equal(formatNumber(-12500), '-12,500');
    assert.equal(formatNumber(1234.5, { decimals: 2 }), '1,234.50');
    assert.equal(formatNumber(0), '0');
  });

  it('renders the empty marker for unusable input', () => {
    for (const value of [null, undefined, '', Number.NaN, 'abc', {}, []]) {
      assert.equal(formatNumber(value), EMPTY_MARKER);
    }
    assert.equal(formatNumber(null, { empty: '0' }), '0');
  });

  it('rejects an out-of-range decimals option', () => {
    assert.throws(() => formatNumber(1, { decimals: -1 }), RangeError);
    assert.throws(() => formatNumber(1, { decimals: 7 }), RangeError);
    assert.throws(() => formatNumber(1, { decimals: 1.5 }), RangeError);
  });
});

describe('formatPkr', () => {
  it('reproduces the locked PKR strings', () => {
    assert.equal(formatPkr(12500), 'PKR 12,500');
    assert.equal(formatPkr(9800), 'PKR 9,800');
    assert.equal(formatPkr(65000), 'PKR 65,000');
    assert.equal(formatPkr(30000), 'PKR 30,000');
    assert.equal(formatPkr(42000), 'PKR 42,000');
    assert.equal(formatPkr(11000), 'PKR 11,000');
    assert.equal(formatPkr(0), 'PKR 0');
  });

  it('handles negatives and decimals', () => {
    assert.equal(formatPkr(-12500), 'PKR -12,500');
    assert.equal(formatPkr(12500.5, { decimals: 2 }), 'PKR 12,500.50');
  });

  it('renders the empty marker for unusable input', () => {
    assert.equal(formatPkr(null), EMPTY_MARKER);
    assert.equal(formatPkr(undefined), EMPTY_MARKER);
    assert.equal(formatPkr('not-a-number'), EMPTY_MARKER);
    assert.equal(formatPkr(''), EMPTY_MARKER);
  });

  it('accepts a form-input numeric string', () => {
    assert.equal(formatPkr('12500'), 'PKR 12,500');
  });
});

describe('formatPkrCompact', () => {
  it('reproduces the locked compact stat strings', () => {
    assert.equal(formatPkrCompact(1080000), 'PKR 1.08M');
    assert.equal(formatPkrCompact(1460000), 'PKR 1.46M');
    assert.equal(formatPkrCompact(12500), 'PKR 12.5k');
  });

  it('uses documented suffixes for larger magnitudes', () => {
    assert.equal(formatPkrCompact(296000), 'PKR 296k');
    assert.equal(formatPkrCompact(1000000), 'PKR 1M');
    assert.equal(formatPkrCompact(2500000000), 'PKR 2.5B');
    assert.equal(formatPkrCompact(1500000000000), 'PKR 1.5T');
  });

  it('never renders a bare 0 fraction', () => {
    assert.equal(formatPkrCompact(2000000), 'PKR 2M');
    assert.equal(formatPkrCompact(3000), 'PKR 3k');
    assert.equal(formatPkrCompact(0), 'PKR 0');
  });

  it('falls back to a grouped integer below 1000', () => {
    assert.equal(formatPkrCompact(500), 'PKR 500');
    assert.equal(formatPkrCompact(999), 'PKR 999');
  });

  it('handles negatives and empty input', () => {
    assert.equal(formatPkrCompact(-1080000), 'PKR -1.08M');
    assert.equal(formatPkrCompact(null), EMPTY_MARKER);
    assert.equal(formatPkrCompact(Number.NaN), EMPTY_MARKER);
  });

  it('respects the decimals option', () => {
    assert.equal(formatPkrCompact(1080000, { decimals: 1 }), 'PKR 1.1M');
    assert.equal(formatPkrCompact(12500, { decimals: 3 }), 'PKR 12.5k');
    assert.throws(() => formatPkrCompact(1, { decimals: 9 }), RangeError);
  });

  it('documents the known locked-UI divergence rather than silently reconciling it', () => {
    // The locked School Dashboard shows "PKR 296K" (uppercase K) beside
    // "PKR 12.5k" (lowercase k). This formatter is deterministic and uses a
    // single lowercase rule; reconciling the locked string is an owner UI
    // decision (open item OI-3), not something the integration layer may do.
    assert.equal(formatPkrCompact(296000), 'PKR 296k');
    assert.notEqual(formatPkrCompact(296000), 'PKR 296K');
  });
});

describe('formatPercent', () => {
  it('reproduces the locked attendance strings', () => {
    assert.equal(formatPercent(91.7), '91.7%');
    assert.equal(formatPercent(94.2), '94.2%');
    assert.equal(formatPercent(93), '93%');
  });

  it('clamps out-of-range values instead of rendering nonsense', () => {
    assert.equal(formatPercent(140), '100%');
    assert.equal(formatPercent(-5), '0%');
  });

  it('supports ratio input', () => {
    assert.equal(formatPercent(0.942, { ratio: true }), '94.2%');
  });

  it('renders the empty marker for unusable input', () => {
    assert.equal(formatPercent(null), EMPTY_MARKER);
    assert.equal(formatPercent('abc'), EMPTY_MARKER);
    assert.equal(formatPercent(Number.NaN), EMPTY_MARKER);
  });
});