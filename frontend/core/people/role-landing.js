/**
 * Mobile role landing. Task: E-O-05.
 *
 * "Verify mobile role landing chooses only existing approved role experience."
 *
 * The Mobile App Preview renders its role experience from a fixed map:
 *
 *   const v = { Connect: connect, Attendance: attendance, Results: results,
 *                Tasks: tools, Feature: featureScreen, Profile: profile
 *              }[tab] || HOME[role];
 *
 * So a role's landing tab must be one of `Home`, `Attendance`, `Results`,
 * `Tasks`, `Profile` (or `Connect` before authentication). This module resolves
 * the landing tab and refuses anything outside the approved tab set, so a future
 * binding cannot invent a landing screen or a new navigation entry.
 *
 * Note the reference default: `HOME[role]` is used when `tab` is not one of the
 * named screens, i.e. Home is the natural landing for every role. This module
 * makes that explicit and total instead of implicit.
 *
 * No DOM, no rendering, no storage.
 */

import { MOBILE_APP_PRE_AUTH_SCREEN, MOBILE_APP_TABS, Surface } from '../auth/screen-registry.js';
import { Role, canOpen, isKnownRole } from '../auth/role-guard.js';

/** Tabs a role may land on. A subset of the five approved tabs. */
export const LANDING_HOME = 'Home';
export const LANDING_CONNECT = MOBILE_APP_PRE_AUTH_SCREEN;

/**
 * Role -> approved landing tab.
 *
 * Home for every authenticated role, matching the reference default
 * `HOME[role]`. No role gets a bespoke landing screen, because none exists.
 */
export const ROLE_LANDING = Object.freeze({
  [Role.PARENT]: LANDING_HOME,
  [Role.STUDENT]: LANDING_HOME,
  [Role.TEACHER]: LANDING_HOME,
  [Role.SCHOOL_ADMIN]: LANDING_HOME,
  [Role.SUPER_ADMIN]: LANDING_HOME,
  [Role.ANONYMOUS]: LANDING_CONNECT,
});

/** A landing request: a role plus, optionally, the surface. */
export function resolveRoleLanding(role, surface = Surface.MOBILE_APP) {
  const known = isKnownRole(role);
  const tab = known ? ROLE_LANDING[role] : null;

  // An unknown role is default-denied: no landing at all.
  if (!known || tab === null) {
    return Object.freeze({ allowed: false, role: null, surface, tab: null, reason: 'unknown-role' });
  }

  // A landing target that the role guard would refuse is a programming error,
  // not a runtime condition: refuse rather than render something unapproved.
  if (!canOpen(role, surface, tab)) {
    return Object.freeze({ allowed: false, role, surface, tab: null, reason: 'not-approved-for-role' });
  }

  return Object.freeze({ allowed: true, role, surface, tab, reason: null });
}

export function roleLandingTab(role) {
  const result = resolveRoleLanding(role);
  return result.allowed ? result.tab : null;
}

export function landingCandidates(surface = Surface.MOBILE_APP) {
  const tabs = surface === Surface.MOBILE_APP ? MOBILE_APP_TABS : [];
  return Object.freeze([...tabs]);
}

/**
 * Drift guard: every landing target must be a real approved screen, and the
 * anonymous landing must be the pre-auth screen.
 */
export function assertLandingsAreApproved() {
  const problems = [];

  for (const role of Object.keys(ROLE_LANDING)) {
    const tab = ROLE_LANDING[role];
    if (!MOBILE_APP_TABS.includes(tab) && tab !== MOBILE_APP_PRE_AUTH_SCREEN) {
      problems.push(`${role} lands on "${tab}", which is not an approved mobile tab`);
    }
  }

  if (ROLE_LANDING[Role.ANONYMOUS] !== MOBILE_APP_PRE_AUTH_SCREEN) {
    problems.push('the anonymous landing must be the approved pre-auth Connect screen');
  }

  const homeCount = Object.values(ROLE_LANDING).filter((tab) => tab === LANDING_HOME).length;
  if (homeCount !== 5) {
    problems.push(`expected five roles to land on Home, found ${homeCount}`);
  }

  if (problems.length > 0) {
    throw new Error(`role landing drifted from the approved reference:\n  ${problems.join('\n  ')}`);
  }
  return true;
}