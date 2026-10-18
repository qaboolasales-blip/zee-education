/**
 * Role-scoped privacy policy for people data. Task: E-O-02.
 *
 * "Create privacy-safe data selectors/formatters; avoid exposing data beyond role
 * needs."
 *
 * This module answers one question: **may this role see this category of people
 * data, and at what scope?** It is built entirely from published policy — never
 * from an invented schema:
 *
 *   - Data categories come from `backend/docs/control-plane-data-boundary.md`,
 *     which enumerates the school-local data set.
 *   - Role rules come from `PROJECT_MEMORY.md`: "Least privilege is mandatory.
 *     Parents only see linked children; teachers only use assigned class/subject
 *     data; school users only use their school; Super Admin does not browse
 *     learner data by default."
 *   - The per-role tool lists come from the approved Mobile App Preview `TL`
 *     map, so what a role may reach mirrors what the locked UI already offers.
 *
 * WHAT THIS IS NOT
 *  - Not a security boundary. The server resolves role, school and data scope from
 *    the authenticated session. A `true` here grants nothing; it only stops the
 *    *client* from requesting or rendering something the product model forbids.
 *  - Not a schema. No student, guardian or staff field is named anywhere in this
 *    package, because none is published. See `contracts/pending-people-contract.js`.
 *
 * Default deny everywhere: an unknown role, or an unknown category, resolves to
 * nothing.
 */

/**
 * People-data categories, transcribed from the data-boundary document's list of
 * school-local data.
 */
export const DataCategory = Object.freeze({
  STUDENT_PROFILE: 'student_profile',
  GUARDIAN_PROFILE: 'guardian_profile',
  STAFF_PROFILE: 'staff_profile',
  STAFF_ASSIGNMENTS: 'staff_assignments',
  ATTENDANCE: 'attendance',
  ACADEMIC_RESULTS: 'academic_results',
  FEE_RECORDS: 'fee_records',
  TIMETABLE_HOMEWORK_NOTICES: 'timetable_homework_notices',
  ACADEMIC_STRUCTURE: 'academic_structure',
  SCHOOL_SETTINGS: 'school_settings',
});

export const DATA_CATEGORIES = Object.freeze([
  DataCategory.STUDENT_PROFILE,
  DataCategory.GUARDIAN_PROFILE,
  DataCategory.STAFF_PROFILE,
  DataCategory.STAFF_ASSIGNMENTS,
  DataCategory.ATTENDANCE,
  DataCategory.ACADEMIC_RESULTS,
  DataCategory.FEE_RECORDS,
  DataCategory.TIMETABLE_HOMEWORK_NOTICES,
  DataCategory.ACADEMIC_STRUCTURE,
  DataCategory.SCHOOL_SETTINGS,
]);

/**
 * How much of a category a role may see.
 *
 *  - `none`              no access at all
 *  - `own`               only the viewer's own record
 *  - `linked-children`   only children linked to the viewer as guardian
 *  - `assigned-class`    only students in the viewer's assigned classes/subjects
 *  - `school`            anything within the viewer's own school
 */
export const Scope = Object.freeze({
  NONE: 'none',
  OWN: 'own',
  LINKED_CHILDREN: 'linked-children',
  ASSIGNED_CLASS: 'assigned-class',
  SCHOOL: 'school',
});

const NONE = Object.freeze([DataCategory]);

/**
 * Role -> category -> scope. Default deny: a category not listed is `none`.
 */
