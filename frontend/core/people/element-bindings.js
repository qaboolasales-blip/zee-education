/**
 * Approved-element binding contracts for people screens. Task: E-O-03.
 *
 * "Bind existing list/detail areas without layout change."
 *
 * Nothing can be bound yet (no endpoint, no schema). What this module provides is
 * the binding contract for every people-related element that already exists in
 * the locked references, with the exact hook kind, the exact attribute a future
 * write would target, and whether a published field exists behind it.
 *
 * Two structural rules are enforced:
 *   - `assertNoElementCreation()` — no descriptor may authorise creating UI.
 *   - `assertBindingsMatchReferences()` — every CSS hook and screen a binding
 *     depends on must still exist in the locked reference.
 *
 * No DOM, no rendering, no CSS.
 */

import { Surface } from '../auth/screen-registry.js';

/** How a value may reach an approved element. */
export const HookKind = Object.freeze({
  TEXT_NODE: 'existing-text-node',
  ATTRIBUTE: 'existing-attribute',
  ROW_TEMPLATE: 'existing-row-template',
  SELECT_OPTION: 'existing-option-value',
  BLOCKED: 'blocked-no-approved-hook',
});

/** @type {ReadonlyArray<Readonly<object>>} */
export const PEOPLE_BINDINGS = Object.freeze([
  // --- School Dashboard: Students ------------------------------------------
  Object.freeze({
    id: 'PB-01',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Students',
    element: '`.pe` person cell — `.pe i` initials + `.pe b` name + `.pe small` subtitle',
    cssHook: '.pe{display:flex;gap:10px;align-items:center}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note:
      'No students table. The `.pe i` cell is a TEXT INITIAL derived from the name, not a photo — ' +
      'so no photo binding is possible here (PEB-02).',
  }),
  Object.freeze({
    id: 'PB-02',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Students',
    element: '`ID` column (e.g. ST-2026-041)',
    cssHook: 'td{padding:14px 16px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'No student reference column is published.',
  }),
  Object.freeze({
    id: 'PB-03',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Students',
    element: '`Class` column (e.g. Grade 6 · A)',
    cssHook: 'td{padding:14px 16px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Requires class + section tables (DB-15). Neither exists.',
  }),
  Object.freeze({
    id: 'PB-04',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Students',
    element: '`Guardian` column (e.g. Imran Khan)',
    cssHook: 'td{padding:14px 16px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Requires the guardian profile and the student_guardians linkage. Neither exists.',
  }),
  Object.freeze({
    id: 'PB-05',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Students',
    element: '`Status` badge `.bd.g` / `.bd.w` / `.bd.r` / `.bd.n`',
    cssHook: '.bd{display:inline-block;padding:5px 10px;border-radius:99px}',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note:
      'Only these four badge classes exist. No enrollment status enum is published, so no mapping ' +
      'can be written; an unknown state must reuse `.bd.n`.',
  }),
  Object.freeze({
    id: 'PB-06',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Students',
    element: 'Row action `.lk` `View`',
    cssHook: '.lk{border:0;background:none;color:var(--brand);font-weight:700}',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note:
      'The action only raises a toast. There is NO student detail screen in any reference, so a ' +
      'detail view would be a NEW screen (PEB-01).',
  }),
  Object.freeze({
    id: 'PB-07',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Students',
    element: 'Toolbar search input (`Search by student, ID or guardian`)',
    cssHook: '.tool .search{max-width:none}',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note: 'No list/search contract. Client-side filtering would fetch the whole roll into the browser.',
  }),
  Object.freeze({
    id: 'PB-08',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Students',
    element: '`All classes` select',
    cssHook: '.tool{',
    kind: HookKind.SELECT_OPTION,
    field: null,
    state: 'unpublished',
    note:
      'The select itself is styled by the reference-wide `select,.in` rule and sized inline. ' +
      'Must remain the only option while no class table exists — adding <option> nodes would be a ' +
      'visible change (PEB-04).',
  }),
  Object.freeze({
    id: 'PB-09',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Students',
    element: '`＋ Add student` button',
    cssHook: '.btn.p{background:linear-gradient(110deg,var(--brand),var(--brand2))}',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note: 'No create endpoint, and no approved add-student form layout (PEB-05).',
  }),

  // --- School Dashboard: Staff & HR ---------------------------------------
  Object.freeze({
    id: 'PB-10',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Staff & HR',
    element: '`.pe` staff person cell (`Ms. Sara Ahmed` / `EMP-2026`)',
    cssHook: '.pe{display:flex;gap:10px;align-items:center}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'No staff table.',
  }),
  Object.freeze({
    id: 'PB-11',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Staff & HR',
    element: '`Contact` column (e.g. 0300 1234567)',
    cssHook: 'td{padding:14px 16px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note:
      'The ONLY approved phone surface in any reference. No student or guardian contact surface ' +
      'exists (PEB-02).',
  }),
  Object.freeze({
    id: 'PB-12',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Staff & HR',
    element: '`Today` status badge (`Present` / `On leave`)',
    cssHook: '.bd{display:inline-block;padding:5px 10px;border-radius:99px}',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note: 'Requires daily staff attendance. No schema.',
  }),
  Object.freeze({
    id: 'PB-13',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Staff & HR',
    element: '`＋ Add staff` button',
    cssHook: '.btn.p{background:linear-gradient(110deg,var(--brand),var(--brand2))}',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note: 'No create endpoint and no approved form layout (PEB-05).',
  }),

  // --- Mobile Preview: students / admissions / staff features ---------------
  Object.freeze({
    id: 'PB-14',
    surface: Surface.MOBILE_APP,
    screen: 'students',
    element: '`.list .row` — name + class + status `.pill.g`',
    cssHook: '.row{display:flex;justify-content:space-between}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'School Admin only, per the reference TL map. No students endpoint.',
  }),
  Object.freeze({
    id: 'PB-15',
    surface: Surface.MOBILE_APP,
    screen: 'admissions',
    element: '`.list .row` applications + `Review` action',
    cssHook: '.row{display:flex;justify-content:space-between}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'School Admin only. Admissions is a later module phase per PROJECT_MEMORY.',
  }),
  Object.freeze({
    id: 'PB-16',
    surface: Surface.MOBILE_APP,
    screen: 'staff',
    element: '`.list .row` staff + presence pill',
    cssHook: '.row{display:flex;justify-content:space-between}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'School Admin only. No staff endpoint.',
  }),
  Object.freeze({
    id: 'PB-17',
    surface: Surface.MOBILE_APP,
    screen: 'Profile',
    element: '`Account` card — display name + role + school',
    cssHook: '.card label{text-transform:uppercase}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Requires the identity endpoint (Batch B block BLK-04).',
  }),
]);

