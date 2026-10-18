/**
 * Commercial / licensing contract dependency record. Task: K-O-01.
 *
 * STATUS: BLOCKED. No commercial table, no licensing table, no support table, no
 * endpoint. The four control-plane migrations hold none of it — commercial records are
 * platform data, but they are still school-*scoped* records and none exist yet.
 *
 * K-O-02 is complete: the reference ships its own status-to-badge mapping, and that
 * mapping is transcribed and drift-guarded. K-O-03 is complete as a *boundary* — the
 * allowlist exists and refuses; there is nothing yet for it to allow.
 */

import { ReportContractStatus } from '../../reports/contracts/pending-report-contract.js';

export const CommercialContractStatus = ReportContractStatus;

/** Entities Batch K needs in the control plane. */
export const MISSING_COMMERCIAL_ENTITIES = Object.freeze([
  Object.freeze({ entity: 'school_plans', need: 'Plan id, name and whether it is quoted or fixed' }),
  Object.freeze({ entity: 'school_licenses', need: 'Licence state vocabulary and its badge mapping (KB-01)' }),
  Object.freeze({ entity: 'school_renewals', need: 'Renewal date, amount, currency and reminder state (KB-03)' }),
  Object.freeze({ entity: 'school_addons', need: 'Separately-quoted add-ons and the one-time print design fee' }),
  Object.freeze({ entity: 'support_tickets', need: 'Ticket id, school, subject, priority and status' }),
  Object.freeze({ entity: 'support_audit', need: 'Who read which approved log, and why (KB-02)' }),
]);

/** @type {ReadonlyArray<Readonly<object>>} */
export const PENDING_COMMERCIAL_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'commercial-read',
    capability: 'list school plans, licences, renewals and the rate book',
    status: CommercialContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No endpoint and no table. The reference shows a plan catalogue, a rate book and a licence ' +
      'status column, all as sample values.',
    unblockRequires:
      'KiloCode publishes the commercial-read contract **including the licence state vocabulary** ' +
      'and the plan catalogue. The badge mapping here is transcribed from the reference and must be ' +
      'replaced by the published one, not extended by hand.',
  }),
  Object.freeze({
    id: 'license-state',
    capability: 'report a licence state that the UI can colour correctly',
    status: CommercialContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'The reference defines exactly two states (`Active`, `Renewal due`). There is no `Expired`, ' +
      '`Suspended` or `Trial`, and no server vocabulary to check them against.',
    unblockRequires:
      'KiloCode publishes the state enum. Until then any value outside the two known states renders ' +
      'the neutral `.n` badge and reports `known: false` — it is never assumed to be `Active`.',
  }),
  Object.freeze({
    id: 'renewal-reminder',
    capability: 'prepare or send a renewal reminder',
    status: CommercialContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No contract, and email is explicitly not connected in the product — the reference says ' +
      '`Preview only — email not connected`.',
    unblockRequires:
      'KiloCode publishes the reminder contract and confirms a delivery channel. Until then ' +
      '`prepareRenewalReminder()` returns `state: prepared`, `sent: false`, and never a send.',
  }),
  Object.freeze({
    id: 'support-tickets',
    capability: 'list and create support tickets',
    status: CommercialContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No endpoint. Ticket priorities (`Normal`, `Low`, `High`) are visible in the reference but ' +
      'undefined anywhere else.',
    unblockRequires:
      'KiloCode publishes the ticket contract, the priority vocabulary, and confirms that a ticket ' +
      'never carries school records as its payload.',
  }),
  Object.freeze({
    id: 'support-logs',
    capability: 'read approved logs for an installation',
    status: CommercialContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No contract, and no audit sink for support reads. The reference permits approved logs; it ' +
      'does not say who may read them or that the read is recorded.',
    unblockRequires:
      'KiloCode publishes the log contract and writes a `support_audit` row per read. ' +
      '`authoriseSupportAction()` already refuses the read without an audited reason.',
  }),
]);

/** No commercial or support request may be made. */
export const COMMERCIAL_INTEGRATION_AUTHORIZED = false;

export function assertNoInventedCommercialSchemas(contracts = PENDING_COMMERCIAL_CONTRACTS) {
  if (COMMERCIAL_INTEGRATION_AUTHORIZED) {
    throw new Error('commercial integration is authorized without a published contract');
  }
  for (const contract of contracts) {
    for (const field of ['method', 'path', 'requestSchema', 'responseSchema']) {
      if (contract[field] !== null) {
        throw new Error(`commercial contract '${contract.id}' declares ${field} without a contract`);
      }
    }
    if (contract.implemented !== false) {
      throw new Error(`commercial contract '${contract.id}' claims implementation without an endpoint`);
    }
    if (contract.status === CommercialContractStatus.PUBLISHED) {
      throw new Error(`commercial contract '${contract.id}' claims to be published; update this module`);
    }
  }
  return true;
}

export function findPendingCommercialContract(id) {
  return PENDING_COMMERCIAL_CONTRACTS.find((contract) => contract.id === id) ?? null;
}

export function describeCommercialBlock() {
  return {
    schemaPublished: false,
    integrationAuthorized: COMMERCIAL_INTEGRATION_AUTHORIZED,
    missingEntities: MISSING_COMMERCIAL_ENTITIES.length,
    capabilities: PENDING_COMMERCIAL_CONTRACTS.map((contract) => ({
      id: contract.id,
      status: contract.status,
    })),
  };
}
