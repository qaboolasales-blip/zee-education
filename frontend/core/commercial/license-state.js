/**
 * License, database and renewal state. Task: K-O-02.
 *
 * "Display license state with existing approved UI styles only."
 *
 * The Super Admin reference ships the mapping itself, as a two-line function:
 *
 *   const stc = s => s === 'Active' ? 'g' : s === 'Renewal due' ? 'w' : 'n';
 *   bd(x[4] === 'Dedicated' ? 'g' : 'w', x[4])     // the Database column
 *
 * where `bd=(c,t) => '<span class="bd ' + c + '">' + t + '</span>'` and `.g`, `.w`,
 * `.r`, `.n` are the existing global colour classes.
 *
 * So this module transcribes that mapping rather than designing a status model, and
 * the transcription has one deliberate property: **an unrecognised licence state must
 * not resolve to `Active`.**
 *
 * That is the whole risk in this area. A new server value — `Expired`, `Suspended`,
 * `Trial` — that fell through to `Active` would render green and read as "this school
 * is in good standing". A school whose licence has lapsed is precisely the school an
 * operator must notice. So an unknown state keeps the neutral `.n` badge, reports
 * `known: false`, and is recorded as a blocker instead of being given a colour.
 *
 * No DOM, no CSS, no rendering.
 */

import { EMPTY_MARKER } from '../format/empty.js';
import { toKarachiParts } from '../format/datetime.js';

/**
 * The only two licence states the reference maps. Anything else is unknown.
 * Transcribed from `stc` — not a business vocabulary.
 */
export const LicenseStatus = Object.freeze({
  ACTIVE: 'Active',
  RENEWAL_DUE: 'Renewal due',
});

/** `stc`, transcribed. */
export const LICENSE_STATUS_BADGE = Object.freeze({
  [LicenseStatus.ACTIVE]: 'g',
  [LicenseStatus.RENEWAL_DUE]: 'w',
});

/** The neutral fallback `stc` already returns for everything else. */
export const NEUTRAL_BADGE = 'n';

/** The only database kind the reference treats as good. */
export const DatabaseKind = Object.freeze({ DEDICATED: 'Dedicated' });

/** `x[4]==='Dedicated'?'g':'w'`, transcribed. */
export const DATABASE_BADGE = Object.freeze({ [DatabaseKind.DEDICATED]: 'g' });
export const DATABASE_BADGE_FALLBACK = 'w';

export const LicenseReject = Object.freeze({
  NOT_AN_OBJECT: 'not-an-object',
  MISSING_NAME: 'missing-name',
});

function fail(reason) {
  return Object.freeze({ valid: false, reason });
}

/** The badge class for a licence state, defaulting to the neutral `.n`. */
export function licenseBadge(status) {
  return LICENSE_STATUS_BADGE[status] ?? NEUTRAL_BADGE;
}

/** The badge class for a database kind, defaulting to `.w` exactly as the reference does. */
export function databaseBadge(kind) {
  return DATABASE_BADGE[kind] ?? DATABASE_BADGE_FALLBACK;
}

/**
 * Normalise one commercial record into the existing `Schools & Installs` columns.
 *
 * Columns: School · Domain · Plan · Database · Status · Renewal · (actions)
 *
 * @param {{ name?: unknown, city?: unknown, domain?: unknown, plan?: unknown,
 *           database?: unknown, status?: unknown, renewalDate?: unknown }} record
 */
export function normaliseCommercialRecord(record) {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return fail(LicenseReject.NOT_AN_OBJECT);
  }
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  if (name === '') return fail(LicenseReject.MISSING_NAME);

  const status = typeof record.status === 'string' && record.status.trim() !== ''
    ? record.status.trim()
    : null;
  const known = status !== null && Object.prototype.hasOwnProperty.call(LICENSE_STATUS_BADGE, status);

  const renewal = parseRenewal(record.renewalDate);

  return Object.freeze({
    valid: true,
    reason: null,
    name,
    city: typeof record.city === 'string' && record.city.trim() !== '' ? record.city.trim() : null,
    domain: typeof record.domain === 'string' && record.domain.trim() !== '' ? record.domain.trim() : null,
    plan: typeof record.plan === 'string' && record.plan.trim() !== '' ? record.plan.trim() : null,
    database: typeof record.database === 'string' && record.database.trim() !== ''
      ? record.database.trim()
      : null,
    status,
    statusKnown: known,
    statusBadge: licenseBadge(status),
    databaseBadge: databaseBadge(
      typeof record.database === 'string' && record.database.trim() !== ''
        ? record.database.trim()
        : null,
    ),
    renewalDate: renewal.date,
    renewalText: renewal.text,
    renewalDays: renewal.days,
  });
}

/**
 * A renewal date renders through the existing `—` when absent or unparseable.
 * The reference itself shows `—` for a school still being set up, so this is the
 * existing treatment rather than a new empty state.
 *
 * @param {{ renewalDate?: unknown, now?: unknown }} record
 */
