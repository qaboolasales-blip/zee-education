/**
 * Role → approved-screen guard. Task: B-O-04.
 *
 * WHAT THIS IS
 *  A pure, default-deny selector that answers one question: "may this role
 *  open this already-approved screen?" It returns frozen id lists and never
 *  touches the DOM.
 *
 * WHAT THIS IS NOT
 *  It is NOT authorization. The server is always authoritative and resolves the
 *  role, the school and the data scope from the authenticated session. This
 *  guard exists to stop the *client* from offering an entry point that the
 *  approved product model does not give that role — i.e. it is a
 *  least-privilege convenience, never a security boundary. A `true` from this
 *  module grants nothing.
 *
 * PROVENANCE OF THE ROLE MODEL
 *  Role labels are copied verbatim from the locked references so that no new
 *  user-visible string is introduced. Scoping is copied from the references'
 *  own `TL` map (Mobile App Preview) plus PROJECT_MEMORY.md governance:
 *    - parents see only linked children; teachers only assigned class/subject;
 *      school users only their own school;
 *    - Super Admin does not browse learner data by default.
 */

import {
  MOBILE_APP_FEATURES,
  MOBILE_APP_PRE_AUTH_SCREEN,
  MOBILE_APP_TABS,
  PLATFORM_SCREENS,
  SCHOOL_DESKTOP_SCREENS,
  Surface,
  approvedScreens,
  isApprovedScreen,
  isApprovedSurface,
} from './screen-registry.js';

/** Roles, using the exact labels that already appear in the locked references. */
export const Role = Object.freeze({
  ANONYMOUS: 'anonymous',
  PARENT: 'Parent',
  STUDENT: 'Student',
  TEACHER: 'Teacher',
  SCHOOL_ADMIN: 'School Admin',
  SUPER_ADMIN: 'Super Admin',
});

export const ROLES = Object.freeze([
  Role.ANONYMOUS,
  Role.PARENT,
  Role.STUDENT,
  Role.TEACHER,
  Role.SCHOOL_ADMIN,
  Role.SUPER_ADMIN,
]);

const ROLE_SOURCE = Object.freeze({
  [Role.PARENT]: 'Mobile App Preview :: role selector value "Parent" + TL.Parent',
  [Role.STUDENT]: 'Mobile App Preview :: role selector value "Student" + TL.Student',
  [Role.TEACHER]: 'Mobile App Preview :: role selector value "Teacher" + TL.Teacher',
  [Role.SCHOOL_ADMIN]: 'Mobile App Preview :: role selector value "School Admin" + TL["School Admin"]',
  [Role.SUPER_ADMIN]: 'Super Admin :: workspace is the platform control plane (separate reference)',
  [Role.ANONYMOUS]: 'no session — Mobile App Preview :: Connect screen is the only pre-auth screen',
});

function freezeList(values) {
  return Object.freeze([...values]);
}

/**
 * Mobile app role → feature sub-screens.
 * Copied from the reference `TL` object verbatim. The guard always emits these
 * in {@link MOBILE_APP_FEATURES} registry order, not in `TL` order, so the
 * rendered order is stable and auditable regardless of which role is active.
 */
const MOBILE_FEATURES_BY_ROLE = Object.freeze({
  [Role.PARENT]: freezeList(['fees', 'timetable', 'homework', 'notices', 'leave', 'messages', 'calendar', 'documents']),
  [Role.STUDENT]: freezeList(['timetable', 'homework', 'notices', 'calendar', 'messages', 'leave', 'documents']),
  [Role.TEACHER]: freezeList(['timetable', 'marks', 'homework', 'messages', 'notices', 'reports', 'leave']),
  [Role.SCHOOL_ADMIN]: freezeList(['students', 'admissions', 'fees', 'staff', 'timetable', 'marks', 'notices', 'reports', 'documents', 'settings']),
});

/**
 * School Dashboard (desktop) role → screens.
 *
 * The School Dashboard reference contains NO role concept at all: one sidebar,
 * one school workspace, one nav for everybody. Partitioning it is a product
 * decision, not an integration decision, so the guard applies least privilege
 * and only grants the screens that the mobile role model unambiguously implies.
 * Everything else is denied and tracked as an owner decision (BLK-07).
 */
