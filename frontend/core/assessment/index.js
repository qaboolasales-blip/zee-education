/**
 * Public surface of the Zee Education frontend assessment layer (Batch H).
 *
 * Nothing here writes a mark, publishes a result or renders a chart. The layer is
 * a lifecycle machine, a publication gate, and mark/chart-safe value helpers.
 */

export {
  ResultStage,
  STAGE_LABELS,
  AWAITING_REVIEW_LABEL,
  FLOW_STEP_COUNT,
  FLOW_STEPS,
  LifecycleReject,
  isResultStage,
  rolesForTransition,
  roleMayEnterStage,
  canTransition,
  transition,
  flowState,
  pillFor,
  canRoleViewResult,
  selectVisibleResults,
  assertLifecycleMatchesReferences,
} from './lifecycle.js';

export {
  MarkReject,
  validateMark,
  progressWidth,
  gradeFor,
  formatMarkScore,
  formatMarkPercent,
  buildResultRows,
  resultSetState,
  aggregateResult,
} from './marks.js';

export {
  HookKind,
  ASSESSMENT_BINDINGS,
  assessmentBindingById,
  blockedAssessmentBindings,
  assertNoAssessmentElementCreation,
  assertAssessmentBindingsMatchReferences,
} from './element-bindings.js';

export {
  AssessmentContractStatus,
  ASSESSMENT_SCHEMA_PUBLISHED,
  ASSESSMENT_ENDPOINTS_PUBLISHED,
  ASSESSMENT_INTEGRATION_AUTHORIZED,
  MISSING_ASSESSMENT_ENTITIES,
  PENDING_ASSESSMENT_CONTRACTS,
  assertNoInventedAssessmentSchemas,
  findPendingAssessmentContract,
  describeAssessmentBlock,
} from './contracts/pending-assessment-contract.js';