export function peopleBindingById(id) {
  return PEOPLE_BINDINGS.find((binding) => binding.id === id) ?? null;
}

export function peopleBindingsForSurface(surface) {
  return Object.freeze(PEOPLE_BINDINGS.filter((binding) => binding.surface === surface));
}

export function blockedPeopleBindings() {
  return Object.freeze(PEOPLE_BINDINGS.filter((binding) => binding.kind === HookKind.BLOCKED));
}

export function assertNoPeopleElementCreation() {
  for (const binding of PEOPLE_BINDINGS) {
    for (const forbidden of ['createsElement', 'appendChild', 'innerHTML', 'insertRow']) {
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
 * @param {Record<string, string>} referenceSources surface -> file text
 */
export function assertPeopleBindingsMatchReferences(referenceSources) {
  const problems = [];
  for (const binding of PEOPLE_BINDINGS) {
    const source = referenceSources[binding.surface];
    if (typeof source !== 'string' || source === '') {
      problems.push(`no reference source supplied for surface "${binding.surface}"`);
      continue;
    }
    const selector = binding.cssHook.split('{')[0].trim();
    if (selector !== '' && !source.includes(selector)) {
      problems.push(`${binding.id}: css hook "${selector}" no longer exists`);
    }
    const screenToken = `'${binding.screen}'`;
    if (!source.includes(screenToken) && !source.includes(binding.screen)) {
      problems.push(`${binding.id}: screen "${binding.screen}" no longer exists`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`people binding contract drifted from the references:\n  ${problems.join('\n  ')}`);
  }
  return true;
}