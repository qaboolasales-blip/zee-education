/**
 * Fee money-formatting contract. Task: I-O-02.
 *
 * "Use PKR formatter and existing color/category accents without visual edits."
 *
 * Everything here delegates to the existing formatters in `core/format/`. This
 * module adds no formatting logic of its own — it only pins which shapes are
 * already approved and which locked strings must survive, so a future binding
 * cannot reformat an approved cell.
 *
 * THE LOCKED STRINGS, all present in the references:
 *   'PKR 1.08M'   'PKR 1.46M'    compact, Overview stat + Fees collected
 *   'PKR 296K'    uppercase K     OUTSTANDING DUES tile
 *   'PKR 12.5k'   lowercase k     mobile Parent KPI 'Fee due'
 *   'PKR 12,500'  grouped         receipts, dues, rate book
 *   'PKR 9,800'   grouped
 *   'Cash · Bank · Wallet · Cheque'  PAYMENT SOURCES note
 *   'Bank · 294012'  'Cash · RC-141'   reference column
 *
 * KNOWN DIVERGENCE (OI-3 / FAT-03)
 *   'PKR 296K' and 'PKR 12.5k' differ in K casing *inside the same locked UI*.
 *   `formatPkrCompact` uses one deterministic rule (lowercase k). Reconciling the
 *   locked string would be a visible change, so it is NOT reconciled here. A caller
 *   that must reproduce 'PKR 296K' exactly must be given the literal by the contract
 *   layer, never by re-deriving it — see `approvedCompactStrings()`.
 *
 * No DOM, no CSS, no rendering.
 */

import { PKR, formatNumber, formatPkr, formatPkrCompact, toFiniteNumber } from '../format/money.js';
import { safeText, EMPTY_MARKER } from '../format/empty.js';

export { PKR };

/** The approved payment modes named in the references. */
export const PaymentMode = Object.freeze({
  CASH: 'Cash',
  BANK: 'Bank',
  WALLET: 'Wallet',
  CHEQUE: 'Cheque',
});

/** Exactly four, matching `sm('PAYMENT SOURCES','4','Cash · Bank · Wallet · Cheque')`. */
export const PAYMENT_MODES = Object.freeze([
  PaymentMode.CASH,
  PaymentMode.BANK,
  PaymentMode.WALLET,
  PaymentMode.CHEQUE,
]);

/**
 * The `Mode` select in the locked Quick-receipt form has only TWO options:
 * `<option>Cash</option><option>Bank</option>`. Adding a third would be a visible
 * change (IB-03).
 */
export const QUICK_RECEIPT_SELECT_MODES = Object.freeze([PaymentMode.CASH, PaymentMode.BANK]);

/**
 * Writable vs. displayed modes — two different things, deliberately separated.
 *
 * DISPLAYED (4): what a historical invoice may show. The reference column renders
 *   `Bank · 294012`, `Cash · RC-141`, and the sources tile names all four.
 * WRITABLE (2): what the locked Quick-receipt form can record, because its `Mode`
 *   select has exactly two `<option>` nodes. Offering Wallet or Cheque on the write
 *   path would require adding an option — a visible change (IB-03).
 *
 * So a Wallet/Cheque invoice can be *displayed* once it exists, but nothing in V1
 * can *create* one.
 */
export const WRITABLE_PAYMENT_MODES = QUICK_RECEIPT_SELECT_MODES;

/** Approved invoice/reference label forms, for the existing columns. */
export const ReferenceShape = Object.freeze({
  INVOICE: 'invoice',
  PAYMENT_REFERENCE: 'payment-reference',
  NONE: 'none',
});

export const FeeReject = Object.freeze({
  NOT_A_NUMBER: 'not-a-number',
  NEGATIVE: 'negative',
  ZERO_MAX: 'zero-max',
  NOT_APPROVED_MODE: 'not-approved-mode',
  NOT_WRITABLE_MODE: 'not-writable-mode',
  MISSING_REFERENCE: 'missing-reference',
  REFERENCE_TOO_LONG: 'reference-too-long',
  MODE_REQUIRES_REFERENCE: 'mode-requires-reference',
});

function ok(value) {
  return Object.freeze({ valid: true, reason: null, value, errors: Object.freeze([]) });
}

function fail(reason, value) {
  return Object.freeze({ valid: false, reason, value, errors: Object.freeze([]) });
}

export function isApprovedPaymentMode(value) {
  return typeof value === 'string' && PAYMENT_MODES.includes(value.trim());
}

/**
 * Validate a fee amount. Arithmetic only — no schema is assumed.
 * A fee may be zero (nothing owed); it may not be negative.
 */
export function validateFeeAmount(value) {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return fail(FeeReject.NOT_A_NUMBER, null);
  if (numeric < 0) return fail(FeeReject.NEGATIVE, numeric);
  return ok(numeric);
}

/**
 * Validate a manual payment record.
 *
 * V1 is manual and auditable, so a recorded payment must state **all three** of
 * source, mode and reference. The reference column proves it: every settled row
 * carries one — `Bank · 294012`, `Cash · RC-141`. The lone `—` belongs to a *due*
 * row that has no payment yet, which is a different thing entirely.
 *
 * A reference is therefore required for EVERY mode. Cash is not exempt: a cash
 * receipt that cannot be traced back to a receipt number is unauditable, and
 * "it's obviously cash" is not evidence.
 *
 * @param {{ amount?: unknown, mode?: unknown, reference?: unknown }} payment
 * @param {{ requireWritableMode?: boolean }} [options]
 */
