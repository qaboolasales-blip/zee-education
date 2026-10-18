/**
 * Report / export binding contract. Tasks: J-O-01, J-O-02, J-O-03.
 *
 * "Bind existing export/print controls to real authorized endpoints only."
 *
 * Every descriptor names an element that already exists. Enforced structurally by
 * `assertNoReportElementCreation()` and `assertReportBindingsMatchReferences()`.
 *
 * Every one is `state: 'unpublished'` with `field: null`: not one export endpoint
 * exists, so not one binding may claim a payload.
 */

import { HookKind } from '../fees/element-bindings.js';
import { Surface } from '../auth/screen-registry.js';

export { HookKind };

/** @type {ReadonlyArray<Readonly<object>>} */
export const REPORT_BINDINGS = Object.freeze([
  // --- School Dashboard: Reports & Print -----------------------------------
  Object.freeze({
    id: 'JRB-01',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Reports & Print',
    element: '`Export Excel / CSV` header action',
    cssHook: '.btn{padding:9px 14px;',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note:
      'The reference behaviour is `notice(\'Export preview\')`. No export endpoint, and no row-level ' +
      'permission contract — J-O-01 blocked.',
  }),
  Object.freeze({
    id: 'JRB-02',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Reports & Print',
    element: '`Print / PDF` header action (secondary variant)',
    cssHook: '.btn.p{color:#fff;',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note: 'Print/PDF has no render endpoint either — shares the GCB-06 PDF blocker.',
  }),
  Object.freeze({
    id: 'JRB-03',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Reports & Print',
    element: '`ATTENDANCE REPORT` `.sm` tile — `91.7%` / `Daily -> weekly -> monthly`',
    cssHook: '.sm{padding:20px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Requires the attendance contract (Batch F blocker).',
  }),
  Object.freeze({
    id: 'JRB-04',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Reports & Print',
    element: '`RESULT STATUS` `.sm` tile — `3` / `Awaiting publication`',
    cssHook: '.sm{padding:20px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Ties to the Batch H publication gate: unpublished results must not be exportable.',
  }),
  Object.freeze({
    id: 'JRB-05',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Reports & Print',
    element: '`EXPORTS` `.sm` tile — `PDF / XLS` / `Permission controlled`',
    cssHook: '.sm{padding:20px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'The tile itself is the permission statement. The contract behind it does not exist.',
  }),
  Object.freeze({
    id: 'JRB-06',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Reports & Print',
    element: '`Free built-in templates` `.tp` grid — 4 x `.card.tpl`',
    cssHook: '.tpl{padding:16px}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'The four names are fixed by the reference. Only the `Preview` link is interactive.',
  }),
  Object.freeze({
    id: 'JRB-07',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Reports & Print',
    element: '`.pv` preview surface inside each template card',
    cssHook: '.pv{height:110px;',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note:
      'Rendered by the reference as CSS art, not an image. No module may generate it — see ' +
      'assertNoPrintDesigner().',
  }),
  Object.freeze({
    id: 'JRB-08',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Reports & Print',
    element: '`CUSTOM SCHOOL DESIGN` `.sm` tile',
    cssHook: '.sm{padding:20px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Read-only commercial statement. Approval is a Super Admin action with no endpoint.',
  }),

  // --- Mobile ---------------------------------------------------------------
  Object.freeze({
    id: 'JRB-09',
    surface: Surface.MOBILE_APP,
    screen: 'Reports & print',
    element: 'reports tool — hero `OCTOBER ATTENDANCE` / `91.7%` / `Target 90%`',
    cssHook: '.hero{',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Teacher and School Admin only — transcribed from the reference tool lists.',
  }),
  Object.freeze({
    id: 'JRB-10',
    surface: Surface.MOBILE_APP,
    screen: 'Reports & print',
    element: 'reports tool rows — `Attendance report`, `Result cards`, `Fee report`',
    cssHook: '.row{',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: '`Result cards` is marked `Approved only` — the publication gate applies here too.',
  }),
  Object.freeze({
    id: 'JRB-11',
    surface: Surface.MOBILE_APP,
    screen: 'Reports & print',
    element: 'reports tool `Create export` action',
    cssHook: '.btn{',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note: 'Footer note: `Exports role permission enforce karein`.',
  }),
  Object.freeze({
    id: 'JRB-12',
    surface: Surface.MOBILE_APP,
    screen: 'Documents & cards',
    element: 'documents tool — `SCHOOL DOCUMENTS` / `4 formats` / `Available when authorised`',
    cssHook: '.hero{',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Parent, Student and School Admin only — Teacher has no documents tool.',
  }),
  Object.freeze({
    id: 'JRB-13',
    surface: Surface.MOBILE_APP,
    screen: 'Documents & cards',
    element: 'documents tool rows — `Student ID card`, `Result card`, `Admission form`',
    cssHook: '.row{',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: '`Result card` is `Published results only` — the Batch H gate, restated by the reference.',
  }),

  // --- Super Admin ----------------------------------------------------------
  Object.freeze({
    id: 'JRB-14',
    surface: Surface.PLATFORM,
    screen: 'Print Templates',
    element: '`Custom template` header action',
    cssHook: '.btn{',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note: 'The reference previews a template editor. Building one is exactly what J-O-02 forbids.',
  }),
  Object.freeze({
    id: 'JRB-15',
    surface: Surface.PLATFORM,
    screen: 'Print Templates',
    element: '`Custom template rules` rows — `Design fee` / `Future reprints`',
    cssHook: '.ar{',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: '`Charge once` (`.bd.w`) and `Included` (`.bd.g`) are the locked commercial rules.',
  }),
  Object.freeze({
    id: 'JRB-16',
    surface: Surface.PLATFORM,
    screen: 'Billing & Renewals',
    element: '`Billing export` header action',
    cssHook: '.btn{',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note: 'Commercial export is the most sensitive export in the product; no contract exists.',
  }),
  Object.freeze({
    id: 'JRB-17',
    surface: Surface.PLATFORM,
    screen: 'Billing & Renewals',
    element: '`School rate book` rows — plan + amount',
    cssHook: '.pn{',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'Sample values, explicitly `authorized commercial workflow se edit hon`.',
  }),
]);

export function reportBindingById(id) {
  return REPORT_BINDINGS.find((binding) => binding.id === id) ?? null;
}

export function blockedReportBindings() {
  return Object.freeze(REPORT_BINDINGS.filter((binding) => binding.kind === HookKind.BLOCKED));
}

export function assertNoReportElementCreation() {
  for (const binding of REPORT_BINDINGS) {
    for (const forbidden of ['createsElement', 'appendChild', 'innerHTML', 'insertRow', 'newModal']) {
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

export function assertReportBindingsMatchReferences(referenceSources) {
  const problems = [];
  for (const binding of REPORT_BINDINGS) {
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
    throw new Error(`report binding contract drifted from the references:\n  ${problems.join('\n  ')}`);
  }
  return true;
}
