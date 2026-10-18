/**
 * Support access and renewal reminder boundary. Task: K-O-03 and K-O-04.
 *
 * "Bind renewal/support actions to permission-aware adapters."
 *
 * The reference states the support rule in its own words, in a card titled
 * *Support access rule*:
 *
 *   "Support installation health aur approved logs dekhta hai. School records
 *    isolated rehte hain jab tak exceptional audited policy approve na ho."
 *
 *   — Support sees installation health and approved logs. School records stay
 *     isolated until an exceptional audited policy is approved.
 *
 * That sentence is the whole permission model, and it has two halves that pull in
 * opposite directions: support *can* see operational state, and it must *not* see
 * school records. A naive "Super Admin sees everything" rule would violate the second
 * half, so support access is modelled as an explicit allowlist rather than a role
 * check. The Batch E matrix already forbids Super Admin from browsing learner data;
 * `assertSupportIsolation()` re-runs that so the two cannot drift apart.
 *
 * The reminder action carries its own trap. The reference renders:
 *
 *   B('🔔 Prepare reminder', 'Preview only — email not connected', 1)
 *
 * so a reminder is *prepared*, never sent, and email is explicitly not connected. An
 * adapter that reported `sent` would be claiming a delivery that the product does not
 * have.
 *
 * No DOM, no network, no rendering.
 */

import { Role } from '../auth/role-guard.js';
import { DataCategory, mayView, assertSuperAdminCannotBrowseLearners } from '../people/privacy-policy.js';

/** What support is allowed to read, per the reference's *Support access rule*. */
export const SupportScope = Object.freeze({
  INSTALLATION_HEALTH: 'installation-health',
  APPROVED_LOGS: 'approved-logs',
  COMMERCIAL_RECORD: 'commercial-record',
});

export const SUPPORT_SCOPES = Object.freeze([
  SupportScope.INSTALLATION_HEALTH,
  SupportScope.APPROVED_LOGS,
  SupportScope.COMMERCIAL_RECORD,
]);

/**
 * Data categories support may never reach through a support surface, even for Super
 * Admin. Every one of these is school-local.
 */
export const SUPPORT_FORBIDDEN_CATEGORIES = Object.freeze([
  DataCategory.STUDENT_PROFILE,
  DataCategory.GUARDIAN_PROFILE,
  DataCategory.STAFF_PROFILE,
  DataCategory.ATTENDANCE,
  DataCategory.ACADEMIC_RESULTS,
  DataCategory.FEE_RECORDS,
]);

export const SupportReject = Object.freeze({
  UNKNOWN_ACTION: 'unknown-action',
  ROLE_NOT_PERMITTED: 'role-not-permitted',
  SCOPE_NOT_SUPPORTED: 'scope-not-supported',
  FORBIDDEN_CATEGORY: 'forbidden-category',
  AUDIT_REASON_REQUIRED: 'audit-reason-required',
  EMAIL_NOT_CONNECTED: 'email-not-connected',
  UNKNOWN_RENEWAL: 'unknown-renewal',
});

export const SUPPORT_ACTIONS = Object.freeze({
  VIEW_INSTALLATION_HEALTH: 'view-installation-health',
  VIEW_APPROVED_LOGS: 'view-approved-logs',
  VIEW_COMMERCIAL_RECORD: 'view-commercial-record',
  CREATE_TICKET: 'create-ticket',
  PREPARE_RENEWAL_REMINDER: 'prepare-renewal-reminder',
});

const ACTION_SCOPE = Object.freeze({
  [SUPPORT_ACTIONS.VIEW_INSTALLATION_HEALTH]: SupportScope.INSTALLATION_HEALTH,
  [SUPPORT_ACTIONS.VIEW_APPROVED_LOGS]: SupportScope.APPROVED_LOGS,
  [SUPPORT_ACTIONS.VIEW_COMMERCIAL_RECORD]: SupportScope.COMMERCIAL_RECORD,
  [SUPPORT_ACTIONS.CREATE_TICKET]: SupportScope.INSTALLATION_HEALTH,
  [SUPPORT_ACTIONS.PREPARE_RENEWAL_REMINDER]: SupportScope.COMMERCIAL_RECORD,
});

function ok(value) {
  return Object.freeze({ allowed: true, reason: null, value, errors: Object.freeze([]) });
}

function fail(reason, errors = []) {
  return Object.freeze({ allowed: false, reason, value: null, errors: Object.freeze(errors) });
}

