/**
 * Pilot release contract dependency record. Task: N-O-02, N-O-03.
 *
 * STATUS: BLOCKED. There is no deployed build, no pilot school and no production
 * environment. N-O-01 is frontend-verifiable and delivered; N-O-02 and N-O-03 need a
 * real deployment.
 */

import { ReportContractStatus } from '../../reports/contracts/pending-report-contract.js';

export const ReleaseContractStatus = ReportContractStatus;

/** @type {ReadonlyArray<Readonly<object>>} */
export const PENDING_RELEASE_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'pilot-ui-comparison',
    capability: 'compare the deployed UI against all three references in real browsers',
    status: ReleaseContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No deployment exists. This package ships no UI, so the comparison must be run ' +
      'against a built app by Cline, whose harness is not approved.',
    unblockRequires:
      "Cline's harness approval, a built and deployed app, and the owner's review/merge.",
  }),
  Object.freeze({
    id: 'pilot-pdf-sharing',
    capability: 'validate manual PDF sharing/download flows in the pilot environment',
    status: ReleaseContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No pilot environment and no render endpoint (GCB-06). The *boundary* is enforced ' +
      'by Batch G and re-checked by assertReleaseShareBoundary(); the live flow cannot be ' +
      'exercised.',
    unblockRequires:
      'KiloCode publishes the render contract, a school is provisioned, and a pilot ' +
      'environment exists.',
  }),
]);

export const RELEASE_AUTHORIZED = false;

export function assertNoInventedReleaseSchemas(contracts = PENDING_RELEASE_CONTRACTS) {
  if (RELEASE_AUTHORIZED) {
    throw new Error('release is authorized without a published contract');
  }
  for (const contract of contracts) {
    for (const field of ['method', 'path', 'requestSchema', 'responseSchema']) {
      if (contract[field] !== null) {
        throw new Error(`release contract '${contract.id}' declares ${field} without a contract`);
      }
    }
    if (contract.implemented !== false) {
      throw new Error(`release contract '${contract.id}' claims implementation without an endpoint`);
    }
    if (contract.status === ReleaseContractStatus.PUBLISHED) {
      throw new Error(`release contract '${contract.id}' claims to be published; update this module`);
    }
  }
  return true;
}

export function describeReleaseBlock() {
  return {
    schemaPublished: false,
    releaseAuthorized: RELEASE_AUTHORIZED,
    capabilities: PENDING_RELEASE_CONTRACTS.map((contract) => ({
      id: contract.id,
      status: contract.status,
    })),
  };
}
