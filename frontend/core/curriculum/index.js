/**
 * Public surface of the Zee Education frontend curriculum layer (Batch G).
 *
 * Nothing here calls an endpoint, renders a period or shares a document. The
 * layer holds the approved subject/period model, timetable and notice behaviour,
 * and the manual V1 PDF share boundary.
 */

export {
  SubjectCode,
  SUBJECT_LABELS,
  SUBJECT_ACCENTS,
  SUBJECT_CODES,
  LOCKED_PERIODS,
  LOCKED_WEEKDAYS,
  isSubjectCode,
  subjectLabel,
  subjectAccent,
  subjectCellStyle,
  isPeriodTime,
  periodMinutes,
  sortPeriods,
  assertSubjectModelMatchesReferences,
} from './subject-model.js';

export {
  CurriculumReject,
  EMPTY_TIMETABLE,
  HomeworkState,
  NoticeState,
  NoticeAudience,
  NOTICE_AUDIENCES,
  buildTimetable,
  timetableSlot,
  daySlotCount,
  dayPeriods,
  classifyHomework,
  classifyNotice,
  canRoleSeeNotice,
} from './timetable.js';

export {
  ShareKind,
  APPROVED_SHARE_TRIGGERS,
  ALLOWED_MEDIA_TYPES,
  FORBIDDEN_DESTINATIONS,
  ShareReject,
  validateShareRequest,
  classifyPdfOutcome,
  assertNoUnofficialAutomation,
} from './share-boundary.js';

export {
  HookKind,
  CURRICULUM_BINDINGS,
  APPROVED_NAVIGATION,
  curriculumBindingById,
  blockedCurriculumBindings,
  isApprovedNavEntry,
  validateNavigationChange,
  assertNoCurriculumElementCreation,
  assertCurriculumBindingsMatchReferences,
} from './element-bindings.js';

export {
  CurriculumContractStatus,
  CURRICULUM_SCHEMA_PUBLISHED,
  CURRICULUM_ENDPOINTS_PUBLISHED,
  CURRICULUM_INTEGRATION_AUTHORIZED,
  MISSING_CURRICULUM_ENTITIES,
  PENDING_CURRICULUM_CONTRACTS,
  assertNoInventedCurriculumSchemas,
  findPendingCurriculumContract,
  describeCurriculumBlock,
} from './contracts/pending-curriculum-contract.js';