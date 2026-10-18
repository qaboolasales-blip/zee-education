/**
 * Privacy-safe people selectors. Task: E-O-02 and E-O-03.
 *
 * These functions REDACT rather than filter. A caller passes whatever the server
 * returned; the selector returns a frozen copy containing only the categories the
 * role may see, with every denied category replaced by an explicit tombstone.
 *
 * Why redact instead of filter:
 *  - filtering silently changes a list's length, and a length change on a
 *    locked screen is indistinguishable from real data loss;
 *  - a tombstone (`null` plus a reason) lets the UI-lock and QA layers prove the
 *    refusal happened, without inventing any new visible string;
 *  - the input object is never mutated, so a caller cannot accidentally read an
 *    unredacted copy.
 *
 * NO STUDENT, GUARDIAN OR STAFF FIELD IS NAMED HERE. None is published. The
 * selectors operate on category keys only — see `contracts/pending-people-contract.js`.
 */

import {
  ANONYMOUS,
  DATA_CATEGORIES,
  DataCategory,
  Scope,
  hiddenCategories,
  mayView,
  requiresServerScope,
  visibleCategories,
} from './privacy-policy.js';
import { safeText, EMPTY_MARKER } from '../format/empty.js';

export { DataCategory, Scope };

/** Marker written in place of a denied category. */
export const REDACTED = Object.freeze({ redacted: true, reason: 'role-not-permitted' });

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Redact one record for one role.
 *
 * @param {Record<string, unknown>} record arbitrary server payload, keyed by category
 * @param {string} role
 * @returns {Readonly<Record<string, unknown>>} frozen; denied categories tombstoned
 */
export function selectPersonForRole(record, role) {
  const source = isPlainObject(record) ? record : {};
  const output = {};

  for (const [category, value] of Object.entries(source)) {
    output[category] = mayView(role, category) ? value : REDACTED;
  }

  return Object.freeze(output);
}

/**
 * Redact a list of records for one role.
 * Never mutates the input array or its items.
 *
 * @param {unknown[]} records
 * @param {string} role
 */
export function selectPeopleForRole(records, role) {
  const list = Array.isArray(records) ? records : [];
  return Object.freeze(list.map((record) => selectPersonForRole(record, role)));
}

/**
 * Redact a single category out of one record without touching the others.
 *
 * @param {Record<string, unknown>} record
 * @param {string} category
 * @param {string} role
 */
export function redactCategory(record, category, role) {
  const source = isPlainObject(record) ? record : {};
  const output = { ...source };
  output[category] = mayView(role, category) ? source[category] : REDACTED;
  return Object.freeze(output);
}

/**
 * Which category keys were actually withheld for a role.
 * Used by tests and QA to assert a redaction was total rather than partial.
 *
 * @param {Record<string, unknown>} record
 * @param {string} role
 */
export function redactedCategories(record, role) {
  const source = isPlainObject(record) ? record : {};
  return Object.freeze(
    Object.keys(source)
      .filter((category) => !mayView(role, category))
      .sort(),
  );
}

/**
 * Parent scoping guard.
 *
 * The frontend cannot prove which children are linked to a guardian — that is a
 * server fact. So this function refuses to act unless the caller supplies the
 * server-resolved scope, and then it keeps only those rows. Without a scope it
 * returns an EMPTY list rather than assuming every child is linked.
 *
 * @param {unknown[]} children
 * @param {{ linkedIds?: readonly unknown[] | null }} [serverScope]
 * @returns {ReadonlyArray<unknown>} frozen
 */
export function selectLinkedChildren(children, serverScope = {}) {
  const list = Array.isArray(children) ? children : [];
  const linked = serverScope?.linkedIds;

  if (!Array.isArray(linked) || linked.length === 0) {
    return Object.freeze([]);
  }

  const allowed = new Set(linked);
  return Object.freeze(
    list.filter((child) => isPlainObject(child) && allowed.has(child.id)),
  );
}

/**
 * Guard for the student role: a student may only ever see their own record.
 *
 * @param {unknown} record
 * @param {{ ownId?: unknown }} [serverScope]
 */
export function selectOwnRecord(record, serverScope = {}) {
  if (!isPlainObject(record)) return Object.freeze(null);
  const ownId = serverScope?.ownId;
  if (ownId === undefined || ownId === null) return Object.freeze(null);
  return Object.freeze(record.id === ownId ? record : null);
}

/**
 * Structured child count for the zero / one / many cases.
 *
 * Returns STRUCTURE ONLY — no display string. The approved references contain no
 * approved "no children" copy, so producing one here would invent a locked
 * string. See `docs/people-blockers.md` (PEB-03).
 *
 * @param {unknown[]} list
 */
export function describeChildCount(list) {
  const count = Array.isArray(list) ? list.length : 0;
  return Object.freeze({
    count,
    isEmpty: count === 0,
    isSingle: count === 1,
    isMany: count > 1,
  });
}

/**
 * Enrollment state for a single child, derived only from what the caller
 * already holds. No status vocabulary is invented: the published schema has no
 * students table, so an unknown status stays unknown.
 *
 * @param {unknown} record
 * @param {{ activeValues?: readonly string[] }} [options]
 */
export function classifyChildStatus(record, options = {}) {
  const activeValues = Array.isArray(options.activeValues) ? options.activeValues : [];
  if (!isPlainObject(record)) {
    return Object.freeze({ known: false, status: null, active: false });
  }
  const status = typeof record.status === 'string' ? record.status.trim() : null;
  if (status === null || status === '' || activeValues.length === 0) {
    return Object.freeze({ known: false, status, active: false });
  }
  const active = activeValues.includes(status);
  return Object.freeze({ known: true, status, active });
}

/**
 * Optional media such as a photo.
 *
 * IMPORTANT FINDING: the approved references contain NO photo element. The
 * `.pe i` cell is a text initial derived from the name, and the mobile `.card`
 * /`.list` rows carry no image. So "missing photo" is not a state the locked UI
 * can express, and this selector deliberately returns a structured description
 * rather than any markup (PEB-02).
 *
 * @param {unknown} value
 */
export function describeOptionalMedia(value) {
  const present = typeof value === 'string' && value.trim() !== '';
  return Object.freeze({ present, kind: 'unsupported-by-locked-ui' });
}

/**
 * Contact details.
 *
 * The approved references display a phone number in one place only — the Staff
 * & HR `Contact` column (e.g. `0300 1234567`). No student or guardian contact
 * surface exists, so contact visibility is recorded, never formatted into a new
 * control (PEB-02).
 *
 * @param {unknown} value
 */
export function describeContact(value) {
  const present = typeof value === 'string' && value.trim() !== '';
  return Object.freeze({ present, renderable: false, reason: 'no-approved-contact-surface' });
}

/**
 * Full access description for a role, for an audit line or a test assertion.
 * Contains no person data — only policy outcomes.
 *
 * @param {string} role
 */
export function describeAccess(role) {
  const anonymous = role === ANONYMOUS;
  const allowed = anonymous ? [] : visibleCategories(role);
  const denied = anonymous ? [...DATA_CATEGORIES] : hiddenCategories(role);

  return Object.freeze({
    role,
    anonymous,
    allowed: Object.freeze([...allowed]),
    denied: Object.freeze([...denied]),
    serverScoped: Object.freeze(allowed.filter((c) => requiresServerScope(role, c))),
    defaultDeny: allowed.length === 0,
  });
}