const SCHOOL_DESKTOP_BY_ROLE = Object.freeze({
  [Role.SCHOOL_ADMIN]: SCHOOL_DESKTOP_SCREENS,
  // Teacher: the modules a teacher can actually use. `Students` is withheld
  // because the mobile Teacher tool list grants no student directory, and
  // PROJECT_MEMORY limits teachers to assigned class/subject data.
  [Role.TEACHER]: freezeList(['Overview', 'Attendance', 'Academics', 'Timetable', 'Reports & Print']),
});

/** Super Admin platform → all platform screens; every other role denied. */
const PLATFORM_BY_ROLE = Object.freeze({
  [Role.SUPER_ADMIN]: PLATFORM_SCREENS,
});

/** Tabs every authenticated mobile role can open (fixed 5-column grid). */
const MOBILE_TABS = MOBILE_APP_TABS;

export function isKnownRole(role) {
  return typeof role === 'string' && ROLES.includes(role);
}

export function roleSource(role) {
  return ROLE_SOURCE[role] ?? null;
}

/**
 * Screens a role may open on a surface. Default deny.
 *
 * Unknown role, unknown surface, or a role with no defined access to a surface
 * all return an EMPTY list — never a fallback, never a wildcard.
 *
 * @param {string} role
 * @param {string} surface one of {@link Surface}
 * @returns {ReadonlyArray<string>} frozen, in approved order
 */
export function allowedScreens(role, surface) {
  if (!isKnownRole(role) || !isApprovedSurface(surface)) return Object.freeze([]);

  const allowed = allowedSet(role, surface);
  // Always return in the surface's approved order so nothing is reordered or
  // invented by this module.
  return freezeList(approvedScreens(surface).filter((screenId) => allowed.has(screenId)));
}

function allowedSet(role, surface) {
  switch (surface) {
    case Surface.MOBILE_APP:
      return mobileSet(role);
    case Surface.SCHOOL_DESKTOP:
      return new Set(SCHOOL_DESKTOP_BY_ROLE[role] ?? []);
    case Surface.PLATFORM:
      return new Set(PLATFORM_BY_ROLE[role] ?? []);
    default:
      return new Set();
  }
}

function mobileSet(role) {
  if (role === Role.ANONYMOUS) {
    // The only screen reachable before authentication is the approved Connect
    // onboarding screen. All five tabs are withheld.
    return new Set([MOBILE_APP_PRE_AUTH_SCREEN]);
  }
  const features = MOBILE_FEATURES_BY_ROLE[role];
  if (features === undefined) {
    // Parent/Student/Teacher/School Admin are the four roles the mobile
    // reference supports. Any other role (incl. Super Admin) is denied.
    return new Set();
  }
  return new Set([...MOBILE_TABS, MOBILE_APP_PRE_AUTH_SCREEN, ...features]);
}

/**
 * Whether a role may open one already-approved screen.
 * Always re-validates against the screen registry, so a non-approved id can
 * never be authorized.
 *
 * @param {string} role
 * @param {string} surface
 * @param {string} screenId
 * @returns {boolean}
 */
export function canOpen(role, surface, screenId) {
  if (!isApprovedScreen(surface, screenId)) return false;
  return allowedScreens(role, surface).includes(screenId);
}

/**
 * Convenience view for callers that must never widen access.
 * @returns {{ allowed: boolean, role: string|null, surface: string, screenId: string }}
 */
export function openDecision(role, surface, screenId) {
  const knownRole = isKnownRole(role);
  const knownSurface = isApprovedSurface(surface);
  const approvedScreen = knownSurface && isApprovedScreen(surface, screenId);

  return Object.freeze({
    allowed: knownRole && knownSurface && approvedScreen && canOpen(role, surface, screenId),
    role: knownRole ? role : null,
    surface: knownSurface ? surface : null,
    screenId: approvedScreen ? screenId : null,
  });
}

/**
 * Feature ids only, for callers that populate the variable-length `.tools`
 * grid on the Tasks screen.
 * @param {string} role
 * @returns {ReadonlyArray<string>}
 */
export function allowedMobileFeatures(role) {
  if (!isKnownRole(role)) return Object.freeze([]);
  return freezeList(MOBILE_APP_FEATURES.filter((id) => allowedSet(role, Surface.MOBILE_APP).has(id)));
}

export { Surface };