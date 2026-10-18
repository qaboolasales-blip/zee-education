/**
 * PKR currency formatting. Task: O-02.1.
 *
 * Why digits are grouped manually instead of via `Intl.NumberFormat`:
 * `Intl.NumberFormat('en-PK', …)` applies South-Asian lakh grouping and would
 * render 1080000 as "10,80,000". The approved references show Western 3-digit
 * grouping ("PKR 12,500", "PKR 65,000"). Grouping is therefore implemented here
 * so output is byte-deterministic and independent of the host's ICU build.
 *
 * Divisor/format rules are recorded in `frontend/docs/reference-ui-audit.md`
 * ("Locked-value observations relevant to future formatting"). Known remaining
 * divergence in the locked UI is `PKR 296K` (uppercase K) next to
 * `PKR 12.5k` (lowercase k). This module does NOT attempt to reconcile it —
 * changing a locked string is a UI decision, not an integration decision.
 * Tracked as open item OI-3 in `frontend/docs/ui-binding-map.md`.
 */

export const PKR = 'PKR';
export const EMPTY_MARKER = '—';

const NUMERIC_STRING_PATTERN = /^[+-]?(\d+(\.\d+)?|\.\d+)$/;

const COMPACT_STEPS = Object.freeze([
  { limit: 1e12, suffix: 'T' },
  { limit: 1e9, suffix: 'B' },
  { limit: 1e6, suffix: 'M' },
  { limit: 1e3, suffix: 'k' },
]);

/**
 * Coerce a value to a finite number, or `null`.
 * Accepts numbers and strict numeric strings only (form inputs arrive as
 * strings). Rejects `NaN`, `Infinity`, booleans, arrays, objects and loose
 * strings such as `"1,234"` or `"12px"`.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
export function toFiniteNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || !NUMERIC_STRING_PATTERN.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Insert `separator` every 3 digits from the right. */
export function groupDigits(digits, separator = ',') {
  if (digits.length <= 3) return digits;
  const head = digits.length % 3 === 0 ? 3 : digits.length % 3;
  const groups = [digits.slice(0, head)];
  for (let i = head; i < digits.length; i += 3) {
    groups.push(digits.slice(i, i + 3));
  }
  return groups.join(separator);
}

/**
 * Group a fixed-point number string into Western 3-digit groups.
 * @param {string} value e.g. `"12500.5"`
 */
function groupFixed(value) {
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [intPart = '0', fracPart] = unsigned.split('.');
  const grouped = groupDigits(intPart.replace(/^0+(?=\d)/, '') || '0');
  const sign = negative ? '-' : '';
  return fracPart === undefined ? `${sign}${grouped}` : `${sign}${grouped}.${fracPart}`;
}

/**
 * Format a plain number.
 *
 * @param {unknown} value
 * @param {{ decimals?: number, empty?: string }} [options]
 * @returns {string}
 */
export function formatNumber(value, { decimals = 0, empty = EMPTY_MARKER } = {}) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) {
    throw new RangeError('decimals must be an integer between 0 and 6');
  }
  const numeric = toFiniteNumber(value);
  if (numeric === null) return empty;
  const fixed = Math.abs(numeric).toFixed(decimals);
  const signed = numeric < 0 ? `-${fixed}` : fixed;
  return groupFixed(signed);
}

/**
 * Format a PKR amount, e.g. `12500` -> `"PKR 12,500"`.
 *
 * @param {unknown} value
 * @param {{ decimals?: number, empty?: string, prefix?: string }} [options]
 * @returns {string}
 */
export function formatPkr(value, { decimals = 0, empty = EMPTY_MARKER, prefix = `${PKR} ` } = {}) {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return empty;
  return `${prefix}${formatNumber(numeric, { decimals })}`;
}

/**
 * Format a PKR amount in the compact style already used by the approved stat
 * tiles: `1080000` -> `"PKR 1.08M"`, `12500` -> `"PKR 12.5k"`, `500` -> `"PKR 500"`.
 *
 * The value is rounded to `decimals` first, then trailing fractional zeros are
 * trimmed, so a whole compact unit never renders as `"2.0M"`.
 *
 * @param {unknown} value
 * @param {{ decimals?: number, empty?: string, prefix?: string }} [options]
 * @returns {string}
 */
export function formatPkrCompact(value, { decimals = 2, empty = EMPTY_MARKER, prefix = `${PKR} ` } = {}) {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return empty;
  if (numeric === 0) return `${prefix}0`;

  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) {
    throw new RangeError('decimals must be an integer between 0 and 6');
  }

  const magnitude = Math.abs(numeric);
  const step = COMPACT_STEPS.find((candidate) => magnitude >= candidate.limit);

  if (!step) {
    return `${prefix}${formatNumber(numeric, { decimals: 0 })}`;
  }

  const [whole, fraction = ''] = (magnitude / step.limit).toFixed(decimals).split('.');
  const trimmed = fraction.replace(/0+$/, '');
  const body = trimmed === '' ? whole : `${whole}.${trimmed}`;
  const sign = numeric < 0 ? '-' : '';

  return `${prefix}${sign}${body}${step.suffix}`;
}

/**
 * Format a percentage for the locked attendance/result tiles, e.g.
 * `91.7` -> `"91.7%"`, `92` -> `"92%"`, `0.9442` -> `"94.4%"` with `ratio: true`.
 * Values are clamped to 0–100 and trailing fractional zeros are trimmed so a
 * whole percentage matches the locked copy (which shows both `"91.7%"` and
 * `"92%"`).
 *
 * @param {unknown} value
 * @param {{ decimals?: number, ratio?: boolean, empty?: string }} [options]
 * @returns {string}
 */
export function formatPercent(value, { decimals = 1, ratio = false, empty = EMPTY_MARKER } = {}) {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return empty;

  const percent = ratio ? numeric * 100 : numeric;
  if (!Number.isFinite(percent)) return empty;

  const clamped = Math.min(100, Math.max(0, percent));
  const [whole, fraction = ''] = clamped.toFixed(decimals).split('.');
  const trimmed = fraction.replace(/0+$/, '');
  const body = trimmed === '' ? whole : `${whole}.${trimmed}`;

  return `${body}%`;
}