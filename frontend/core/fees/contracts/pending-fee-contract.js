/**
 * Fee / receipt contract dependency record. Task: I-O-01.
 *
 * STATUS: BLOCKED. No fee, invoice, receipt, discount or fine table, no endpoint,
 * and no school database. `backend/docs/control-plane-data-boundary.md` lists
 * "Fee records, receipts, discounts, fines" as school-local data that is **never**
 * stored in the control plane.
 *
 * I-O-05 IS complete: the absence of any payment-gateway surface is confirmed and
 * continuously enforced.
 *
 * Every schema below is pinned to `null` and `assertNoInventedFeeSchemas()` fails the
 * suite if that changes.
 */

/** Contract publication states. */
export const FeeContractStatus = Object.freeze({
  BLOCKED_NOT_CONTRACTED: 'blocked-not-contracted',
  BLOCKED_NEEDS_PROVISIONING: 'blocked-needs-provisioning-path',
  PUBLISHED: 'published',
});

export const FEE_SCHEMA_PUBLISHED = false;
export const FEE_ENDPOINTS_PUBLISHED = false;

/** Entities Batch I needs inside a school database. */
export const MISSING_FEE_ENTITIES = Object.freeze([
  Object.freeze({ entity: 'fee_invoices', need: 'Invoice reference, amount, status, due date' }),
  Object.freeze({ entity: 'fee_payments', need: 'Amount, mode, receipt reference, who recorded it' }),
  Object.freeze({ entity: 'fee_audit', need: 'Immutable record of every payment and reversal' }),
  Object.freeze({ entity: 'fee_discounts', need: 'Approved discounts — PROJECT_MEMORY scope, but NO approved UI exists (IB-01)' }),
  Object.freeze({ entity: 'fee_fines', need: 'Approved fines — same gap as discounts (IB-01)' }),
]);

/** @type {ReadonlyArray<Readonly<object>>} */
export const PENDING_FEE_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'fee-read',
    capability: 'list invoices and summarise collected / outstanding / sources',
    status: FeeContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No fee or invoice table, no endpoint, no school database. The three summary tiles and the ' +
      'five-column table have nothing to bind to.',
    unblockRequires:
      'KiloCode implements fee invoices and payments in a dedicated school database and publishes ' +
      'the read contract, including the invoice status vocabulary.',
  }),
  Object.freeze({
    id: 'manual-payment',
    capability: 'record a manual payment and issue a receipt',
    status: FeeContractStatus.BLOCKED_NEEDS_PROVISIONING,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No endpoint. V1 forbids any gateway, so the contract must describe a purely manual record ' +
      'with mode, receipt reference and an audit entry.',
    unblockRequires:
      'KiloCode publishes the manual-payment contract: request fields (amount, mode, reference, ' +
      'invoice), the receipt identifier, the audit record written, and the 403 case for a ' +
      'non-admin. On the client, recordManualPayment() already refuses overpayment and re-payment ' +
      'of a settled invoice.',
  }),
  Object.freeze({
    id: 'receipt-pdf',
    capability: 'produce and share a receipt or fee PDF',
    status: FeeContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'No render endpoint (already GCB-06). The sharing half is already bounded by the Batch G ' +
      'manual-share policy, which refuses any code-chosen destination.',
    unblockRequires:
      'KiloCode publishes the render contract. Any share must additionally satisfy ' +
      'validateShareRequest() from core/curriculum/share-boundary.js.',
  }),
  Object.freeze({
    id: 'invoice-status-vocabulary',
    capability: 'confirm the invoice status enum',
    status: FeeContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'The references display only `Paid` and `Due`. No enum is published, so a partial, overdue ' +
      'or cancelled state has no approved badge.',
    unblockRequires:
      'KiloCode publishes the status vocabulary and the `.bd` class mapping. Until then an ' +
      'unknown state reuses the existing `.bd.n` badge and no third badge may be added (IB-02).',
  }),
  Object.freeze({
    id: 'discounts-and-fines',
    capability: 'apply an approved discount or fine',
    status: FeeContractStatus.BLOCKED_NOT_CONTRACTED,
    method: null,
    path: null,
    requestSchema: null,
    responseSchema: null,
    implemented: false,
    blocker:
      'PROJECT_MEMORY lists "approved discounts/fines" as V1 scope, but a scan of all three ' +
      'references for `discount|fine|waiver` returns ZERO matches — there is no approved UI ' +
      'surface at all, and no contract.',
    unblockRequires:
      'The owner approves a discount/fine surface, then KiloCode publishes the contract. This is ' +
      'a V1-scope gap that needs an explicit decision, not just a contract (IB-01).',
  }),
]);

/** No fee request may be made. */
export const FEE_INTEGRATION_AUTHORIZED = false;

export function assertNoInventedFeeSchemas(contracts = PENDING_FEE_CONTRACTS) {
  if (FEE_INTEGRATION_AUTHORIZED) {
    throw new Error('fee integration is authorized without a published contract');
  }
  for (const contract of contracts) {
    for (const field of ['method', 'path', 'requestSchema', 'responseSchema']) {
      if (contract[field] !== null) {
        throw new Error(`fee contract '${contract.id}' declares ${field} without a contract`);
      }
    }
    if (contract.implemented !== false) {
      throw new Error(`fee contract '${contract.id}' claims implementation without an endpoint`);
    }
    if (contract.status === FeeContractStatus.PUBLISHED) {
      throw new Error(`fee contract '${contract.id}' claims to be published; update this module`);
    }
  }
  return true;
}

export function findPendingFeeContract(id) {
  return PENDING_FEE_CONTRACTS.find((contract) => contract.id === id) ?? null;
}

export function describeFeeBlock() {
  return {
    schemaPublished: FEE_SCHEMA_PUBLISHED,
    endpointsPublished: FEE_ENDPOINTS_PUBLISHED,
    integrationAuthorized: FEE_INTEGRATION_AUTHORIZED,
    missingEntities: MISSING_FEE_ENTITIES.length,
    capabilities: PENDING_FEE_CONTRACTS.map((contract) => ({
      id: contract.id,
      status: contract.status,
    })),
  };
}