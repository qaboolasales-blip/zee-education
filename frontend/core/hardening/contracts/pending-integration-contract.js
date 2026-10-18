/**
 * Integration, performance and recovery contract dependency record. Task: M-O-01, M-O-04.
 *
 * STATUS: BLOCKED on the outside world. M-O-02 and M-O-03 are frontend-verifiable and
 * are delivered; M-O-01 (merged real APIs) and M-O-04 (Cline's UI regression harness)
 * cannot be performed by this package.
 *
 * There is no server, no database and no deployed browser. The published contract is
 * still `GET /health` and `GET /setup` only.
 */

import { ReportContractStatus } from '../../reports/contracts/pending-report-contract.js';

export const IntegrationContractStatus = ReportContractStatus;

/** @type {ReadonlyArray<Readonly<object>>} */
export const PENDING_INTEGRATION_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'integration-smoke',
    capability: 'run every role flow end to end against the merged real APIs',
    status: IntegrationContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No real APIs. The contract still publishes only `/health` and `/setup`, so there ' +
      'is nothing to run a role flow against. Every earlier batch recorded the same absence.',
    unblockRequires:
      'KiloCode publishes the remaining contracts and provisions a school, then the flows ' +
      'can be executed for real.',
  }),
  Object.freeze({
    id: 'backup-restore',
    capability: 'prove backup and restore for a school database',
    status: IntegrationContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No school database exists, so there is nothing to back up or restore. The mobile ' +
      'reference lists `Backup & audit` as `Infrastructure-controlled`, which is a backend ' +
      'concern, not a frontend one.',
    unblockRequires:
      'KiloCode implements backup/restore in the control plane and records evidence.',
  }),
  Object.freeze({
    id: 'ui-regression-matrix',
    capability: 'compare the built UI against all three references at desktop/tablet/mobile widths',
    status: IntegrationContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'This package ships no UI, so a rendered comparison is impossible. Cline owns the ' +
      'UI-lock regression harness; it is not approved to run.',
    unblockRequires:
      "Cline's harness approval and the owner's review/merge of Batches A-M. The hash lock " +
      'is the only automated guarantee this package can make.',
  }),
]);

export const INTEGRATION_AUTHORIZED = false;

export function assertNoInventedIntegrationSchemas(contracts = PENDING_INTEGRATION_CONTRACTS) {
  if (INTEGRATION_AUTHORIZED) {
    throw new Error('integration is authorized without a published contract');
  }
  for (const contract of contracts) {
    for (const field of ['method', 'path', 'requestSchema', 'responseSchema']) {
      if (contract[field] !== null) {
        throw new Error(`integration contract '${contract.id}' declares ${field} without a contract`);
      }
    }
    if (contract.implemented !== false) {
      throw new Error(`integration contract '${contract.id}' claims implementation without an endpoint`);
    }
    if (contract.status === IntegrationContractStatus.PUBLISHED) {
      throw new Error(`integration contract '${contract.id}' claims to be published; update this module`);
    }
  }
  return true;
}

export function describeIntegrationBlock() {
  return {
    schemaPublished: false,
    integrationAuthorized: INTEGRATION_AUTHORIZED,
    capabilities: PENDING_INTEGRATION_CONTRACTS.map((contract) => ({
      id: contract.id,
      status: contract.status,
    })),
  };
}
