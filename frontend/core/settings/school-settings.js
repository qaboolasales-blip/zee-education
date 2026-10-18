/**
 * School settings adapter. Task: D-O-04.
 *
 * Validates and shapes values for the `schools` columns KiloCode has actually
 * implemented, and nothing else. Provenance is migration 000001 and migration
 * 000002, verified by `assertSchemaMatchesMigrations()` in the provisioning
 * schema module.
 *
 * There is NO settings endpoint yet, so this module performs no request. It is
 * the value layer a future binding would use, plus the guards that keep a future
 * binding honest.
 *
 * It does not produce display labels. The approved `Settings` screen offers
 * "English", "Roman Urdu" and "اردو · RTL" in a select, and no locale code
 * vocabulary is published, so mapping label -> code is a recorded blocker
 * (DSB-03) rather than an invented table.
 */

import { SCHEMA_DEFAULTS } from '../provisioning/control-plane-schema.js';
import { safeText, EMPTY_MARKER } from '../format/empty.js';
import { KARACHI_TIME_ZONE } from '../format/datetime.js';
import { PKR } from '../format/money.js';

/**
 * Columns a client may read and write for school settings.
 * `id`, `status`, `plan_code`, `created_at` and `updated_at` are excluded:
 * identity and lifecycle are server-owned, and plan_code references a
 * commercial catalogue that is not published (CPB-04).
 */
export const WRITABLE_SETTING_FIELDS = Object.freeze(['name', 'timezone', 'currency', 'locale']);

/** Read-only setting columns the UI may display. */
export const READONLY_SETTING_FIELDS = Object.freeze(['plan_code', 'status']);

/** Published defaults, sourced from column defaults. */
export const DEFAULT_SCHOOL_SETTINGS = Object.freeze({
  timezone: SCHEMA_DEFAULTS['schools.timezone'],
  currency: SCHEMA_DEFAULTS['schools.currency'],
  locale: SCHEMA_DEFAULTS['schools.locale'],
});

/** Closed rejection reasons. No free-form text can reach UI copy. */
export const SettingReject = Object.freeze({
  MISSING: 'missing',
  NOT_A_STRING: 'not-a-string',
  TOO_LONG: 'too-long',
  NOT_APPROVED_TIMEZONE: 'not-approved-timezone',
  NOT_APPROVED_CURRENCY: 'not-approved-currency',
  BAD_LOCALE_FORMAT: 'bad-locale-format',
  FORBIDDEN_FIELD: 'forbidden-field',
  UNKNOWN_FIELD: 'unknown-field',
});

function ok(value) {
  return Object.freeze({ valid: true, reason: null, value, errors: Object.freeze([]) });
}

function fail(reason, value, errors = []) {
  return Object.freeze({ valid: false, reason, value, errors: Object.freeze(errors) });
}

/**
 * The only timezone the approved `Settings` screen offers:
 * `<label>Timezone<select><option>Asia/Karachi</option></select></label>`
 *
 * Adding a second <option> would change an approved control, so any other zone
 * is rejected here and recorded as DSB-02.
 */
export const APPROVED_SCHOOL_TIMEZONES = Object.freeze([KARACHI_TIME_ZONE]);

/** The only currency the product uses in V1. */
export const APPROVED_SCHOOL_CURRENCIES = Object.freeze([PKR]);

/**
 * `schools.timezone` VARCHAR(64). Accept only an approved zone.
 */
export function validateSchoolTimezone(value) {
  if (value === undefined || value === null) return fail(SettingReject.MISSING, null);
  if (typeof value !== 'string') return fail(SettingReject.NOT_A_STRING, null);
  const trimmed = value.trim();
  if (trimmed === '') return fail(SettingReject.MISSING, null);
  if (trimmed.length > 64) return fail(SettingReject.TOO_LONG, trimmed);
  if (!APPROVED_SCHOOL_TIMEZONES.includes(trimmed)) {
    return fail(SettingReject.NOT_APPROVED_TIMEZONE, trimmed, [...APPROVED_SCHOOL_TIMEZONES]);
  }
  return ok(trimmed);
}

/** `schools.currency` VARCHAR(8). */
export function validateSchoolCurrency(value) {
  if (value === undefined || value === null) return fail(SettingReject.MISSING, null);
  if (typeof value !== 'string') return fail(SettingReject.NOT_A_STRING, null);
  const trimmed = value.trim();
  if (trimmed === '') return fail(SettingReject.MISSING, null);
  if (trimmed.length > 8) return fail(SettingReject.TOO_LONG, trimmed);
  if (!APPROVED_SCHOOL_CURRENCIES.includes(trimmed)) {
    return fail(SettingReject.NOT_APPROVED_CURRENCY, trimmed, [...APPROVED_SCHOOL_CURRENCIES]);
  }
  return ok(trimmed);
}

/**
 * `schools.locale` VARCHAR(8) NOT NULL DEFAULT 'en'.
 *
 * Only the column's FORMAT is checkable: no locale vocabulary is published, so
 * a code allow-list would be invented. Label -> code mapping is DSB-03.
 */
