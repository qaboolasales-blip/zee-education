/**
 * Approved fee binding contract. Tasks: I-O-01, I-O-02, I-O-03.
 *
 * "Bind fee/receipt data only to existing approved UI components."
 *
 * Every descriptor names an element that already exists, the exact attribute a
 * future write would target, and whether a published field exists behind it.
 * Enforced structurally:
 *   - `assertNoFeeElementCreation()`
 *   - `assertFeeBindingsMatchReferences()`
 *
 * No DOM, no rendering, no CSS.
 */

import { Surface } from '../auth/screen-registry.js';

export const HookKind = Object.freeze({
  TEXT_NODE: 'existing-text-node',
  ATTRIBUTE: 'existing-attribute',
  ROW_TEMPLATE: 'existing-row-template',
  SELECT_OPTION: 'existing-option-value',
  BLOCKED: 'blocked-no-approved-hook',
});

/** @type {ReadonlyArray<Readonly<object>>} */
export const FEE_BINDINGS = Object.freeze([
  // --- School Dashboard: Fees & Accounts tiles ------------------------------
  Object.freeze({
    id: 'IFB-01',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Fees & Accounts',
    element: '`COLLECTED THIS MONTH` `.sm` card — `<strong>` and `<span>`',
    cssHook: '.sm{padding:20px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Approved shape: `PKR 1.08M` / `↑ 12.5% vs last month`. Green delta style already exists.',
  }),
  Object.freeze({
    id: 'IFB-02',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Fees & Accounts',
    element: '`OUTSTANDING DUES` `.sm` card',
    cssHook: '.sm{padding:20px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note:
      'Approved shape: `PKR 296K` / `47 invoices pending`. Note the uppercase-K divergence (IB-04).',
  }),
  Object.freeze({
    id: 'IFB-03',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Fees & Accounts',
    element: '`PAYMENT SOURCES` `.sm` card',
    cssHook: '.sm{padding:20px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Approved shape: `4` / `Cash · Bank · Wallet · Cheque`. A COUNT, not a list of amounts.',
  }),

  // --- School Dashboard: fee table -----------------------------------------
  Object.freeze({
    id: 'IFB-04',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Fees & Accounts',
    element: 'Table `Student` cell (`.pe` person cell)',
    cssHook: '.pe{display:flex;gap:10px;align-items:center}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'Requires the students table (Batch E block).',
  }),
  Object.freeze({
    id: 'IFB-05',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Fees & Accounts',
    element: 'Table `Invoice` column (`INV-1024`)',
    cssHook: 'td{padding:14px 16px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'No invoice model exists.',
  }),
  Object.freeze({
    id: 'IFB-06',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Fees & Accounts',
    element: 'Table `Amount` column (`PKR 12,500`)',
    cssHook: 'td{padding:14px 16px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Grouped, no decimals, via formatFee(). Never compact here.',
  }),
  Object.freeze({
    id: 'IFB-07',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Fees & Accounts',
    element: 'Table `Reference` column (`Bank · 294012`, `—`)',
    cssHook: 'td{padding:14px 16px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note:
      'The locked ` · ` join is reused verbatim. A missing reference must render the existing ' +
      '`—` marker, never an empty cell.',
  }),
  Object.freeze({
    id: 'IFB-08',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Fees & Accounts',
    element: 'Table `Status` badge (`.bd.g` Paid / `.bd.w` Due)',
    cssHook: '.bd{display:inline-block;padding:5px 10px;border-radius:99px}',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note:
      'Exactly two states are approved. An unknown state must reuse `.bd.n`. No third badge may be added.',
  }),

  // --- School Dashboard: Quick manual receipt -------------------------------
  Object.freeze({
    id: 'IFB-09',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Fees & Accounts',
    element: 'Quick-receipt `Student` `<select>`',
    cssHook: '.fg select{margin-top:5px}',
    kind: HookKind.SELECT_OPTION,
    field: null,
    state: 'unpublished',
    note: 'Options are existing `<option>` nodes only; population needs the students contract.',
  }),
  Object.freeze({
    id: 'IFB-10',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Fees & Accounts',
    element: 'Quick-receipt `Amount` input `value`',
    cssHook: '.fg .in{margin-top:5px}',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note: 'Grouped display; no currency formatting inside the input.',
  }),
  Object.freeze({
    id: 'IFB-11',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Fees & Accounts',
    element: 'Quick-receipt `Mode` `<select>` (Cash, Bank)',
    cssHook: '.fg select{margin-top:5px}',
    kind: HookKind.SELECT_OPTION,
    field: null,
    state: 'unpublished',
    note: 'TWO options exist. Wallet and Cheque are known sources but have no approved option (IB-03).',
  }),
  Object.freeze({
    id: 'IFB-12',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Fees & Accounts',
    element: 'Quick-receipt `Reference` input `placeholder="Receipt no."`',
    cssHook: '.fg .in{margin-top:5px}',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note: 'The placeholder is locked copy and must not change.',
  }),
  Object.freeze({
    id: 'IFB-13',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Fees & Accounts',
    element: '`Save payment & receipt` button',
    cssHook: '.btn.p{border:0;color:#fff;',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note:
      'No fee endpoint. Field validation has no inline error markup, so errors must reuse ' +
      '`#toast` (IB-05). No receipt modal exists (IB-06).',
  }),
  Object.freeze({
    id: 'IFB-14',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Fees & Accounts',
    element: '`＋ Record payment` header action',
    cssHook: '.btn{border:1px solid var(--line);background:var(--card);',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note: 'The reference behaviour is a preview toast. It targets the same Quick-receipt form.',
  }),

  // --- Overview stat --------------------------------------------------------
  Object.freeze({
    id: 'IFB-15',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Overview',
    element: '`Fees collected` stat tile with `--c:#8b5cf6`',
    cssHook: '.stat strong{display:block;font-size:26px',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note:
      'Approved shape: `PKR 1.08M` / `this month` / `12.5%`. The accent `#8b5cf6` is locked to this tile.',
  }),

  // --- Mobile ---------------------------------------------------------------
  Object.freeze({
    id: 'IFB-16',
    surface: Surface.MOBILE_APP,
    screen: 'fees',
    element: '`THIS MONTH` hero and `.list .row` invoices with `.pill.w` / `.pill.g`',
    cssHook: '.row{display:flex;justify-content:space-between}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'Parent and School Admin only. The locked note is `Manual source tracking`.',
  }),
  Object.freeze({
    id: 'IFB-17',
    surface: Surface.MOBILE_APP,
    screen: 'Profile',
    element: 'Parent home `Next fee due` card',
    cssHook: '.card label{font-size:10px;font-weight:700;',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Approved shape: `PKR 12,500` / `Due 25 Oct · manual payment`. The word "manual" is locked copy.',
  }),
  Object.freeze({
    id: 'IFB-18',
    surface: Surface.MOBILE_APP,
    screen: 'Profile',
    element: 'Parent KPI tile `Fee due` with `--k:#f59e0b`',
    cssHook: '.kpi b{display:block;font-size:18px',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Approved shape: `PKR 12.5k` — compact. Note the lowercase-k divergence (IB-04).',
  }),
]);