export const PRIVACY_MATRIX = Object.freeze({
  /**
   * PROJECT_MEMORY: "Super Admin does not browse learner data by default."
   * So Super Admin receives nothing. The platform reference confirms this: it
   * shows commercial and installation data only, with no student, staff,
   * attendance or fee content anywhere.
   */
  'Super Admin': Object.freeze({}),

  /**
   * The school owner. May work with people records inside its own school.
   * "school users only use their school" is enforced server-side; the client
   * cannot widen it.
   */
  'School Admin': Object.freeze({
    [DataCategory.STUDENT_PROFILE]: Scope.SCHOOL,
    [DataCategory.GUARDIAN_PROFILE]: Scope.SCHOOL,
    [DataCategory.STAFF_PROFILE]: Scope.SCHOOL,
    [DataCategory.STAFF_ASSIGNMENTS]: Scope.SCHOOL,
    [DataCategory.ATTENDANCE]: Scope.SCHOOL,
    [DataCategory.ACADEMIC_RESULTS]: Scope.SCHOOL,
    [DataCategory.FEE_RECORDS]: Scope.SCHOOL,
    [DataCategory.TIMETABLE_HOMEWORK_NOTICES]: Scope.SCHOOL,
    [DataCategory.ACADEMIC_STRUCTURE]: Scope.SCHOOL,
    [DataCategory.SCHOOL_SETTINGS]: Scope.SCHOOL,
  }),

  /**
   * PROJECT_MEMORY: "teachers only use assigned class/subject data".
   * The mobile Teacher tool list grants timetable, attendance, marks, homework,
   * messages, notices, reports and leave — and no student directory, no staff
   * directory, no fees and no school settings.
   */
  Teacher: Object.freeze({
    [DataCategory.STUDENT_PROFILE]: Scope.ASSIGNED_CLASS,
    [DataCategory.ATTENDANCE]: Scope.ASSIGNED_CLASS,
    [DataCategory.ACADEMIC_RESULTS]: Scope.ASSIGNED_CLASS,
    [DataCategory.TIMETABLE_HOMEWORK_NOTICES]: Scope.ASSIGNED_CLASS,
    [DataCategory.ACADEMIC_STRUCTURE]: Scope.SCHOOL,
  }),

  /**
   * PROJECT_MEMORY: "Parents only see linked children".
   * The mobile Parent tool list grants fees, timetable, homework, notices, leave,
   * messages, calendar and documents — no student directory, no staff directory,
   * no marks-entry, no school settings.
   */
  Parent: Object.freeze({
    [DataCategory.STUDENT_PROFILE]: Scope.LINKED_CHILDREN,
    [DataCategory.ATTENDANCE]: Scope.LINKED_CHILDREN,
    [DataCategory.ACADEMIC_RESULTS]: Scope.LINKED_CHILDREN,
    [DataCategory.FEE_RECORDS]: Scope.LINKED_CHILDREN,
    [DataCategory.TIMETABLE_HOMEWORK_NOTICES]: Scope.LINKED_CHILDREN,
  }),

  /**
   * The mobile Student tool list grants timetable, homework, notices, calendar,
   * messages, leave and documents — and deliberately no `fees`.
   */
  Student: Object.freeze({
    [DataCategory.STUDENT_PROFILE]: Scope.OWN,
    [DataCategory.ATTENDANCE]: Scope.OWN,
    [DataCategory.ACADEMIC_RESULTS]: Scope.OWN,
    [DataCategory.TIMETABLE_HOMEWORK_NOTICES]: Scope.OWN,
  }),
});

/** Roles the privacy matrix knows. Mirrors the auth role vocabulary. */
export const PRIVACY_ROLES = Object.freeze(Object.keys(PRIVACY_MATRIX));

/** anonymous is a role for policy purposes and may see nothing. */
const ANONYMOUS = 'anonymous';

export function isKnownPrivacyRole(role) {
  return typeof role === 'string' && Object.prototype.hasOwnProperty.call(PRIVACY_MATRIX, role);
}

/**
 * Scope a role has for a category. Default deny.
 * @param {string} role
 * @param {string} category
 * @returns {string} one of {@link Scope}
 */
export function scopeFor(role, category) {
  if (!isKnownPrivacyRole(role)) return Scope.NONE;
  if (!DATA_CATEGORIES.includes(category)) return Scope.NONE;
  const scope = PRIVACY_MATRIX[role][category];
  return typeof scope === 'string' ? scope : Scope.NONE;
}

export function mayView(role, category) {
  return scopeFor(role, category) !== Scope.NONE;
}

/** Every category a role may see, in the canonical order. */
export function visibleCategories(role) {
  if (!isKnownPrivacyRole(role)) return Object.freeze([]);
  return Object.freeze(DATA_CATEGORIES.filter((category) => mayView(role, category)));
}

/** Every category a role may NOT see. Useful for asserting a redaction is total. */
export function hiddenCategories(role) {
  if (!isKnownPrivacyRole(role)) return Object.freeze([...DATA_CATEGORIES]);
  return Object.freeze(DATA_CATEGORIES.filter((category) => !mayView(role, category)));
}

/**
 * Does this scope require the server to resolve ownership before any record can
 * be shown? True for everything except `school`-wide access, and for the
 * anonymous role (which has no access at all).
 */
export function requiresServerScope(role, category) {
  const scope = scopeFor(role, category);
  return scope === Scope.OWN || scope === Scope.LINKED_CHILDREN || scope === Scope.ASSIGNED_CLASS;
}

/**
 * Guard for the two rules with hard governance weight. Useful as an explicit
 * assertion in tests and in any future binding layer.
 */
export function assertSuperAdminCannotBrowseLearners(role) {
  if (role !== 'Super Admin') return true;
  const leaked = visibleCategories(role);
  if (leaked.length > 0) {
    throw new Error(`Super Admin must not browse learner data, but policy grants: ${leaked.join(', ')}`);
  }
  return true;
}

export function assertParentLimitedToLinkedChildren(role) {
  if (role !== 'Parent') return true;
  const offending = visibleCategories(role).filter(
    (category) => scopeFor(role, category) !== Scope.LINKED_CHILDREN,
  );
  if (offending.length > 0) {
    throw new Error(`Parent must be limited to linked children, but: ${offending.join(', ')}`);
  }
  return true;
}

export { ANONYMOUS, NONE };