/**
 * Fee / receipt tests. Tasks: I-O-01 … I-O-05.
 * Synthetic invoices only. No network. No rendering.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { Surface } from '../core/auth/index.js';
import { Role } from '../core/auth/role-guard.js';
import {
  FEE_BINDINGS,
  FEE_INTEGRATION_AUTHORIZED,
  FeeReject,
  InvoiceStatus,
  LedgerReject,
  PAYMENT_MODES,
  PENDING_FEE_CONTRACTS,
  PaymentMode,
  PaymentReject,
  QUICK_RECEIPT_SELECT_MODES,
  STATUS_BADGE,
  WRITABLE_PAYMENT_MODES,
  approvedCompactStrings,
  assertFeeBindingsMatchReferences,
  assertFeeContractMatchesReferences,
  assertNoFeeElementCreation,
  assertNoGatewayCopyInReferences,
  assertNoInventedFeeSchemas,
  assertNoNetworkCalls,
  assertNoPaymentGateway,
  badgeFor,
  blockedFeeBindings,
  classifyFeeDue,
  describeFeeBlock,
  emptyFeeState,
  feeBindingById,
  feeStateForRole,
  feeText,
  feeVisibility,
  findPendingFeeContract,
  formatCount,
  formatFee,
  formatFeeCompact,
  formatPaymentReference,
  formatPaymentSourcesNote,
  inspectPaymentPayload,
  isApprovedPaymentMode,
  normaliseInvoice,
  recordManualPayment,
  stripCommentsAndLiterals,
  summariseFees,
  validateFeeAmount,
  validateManualPayment,
  validateManualPaymentRequest,
} from '../core/fees/index.js';
import { listSourceFiles, readCode } from './helpers/source-scan.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REF_DIR = resolve(REPO_ROOT, 'zee_education_multi_agent_handoff', 'agents', 'opencode', 'reference_ui');
const CORE_DIR = resolve(REPO_ROOT, 'frontend', 'core');

function readReference(fragment) {
  const matches = readdirSync(REF_DIR).filter((name) => name.includes(fragment));
  assert.equal(matches.length, 1, `exactly one reference containing "${fragment}"`);
  return readFileSync(resolve(REF_DIR, matches[0]), 'utf8');
}

const REFERENCES = Object.freeze({
  'school-desktop': readReference('School Dashboard'),
  'mobile-app': readReference('Mobile App Preview'),
  [Surface.PLATFORM]: readReference('Super Admin'),
});

const PAID = { invoiceRef: 'INV-1024', amount: 12500, referenceMode: 'Bank', reference: '294012', status: 'paid' };
const DUE = { invoiceRef: 'INV-1026', amount: 11000, referenceMode: null, reference: null, status: 'due' };

describe('I-O-02 — money formatting reuses the locked strings', () => {
  it('passes the reference drift guard', () => {
    assert.equal(assertFeeContractMatchesReferences(REFERENCES['school-desktop']), true);
  });

  it('knows exactly four payment modes, matching the sources tile', () => {
    assert.deepEqual([...PAYMENT_MODES], ['Cash', 'Bank', 'Wallet', 'Cheque']);
    assert.equal(formatPaymentSourcesNote(), 'Cash · Bank · Wallet · Cheque');
  });

  it('records that the quick-receipt select has only two options', () => {
    assert.deepEqual([...QUICK_RECEIPT_SELECT_MODES], ['Cash', 'Bank']);
    for (const option of QUICK_RECEIPT_SELECT_MODES) {
      assert.ok(REFERENCES['school-desktop'].includes(`<option>${option}</option>`), option);
    }
  });

  it('separates writable modes from displayed modes', () => {
    assert.deepEqual([...WRITABLE_PAYMENT_MODES], [...QUICK_RECEIPT_SELECT_MODES]);
    for (const mode of WRITABLE_PAYMENT_MODES) assert.ok(isApprovedPaymentMode(mode), mode);
    assert.equal(isApprovedPaymentMode('Wallet'), true);
    assert.equal(isApprovedPaymentMode('Cheque'), true);
  });

  it('reproduces the locked grouped amounts', () => {
    assert.equal(formatFee(12500), 'PKR 12,500');
    assert.equal(formatFee(9800), 'PKR 9,800');
    assert.equal(formatFee(11000), 'PKR 11,000');
    assert.equal(formatFee(65000), 'PKR 65,000');
  });

  it('reproduces the locked compact amounts', () => {
    assert.equal(formatFeeCompact(1080000), 'PKR 1.08M');
    assert.equal(formatFeeCompact(12500), 'PKR 12.5k');
  });

  it('exposes the locked uppercase-K divergence instead of reconciling it', () => {
    // The locked tile reads 'PKR 296K' while the derived rule yields 'PKR 296k'.
    const record = approvedCompactStrings(296000);
    assert.equal(record.derived, 'PKR 296k');
    assert.equal(record.locked, 'PKR 296K');
    assert.equal(record.matches, false);
    assert.equal(approvedCompactStrings(1080000).matches, true);
    assert.equal(approvedCompactStrings(12500).matches, true);
    assert.equal(approvedCompactStrings(null), null);
  });

  it('renders the existing `Bank · 294012` reference and the `—` empty case', () => {
    assert.equal(formatPaymentReference('Bank', '294012'), 'Bank · 294012');
    assert.equal(formatPaymentReference('Cash', 'RC-141'), 'Cash · RC-141');
    assert.equal(formatPaymentReference(null, null), '—');
    assert.equal(formatFee(null), '—');
    assert.equal(formatCount(47), '47');
  });

  it('never renders an empty cell and never coerces a non-string', () => {
    for (const value of [null, undefined, '', '   ', 42, {}, []]) {
      assert.equal(feeText(value), '—', String(value));
    }
  });
});

describe('I-O-01 — invoice validation is arithmetic only', () => {
  it('accepts the approved amounts, including zero', () => {
    assert.equal(validateFeeAmount(0).valid, true);
    assert.equal(validateFeeAmount('12500').valid, true);
    assert.equal(validateFeeAmount(12500).value, 12500);
  });

  it('rejects a negative or unusable amount', () => {
    assert.equal(validateFeeAmount(-1).reason, FeeReject.NEGATIVE);
    for (const value of ['', 'abc', null, undefined, NaN, Infinity, {}]) {
      assert.equal(validateFeeAmount(value).reason, FeeReject.NOT_A_NUMBER, String(value));
    }
  });

  it('maps only the two approved statuses, reusing the existing badge classes', () => {
    assert.deepEqual({ ...STATUS_BADGE[InvoiceStatus.PAID] }, { className: 'g', label: 'Paid' });
    assert.deepEqual({ ...STATUS_BADGE[InvoiceStatus.DUE] }, { className: 'w', label: 'Due' });
    assert.equal(Object.keys(STATUS_BADGE).length, 2);
    assert.equal(badgeFor(InvoiceStatus.PAID).known, true);
    assert.equal(badgeFor(InvoiceStatus.DUE).label, 'Due');
    assert.deepEqual({ ...badgeFor('partial') }, { className: 'n', label: null, known: false });
    assert.deepEqual({ ...badgeFor('Paid') }, { className: 'n', label: null, known: false });
  });

  it('refuses an invoice with an unknown status instead of defaulting to due', () => {
    assert.equal(normaliseInvoice({ amount: 100, status: 'partial' }).reason, LedgerReject.UNKNOWN_STATUS);
    assert.equal(normaliseInvoice({ amount: 100 }).reason, LedgerReject.UNKNOWN_STATUS);
  });

  it('normalises a row into the existing approved shapes', () => {
    const row = normaliseInvoice(PAID);
    assert.equal(row.valid, true);
    assert.equal(row.amountText, 'PKR 12,500');
    assert.equal(row.badgeClass, 'g');
    assert.equal(row.badgeLabel, 'Paid');
  });

  it('rejects a malformed invoice rather than fabricating PKR 0', () => {
    for (const input of [null, 'x', 42, [], { amount: 'abc', status: 'paid' }, { amount: -5, status: 'due' }]) {
      assert.equal(normaliseInvoice(input).valid, false, JSON.stringify(input));
    }
  });
});

describe('I-O-01 — role scope for fees', () => {
  it('permits School Admin', () => {
    assert.equal(feeVisibility(Role.SCHOOL_ADMIN).permitted, true);
  });

  it('permits a Parent only with server-resolved linkage', () => {
    assert.equal(feeVisibility(Role.PARENT).permitted, false);
    assert.equal(feeVisibility(Role.PARENT, { linkedIds: ['S-1'] }).permitted, true);
    assert.equal(feeVisibility(Role.PARENT, { linkedIds: [] }).permitted, false);
  });

  it('denies Teacher and Student, matching the reference tool lists', () => {
    for (const role of [Role.TEACHER, Role.STUDENT, Role.SUPER_ADMIN]) {
      assert.equal(feeVisibility(role).permitted, false, role);
    }
    const mobile = REFERENCES['mobile-app'];
    assert.doesNotMatch(mobile, /Teacher:\[[^\]]*'fees'/);
    assert.doesNotMatch(mobile, /Student:\[[^\]]*'fees'/);
  });

  it('denies every unknown role', () => {
    for (const role of ['Admin', 'parent', '', null, 42]) {
      assert.equal(feeVisibility(role).permitted, false, String(role));
    }
  });
});

describe('I-O-04 — partial / overdue / no-fee mapping', () => {
  it('summarises the three existing tiles', () => {
    const summary = summariseFees([PAID, DUE], Role.SCHOOL_ADMIN);
    assert.equal(summary.invoices, 2);
    assert.equal(summary.paidCount, 1);
    assert.equal(summary.dueCount, 1);
    assert.equal(summary.collectedText, 'PKR 12.5k');
    assert.equal(summary.outstandingText, 'PKR 11k');
    assert.equal(summary.sourcesCountText, '1');
  });

  it('reports an invalid record instead of silently shrinking the totals', () => {
    const summary = summariseFees([PAID, DUE, { amount: 'abc', status: 'due' }], Role.SCHOOL_ADMIN);
    assert.equal(summary.invoices, 2);
    assert.equal(summary.invalidCount, 1);
  });

  it('marks a partially invalid ledger as partial', () => {
    assert.equal(feeStateForRole([PAID, DUE], Role.SCHOOL_ADMIN).reason, null);
    assert.equal(feeStateForRole([PAID, { amount: 'x', status: 'due' }], Role.SCHOOL_ADMIN).reason, 'partial');
  });

  it('reports the no-fee case as a real state', () => {
    assert.deepEqual({ ...emptyFeeState() }, {
      present: false,
      reason: 'no-fee',
      invoices: 0,
      collected: 0,
      outstanding: 0,
      nextDue: null,
      dueInText: null,
    });
    assert.equal(feeStateForRole([], Role.SCHOOL_ADMIN).reason, 'no-fee');
    assert.equal(feeStateForRole(null, Role.SCHOOL_ADMIN).present, false);
  });

  it('withholds rather than zeroing for an unpermitted role', () => {
    const state = feeStateForRole([PAID, DUE], Role.TEACHER);
    assert.equal(state.present, false);
    assert.equal(state.reason, LedgerReject.ROLE_NOT_PERMITTED);
    const summary = summariseFees([PAID, DUE], Role.SUPER_ADMIN);
    assert.equal(summary.permitted, false);
    assert.equal(summary.collected, null);
    assert.equal(summary.collectedText, null);
  });

  it('classifies a due date without guessing', () => {
    const now = '2026-10-16T12:00:00Z';
    assert.equal(classifyFeeDue({ ...DUE, dueAt: '2026-10-25T06:00:00Z' }, { now }).state, 'due');
    assert.equal(classifyFeeDue({ ...DUE, dueAt: '2026-10-10T06:00:00Z' }, { now }).state, 'overdue');
    assert.equal(classifyFeeDue(PAID, { now }).state, 'settled');
    assert.equal(classifyFeeDue({ ...DUE, dueAt: null }, { now }).known, false);
    assert.equal(classifyFeeDue({ status: 'nope', dueAt: '2026-10-25T06:00:00Z' }, { now }).known, false);
  });
});

describe('I-O-01 — manual payment is auditable by construction', () => {
  it('records a valid manual payment and settles the invoice', () => {
    const result = recordManualPayment(DUE, { amount: 11000, mode: 'Bank', reference: 'RC-9' }, Role.SCHOOL_ADMIN);
    assert.equal(result.allowed, true);
    assert.equal(result.invoice.status, InvoiceStatus.PAID);
    assert.equal(result.invoice.badgeClass, 'g');
    assert.equal(result.invoice.referenceMode, 'Bank');
    assert.equal(/^\d{4}-\d{2}-\d{2}$/.test(result.invoice.paidAt), true, result.invoice.paidAt);
    assert.equal(Object.isFrozen(result.invoice), true);
  });

  it('allows only School Admin to record a payment', () => {
    for (const role of [Role.TEACHER, Role.PARENT, Role.STUDENT, Role.SUPER_ADMIN, 'Admin', null]) {
      const result = recordManualPayment(DUE, { amount: 11000, mode: 'Cash', reference: 'RC-1' }, role);
      assert.equal(result.allowed, false, String(role));
      assert.equal(result.reason, LedgerReject.ROLE_NOT_PERMITTED, String(role));
    }
  });

  it('refuses a second payment against a settled invoice', () => {
    const result = recordManualPayment(PAID, { amount: 12500, mode: 'Cash', reference: 'RC-2' }, Role.SCHOOL_ADMIN);
    assert.equal(result.reason, LedgerReject.ALREADY_PAID);
  });

  it('refuses an overpayment, which would be unrecoverable', () => {
    const result = recordManualPayment(DUE, { amount: 11001, mode: 'Cash', reference: 'RC-3' }, Role.SCHOOL_ADMIN);
    assert.equal(result.reason, LedgerReject.OVERPAYMENT);
  });

  it('refuses to settle an invoice with a part payment (IB-07)', () => {
    const result = recordManualPayment(DUE, { amount: 5000, mode: 'Cash', reference: 'RC-4' }, Role.SCHOOL_ADMIN);
    assert.equal(result.allowed, false);
    assert.equal(result.reason, LedgerReject.PARTIAL_NOT_SETTLED);
    assert.equal(result.invoice.status, InvoiceStatus.DUE);
  });

  it('accepts an exact settlement, including a zero-amount invoice', () => {
    assert.equal(recordManualPayment(DUE, { amount: 11000, mode: 'Bank', reference: 'RC-5' }, Role.SCHOOL_ADMIN).allowed, true);
    const free = { invoiceRef: 'INV-0', amount: 0, referenceMode: null, reference: null, status: 'due' };
    assert.equal(recordManualPayment(free, { amount: 0, mode: 'Cash', reference: 'RC-6' }, Role.SCHOOL_ADMIN).allowed, true);
  });

  it('requires a receipt reference for every mode, cash included', () => {
    for (const mode of ['Cash', 'Bank']) {
      const result = recordManualPayment(DUE, { amount: 11000, mode }, Role.SCHOOL_ADMIN);
      assert.equal(result.reason, FeeReject.MODE_REQUIRES_REFERENCE, mode);
      assert.equal(validateManualPayment({ amount: 10, mode }).valid, false, mode);
    }
    for (const value of ['', '   ', null, undefined, 42]) {
      const result = recordManualPayment(DUE, { amount: 11000, mode: 'Cash', reference: value }, Role.SCHOOL_ADMIN);
      assert.equal(result.reason, FeeReject.MODE_REQUIRES_REFERENCE, String(value));
    }
  });

  it('rejects an over-long reference rather than truncating it', () => {
    const result = recordManualPayment(DUE, { amount: 11000, mode: 'Cash', reference: 'x'.repeat(192) }, Role.SCHOOL_ADMIN);
    assert.equal(result.reason, FeeReject.REFERENCE_TOO_LONG);
    assert.equal(validateManualPayment({ amount: 10, mode: 'Cash', reference: 'x'.repeat(191) }).valid, true);
  });

  it('refuses to write a mode the locked select cannot record (IB-03)', () => {
    for (const mode of ['Wallet', 'Cheque']) {
      const result = recordManualPayment(DUE, { amount: 11000, mode, reference: 'RC-7' }, Role.SCHOOL_ADMIN);
      assert.equal(result.allowed, false, mode);
      assert.equal(result.reason, FeeReject.NOT_WRITABLE_MODE, mode);
    }
    // ...but such a row may still be displayed once it exists.
    const row = normaliseInvoice({ ...DUE, referenceMode: 'Wallet', reference: 'W-1', status: 'paid' });
    assert.equal(row.valid, true);
    assert.equal(row.mode, 'Wallet');
  });

  it('rejects an unapproved mode', () => {
    for (const mode of ['crypto', 'Card', 'Bank Transfer', '', null]) {
      const result = recordManualPayment(DUE, { amount: 11000, mode, reference: 'RC-8' }, Role.SCHOOL_ADMIN);
      assert.equal(result.allowed, false, String(mode));
      assert.equal(result.reason, FeeReject.NOT_APPROVED_MODE, String(mode));
    }
    assert.equal(isApprovedPaymentMode('Cheque'), true);
  });

  it('leaves the invoice untouched on every refused payment', () => {
    const snapshot = JSON.stringify(DUE);
    recordManualPayment(DUE, { amount: 99999, mode: 'Bank', reference: 'x' }, Role.SCHOOL_ADMIN);
    recordManualPayment(DUE, { amount: 5000, mode: 'Cash', reference: 'x' }, Role.SCHOOL_ADMIN);
    recordManualPayment(DUE, { amount: 11000, mode: 'Cash' }, Role.SCHOOL_ADMIN);
    recordManualPayment(DUE, { amount: 11000, mode: 'Cash', reference: 'x' }, Role.TEACHER);
    assert.equal(JSON.stringify(DUE), snapshot);
  });
});

describe('I-O-05 — no payment gateway, checkout or card surface', () => {
  const files = listSourceFiles(CORE_DIR);
  const rel = (file) => file.replace(`${REPO_ROOT}\\`, '').replace(/\//g, '\\');

  it('scans the whole core tree and finds nothing', () => {
    const sources = files.map((file) => ({ path: rel(file), code: readCode(file) }));
    assert.equal(assertNoPaymentGateway(sources), true);
  });

  it('proves the denylist modules cannot smuggle a gateway past the exemption', () => {
    const denylist = { path: 'core\\fees\\payment-boundary.js', code: "post('https://api.stripe.com/v1')" };
    // The gateway *name* is exempt there (it must name what it forbids)...
    assert.equal(assertNoPaymentGateway([denylist]), true);
    // ...but the no-exemption guard still refuses an absolute URL in that file.
    assert.throws(() => assertNoNetworkCalls([denylist]), /absolute URL/);
  });

  it('applies the network guard to every module with no exemption', () => {
    const sources = files.map((file) => ({ path: rel(file), code: readCode(file) }));
    assert.equal(assertNoNetworkCalls(sources), true);
    assert.throws(() => assertNoNetworkCalls([{ path: 'a.js', code: "fetch('/x')" }]), /fetch/);
    assert.throws(() => assertNoNetworkCalls([{ path: 'a.js', code: 'new XMLHttpRequest()' }]), /XMLHttpRequest/);
    assert.throws(() => assertNoNetworkCalls([{ path: 'a.js', code: "import https from 'node:https'" }]), /import/);
    assert.throws(() => assertNoNetworkCalls([{ path: 'a.js', code: "post('https://pay.example/v1')" }]), /absolute URL/);
  });

  it('strips comments, strings and regexes so a rule can name what it denies', () => {
    assert.equal(stripCommentsAndLiterals("fetch('/x')"), 'fetch( )');
    assert.equal(stripCommentsAndLiterals('new XMLHttpRequest()'), 'new XMLHttpRequest()');
    assert.equal(stripCommentsAndLiterals('// fetch(x)\nconst y = 2;'), '\nconst y = 2;');
    assert.equal(stripCommentsAndLiterals('const s = "fetch(1)";'), 'const s =  ;');
    // Division must not be mistaken for a regex literal.
    assert.equal(stripCommentsAndLiterals('const b = a / 2;'), 'const b = a / 2;');
    assert.equal(stripCommentsAndLiterals('const r = /ab/; const d = 4 / 2;'), 'const r =  ; const d = 4 / 2;');
    // A forbidden identifier in a string must NOT trip the guard...
    assert.doesNotThrow(() => assertNoNetworkCalls([{ path: 'a.js', code: 'const s = "fetch(1)";' }]));
    // ...but calling it must.
    assert.throws(() => assertNoNetworkCalls([{ path: 'a.js', code: 'fetch("/x");' }]), /fetch/);
  });

  it('keeps the API client out of the fee layer', () => {
    for (const file of files) {
      if (rel(file).includes('api')) continue;
      const code = readCode(file);
      assert.doesNotMatch(code, /createApiClient/, rel(file));
    }
  });

  it('would fail on a gateway, card or checkout surface', () => {
    assert.throws(() => assertNoPaymentGateway([{ path: 'a.js', code: "const s='stripe';" }]));
    assert.throws(() => assertNoPaymentGateway([{ path: 'a.js', code: 'send({ cardNumber: 1 })' }]));
    assert.throws(() => assertNoPaymentGateway([{ path: 'a.js', code: 'const iban="PK00";' }]));
    assert.throws(() => assertNoPaymentGateway([{ path: 'a.js', code: "fetch('https://api.stripe.com/v1')" }]));
    assert.throws(() => assertNoPaymentGateway([{ path: 'a.js', code: "post('/checkout/session')" }]));
  });

  it('tolerates an empty or malformed source list', () => {
    assert.equal(assertNoPaymentGateway([]), true);
    assert.equal(assertNoPaymentGateway(null), true);
    assert.equal(assertNoPaymentGateway([{ path: 'a.js' }]), true);
  });

  it('refuses card, gateway, token and redirect fields in a payload', () => {
    const cases = [
      [{ cardNumber: '1' }, PaymentReject.CARD_DETECTED],
      [{ cvv: '1' }, PaymentReject.CARD_DETECTED],
      [{ iban: '1' }, PaymentReject.CARD_DETECTED],
      [{ checkoutToken: 'x' }, PaymentReject.TOKEN_DETECTED],
      [{ redirectUrl: 'x' }, PaymentReject.REDIRECT_DETECTED],
      [{ gateway: 'stripe' }, PaymentReject.GATEWAY_DETECTED],
    ];
    for (const [payload, reason] of cases) {
      const result = validateManualPaymentRequest({ ...payload, manual: true });
      assert.equal(result.allowed, false, JSON.stringify(payload));
      assert.equal(result.reason, reason, JSON.stringify(payload));
    }
  });

  it('requires the payment to declare itself manual', () => {
    for (const manual of [undefined, false, null, 'yes', 1]) {
      assert.equal(validateManualPaymentRequest({ manual, amount: 1, mode: 'Cash' }).reason, PaymentReject.NOT_MANUAL, String(manual));
    }
    assert.equal(validateManualPaymentRequest({ manual: true, amount: 1, mode: 'Cash' }).allowed, true);
  });

  it('inspects a clean payload as clean', () => {
    const inspection = inspectPaymentPayload({ amount: 1, mode: 'Cash', reference: 'RC-1' });
    assert.equal(inspection.clean, true);
    assert.deepEqual([...inspection.findings], []);
  });

  it('confirms the references still state the V1 exclusion', () => {
    assert.equal(assertNoGatewayCopyInReferences(REFERENCES), true);
    assert.throws(() => assertNoGatewayCopyInReferences({ ...REFERENCES, 'school-desktop': 'no copy here' }));
  });
});

describe('I-O-01/I-O-03 — binding contract', () => {
  it('passes the drift guard', () => {
    assert.equal(assertFeeBindingsMatchReferences(REFERENCES), true);
  });

  it('never authorises creating UI', () => {
    assert.equal(assertNoFeeElementCreation(), true);
    for (const binding of FEE_BINDINGS) {
      assert.notEqual(binding.kind, 'creates-element');
    }
  });

  it('marks every element unpublished and blocks the two payment actions', () => {
    for (const binding of FEE_BINDINGS) {
      assert.equal(binding.state, 'unpublished', binding.id);
      assert.equal(binding.field, null, binding.id);
    }
    assert.deepEqual(blockedFeeBindings().map((b) => b.id), ['IFB-13', 'IFB-14']);
  });

  it('pins the Overview fee accent rather than restyling it', () => {
    assert.match(feeBindingById('IFB-15').note, /#8b5cf6/);
  });

  it('records that a missing reference must use the existing empty marker', () => {
    assert.match(feeBindingById('IFB-07').note, /never an empty cell/);
  });
});

describe('no invented fee contract', () => {
  it('confirms nothing is authorized', () => {
    assert.equal(FEE_INTEGRATION_AUTHORIZED, false);
    assert.equal(describeFeeBlock().schemaPublished, false);
  });

  it('covers every Batch I capability', () => {
    assert.deepEqual(
      PENDING_FEE_CONTRACTS.map((c) => c.id).sort(),
      ['discounts-and-fines', 'fee-read', 'invoice-status-vocabulary', 'manual-payment', 'receipt-pdf'],
    );
  });

  it('declares no endpoint or payload and fails closed otherwise', () => {
    assert.equal(assertNoInventedFeeSchemas(), true);
    const base = {
      id: 'manual-payment',
      status: 'blocked-needs-provisioning-path',
      method: null,
      path: null,
      requestSchema: null,
      responseSchema: null,
      implemented: false,
    };
    assert.throws(() => assertNoInventedFeeSchemas([{ ...base, path: '/fees/pay' }]));
    assert.throws(() => assertNoInventedFeeSchemas([{ ...base, method: 'POST' }]));
    assert.throws(() => assertNoInventedFeeSchemas([{ ...base, implemented: true }]));
    assert.doesNotThrow(() => assertNoInventedFeeSchemas([base]));
  });

  it('records the discounts/fines scope gap', () => {
    const contract = findPendingFeeContract('discounts-and-fines');
    assert.match(contract.blocker, /ZERO matches/);
    assert.match(contract.unblockRequires, /approves a discount\/fine surface/);
  });
});