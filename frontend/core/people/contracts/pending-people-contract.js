/**
 * People-records contract dependency record. Task: E-O-03.
 *
 * STATUS: BLOCKED. Batch E needs students, guardians, staff and enrollment
 * history in a DEDICATED SCHOOL DATABASE. None of it exists, and none of it may
 * live in the control plane.
 *
 * Verified 2026-10-18:
 *   backend/app/Database/Migrations/  4 tables: schools, school_domains,
 *                                      provisioning_jobs, platform_audit_events
 *   backend/app/Models/               .gitkeep only
 *   backend/app/Config/Routes.php     GET /health, GET /setup, GET /
 *   backend/docs/api/openapi-v0.md    documents only /health and /setup
 *
 * Critically, `backend/docs/control-plane-data-boundary.md` states that student,
 * guardian, staff, attendance, results, fee, timetable, homework and notice data
 * are "Never stored in the control plane" and belong in each school's own
 * database, provisioned by the Phase P3 installer. So even after the tables are
 * written, they require the Batch C provisioning path to exist first.
 *
 * Every schema below is pinned to `null` and `assertNoInventedPeopleSchemas()`
 * fails the test suite if that changes.
 */

/** Contract publication states. */
export const PeopleContractStatus = Object.freeze({
  BLOCKED_NOT_CONTRACTED: 'blocked-not-contracted',
  BLOCKED_NO_IMPLEMENTATION: 'blocked-no-backend-implementation',
  BLOCKED_NEEDS_PROVISIONING: 'blocked-needs-provisioning-path',
  PUBLISHED: 'published',
});

/** The school database does not exist yet. */
export const SCHOOL_DATABASE_EXISTS = false;
export const PEOPLE_SCHEMA_PUBLISHED = false;
export const PEOPLE_ENDPOINTS_PUBLISHED = false;

/**
 * Entities Batch E needs, none of which exists. Recorded so nobody assumes them.
 * Every one of these belongs in a SCHOOL database, never the control plane.
 */
export const MISSING_PEOPLE_ENTITIES = Object.freeze([
  Object.freeze({ entity: 'students', need: 'Student profile, enrollment status, reference such as ST-2026-041' }),
  Object.freeze({ entity: 'guardians', need: 'Guardian profile and primary/secondary relationship' }),
  Object.freeze({ entity: 'student_guardians', need: 'The linkage that makes a child "linked" to a parent' }),
  Object.freeze({ entity: 'staff', need: 'Staff profile and employee reference such as EMP-2026' }),
  Object.freeze({ entity: 'student_enrollments', need: 'Enrollment history / lifecycle' }),
  Object.freeze({ entity: 'student_photos', need: 'Optional photo — note: no approved UI element exists for it' }),
  Object.freeze({ entity: 'student_contacts', need: 'Contact details — likewise no approved UI surface' }),
]);

/** @type {ReadonlyArray<Readonly<object>>} */
export const PENDING_PEOPLE_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'student-list',
    capability: 'list students in the School Dashboard Students table',
    status: PeopleContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No students table, no model and no endpoint. The table also needs the class/section filter ' +
      '(DB-15), which has no schema either.',
    unblockRequires:
      'KiloCode implements the per-school students/guardians/staff migrations behind the Batch C ' +
      'provisioning path and publishes the list contract, including pagination and filtering.',
  }),
  Object.freeze({
    id: 'student-detail',
    capability: 'read one student record',
    status: PeopleContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No endpoint. Note the approved UI has no student detail screen — the row action `View` only ' +
      'raises a toast — so a detail view would be a NEW screen (PEB-01).',
    unblockRequires:
      'KiloCode publishes the detail contract and the owner approves a detail layout.',
  }),
  Object.freeze({
    id: 'guardian-linkage',
    capability: 'resolve which children are linked to the signed-in parent',
    status: PeopleContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No student_guardians linkage table. This is the single most important privacy dependency: ' +
      'PROJECT_MEMORY requires that parents see only linked children, and the client cannot ' +
      'establish that linkage itself.',
    unblockRequires:
      'KiloCode implements the linkage and resolves it server-side from the session. The frontend ' +
      'must never receive or infer the whole child list.',
  }),
  Object.freeze({
    id: 'staff-directory',
    capability: 'read the School Dashboard Staff & HR table',
    status: PeopleContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No staff table or endpoint. Payroll is not in V1, and the approved reference already labels ' +
      'the module "Profiles, leave, attendance aur payroll" without a payroll surface.',
    unblockRequires: 'KiloCode implements staff in the school database and publishes the contract.',
  }),
  Object.freeze({
    id: 'enrollment-history',
    capability: 'admission approval and enrollment lifecycle',
    status: PeopleContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No enrollment table. The UI shows a "New admission approved" activity row and a ' +
      '"Quick admission" button, both of which are previews. Admissions are also listed as a later ' +
      'module phase in PROJECT_MEMORY.',
    unblockRequires:
      'KiloCode publishes the admissions module contract and confirms it is in V1 scope.',
  }),
  Object.freeze({
    id: 'student-photo',
    capability: 'store and display a student photo',
    status: PeopleContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No storage contract, and — independently — NO approved UI element exists. The `.pe i` cell ' +
      'is a text initial and the mobile rows carry no image, so a photo could not be displayed ' +
      'without a visual change (PEB-02).',
    unblockRequires:
      'KiloCode publishes the media contract and the owner approves a photo presentation.',
  }),
]);

/** No people endpoint may be called. */
export const PEOPLE_INTEGRATION_AUTHORIZED = false;

export function assertNoInventedPeopleSchemas(contracts = PENDING_PEOPLE_CONTRACTS) {
  if (PEOPLE_INTEGRATION_AUTHORIZED) {
    throw new Error('people integration is authorized without a published contract');
  }
  for (const contract of contracts) {
    for (const field of ['method', 'path', 'requestSchema', 'responseSchema']) {
      if (contract[field] !== null) {
        throw new Error(`people contract '${contract.id}' declares ${field} without a contract`);
      }
    }
    if (contract.implemented !== false) {
      throw new Error(`people contract '${contract.id}' claims implementation without an endpoint`);
    }
    if (contract.status === PeopleContractStatus.PUBLISHED) {
      throw new Error(`people contract '${contract.id}' claims to be published; update this module`);
    }
  }
  return true;
}

export function findPendingPeopleContract(id) {
  return PENDING_PEOPLE_CONTRACTS.find((contract) => contract.id === id) ?? null;
}

export function describePeopleBlock() {
  return {
    schoolDatabaseExists: SCHOOL_DATABASE_EXISTS,
    schemaPublished: PEOPLE_SCHEMA_PUBLISHED,
    endpointsPublished: PEOPLE_ENDPOINTS_PUBLISHED,
    integrationAuthorized: PEOPLE_INTEGRATION_AUTHORIZED,
    missingEntities: MISSING_PEOPLE_ENTITIES.length,
    capabilities: PENDING_PEOPLE_CONTRACTS.map((contract) => ({
      id: contract.id,
      status: contract.status,
    })),
  };
}