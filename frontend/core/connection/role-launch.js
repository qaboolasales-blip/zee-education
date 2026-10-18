/**
 * Role launch. Task: L-O-03.
 *
 * "Launch the existing appropriate role experience after login; no new navigation design."
 *
 * The mobile reference launches a role from `#roles` buttons:
 *
 *   role = b.dataset.r; tab = 'Home'; feat = '';
 *
 * So every role lands on the existing `Home` screen with `feat = ''`, and the tools
 * shown there are exactly the role's `TL` list — which Batch E already transcribed
 * into `allowedMobileFeatures()`. Nothing new is navigated to; no new menu item is
 * added; the order is connection-before-login, so a role launch only happens after a
 * school has been connected.
 *
 * No DOM, no network, no storage.
 */

import { Role, ROLES } from '../auth/role-guard.js';
import { allowedMobileFeatures } from '../auth/role-guard.js';

export const LaunchReject = Object.freeze({
  UNKNOWN_ROLE: 'unknown-role',
  NOT_CONNECTED: 'school-not-connected',
});

function ok(value) {
  return Object.freeze({ allowed: true, reason: null, value, errors: Object.freeze([]) });
}

function fail(reason, errors = []) {
  return Object.freeze({ allowed: false, reason, value: null, errors: Object.freeze(errors) });
}

/** The transcribed landing: every role goes to Home with no feature pre-selected. */
export const LANDING = Object.freeze({ screen: 'Home', feat: null, tab: 'Home' });

/**
 * Compute what a role launch produces, without performing it.
 *
 * @param {{ role?: unknown, schoolConnected?: unknown }} request
 */
export function launchRoleExperience(request = {}) {
  const { role, schoolConnected } = request;

  if (!ROLES.includes(role)) return fail(LaunchReject.UNKNOWN_ROLE);

  // Connection precedes login in the reference; a launch with no connected school is
  // not the reference flow.
  if (schoolConnected !== true) return fail(LaunchReject.NOT_CONNECTED);

  return ok(
    Object.freeze({
      ...LANDING,
      role,
      features: Object.freeze([...allowedMobileFeatures(role)]),
    }),
  );
}

/**
 * Which tools the launched experience shows — the existing role tool list only.
 *
 * @param {string} role
 */
export function roleLaunchFeatures(role) {
  return Object.freeze([...allowedMobileFeatures(role)]);
}

/**
 * Drift guard — the landing remains `Home` with `feat = ''` and no new navigation.
 *
 * @param {string} mobileSource
 */
export function assertRoleLaunchMatchesReferences(mobileSource) {
  if (typeof mobileSource !== 'string' || mobileSource === '') {
    throw new Error('no Mobile Preview reference supplied');
  }
  const problems = [];
  const claims = ["role=b.dataset.r", "tab='Home'", "feat=''", 'WELCOME TO ZEE EDUCATION'];
  for (const claim of claims) {
    if (!mobileSource.includes(claim)) problems.push(`role launch copy "${claim}" is gone`);
  }
  // The buttons are built from an array literal and rendered with a template
  // placeholder, so neither `data-r="Parent"` nor `dataset.r="Parent"` is a literal
  // in the source. The array literal is the reliable anchor.
  if (!mobileSource.includes("['Parent','Student','Teacher','School Admin']")) {
    problems.push('the four role buttons are gone');
  }
  if (!mobileSource.includes('data-r="${r}"')) {
    problems.push('the role button data-r attribute is gone');
  }
  if (problems.length > 0) {
    throw new Error(`role launch drifted from the reference:\n  ${problems.join('\n  ')}`);
  }
  return true;
}
