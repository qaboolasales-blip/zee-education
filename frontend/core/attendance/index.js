/**
 * Public surface of the Zee Education frontend attendance layer (Batch F).
 *
 * Nothing here sends an attendance request, stores a register or renders a mark.
 * The layer is a status model bound to the approved controls, a pure submission
 * state machine, and role-safe summaries.
 */

export {
  AttendanceStatus,
  ATTENDANCE_STATUSES,
  STATUS_LETTERS,
  STATUS_SELECTORS,
  MOBILE_STATUS_PILL,
  BADGE_UNKNOWN_CLASS,
  isAttendanceStatus,
  statusLetter,
  isEnterableOn,
  statusesForSurface,
  statusFromApprovedText,
  assertStatusModelMatchesReferences,
} from './status-model.js';

export {
  SubmissionState,
  SubmitReject,
  EMPTY_REGISTER,
  submissionKey,
  openRegister,
  isRegisterOpen,
  markStudent,
  rollbackMark,
  markCounts,
  markedCount,
  isRegisterComplete,
  pendingSubmissionKeys,
  canSubmit,
  beginSubmit,
  settleSubmit,
  isRetryable,
  reopenRegister,
} from './submission.js';

export {
  SummaryTarget,
  APPROVED_SUMMARY_TARGETS,
  attendanceVisibility,
  summariseRegister,
  summariseSeries,
  statusVisibleOnStatusCard,
} from './summary.js';

export {
  HookKind,
  ATTENDANCE_BINDINGS,
  attendanceBindingById,
  blockedAttendanceBindings,
  assertNoAttendanceElementCreation,
  assertAttendanceBindingsMatchReferences,
} from './element-bindings.js';

export {
  AttendanceContractStatus,
  ATTENDANCE_SCHEMA_PUBLISHED,
  ATTENDANCE_ENDPOINTS_PUBLISHED,
  ATTENDANCE_INTEGRATION_AUTHORIZED,
  MISSING_ATTENDANCE_ENTITIES,
  PENDING_ATTENDANCE_CONTRACTS,
  assertNoInventedAttendanceSchemas,
  findPendingAttendanceContract,
  describeAttendanceBlock,
} from './contracts/pending-attendance-contract.js';