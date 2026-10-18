/**
 * Public surface of the Zee Education frontend reports layer (Batch J).
 *
 * Nothing here requests an export, renders a template or issues a download.
 * Importing it has no side effects.
 */

export {
  ReportSurface,
  SURFACE_ROLES,
  EXPORT_FORMATS,
  LOCKED_FORMAT_STRINGS,
  ExportReject,
  isReportSurface,
  isKnownExportFormat,
  canOpenReportSurface,
  reportSurfacesFor,
  authoriseExport,
  selectAvailableReports,
  assertReportRolesMatchReferences,
} from './export-authorization.js';

export {
  ExportOutcome,
  FEEDBACK_AREA,
  classifyExportOutcome,
  bindFeedback,
  assertSingleFeedbackArea,
  assertExportOutcomesMatchReferences,
} from './export-outcome.js';

export {
  BUILT_IN_TEMPLATES,
  TEMPLATE_COMMERCIAL_RULES,
  CUSTOM_DESIGN_APPROVER,
  TemplateReject,
  isBuiltInTemplate,
  templateById,
  templateCatalogue,
  canRenderTemplate,
  assertNoPrintDesigner,
  assertTemplatesMatchReferences,
} from './print-templates.js';

export {
  HookKind,
  REPORT_BINDINGS,
  reportBindingById,
  blockedReportBindings,
  assertNoReportElementCreation,
  assertReportBindingsMatchReferences,
} from './element-bindings.js';

export {
  ReportContractStatus,
  REPORT_INTEGRATION_AUTHORIZED,
  MISSING_REPORT_ENTITIES,
  PENDING_REPORT_CONTRACTS,
  assertNoInventedReportSchemas,
  findPendingReportContract,
  describeReportBlock,
} from './contracts/pending-report-contract.js';
