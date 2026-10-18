/**
 * Fee ledger behaviour. Tasks: I-O-01 and I-O-04.
 *
 * Pure logic over data the caller supplies. No request, no rendering, no storage.
 *
 * THE APPROVED LEDGER SHAPES, read from the references:
 *
 *   School Dashboard — Fees & Accounts
 *     sm('COLLECTED THIS MONTH','PKR 1.08M','↑ 12.5% vs last month')
 *     sm('OUTSTANDING DUES','PKR 296K','47 invoices pending')
 *     sm('PAYMENT SOURCES','4','Cash · Bank · Wallet · Cheque')
 *     table ['Student','Invoice','Amount','Reference','Status']
 *       ['Muhammad Ayan','INV-1024','PKR 12,500','Bank · 294012', bd.g 'Paid']
 *       ['Zain Ahmed',    'INV-1026','PKR 11,000','—',            bd.w 'Due']
 *
 *   Mobile Preview
 *     Parent home   card('Next fee due','PKR 12,500','Due 25 Oct · manual payment')
 *     Parent KPI    ['Fee due','PKR 12.5k']
 *     fees feature  ['THIS MONTH','PKR 1.08M','Manual source tracking']
 *                   ['October tuition','PKR 12,500','Due','w']
 *     and           'Online payment V1 mein enabled nahin'
 *
 * So exactly TWO invoice states appear: `Paid` and `Due`. No status enum is
 * published, so nothing beyond those two may be asserted (IB-02).
 *
 * ROLE SCOPE reuses the Batch E privacy matrix: only Parent (linked children) and
 * School Admin may see fee records. Teacher and Student get nothing — the mobile
 * reference's `TL.Teacher` and `TL.Student` lists contain no `fees` entry at all.
 * Super Admin is denied by the data-boundary rule that fee records are school-local.
 *
 * No DOM, no CSS, no rendering.
 */

import { DataCategory, Scope, mayView, scopeFor } from '../people/privacy-policy.js';
import { Role } from '../auth/role-guard.js';
import { formatDueIn, toKarachiParts } from '../format/datetime.js';
import { toFiniteNumber } from '../format/money.js';
import {
  FeeReject,
  PaymentMode,
  formatCount,
  formatFee,
  formatFeeCompact,
  isApprovedPaymentMode,
  validateManualPayment,
} from './money-contract.js';

/** The only two invoice states the approved UI displays. */
export const InvoiceStatus = Object.freeze({
  PAID: 'paid',
  DUE: 'due',
});

/** Locked badge classes for those states, from `.bd.g` / `.bd.w`. */
export const STATUS_BADGE = Object.freeze({
  [InvoiceStatus.PAID]: Object.freeze({ className: 'g', label: 'Paid' }),
  [InvoiceStatus.DUE]: Object.freeze({ className: 'w', label: 'Due' }),
});

/** Closed rejection reasons for ledger-shaped input. */
export const LedgerReject = Object.freeze({
  UNKNOWN_STATUS: 'unknown-status',
  NOT_AN_OBJECT: 'not-an-object',
  NOT_A_NUMBER: 'not-a-number',
  NEGATIVE: 'negative',
  SCOPE_UNRESOLVED: 'scope-unresolved',
  ROLE_NOT_PERMITTED: 'role-not-permitted',
  NOT_A_PAYMENT: 'not-a-payment',
  OVERPAYMENT: 'overpayment',
  PARTIAL_NOT_SETTLED: 'partial-not-settled',
  ALREADY_PAID: 'already-paid',
  NO_RECEIPT: 'no-receipt',
});

export function isInvoiceStatus(value) {
  return typeof value === 'string' && Object.values(InvoiceStatus).includes(value);
}

/** The badge descriptor for an existing `.bd` cell. Unknown state reuses `.bd.n`. */
export function badgeFor(status) {
  if (!isInvoiceStatus(status)) {
    return Object.freeze({ className: 'n', label: null, known: false });
  }
  return Object.freeze({ ...STATUS_BADGE[status], known: true });
}

/**
 * May this role see these fee records at all?
 * Reuses the privacy matrix — fee records are `fee_records`.
 */
export function feeVisibility(role, viewerScope = {}) {
  if (!mayView(role, DataCategory.FEE_RECORDS)) {
    return Object.freeze({ permitted: false, scope: Scope.NONE });
  }
  const scope = scopeFor(role, DataCategory.FEE_RECORDS);
  if (scope === Scope.LINKED_CHILDREN) {
    const linked = viewerScope.linkedIds;
    if (!Array.isArray(linked) || linked.length === 0) {
      return Object.freeze({ permitted: false, scope });
    }
    return Object.freeze({ permitted: true, scope });
  }
  return Object.freeze({ permitted: true, scope });
}