export function validateManualPayment(payment, options = {}) {
  const amount = validateFeeAmount(payment?.amount);
  if (!amount.valid) return fail(amount.reason, amount.value);

  if (!isApprovedPaymentMode(payment?.mode)) return fail(FeeReject.NOT_APPROVED_MODE, null);
  const mode = payment.mode.trim();

  if (options.requireWritableMode === true && !WRITABLE_PAYMENT_MODES.includes(mode)) {
    return fail(FeeReject.NOT_WRITABLE_MODE, null);
  }

  const referenceRaw = payment?.reference;
  const reference =
    typeof referenceRaw === 'string' && referenceRaw.trim() !== '' ? referenceRaw.trim() : null;

  if (reference === null) return fail(FeeReject.MODE_REQUIRES_REFERENCE, null);
  if (reference.length > 191) return fail(FeeReject.REFERENCE_TOO_LONG, null);

  return ok(Object.freeze({ amount: amount.value, mode, reference }));
}

/**
 * Render a fee for an existing approved text node.
 * `PKR 12,500` — grouped, no decimals, matching the receipts table.
 */
export function formatFee(value) {
  const numeric = toFiniteNumber(value);
  if (numeric === null || numeric < 0) return EMPTY_MARKER;
  return formatPkr(numeric);
}

/**
 * Render a compact fee for the existing stat tiles.
 * Reproduces `PKR 1.08M` and `PKR 12.5k` via the single documented rule.
 */
export function formatFeeCompact(value) {
  const numeric = toFiniteNumber(value);
  if (numeric === null || numeric < 0) return EMPTY_MARKER;
  return formatPkrCompact(numeric);
}

/**
 * The compact strings that already exist in the approved UI, with their exact
 * locked casing. A binding that must reproduce a locked string byte-for-byte
 * should take it from here rather than re-derive it.
 *
 * @returns {{ locked: string, derived: string, matches: boolean } | null}
 */
export function approvedCompactStrings(value) {
  const derived = formatFeeCompact(value);
  if (derived === EMPTY_MARKER) return null;
  const locked = COMPACT_LOCKED_STRINGS[derived];
  return Object.freeze({
    locked: locked ?? derived,
    derived,
    // True only when the locked UI already agrees with the derived rule.
    matches: locked === undefined ? true : locked === derived,
  });
}

const COMPACT_LOCKED_STRINGS = Object.freeze({
  'PKR 1.08M': 'PKR 1.08M',
  'PKR 1.46M': 'PKR 1.46M',
  'PKR 12.5k': 'PKR 12.5k',
  // The single documented divergence: locked uppercase K, derived lowercase k.
  'PKR 296k': 'PKR 296K',
});

/**
 * Render the existing `Bank · 294012` / `Cash · RC-141` reference cell.
 * The separator is the locked ` · ` join used throughout the references.
 */
export function formatPaymentReference(mode, reference) {
  const modeText = isApprovedPaymentMode(mode) ? mode.trim() : null;
  const refText = typeof reference === 'string' && reference.trim() !== '' ? reference.trim() : null;
  if (modeText === null && refText === null) return EMPTY_MARKER;
  return [modeText, refText].filter((part) => part !== null).join(' · ');
}

/**
 * Render the existing `Cash · Bank · Wallet · Cheque` source note.
 * The order is locked by the reference string, not by PAYMENT_MODES ordering logic.
 */
export function formatPaymentSourcesNote() {
  return PAYMENT_MODES.join(' · ');
}

/** Render a grouped integer for the existing `47 invoices pending` style slot. */
export function formatCount(value) {
  const numeric = toFiniteNumber(value);
  if (numeric === null || numeric < 0) return EMPTY_MARKER;
  return formatNumber(numeric);
}

/** Render a field value safely into an approved text node. */
export function feeText(value) {
  if (typeof value !== 'string') return EMPTY_MARKER;
  return safeText(value, { empty: EMPTY_MARKER });
}

/**
 * Drift guard: the four approved modes, the locked separator, and the approved
 * strings must still be present in the School Dashboard reference.
 *
 * @param {string} schoolDashboardSource
 */
export function assertFeeContractMatchesReferences(schoolDashboardSource) {
  if (typeof schoolDashboardSource !== 'string' || schoolDashboardSource === '') {
    throw new Error('no School Dashboard reference supplied');
  }
  const problems = [];

  for (const mode of PAYMENT_MODES) {
    if (!schoolDashboardSource.includes(mode)) {
      problems.push(`payment mode "${mode}" is not in the reference`);
    }
  }
  if (!schoolDashboardSource.includes('PAYMENT SOURCES')) {
    problems.push('the PAYMENT SOURCES tile changed');
  }
  for (const locked of ['PKR 1.08M', 'PKR 296K', 'PKR 12,500']) {
    if (!schoolDashboardSource.includes(locked)) {
      problems.push(`locked money string "${locked}" is not in the reference`);
    }
  }
  if (!schoolDashboardSource.includes('Online gateway V1 mein nahin')) {
    problems.push('the reference no longer states that online payment is out of V1');
  }
  for (const option of QUICK_RECEIPT_SELECT_MODES) {
    if (!schoolDashboardSource.includes(`<option>${option}</option>`)) {
      problems.push(`quick-receipt option "${option}" is not in the reference`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`fee contract drifted from the reference:\n  ${problems.join('\n  ')}`);
  }
  return true;
}