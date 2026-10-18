/**
 * Report / export contract dependency record. Task: J-O-01.
 *
 * STATUS: BLOCKED. No export endpoint, no print-render endpoint, no commercial
 * contract, and no school database. `backend/docs/control-plane-data-boundary.md`
 * treats reports and print artefacts as school-local data, so these wait on school
 * provisioning as well as on a contract.
 *
 * J-O-02 and J-O-03 are complete: the absence of a print designer is enforced, and
 * export failures map onto the single existing feedback area.
 */

import { FeeContractStatus } from '../../fees/contracts/pending-fee-contract.js';

export const ReportContractStatus = FeeContractStatus;

/** Entities Batch J needs inside a school database. */
export const MISSING_REPORT_ENTITIES = Object.freeze([
  Object.freeze({ entity: 'export_jobs', need: 'Requested export, its actor, its scope and its expiry' }),
  Object.freeze({ entity: 'export_row_permissions', need: 'Which reports a given role may export (JB-04)' }),
  Object.freeze({ entity: 'print_templates', need: 'Built-in template ids and any approved custom design reference' }),
  Object.freeze({ entity: 'custom_design_approvals', need: 'Super Admin approval record for a custom design (JB-07)' }),
]);

/** @type {ReadonlyArray<Readonly<object>>} */
export const PENDING_REPORT_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'report-read',
    capability: 'list the reports a role may export, with their row counts',
    status: ReportContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No endpoint. The mobile `reports` tool lists three rows and the school workspace shows three ' +
      'tiles, but nothing defines what a report contains or who may run it server-side.',
    unblockRequires:
      'KiloCode publishes the report-read contract including the per-role report list, the date ' +
      'granularity behind `Daily → weekly → monthly`, and the 403 case for a role without the ' +
      'reports tool.',
  }),
  Object.freeze({
    id: 'export-create',
    capability: 'create an export (PDF / XLS / Excel / CSV)',
    status: ReportContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No endpoint. `authoriseExport()` enforces the client half of the rule the UI states ' +
      '(`Permission controlled`), but a client check is a usability guard, not a control.',
    unblockRequires:
      'KiloCode publishes the export-create contract: request fields (report ids, format, date ' +
      'range), the job or inline response shape, the expiry of any download link, and ' +
      'server-side re-authorisation. The client already refuses an export that would include an ' +
      'unpublished result.',
  }),
  Object.freeze({
    id: 'export-download',
    capability: 'download a completed export from a time-limited link',
    status: ReportContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No contract at all. An expired-download case is modelled client-side (`EXPIRED_DOWNLOAD`) ' +
      'but there is no link format, TTL or expiry field to read.',
    unblockRequires:
      'KiloCode publishes the download contract: the link shape, its TTL, and the status returned ' +
      'once it has expired.',
  }),
  Object.freeze({
    id: 'print-render',
    capability: 'render a built-in or approved custom print template',
    status: ReportContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No render endpoint (the same absence recorded as GCB-06). The four built-in template names ' +
      'are transcribed, but their field set is not published anywhere.',
    unblockRequires:
      'KiloCode publishes the render contract and the approved field set per template. No template ' +
      'markup may be generated client-side — assertNoPrintDesigner() enforces that.',
  }),
  Object.freeze({
    id: 'commercial-billing',
    capability: 'read plans, quotes, rate book and renewals',
    status: ReportContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No commercial table. The Super Admin reference shows a rate book, a quote action and three ' +
      'commercial tiles, all with no contract behind them.',
    unblockRequires:
      'KiloCode publishes the commercial contract. `PKR 1.46M`, `42,000` and the three commercial ' +
      'tiles must come from it rather than from the reference sample values.',
  }),
]);

/** No report, export or print request may be made. */
export const REPORT_INTEGRATION_AUTHORIZED = false;

export function assertNoInventedReportSchemas(contracts = PENDING_REPORT_CONTRACTS) {
  if (REPORT_INTEGRATION_AUTHORIZED) {
    throw new Error('report integration is authorized without a published contract');
  }
  for (const contract of contracts) {
    for (const field of ['method', 'path', 'requestSchema', 'responseSchema']) {
      if (contract[field] !== null) {
        throw new Error(`report contract '${contract.id}' declares ${field} without a contract`);
      }
    }
    if (contract.implemented !== false) {
      throw new Error(`report contract '${contract.id}' claims implementation without an endpoint`);
    }
    if (contract.status === ReportContractStatus.PUBLISHED) {
      throw new Error(`report contract '${contract.id}' claims to be published; update this module`);
    }
  }
  return true;
}

export function findPendingReportContract(id) {
  return PENDING_REPORT_CONTRACTS.find((contract) => contract.id === id) ?? null;
}

export function describeReportBlock() {
  return {
    schemaPublished: false,
    integrationAuthorized: REPORT_INTEGRATION_AUTHORIZED,
    missingEntities: MISSING_REPORT_ENTITIES.length,
    capabilities: PENDING_REPORT_CONTRACTS.map((contract) => ({
      id: contract.id,
      status: contract.status,
    })),
  };
}
