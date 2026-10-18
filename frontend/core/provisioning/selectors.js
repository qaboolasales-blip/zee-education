/**
 * Pure selectors and validators for control-plane values. Task: C-O-05.
 *
 * Every rule here is derived from a PUBLISHED column or enum in
 * `control-plane-schema.js`, or from the published error-status table. Nothing is
 * invented, and no display label is produced: mapping an enum to visible copy
 * needs approved strings that do not exist for these values (C-O-06).
 *
 * No DOM, no network, no storage, no rendering.
 */

import {
  AUDIT_ACTOR_TYPES,
  PROVISIONING_JOB_STATUSES,
  PROVISIONING_JOB_TYPES,
  SCHOOL_STATUS_VALUES,
} from './control-plane-schema.js';
import { safeText, EMPTY_MARKER } from '../format/empty.js';

/**
 * Published error statuses only (openapi-v0.md "Error responses").
 * 409 Conflict is deliberately absent because the contract does not define it,
 * even though duplicate handling is an obvious need (see C-O-06).
 */
export const PUBLISHED_ERROR_STATUSES = Object.freeze([400, 401, 403, 404, 429, 500]);

/** Reasons a value can be rejected, as a closed set. No free-form messages. */
export const RejectReason = Object.freeze({
  MISSING: 'missing',
  NOT_A_STRING: 'not-a-string',
  TOO_LONG: 'too-long',
  MALFORMED_DOMAIN: 'malformed-domain',
  NOT_IN_ENUM: 'not-in-enum',
  NOT_A_BOOLEAN: 'not-a-boolean',
  NOT_A_NON_NEGATIVE_INTEGER: 'not-a-non-negative-integer',
  UNKNOWN_FIELD: 'unknown-field',
  FORBIDDEN_FIELD: 'forbidden-field',
});

function ok(value) {
  return Object.freeze({ valid: true, reason: null, value, errors: Object.freeze([]) });
}

function fail(reason, value, errors = []) {
  return Object.freeze({ valid: false, reason, value, errors: Object.freeze(errors) });
}

/**
 * Hostname rules for `school_domains.domain` (VARCHAR(191), unique per school).
 *
 * Deliberately conservative: labels, no scheme, no port, no path, no
 * credentials, no trailing dot. A school domain is a verified hostname, and the
 * reference already stores `horizon.school.pk` / `brightfuture.edu.pk` in exactly
 * this form.
 */
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function isValidSchoolDomain(domain) {
  if (typeof domain !== 'string') return false;
  const candidate = domain.trim().toLowerCase();
  if (candidate === '' || candidate.length > 191) return false;
  if (/[^a-z0-9.-]/.test(candidate)) return false;
  if (candidate.startsWith('.') || candidate.endsWith('.') || candidate.includes('..')) return false;

  const labels = candidate.split('.');
  if (labels.length < 2) return false;
  const tld = labels[labels.length - 1];
  if (tld.length < 2 || !/^[a-z]{2,}$/.test(tld)) return false;

  return labels.every((label) => DOMAIN_LABEL.test(label));
}

/**
 * Validate a school domain. Never lowercases the value it returns — the stored
 * hostname is authoritative server-side and the frontend must not rewrite it.
 */
export function validateSchoolDomain(domain) {
  if (domain === undefined || domain === null) return fail(RejectReason.MISSING, null);
  if (typeof domain !== 'string') return fail(RejectReason.NOT_A_STRING, null);
  const trimmed = domain.trim();
  if (trimmed === '') return fail(RejectReason.MISSING, null);
  if (trimmed.length > 191) return fail(RejectReason.TOO_LONG, trimmed);
  if (!isValidSchoolDomain(trimmed)) return fail(RejectReason.MALFORMED_DOMAIN, trimmed);
  return ok(trimmed);
}

/**
 * Validate a value against a published enum.
 * @param {unknown} value
 * @param {ReadonlyArray<string>} allowed
 */
export function validateEnum(value, allowed) {
  if (value === undefined || value === null) return fail(RejectReason.MISSING, null);
  if (typeof value !== 'string') return fail(RejectReason.NOT_A_STRING, null);
  const trimmed = value.trim();
  if (trimmed === '') return fail(RejectReason.MISSING, null);
  if (!allowed.includes(trimmed)) {
    return fail(RejectReason.NOT_IN_ENUM, trimmed, [...allowed]);
  }
  return ok(trimmed);
}

export const validateSchoolStatus = (value) => validateEnum(value, SCHOOL_STATUS_VALUES);
export const validateProvisioningJobType = (value) => validateEnum(value, PROVISIONING_JOB_TYPES);
export const validateProvisioningJobStatus = (value) => validateEnum(value, PROVISIONING_JOB_STATUSES);
export const validateAuditActorType = (value) => validateEnum(value, AUDIT_ACTOR_TYPES);