const LOCALE_FORMAT = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export function validateSchoolLocale(value) {
  if (value === undefined || value === null) return fail(SettingReject.MISSING, null);
  if (typeof value !== 'string') return fail(SettingReject.NOT_A_STRING, null);
  const trimmed = value.trim();
  if (trimmed === '') return fail(SettingReject.MISSING, null);
  if (trimmed.length > 8) return fail(SettingReject.TOO_LONG, trimmed);
  if (!LOCALE_FORMAT.test(trimmed)) return fail(SettingReject.BAD_LOCALE_FORMAT, trimmed);
  return ok(trimmed);
}

/** `schools.name` VARCHAR(191) NOT NULL. */
export function validateSchoolName(value) {
  if (value === undefined || value === null) return fail(SettingReject.MISSING, null);
  if (typeof value !== 'string') return fail(SettingReject.NOT_A_STRING, null);
  const trimmed = value.trim();
  if (trimmed === '') return fail(SettingReject.MISSING, null);
  if (trimmed.length > 191) return fail(SettingReject.TOO_LONG, trimmed);
  return ok(trimmed);
}

/** Per-field validators applied by {@link validateSettingsPatch}. */
const FIELD_VALIDATORS = Object.freeze({
  name: validateSchoolName,
  timezone: validateSchoolTimezone,
  currency: validateSchoolCurrency,
  locale: validateSchoolLocale,
});

/**
 * Validate a settings patch from the approved `Settings` screen.
 *
 * Rejects a browser-supplied `id` or `status`: PROJECT_MEMORY requires that a
 * school id is never trusted from the browser, and lifecycle is server-owned.
 *
 * @param {Record<string, unknown>} patch
 */
export function validateSettingsPatch(patch) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    return fail(SettingReject.UNKNOWN_FIELD, null);
  }

  const keys = Object.keys(patch);
  const forbidden = keys.filter((key) => !WRITABLE_SETTING_FIELDS.includes(key));
  if (forbidden.length > 0) return fail(SettingReject.FORBIDDEN_FIELD, null, forbidden);

  const errors = [];
  const cleaned = {};
  for (const [key, value] of Object.entries(patch)) {
    const result = FIELD_VALIDATORS[key](value);
    if (!result.valid) {
      errors.push({ field: key, reason: result.reason });
      continue;
    }
    cleaned[key] = result.value;
  }

  if (errors.length > 0) {
    return Object.freeze({
      valid: false,
      reason: errors[0].reason,
      value: Object.freeze({}),
      errors: Object.freeze(errors),
    });
  }
  return Object.freeze({ valid: true, reason: null, value: Object.freeze(cleaned), errors: Object.freeze([]) });
}

/**
 * Fill a partial settings record with the published column defaults, so a
 * missing value never renders as a blank control.
 */
export function applySchoolSettingDefaults(record) {
  const source = record && typeof record === 'object' ? record : {};
  return Object.freeze({
    timezone:
      typeof source.timezone === 'string' && source.timezone.trim() !== ''
        ? source.timezone.trim()
        : DEFAULT_SCHOOL_SETTINGS.timezone,
    currency:
      typeof source.currency === 'string' && source.currency.trim() !== ''
        ? source.currency.trim()
        : DEFAULT_SCHOOL_SETTINGS.currency,
    locale:
      typeof source.locale === 'string' && source.locale.trim() !== ''
        ? source.locale.trim()
        : DEFAULT_SCHOOL_SETTINGS.locale,
  });
}

/**
 * Is this school operational?
 *
 * Only `active` is. `pending`, `suspended` and `decommissioned` are all
 * inactive — a suspended school must not be treated as usable, and per the data
 * boundary a licence state may restrict access but must never hide or destroy
 * school data, so `dataStillAccessible` stays true in every case.
 */
export function classifySchoolAvailability(status) {
  const value = typeof status === 'string' ? status.trim() : null;
  switch (value) {
    case 'active':
      return Object.freeze({ active: true, status: 'active', dataStillAccessible: true });
    case 'pending':
      return Object.freeze({ active: false, status: 'pending', dataStillAccessible: true });
    case 'suspended':
      return Object.freeze({ active: false, status: 'suspended', dataStillAccessible: true });
    case 'decommissioned':
      return Object.freeze({ active: false, status: 'decommissioned', dataStillAccessible: false });
    default:
      return Object.freeze({ active: false, status: null, dataStillAccessible: true });
  }
}

export function isSchoolActive(status) {
  return classifySchoolAvailability(status).active;
}

/**
 * Render a setting value into an approved text node safely.
 *
 * Every published settings column is a VARCHAR, so a non-string value is a
 * contract violation rather than something to coerce: it yields the empty
 * marker instead of rendering "42".
 */
export function settingText(value) {
  if (typeof value !== 'string') return EMPTY_MARKER;
  return safeText(value, { empty: EMPTY_MARKER });
}