export function parseRenewal(record = {}) {
  const raw = record.renewalDate;
  if (typeof raw !== 'string' || raw.trim() === '' || raw.trim() === EMPTY_MARKER) {
    return Object.freeze({ date: null, text: EMPTY_MARKER, days: null });
  }
  const parts = toKarachiParts(raw);
  if (parts === null) {
    return Object.freeze({ date: null, text: EMPTY_MARKER, days: null });
  }
  const nowParts = toKarachiParts(record.now ?? Date.now());
  if (nowParts === null) {
    return Object.freeze({ date: raw.trim(), text: raw.trim(), days: null });
  }
  const days = Math.round(
    (Date.UTC(parts.year, parts.month - 1, parts.day) -
      Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day)) /
      86400000,
  );
  return Object.freeze({ date: raw.trim(), text: raw.trim(), days });
}

/**
 * The licence state a row actually conveys, stated plainly rather than by colour.
 *
 * `renewalDue` is only true for the one state the reference names. An unknown state is
 * **not** treated as active and **not** treated as due — it is surfaced as unknown, so
 * an operator sees that the vocabulary has moved on rather than a confident wrong
 * answer.
 */
export function licenseStateFor(record, options = {}) {
  const row = normaliseCommercialRecord(record);
  if (!row.valid) {
    return Object.freeze({ known: false, status: null, badge: NEUTRAL_BADGE, renewalDue: false, days: null });
  }
  const renewal = parseRenewal({ renewalDate: record.renewalDate, now: options.now });
  return Object.freeze({
    known: row.statusKnown,
    status: row.status,
    badge: row.statusBadge,
    renewalDue: row.status === LicenseStatus.RENEWAL_DUE,
    active: row.status === LicenseStatus.ACTIVE,
    days: renewal.days,
  });
}

/**
 * The four existing `.stat` tiles.
 *
 * Structure only — no tile renders a number that is not derived from a record. When
 * commercial data is missing the summary is withheld rather than zeroed, for the same
 * reason the fee summary withholds: `0` asserts a fact, `null` admits ignorance.
 */
export function commercialSummary(records) {
  const list = Array.isArray(records) ? records : [];
  const rows = list.map(normaliseCommercialRecord);
  const valid = rows.filter((row) => row.valid);

  if (valid.length === 0) {
    return Object.freeze({
      present: false,
      reason: list.length === 0 ? 'no-commercial-records' : 'all-records-invalid',
      installs: 0,
      activeCount: 0,
      renewalDueCount: 0,
      unknownStatusCount: 0,
      invalidCount: rows.length,
    });
  }

  const active = valid.filter((row) => row.status === LicenseStatus.ACTIVE);
  const due = valid.filter((row) => row.status === LicenseStatus.RENEWAL_DUE);
  const unknown = valid.filter((row) => !row.statusKnown);

  return Object.freeze({
    present: true,
    reason: rows.length - valid.length > 0 ? 'partial' : null,
    installs: valid.length,
    activeCount: active.length,
    renewalDueCount: due.length,
    unknownStatusCount: unknown.length,
    invalidCount: rows.length - valid.length,
  });
}

/**
 * Drift guard — the transcription must still match `stc` and the badge classes in the
 * reference. If the reference adds a state, this fails rather than quietly ignoring it.
 *
 * @param {string} platformSource
 */
export function assertLicenseStatesMatchReferences(platformSource) {
  if (typeof platformSource !== 'string' || platformSource === '') {
    throw new Error('no Super Admin reference supplied');
  }
  const problems = [];

  if (!platformSource.includes("s==='Active'?'g'")) {
    problems.push('the reference no longer maps Active to the .g badge');
  }
  if (!platformSource.includes("s==='Renewal due'?'w'")) {
    problems.push('the reference no longer maps Renewal due to the .w badge');
  }
  if (!platformSource.includes("'n'")) {
    problems.push('the reference no longer falls back to the .n badge');
  }
  if (!platformSource.includes("==='Dedicated'?'g':'w'")) {
    problems.push('the reference no longer maps a non-Dedicated database to .w');
  }
  for (const state of [LicenseStatus.ACTIVE, LicenseStatus.RENEWAL_DUE]) {
    if (!platformSource.includes(`'${state}'`)) {
      problems.push(`the licence state "${state}" is gone from the reference`);
    }
  }
  // An expired state would be the most important addition of all, so its absence is
  // asserted explicitly rather than left to the fallback.
  for (const absent of ['Expired', 'Suspended']) {
    if (platformSource.includes(`'${absent}'`)) {
      problems.push(
        `the reference now shows "${absent}", which this module has no badge mapping for; ` +
          'extend LicenseStatus deliberately rather than letting it fall through to .n',
      );
    }
  }
  for (const hook of ['.bd{', '.g{', '.w{', '.n{']) {
    if (!platformSource.includes(hook)) problems.push(`badge hook ${hook} is gone`);
  }

  if (problems.length > 0) {
    throw new Error(`license state contract drifted:\n  ${problems.join('\n  ')}`);
  }
  return true;
}
