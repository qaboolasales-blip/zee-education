/**
 * Attendance contract dependency record. Task: F-O-02 / F-O-03.
 *
 * STATUS: BLOCKED. No attendance table, no endpoint, and — decisively — no school
 * database to hold one.
 *
 * `backend/docs/control-plane-data-boundary.md` lists "Attendance records" under
 * school-local data that is "Never stored in the control plane". So attendance
 * cannot land in the 4 existing control-plane tables, and cannot land at all
 * until the Batch C provisioning path creates a dedicated school database.
 *
 * Every schema below is pinned to `null` and
 * `assertNoInventedAttendanceSchemas()` fails the suite if that changes.
 */

/** Contract publication states. */
export const AttendanceContractStatus = Object.freeze({
  BLOCKED_NOT_CONTRACTED: 'blocked-not-contracted',
  BLOCKED_NEEDS_PROVISIONING: 'blocked-needs-provisioning-path',
  PUBLISHED: 'published',
});

export const ATTENDANCE_SCHEMA_PUBLISHED = false;
export const ATTENDANCE_ENDPOINTS_PUBLISHED = false;

/** Entities Batch F needs inside a school database. */
export const MISSING_ATTENDANCE_ENTITIES = Object.freeze([
  Object.freeze({ entity: 'attendance_registers', need: 'One register per class/section/date' }),
  Object.freeze({ entity: 'attendance_marks', need: 'Per-student Present/Absent/Leave for that date' }),
  Object.freeze({ entity: 'attendance_audit', need: 'Who marked what, and when — the exit gate requires auditable attendance' }),
]);

/** @type {ReadonlyArray<Readonly<object>>} */
export const PENDING_ATTENDANCE_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'attendance-read',
    capability: 'read a register for a class/section/date',
    status: AttendanceContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No attendance table, no endpoint and no school database. Class and section also do not ' +
      'exist (DSB-04), so a register has no address.',
    unblockRequires:
      'KiloCode implements academic structure plus attendance in a dedicated school database ' +
      'behind the Batch C provisioning path, and publishes the read contract including ' +
      'teacher assignment scope.',
  }),
  Object.freeze({
    id: 'attendance-submit',
    capability: 'submit a marked register',
    status: AttendanceContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No endpoint, so the submit contract cannot be derived. The client-side state machine in ' +
      '../submission.js is ready but performs no request.',
    unblockRequires:
      'KiloCode publishes the submit contract: method and path, request shape, the ' +
      'Present/Absent/Leave vocabulary, the audit record it writes, and the server-side ' +
      'idempotency key strategy.',
  }),
  Object.freeze({
    id: 'attendance-idempotency',
    capability: 'guarantee a retry cannot double-write a register',
    status: AttendanceContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'The client can refuse to send a duplicate deterministic key, but only the server can ' +
      'guarantee it. The published error table has no 409 Conflict, so the client cannot even ' +
      'classify a duplicate the server reports (CPB-09).',
    unblockRequires:
      'KiloCode publishes the idempotency strategy and duplicate/conflict semantics. This is a ' +
      'server guarantee and cannot be established from a browser.',
  }),
  Object.freeze({
    id: 'attendance-status-vocabulary',
    capability: 'confirm the Present/Absent/Leave enum and any extra states',
    status: AttendanceContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'The approved model is Present/Absent/Leave, but no enum is published. The client model ' +
      'mirrors the three approved controls and refuses anything else.',
    unblockRequires:
      'KiloCode publishes the enum, including whether "unmarked" and "excused" are separate ' +
      'states. The three approved controls may not be extended without an owner UI decision.',
  }),
  Object.freeze({
    id: 'attendance-scope',
    capability: 'server-side enforcement of class/section/role scope on attendance',
    status: AttendanceContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No teacher assignment table exists (DSB-04), so "assigned class only" cannot be enforced ' +
      'anywhere — and the Batch F exit gate requires attendance to be "correct, scoped, auditable ' +
      'and role-safe".',
    unblockRequires:
      'KiloCode implements teacher assignment scope and enforces it server-side, plus the auth ' +
      'contract needed to resolve the viewer.',
  }),
]);

/** No attendance request may be made. */
export const ATTENDANCE_INTEGRATION_AUTHORIZED = false;

export function assertNoInventedAttendanceSchemas(contracts = PENDING_ATTENDANCE_CONTRACTS) {
  if (ATTENDANCE_INTEGRATION_AUTHORIZED) {
    throw new Error('attendance integration is authorized without a published contract');
  }
  for (const contract of contracts) {
    for (const field of ['method', 'path', 'requestSchema', 'responseSchema']) {
      if (contract[field] !== null) {
        throw new Error(`attendance contract '${contract.id}' declares ${field} without a contract`);
      }
    }
    if (contract.implemented !== false) {
      throw new Error(`attendance contract '${contract.id}' claims implementation without an endpoint`);
    }
    if (contract.status === AttendanceContractStatus.PUBLISHED) {
      throw new Error(`attendance contract '${contract.id}' claims to be published; update this module`);
    }
  }
  return true;
}

export function findPendingAttendanceContract(id) {
  return PENDING_ATTENDANCE_CONTRACTS.find((contract) => contract.id === id) ?? null;
}

export function describeAttendanceBlock() {
  return {
    schemaPublished: ATTENDANCE_SCHEMA_PUBLISHED,
    endpointsPublished: ATTENDANCE_ENDPOINTS_PUBLISHED,
    integrationAuthorized: ATTENDANCE_INTEGRATION_AUTHORIZED,
    missingEntities: MISSING_ATTENDANCE_ENTITIES.length,
    capabilities: PENDING_ATTENDANCE_CONTRACTS.map((contract) => ({
      id: contract.id,
      status: contract.status,
    })),
  };
}