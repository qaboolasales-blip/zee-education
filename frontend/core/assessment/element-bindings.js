/**
 * Approved assessment / marks / results binding contract.
 * Tasks: H-O-01, H-O-02, H-O-03.
 *
 * "Bind teacher draft/review feedback using existing visual states only" and
 * "Bind published result views/charts without altering chart design."
 *
 * Every descriptor names an element that already exists and the exact attribute a
 * future write would target. Enforced structurally:
 *   - `assertNoAssessmentElementCreation()`
 *   - `assertAssessmentBindingsMatchReferences()` re-reads both references.
 *
 * No DOM, no rendering, no CSS.
 */

import { Surface } from '../auth/screen-registry.js';

export const HookKind = Object.freeze({
  TEXT_NODE: 'existing-text-node',
  ATTRIBUTE: 'existing-attribute',
  ROW_TEMPLATE: 'existing-row-template',
  BLOCKED: 'blocked-no-approved-hook',
});

/** @type {ReadonlyArray<Readonly<object>>} */
export const ASSESSMENT_BINDINGS = Object.freeze([
  // --- School Dashboard: Academics (teacher entry + review) ----------------
  Object.freeze({
    id: 'HAB-B01',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Academics',
    element: 'Assessment card title `Science Quiz · Grade 6-A` and `Term 1 · Max 20`',
    cssHook: '.t{font-size:15px;font-weight:700}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Requires assessment, term and class fields (DSB-04).',
  }),
  Object.freeze({
    id: 'HAB-B02',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Academics',
    element: '`Awaiting review` badge',
    cssHook: '.bd{display:inline-block;padding:5px 10px;border-radius:99px}',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note: 'The badge class is `.bd.w` and the text is a locked string. No other review label is approved.',
  }),
  Object.freeze({
    id: 'HAB-B03',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Academics',
    element: 'Score inputs `.in` (width 70px, height 34px) and the grade column',
    cssHook: '.fg .in{margin-top:5px}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note:
      'Teacher draft entry. No disabled/busy styling exists, so a submitting state must be ' +
      'signalled through `#toast` only (HAB-03).',
  }),
  Object.freeze({
    id: 'HAB-B04',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Academics',
    element: 'Publication flow `.flow` — three steps with `.d` / `.nw`',
    cssHook: '.flow{display:flex;gap:6px;margin-top:14px}',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note:
      'EXACTLY THREE steps exist and no fourth may be inserted. `.d` = done, `.nw` = current, ' +
      'plain = upcoming.',
  }),
  Object.freeze({
    id: 'HAB-B05',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Academics',
    element: '`Save draft` and `Send for review` buttons',
    cssHook: '.btn.p{border:0;color:#fff;',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note: 'No assessment endpoint. Feedback must reuse `#toast` only.',
  }),

  // --- School Dashboard: Overview ------------------------------------------
  Object.freeze({
    id: 'HAB-B06',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Overview',
    element: '`RESULT STATUS` `.sm` card — `<strong>` count and `<span>` note',
    cssHook: '.sm{padding:20px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Existing approved shape is `3` / `Awaiting publication`.',
  }),

  // --- Mobile Preview: results ---------------------------------------------
  Object.freeze({
    id: 'HAB-B07',
    surface: Surface.MOBILE_APP,
    screen: 'Results',
    element: '`.hello` `Mid-term · Grade 6-A` and `h3` title',
    cssHook: '.screen h3{font-size:24px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'The h3 title itself is role-dependent in the reference: Enter marks / Results review / Published results.',
  }),
  Object.freeze({
    id: 'HAB-B08',
    surface: Surface.MOBILE_APP,
    screen: 'Results',
    element: '`hero` label / `strong` / `small` per role',
    cssHook: '.hero{background:linear-gradient(135deg,var(--brand),var(--brand2))}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Draft shows `Awaiting admin review`; published shows `88% · A`. The grade letter has no published policy (HAB-01).',
  }),
  Object.freeze({
    id: 'HAB-B09',
    surface: Surface.MOBILE_APP,
    screen: 'Results',
    element: 'Per-subject `.row` bars — `.prog i` inline `width`',
    cssHook: '.prog i{display:block;height:100%;',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note:
      'THE CHART. The bar is a fixed 6px-tick `.prog` and `width` is its only variable. ' +
      'Clamped to 0–100 so a malformed mark cannot escape the bar (HAB-04). No chart library.',
  }),
  Object.freeze({
    id: 'HAB-B10',
    surface: Surface.MOBILE_APP,
    screen: 'marks',
    element: '`.list .row` lifecycle rows with `.pill.g/.w/.n`',
    cssHook: '.pill{font-size:11px;font-weight:700;padding:5px 10px}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note:
      'Rows are exactly: Teacher draft / Admin review / Published result, with notes ' +
      '`Validated`, `Before publication`, `Parents see approved only`. Three rows, no more.',
  }),
  Object.freeze({
    id: 'HAB-B11',
    surface: Surface.MOBILE_APP,
    screen: 'Results',
    element: 'Role action button — `Save draft for review` / `Approve & publish` / `Share result PDF`',
    cssHook: '.btn{width:100%;margin-top:10px;',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note: 'No assessment endpoint. The share action is additionally bounded by the Batch G share policy.',
  }),
]);

export function assessmentBindingById(id) {
  return ASSESSMENT_BINDINGS.find((binding) => binding.id === id) ?? null;
}

export function blockedAssessmentBindings() {
  return Object.freeze(ASSESSMENT_BINDINGS.filter((binding) => binding.kind === HookKind.BLOCKED));
}

export function assertNoAssessmentElementCreation() {
  for (const binding of ASSESSMENT_BINDINGS) {
    for (const forbidden of ['createsElement', 'appendChild', 'innerHTML', 'insertRow', 'newStep']) {
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
export function assertAssessmentBindingsMatchReferences(referenceSources) {
  const problems = [];
  for (const binding of ASSESSMENT_BINDINGS) {
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
    throw new Error(`assessment binding contract drifted from the references:\n  ${problems.join('\n  ')}`);
  }
  return true;
}