/**
 * Normalise one invoice row for an approved table row.
 *
 * An invoice whose amount is unusable yields `valid: false` rather than a
 * fabricated `PKR 0`, so a bad record can never read as "nothing owed".
 *
 * @param {{ invoiceRef?: unknown, amount?: unknown, referenceMode?: unknown, reference?: unknown, status?: unknown }} invoice
 */
export function normaliseInvoice(invoice) {
  if (invoice === null || typeof invoice !== 'object') {
    return Object.freeze({ valid: false, reason: LedgerReject.NOT_AN_OBJECT });
  }
  const amount = toFiniteNumber(invoice.amount);
  if (amount === null) return Object.freeze({ valid: false, reason: LedgerReject.NOT_A_NUMBER });
  if (amount < 0) return Object.freeze({ valid: false, reason: LedgerReject.NEGATIVE });
  if (!isInvoiceStatus(invoice.status)) {
    return Object.freeze({ valid: false, reason: LedgerReject.UNKNOWN_STATUS });
  }

  const badge = badgeFor(invoice.status);
  const modeText = isApprovedPaymentMode(invoice.referenceMode) ? invoice.referenceMode.trim() : null;
  const refText =
    typeof invoice.reference === 'string' && invoice.reference.trim() !== '' ? invoice.reference.trim() : null;

  return Object.freeze({
    valid: true,
    reason: null,
    invoiceRef:
      typeof invoice.invoiceRef === 'string' && invoice.invoiceRef.trim() !== ''
        ? invoice.invoiceRef.trim()
        : null,
    amount,
    amountText: formatFee(amount),
    amountCompactText: formatFeeCompact(amount),
    mode: modeText,
    reference: refText,
    status: invoice.status,
    badgeClass: badge.className,
    badgeLabel: badge.label,
  });
}

/** Structure only — no display copy is produced for totals. */
export const EMPTY_FEE_SUMMARY = Object.freeze({
  permitted: false,
  scope: Scope.NONE,
  invoices: 0,
  paidCount: 0,
  dueCount: 0,
  invalidCount: 0,
  collected: null,
  collectedText: null,
  outstanding: null,
  outstandingText: null,
  sourcesCount: null,
  sourcesCountText: null,
});

/**
 * Summarise a fee ledger for the three existing `.sm` tiles.
 *
 * Only valid invoices contribute. `invalidCount` is reported so a malformed record
 * is visible to QA instead of silently shrinking the totals.
 */
export function summariseFees(invoices, role, viewerScope = {}) {
  const visibility = feeVisibility(role, viewerScope);
  if (!visibility.permitted) return EMPTY_FEE_SUMMARY;

  const list = Array.isArray(invoices) ? invoices : [];
  const rows = list.map(normaliseInvoice);
  const valid = rows.filter((row) => row.valid);

  const paid = valid.filter((row) => row.status === InvoiceStatus.PAID);
  const due = valid.filter((row) => row.status === InvoiceStatus.DUE);

  const collected = paid.reduce((sum, row) => sum + row.amount, 0);
  const outstanding = due.reduce((sum, row) => sum + row.amount, 0);

  const modes = new Set(
    valid.map((row) => row.mode).filter((mode) => mode !== null),
  );

  return Object.freeze({
    permitted: true,
    scope: visibility.scope,
    invoices: valid.length,
    paidCount: paid.length,
    dueCount: due.length,
    invalidCount: rows.length - valid.length,
    collected,
    collectedText: formatFeeCompact(collected),
    outstanding,
    outstandingText: formatFeeCompact(outstanding),
    // The approved tile shows the COUNT of sources, e.g. '4'.
    sourcesCount: modes.size,
    sourcesCountText: formatCount(modes.size),
  });
}

/**
 * Due-date state for the existing `Due 25 Oct · manual payment` card.
 *
 * `overdue` is derived purely from the supplied instants, never guessed. A fee with
 * no due date reports unknown rather than implying it is due.
 *
 * @param {{ dueAt?: unknown, status?: unknown }} invoice
 * @param {{ now?: unknown }} [options]
 */
export function classifyFeeDue(invoice, options = {}) {
  const nowParts = toKarachiParts(options.now ?? Date.now());
  if (!nowParts) return Object.freeze({ known: false, state: null, minutesRemaining: null });

  const status = invoice?.status;
  if (!isInvoiceStatus(status)) return Object.freeze({ known: false, state: null, minutesRemaining: null });
  if (status === InvoiceStatus.PAID) {
    return Object.freeze({ known: true, state: 'settled', minutesRemaining: null });
  }

  const dueParts = toKarachiParts(invoice?.dueAt);
  if (!dueParts) return Object.freeze({ known: false, state: null, minutesRemaining: null });

  const minutes = Math.round(
    (karachiUtc(dueParts) - karachiUtc(nowParts)) / 60000,
  );
  return Object.freeze({
    known: true,
    state: minutes < 0 ? 'overdue' : 'due',
    minutesRemaining: minutes,
    dueInText: formatDueIn(minutes),
  });
}