/** `is_primary` is TINYINT(1) with default 0. */
export function validateIsPrimary(value) {
  if (value === undefined || value === null) return ok(false);
  if (typeof value === 'boolean') return ok(value);
  if (value === 0 || value === 1) return ok(value === 1);
  return fail(RejectReason.NOT_A_BOOLEAN, null);
}

/** `attempts` is INT UNSIGNED with default 0, so it can never be negative. */
export function validateAttempts(value) {
  if (value === undefined || value === null) return ok(0);
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return ok(value);
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return ok(Number(value.trim()));
  return fail(RejectReason.NOT_A_NON_NEGATIVE_INTEGER, null);
}

/**
 * Columns that must never be sent to or accepted from a browser payload.
 * `target_database` names a school's dedicated database and `error_message` can
 * carry infrastructure detail, so neither belongs in a client request.
 * Credentials are excluded by ADR-108 and are not columns at all.
 */
export const FORBIDDEN_CLIENT_FIELDS = Object.freeze([
  'target_database',
  'error_message',
  'ip_address',
  'actor_id',
  'actor_type',
  'id',
]);

/**
 * Reject a payload carrying anything the browser may not set or read.
 * @param {Record<string, unknown>} payload
 * @param {ReadonlyArray<string>} allowedFields
 */
export function validateClientPayload(payload, allowedFields) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return fail(RejectReason.NOT_A_STRING, null);
  }
  const unknown = [];
  const forbidden = [];

  for (const key of Object.keys(payload)) {
    if (FORBIDDEN_CLIENT_FIELDS.includes(key)) forbidden.push(key);
    else if (!allowedFields.includes(key)) unknown.push(key);
  }

  if (forbidden.length > 0) return fail(RejectReason.FORBIDDEN_FIELD, null, forbidden);
  if (unknown.length > 0) return fail(RejectReason.UNKNOWN_FIELD, null, unknown);
  return ok(Object.freeze({ ...payload }));
}

/**
 * Classify a provisioning job for safe handling.
 *
 * Note what this does NOT do: it does not decide whether a retry is safe. Retry
 * safety is a server concern, and the Batch C exit gate requires that a retry
 * cannot create inconsistent duplicate data — that guarantee cannot be made or
 * tested from the browser.
 *
 * @param {{ type?: unknown, status?: unknown, attempts?: unknown }} job
 */
export function classifyProvisioningJob(job) {
  if (!job || typeof job !== 'object') {
    return Object.freeze({ state: 'unknown', reason: RejectReason.MISSING, mayShowError: false });
  }

  const type = validateProvisioningJobType(job.type);
  const status = validateProvisioningJobStatus(job.status);
  const attempts = validateAttempts(job.attempts);

  if (!type.valid || !status.valid || !attempts.valid) {
    return Object.freeze({
      state: 'invalid',
      reason: type.reason ?? status.reason ?? attempts.reason,
      mayShowError: false,
    });
  }

  const state = status.value === 'failed' ? 'failed' : status.value;
  return Object.freeze({
    state,
    reason: null,
    // A failure detail belongs to `error_message`, which the browser may not
    // read (FORBIDDEN_CLIENT_FIELDS). Only the fact of failure is usable.
    mayShowError: status.value === 'failed',
    attempts: attempts.value,
  });
}

/**
 * Map an HTTP status to a safe client-side outcome using ONLY published codes.
 * Any other status collapses to a generic unknown-outcome rather than being
 * interpreted, because the contract does not define it.
 *
 * @param {unknown} status
 */
export function classifyProvisioningOutcome(status) {
  if (!PUBLISHED_ERROR_STATUSES.includes(status)) {
    return Object.freeze({ outcome: 'unknown', status: null, reason: 'unpublished-status' });
  }
  switch (status) {
    case 400:
      return Object.freeze({ outcome: 'rejected', status, reason: 'validation' });
    case 401:
      return Object.freeze({ outcome: 'unauthenticated', status, reason: 'auth' });
    case 403:
      return Object.freeze({ outcome: 'forbidden', status, reason: 'scope' });
    case 404:
      return Object.freeze({ outcome: 'not-found', status, reason: 'missing-record' });
    case 429:
      return Object.freeze({ outcome: 'rate-limited', status, reason: 'throttled' });
    case 500:
      return Object.freeze({ outcome: 'server-error', status, reason: 'internal' });
    default:
      return Object.freeze({ outcome: 'unknown', status, reason: 'unpublished-status' });
  }
}

/**
 * Render a school name for an approved text node. `schools.name` is
 * VARCHAR(191) NOT NULL, so a non-string value is a contract violation rather
 * than something to coerce: it yields the empty marker instead of "42".
 */
export function schoolNameFor(value) {
  if (typeof value !== 'string') return EMPTY_MARKER;
  return safeText(value, { empty: EMPTY_MARKER });
}

/** A domain cell must never render as an empty string. */
export function domainFor(value) {
  const result = validateSchoolDomain(value);
  return result.valid ? result.value : EMPTY_MARKER;
}