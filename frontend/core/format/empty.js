/**
 * Safe empty / absent value rendering. Task: O-02.1.
 *
 * Every value that reaches an approved DOM text node must pass through here so
 * that `undefined`, `null`, `NaN`, `[object Object]` and empty whitespace can
 * never be rendered. This is a **data** concern only: it returns strings and
 * numbers. It creates no node, sets no class and reads no style.
 *
 * The default empty marker is `—` (em dash) because that is the glyph already
 * used inside the approved references for absent values (e.g. the Super Admin
 * renewal column). Choosing it here does not add any new UI.
 */

import { EMPTY_MARKER, toFiniteNumber } from './money.js';

export { EMPTY_MARKER };

/**
 * True when a value carries no presentable content.
 * `false`, `0`, `NaN`-as-empty and `'0'` are NOT empty.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number') return Number.isNaN(value);
  if (typeof value === 'boolean') return false;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (value instanceof Date) return !Number.isFinite(value.getTime());
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Render text safely. Objects are never stringified into `[object Object]`.
 *
 * @param {unknown} value
 * @param {{ empty?: string, maxLength?: number|null }} [options]
 * @returns {string}
 */
export function safeText(value, { empty = EMPTY_MARKER, maxLength = null } = {}) {
  if (isEmptyValue(value)) return empty;
  if (typeof value === 'object') return empty;
  if (typeof value === 'number' && !Number.isFinite(value)) return empty;

  const text = typeof value === 'string' ? value : String(value);
  const trimmed = text.trim();

  if (trimmed === '') return empty;
  if (Number.isInteger(maxLength) && maxLength > 0 && trimmed.length > maxLength) {
    return `${trimmed.slice(0, maxLength - 1)}…`;
  }
  return trimmed;
}

/**
 * Render a number safely.
 * @param {unknown} value
 * @param {{ empty?: string, fallback?: number }} [options]
 * @returns {string}
 */
export function safeNumber(value, { empty = EMPTY_MARKER, fallback = null } = {}) {
  if (isEmptyValue(value)) {
    return fallback === null ? empty : String(fallback);
  }
  const numeric = toFiniteNumber(value);
  if (numeric === null) return fallback === null ? empty : String(fallback);
  return String(numeric);
}

/**
 * Render a 0–100 percentage safely and clamped.
 * @param {unknown} value
 * @param {{ empty?: string, decimals?: number, ratio?: boolean }} [options]
 * @returns {string}
 */
export function safePercent(value, { empty = EMPTY_MARKER, decimals = 1, ratio = false } = {}) {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return empty;
  const percent = ratio ? numeric * 100 : numeric;
  if (!Number.isFinite(percent)) return empty;
  const clamped = Math.min(100, Math.max(0, percent));
  return `${clamped.toFixed(decimals)}%`;
}

/**
 * Return an array, whatever the input was.
 * @param {unknown} value
 * @returns {unknown[]}
 */
export function safeList(value) {
  if (Array.isArray(value)) return value;
  if (isEmptyValue(value)) return [];
  return [value];
}

/**
 * Two-letter initials, mirroring the existing reference helper so avatar cells
 * keep rendering identically. E.g. `"Horizon Public School"` -> `"HP"`.
 *
 * @param {unknown} value
 * @param {{ empty?: string, max?: number }} [options]
 * @returns {string}
 */
export function safeInitials(value, { empty = EMPTY_MARKER, max = 2 } = {}) {
  const text = safeText(value, { empty: '' });
  if (text === '') return empty;

  const initials = text
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => [...token][0] ?? '')
    .join('')
    .slice(0, Math.max(1, max));

  return initials === '' ? empty : initials;
}

/**
 * Choose the first value that is present, else the fallback.
 * @param {unknown[]} candidates
 * @param {unknown} [fallback]
 */
export function firstPresent(candidates, fallback = EMPTY_MARKER) {
  for (const candidate of candidates) {
    if (!isEmptyValue(candidate)) return candidate;
  }
  return fallback;
}

/**
 * Join non-empty parts with a separator, mirroring how the reference composes
 * subtitle lines such as `"Grade 6 · A"`.
 *
 * @param {unknown[]} parts
 * @param {{ separator?: string, empty?: string }} [options]
 * @returns {string}
 */
export function joinPresent(parts, { separator = ' · ', empty = EMPTY_MARKER } = {}) {
  const rendered = safeList(parts)
    .map((part) => safeText(part, { empty: '' }))
    .filter((part) => part !== '');
  return rendered.length === 0 ? empty : rendered.join(separator);
}

/**
 * Render a yes/no style flag using only copy the caller supplies.
 * Never invents new wording, so it cannot introduce a new locked string.
 *
 * @param {unknown} value
 * @param {{ truthy: string, falsy: string }} labels
 */
export function safeFlag(value, labels) {
  if (isEmptyValue(value)) return safeText(labels?.falsy, { empty: EMPTY_MARKER });
  return safeText(Boolean(value) ? labels?.truthy : labels?.falsy, { empty: EMPTY_MARKER });
}