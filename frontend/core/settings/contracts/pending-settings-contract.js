/**
 * School-settings and academic-structure contract dependency record.
 * Tasks: D-O-02, D-O-04, D-O-05.
 *
 * STATUS: BLOCKED for every task that needs a request.
 *
 * What IS published and therefore usable:
 *   schools(id, name, status, plan_code, timezone, currency, locale, …)
 *   school_domains(id, school_id, domain, is_primary, verified_at, …)
 *   -> columns, types and defaults verified by assertSchemaMatchesMigrations()
 *
 * What is NOT published:
 *   - no settings endpoint (no read, no write)
 *   - no academic structure at all: no class, section, subject, academic
 *     session, timetable, homework, assessment or marks table
 *   - no staff/teacher record, no teacher-to-class assignment
 *   - no logo/upload endpoint and no branding column
 *   - no auth contract, so no permission-denied contract either
 *
 * Every schema below is pinned to `null` and
 * `assertNoInventedAcademicSchemas()` fails the suite if that changes.
 */

/** Contract publication states. */
export const AcademicContractStatus = Object.freeze({
  BLOCKED_NOT_CONTRACTED: 'blocked-not-contracted',
  BLOCKED_NO_IMPLEMENTATION: 'blocked-no-backend-implementation',
  PUBLISHED: 'published',
});

export const EXPECTED_SETTINGS_CONTRACT_DOC = 'backend/docs/api/openapi-v0.md';

/** The schools/school_domains columns exist; no academic table exists. */
export const SETTINGS_SCHEMA_PUBLISHED = true;
export const ACADEMIC_SCHEMA_PUBLISHED = false;
export const SETTINGS_ENDPOINTS_PUBLISHED = false;

/** Academic entities the Batch D goal needs and the schema does not have. */
export const MISSING_ACADEMIC_ENTITIES = Object.freeze([
  Object.freeze({ entity: 'academic_sessions', need: 'Session / term labels such as "Term 1"' }),
  Object.freeze({ entity: 'classes', need: 'Grade/class labels such as "Grade 6"' }),
  Object.freeze({ entity: 'sections', need: 'Section letters such as "A"' }),
  Object.freeze({ entity: 'subjects', need: 'Subject list and the four locked subject colours' }),
  Object.freeze({ entity: 'class_subjects', need: 'Which subject runs in which class' }),
  Object.freeze({ entity: 'timetable_periods', need: 'Period start times such as "08:30"' }),
  Object.freeze({ entity: 'timetable_slots', need: 'Weekday x period x subject assignment' }),
  Object.freeze({ entity: 'staff', need: 'Staff profile and employee reference (EMP-2026)' }),
  Object.freeze({ entity: 'teacher_assignments', need: 'Teacher -> class/section/subject scope' }),
  Object.freeze({ entity: 'assessments', need: 'Assessment name, term, max marks ("Max 20")' }),
  Object.freeze({ entity: 'assessment_marks', need: 'Draft marks and draft/review/publish state' }),
  Object.freeze({ entity: 'homework', need: 'Homework title, class, due date' }),
]);

/** @type {ReadonlyArray<Readonly<object>>} */
export const PENDING_SETTINGS_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'school-settings-read',
    capability: 'read the school settings the approved Settings screen displays',
    status: AcademicContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'The columns exist but no endpoint does. Tenant resolution must come from the server ' +
      'session, which does not exist yet either.',
    unblockRequires:
      'KiloCode publishes the settings read contract, including how the school is resolved ' +
      'server-side and whether plan_code is exposed to the browser at all.',
  }),
  Object.freeze({
    id: 'school-settings-write',
    capability: 'save timezone / currency / locale / name from the approved Settings screen',
    status: AcademicContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No write endpoint. A browser-supplied school id must never be trusted for authorization, ' +
      'so the endpoint must derive the school from the authenticated session.',
    unblockRequires:
      'KiloCode publishes the write contract: method and path, request fields, validation rules, ' +
      'the 400/409 semantics for duplicates, and the audit event it writes.',
  }),
  Object.freeze({
    id: 'locale-vocabulary',
    capability: 'map the three approved language options to stored locale codes',
    status: AcademicContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'schools.locale is VARCHAR(8) with no published vocabulary. The approved select shows ' +
      '"English", "Roman Urdu", "اردو · RTL"; inventing the codes would risk writing a locale the ' +
      'server does not recognise.',
    unblockRequires:
      'KiloCode publishes the supported locale codes and the label mapping, and confirms RTL ' +
      'handling needs no new CSS.',
  }),
  Object.freeze({
    id: 'academic-structure',
    capability: 'classes, sections, subjects, sessions and teacher assignment scope',
    status: AcademicContractStatus.BLOCKED_NO_IMPLEMENTATION,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'None of these tables exists. The Batch D goal is entirely unbuildable server-side, and the ' +
      'exit gate condition "teacher assignment scope is enforceable server-side" cannot hold.',
    unblockRequires:
      'KiloCode implements the academic-structure migrations in the per-school database and ' +
      'publishes the contract for each module.',
  }),
  Object.freeze({
    id: 'school-branding-logo',
    capability: 'store and serve a school logo',
    status: AcademicContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No branding column and no upload endpoint. The Batch D exit gate expects uploaded logo ' +
      'controls to be tested; nothing can be tested.',
    unblockRequires:
      'KiloCode publishes the branding storage contract (formats, size limits, where the file is ' +
      'served from) and the owner approves any visible logo presentation, since none exists in the ' +
      'approved references.',
  }),
  Object.freeze({
    id: 'permission-denied',
    capability: '403 semantics for settings writes and academic reads',
    status: AcademicContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    requestSchemaNote: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'The published error table defines 403 as "valid auth but insufficient scope", but there is ' +
      'no auth contract and therefore no per-endpoint role requirement to test against.',
    unblockRequires:
      'KiloCode publishes the role/permission model and per-endpoint requirements (Batch B block).',
  }),
]);

/** No settings or academic request may be made. */
export const SETTINGS_INTEGRATION_AUTHORIZED = false;

export function assertNoInventedAcademicSchemas(contracts = PENDING_SETTINGS_CONTRACTS) {
  if (SETTINGS_INTEGRATION_AUTHORIZED) {
    throw new Error('settings integration is authorized without a published contract');
  }
  for (const contract of contracts) {
    for (const field of ['method', 'path', 'requestSchema', 'responseSchema']) {
      if (contract[field] !== null) {
        throw new Error(`settings contract '${contract.id}' declares ${field} without a contract`);
      }
    }
    if (contract.implemented !== false) {
      throw new Error(`settings contract '${contract.id}' claims implementation without an endpoint`);
    }
    if (contract.status === AcademicContractStatus.PUBLISHED) {
      throw new Error(`settings contract '${contract.id}' claims to be published; update this module`);
    }
  }
  return true;
}

export function findPendingSettingsContract(id) {
  return PENDING_SETTINGS_CONTRACTS.find((contract) => contract.id === id) ?? null;
}

export function describeSettingsBlock() {
  return {
    settingsSchemaPublished: SETTINGS_SCHEMA_PUBLISHED,
    academicSchemaPublished: ACADEMIC_SCHEMA_PUBLISHED,
    settingsEndpointsPublished: SETTINGS_ENDPOINTS_PUBLISHED,
    integrationAuthorized: SETTINGS_INTEGRATION_AUTHORIZED,
    missingAcademicEntities: MISSING_ACADEMIC_ENTITIES.length,
    capabilities: PENDING_SETTINGS_CONTRACTS.map((contract) => ({
      id: contract.id,
      status: contract.status,
    })),
  };
}