function karachiUtc(parts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

/**
 * Record a manual payment against an invoice.
 *
 * Auditable by construction:
 *   - only School Admin may record a payment (the Quick-receipt form lives on the
 *     School Admin workspace);
 *   - the payment must satisfy `validateManualPayment`, including a receipt
 *     reference for every mode;
 *   - only the two modes the locked `Mode` select can record are writable — a
 *     Wallet or Cheque invoice may be *displayed* but cannot be *created* (IB-03);
 *   - overpaying is refused (an unrecoverable accounting error), and so is paying
 *     less than the invoice (see PARTIAL_NOT_SETTLED below);
 *   - this transition is the ONLY way an invoice becomes `Paid`.
 *
 * PARTIAL PAYMENTS — why they are refused rather than handled:
 *   The references show two states, `Paid` and `Due`, and no third badge exists. A
 *   payment smaller than the invoice would leave money genuinely outstanding, yet
 *   the only available transition marks it `Paid` and paints it `.bd.g`. Silently
 *   settling a part payment is a data-integrity bug that is invisible afterwards,
 *   so it is refused and surfaced as IB-07 until the invoice model publishes
 *   partial-payment semantics and an approved treatment for it.
 *
 * @param {object} invoice
 * @param {{ amount?: unknown, mode?: unknown, reference?: unknown }} payment
 * @param {string} role
 * @param {{ now?: unknown }} [options]
 */
export function recordManualPayment(invoice, payment, role, options = {}) {
  if (invoice === null || typeof invoice !== 'object') {
    return Object.freeze({ allowed: false, reason: LedgerReject.NOT_AN_OBJECT, invoice: null });
  }
  if (role !== Role.SCHOOL_ADMIN) {
    return Object.freeze({ allowed: false, reason: LedgerReject.ROLE_NOT_PERMITTED, invoice });
  }
  if (invoice.status === InvoiceStatus.PAID) {
    return Object.freeze({ allowed: false, reason: LedgerReject.ALREADY_PAID, invoice });
  }

  const amount = toFiniteNumber(invoice.amount);
  if (amount === null) return Object.freeze({ allowed: false, reason: LedgerReject.NOT_A_NUMBER, invoice });
  if (amount < 0) return Object.freeze({ allowed: false, reason: LedgerReject.NEGATIVE, invoice });

  const validated = validateManualPayment(payment, { requireWritableMode: true });
  if (!validated.valid) {
    return Object.freeze({ allowed: false, reason: validated.reason, invoice });
  }
  if (validated.value.amount > amount) {
    return Object.freeze({ allowed: false, reason: LedgerReject.OVERPAYMENT, invoice });
  }
  if (validated.value.amount < amount) {
    return Object.freeze({ allowed: false, reason: LedgerReject.PARTIAL_NOT_SETTLED, invoice });
  }

  const nowParts = toKarachiParts(options.now ?? Date.now());
  const paidAt = nowParts === null
    ? null
    : `${pad(nowParts.year, 4)}-${pad(nowParts.month, 2)}-${pad(nowParts.day, 2)}`;

  return Object.freeze({
    allowed: true,
    reason: null,
    invoice: Object.freeze({
      ...invoice,
      amount,
      status: InvoiceStatus.PAID,
      referenceMode: validated.value.mode,
      reference: validated.value.reference,
      paidAt,
      amountText: formatFee(amount),
      badgeClass: STATUS_BADGE[InvoiceStatus.PAID].className,
      badgeLabel: STATUS_BADGE[InvoiceStatus.PAID].label,
    }),
  });
}

function pad(value, width) {
  return String(value).padStart(width, '0');
}

/** An invoice with no record at all — the `no-fee` case (I-O-04). */
export function emptyFeeState() {
  return Object.freeze({
    present: false,
    reason: 'no-fee',
    invoices: 0,
    collected: 0,
    outstanding: 0,
    nextDue: null,
    dueInText: null,
  });
}

/** Render the summary for a role, withholding rather than zeroing when forbidden. */
export function feeStateForRole(invoices, role, viewerScope = {}) {
  const visibility = feeVisibility(role, viewerScope);
  if (!visibility.permitted) return Object.freeze({ ...emptyFeeState(), reason: LedgerReject.ROLE_NOT_PERMITTED });
  const list = Array.isArray(invoices) ? invoices.filter(Boolean) : [];
  if (list.length === 0) return emptyFeeState();

  const summary = summariseFees(list, role, viewerScope);
  return Object.freeze({
    present: true,
    reason: summary.invalidCount > 0 ? 'partial' : null,
    invoices: summary.invoices,
    collected: summary.collected,
    outstanding: summary.outstanding,
    invalidCount: summary.invalidCount,
    nextDue: null,
    dueInText: null,
  });
}

export { PaymentMode, FeeReject as MoneyFeeReject };