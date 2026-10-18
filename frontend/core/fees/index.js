/**
 * Public surface of the Zee Education frontend fees layer (Batch I).
 *
 * Nothing here records a payment, renders a receipt or calls a gateway. Importing
 * it has no side effects.
 */

export {
  PaymentMode,
  PAYMENT_MODES,
  QUICK_RECEIPT_SELECT_MODES,
  WRITABLE_PAYMENT_MODES,
  ReferenceShape,
  FeeReject,
  isApprovedPaymentMode,
  validateFeeAmount,
  validateManualPayment,
  formatFee,
  formatFeeCompact,
  approvedCompactStrings,
  formatPaymentReference,
  formatPaymentSourcesNote,
  formatCount,
  feeText,
  assertFeeContractMatchesReferences,
} from './money-contract.js';

export {
  InvoiceStatus,
  STATUS_BADGE,
  LedgerReject,
  EMPTY_FEE_SUMMARY,
  isInvoiceStatus,
  badgeFor,
  feeVisibility,
  normaliseInvoice,
  summariseFees,
  classifyFeeDue,
  recordManualPayment,
  emptyFeeState,
  feeStateForRole,
} from './ledger.js';

export {
  PaymentReject,
  FORBIDDEN_PAYMENT_FIELDS,
  inspectPaymentPayload,
  validateManualPaymentRequest,
  assertNoPaymentGateway,
  assertNoNetworkCalls,
  stripCommentsAndLiterals,
  assertNoGatewayCopyInReferences,
} from './payment-boundary.js';

export {
  HookKind,
  FEE_BINDINGS,
  feeBindingById,
  blockedFeeBindings,
  assertNoFeeElementCreation,
  assertFeeBindingsMatchReferences,
} from './element-bindings.js';

export {
  FeeContractStatus,
  FEE_SCHEMA_PUBLISHED,
  FEE_ENDPOINTS_PUBLISHED,
  FEE_INTEGRATION_AUTHORIZED,
  MISSING_FEE_ENTITIES,
  PENDING_FEE_CONTRACTS,
  assertNoInventedFeeSchemas,
  findPendingFeeContract,
  describeFeeBlock,
} from './contracts/pending-fee-contract.js';