export function feeBindingById(id) {
  return FEE_BINDINGS.find((binding) => binding.id === id) ?? null;
}

export function blockedFeeBindings() {
  return Object.freeze(FEE_BINDINGS.filter((binding) => binding.kind === HookKind.BLOCKED));
}

export function assertNoFeeElementCreation() {
  for (const binding of FEE_BINDINGS) {
    for (const forbidden of ['createsElement', 'appendChild', 'innerHTML', 'insertRow', 'newModal', 'gateway']) {
      if (Object.prototype.hasOwnProperty.call(binding, forbidden)) {
        throw new Error(`binding ${binding.id} declares ${forbidden}`);
      }
    }
    if (!binding.cssHook || binding.cssHook.trim() === '') {
      throw new Error(`binding ${binding.id} has no CSS hook`);
    }
  }
  return true;
}

/**
 * Drift guard: each binding's CSS hook and screen must still exist in its
 * approved reference.
 *
 * @param {Record<string, string>} referenceSources
 */
export function assertFeeBindingsMatchReferences(referenceSources) {
  const problems = [];
  for (const binding of FEE_BINDINGS) {
    const source = referenceSources[binding.surface];
    if (typeof source !== 'string' || source === '') {
      problems.push(`no reference source supplied for surface "${binding.surface}"`);
      continue;
    }
    const selector = binding.cssHook.split('{')[0].trim();
    if (selector !== '' && !source.includes(selector)) {
      problems.push(`${binding.id}: css hook "${selector}" no longer exists`);
    }
    if (!source.includes(binding.screen)) {
      problems.push(`${binding.id}: screen "${binding.screen}" no longer exists`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`fee binding contract drifted from the references:\n  ${problems.join('\n  ')}`);
  }
  return true;
}