export function isSupportAction(value) {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ACTION_SCOPE, value);
}

export function scopeForSupportAction(action) {
  return ACTION_SCOPE[action] ?? null;
}

/**
 * Authorize one support action.
 *
 * @param {{ role?: unknown, action?: unknown, category?: unknown, auditedReason?: unknown }} request
 */
export function authoriseSupportAction(request = {}) {
  const { role, action, category } = request;

  if (!isSupportAction(action)) return fail(SupportReject.UNKNOWN_ACTION);
  if (role !== Role.SUPER_ADMIN) return fail(SupportReject.ROLE_NOT_PERMITTED);

  // The isolation half: a support surface may not be used as a back door to school data.
  if (category !== undefined && category !== null) {
    if (SUPPORT_FORBIDDEN_CATEGORIES.includes(category)) {
      return fail(SupportReject.FORBIDDEN_CATEGORY, [category]);
    }
  }

  // Reading approved logs is the one action the reference conditions on an audit
  // trail, so it must carry a reason.
  if (action === SUPPORT_ACTIONS.VIEW_APPROVED_LOGS) {
    const reason = typeof request.auditedReason === 'string' ? request.auditedReason.trim() : '';
    if (reason === '') return fail(SupportReject.AUDIT_REASON_REQUIRED);
    return ok(Object.freeze({ action, scope: scopeForSupportAction(action), auditedReason: reason }));
  }

  return ok(Object.freeze({ action, scope: scopeForSupportAction(action), auditedReason: null }));
}

/**
 * Renewal reminders are prepared, never sent.
 *
 * The reference says so directly — `Preview only — email not connected` — so this
 * returns a prepared draft and refuses to report a delivery. There is no code path
 * that produces `sent`.
 *
 * @param {{ school?: unknown, renewalDate?: unknown, preparedBy?: unknown }} request
 */
export function prepareRenewalReminder(request = {}) {
  const school = typeof request.school === 'string' ? request.school.trim() : '';
  if (school === '') return fail(SupportReject.UNKNOWN_RENEWAL);

  const gate = authoriseSupportAction({
    role: request.preparedBy,
    action: SUPPORT_ACTIONS.PREPARE_RENEWAL_REMINDER,
  });
  if (!gate.allowed) return fail(gate.reason);

  const renewalDate = typeof request.renewalDate === 'string' ? request.renewalDate.trim() : '';
  if (renewalDate === '') return fail(SupportReject.UNKNOWN_RENEWAL);

  return ok(
    Object.freeze({
      school,
      renewalDate,
      state: 'prepared',
      sent: false,
      channel: null,
      reason: SupportReject.EMAIL_NOT_CONNECTED,
    }),
  );
}

/**
 * K-O-04 — the support rule must still be the Batch E rule.
 *
 * The reference permits support to see installation health, and the privacy matrix
 * must still forbid Super Admin from browsing learner records. If either half moves,
 * one of them is wrong and this fails rather than picking a side.
 */
export function assertSupportIsolation() {
  assertSuperAdminCannotBrowseLearners(Role.SUPER_ADMIN);
  for (const category of SUPPORT_FORBIDDEN_CATEGORIES) {
    if (mayView(Role.SUPER_ADMIN, category)) {
      throw new Error(`Super Admin may browse ${category}; the support boundary would be meaningless`);
    }
  }
  return true;
}

/**
 * Drift guard — the support rule copy and the not-connected reminder must both remain.
 *
 * @param {string} platformSource
 */
export function assertSupportRulesMatchReferences(platformSource) {
  if (typeof platformSource !== 'string' || platformSource === '') {
    throw new Error('no Super Admin reference supplied');
  }
  const problems = [];
  if (!platformSource.includes('Support access rule')) {
    problems.push('the Support access rule card is gone');
  }
  if (!platformSource.includes('approved logs')) {
    problems.push('the support rule no longer mentions approved logs');
  }
  if (!platformSource.includes('email not connected')) {
    problems.push('the reference no longer states that email is not connected');
  }
  if (!platformSource.includes('Prepare reminder')) {
    problems.push('the renewal reminder action is gone');
  }
  for (const priority of ['Normal', 'Low', 'High']) {
    if (!platformSource.includes(`'${priority}'`)) {
      problems.push(`ticket priority "${priority}" is gone`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`support boundary drifted:\n  ${problems.join('\n  ')}`);
  }
  return true;
}
