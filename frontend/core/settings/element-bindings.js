/**
 * Approved-element → field binding contracts. Task: D-O-02.
 *
 * "Bind settings/academic data only through existing approved elements."
 *
 * Since no settings or academic endpoint exists, nothing can be bound yet. What
 * this module provides is the *binding contract*: for every element that already
 * exists in the locked School Dashboard, the exact published field it would
 * receive, the exact attribute it would set, and whether that field exists at
 * all.
 *
 * Every descriptor here was read from the approved reference. A descriptor may
 * only reference:
 *   - `textContent` of a text node that already exists, or
 *   - an attribute / inline custom property the reference already styles.
 *
 * There is no entry with `createsElement: true`. `assertNoElementCreation()`
 * enforces that, and `assertBindingsMatchReference()` re-reads the reference to
 * confirm the CSS hook still exists.
 *
 * No DOM access, no rendering, no CSS.
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

/**
 * @typedef {Readonly<{
 *   id: string,
 *   surface: string,
 *   screen: string,
 *   element: string,
 *   cssHook: string,
 *   kind: string,
 *   field: string|null,
 *   state: 'published'|'unpublished'|'static',
 *   note: string
 * }>} BindingDescriptor
 */

/** @type {ReadonlyArray<BindingDescriptor>} */
export const BINDINGS = Object.freeze([
  // --- Settings screen: branding -------------------------------------------
  Object.freeze({
    id: 'DB-01',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Settings',
    element: '.th .tm[aria-label="theme"] (8 buttons)',
    cssHook: '.tm.on{box-shadow:0 0 0 3px var(--brand)}',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note:
      'schools has NO branding column (migration 000001 creates only name/status/plan_code/' +
      'timezone/currency/locale). Only the existing theme pairs are available, and those are ' +
      'client-local by design. See DSB-01.',
  }),
  Object.freeze({
    id: 'DB-02',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Settings',
    element: 'School branding subtitle text',
    cssHook: '.s{font-size:12px;color:var(--muted)}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'static',
    note: 'Governance copy. Must not be bound to data.',
  }),

  // --- Settings screen: language ------------------------------------------
  Object.freeze({
    id: 'DB-03',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Settings',
    element: 'Language <select> (English / Roman Urdu / اردو · RTL)',
    cssHook: '.fg select{margin-top:5px}',
    kind: HookKind.SELECT_OPTION,
    field: 'schools.locale',
    state: 'unpublished',
    note:
      'Column exists (VARCHAR(8) DEFAULT "en") but NO locale vocabulary is published, so the ' +
      'label -> code mapping cannot be built. Only the three existing <option> nodes may be used. ' +
      'See DSB-03.',
  }),

  // --- Settings screen: timezone ------------------------------------------
  Object.freeze({
    id: 'DB-04',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Settings',
    element: 'Timezone <select> (Asia/Karachi)',
    cssHook: '.fg select{margin-top:5px}',
    kind: HookKind.SELECT_OPTION,
    field: 'schools.timezone',
    state: 'published',
    note:
      'Directly bindable: VARCHAR(64) DEFAULT "Asia/Karachi". The select has exactly one ' +
      'approved <option>; adding another would be a visual change (DSB-02).',
  }),

  // --- Settings screen: app connection ------------------------------------
  Object.freeze({
    id: 'DB-05',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Settings',
    element: 'Domain input',
    cssHook: '.fg .in{margin-top:5px}',
    kind: HookKind.ATTRIBUTE,
    field: 'school_domains.domain',
    state: 'published',
    note: 'Bindable. Validated by validateSchoolDomain(). is_primary/verified_at decide which row shows.',
  }),
  Object.freeze({
    id: 'DB-06',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Settings',
    element: 'Code input',
    cssHook: '.fg .in{margin-top:5px}',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note: 'No column stores a connection code anywhere. See PUB-01 / CPB-02.',
  }),
  Object.freeze({
    id: 'DB-07',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Settings',
    element: '▣ Generate app QR button',
    cssHook: '.btn.p{background:linear-gradient(110deg,var(--brand),var(--brand2))}',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note:
      'No QR endpoint, no payload contract. The locked copy already requires server-side ' +
      'generation; the frontend must never build a QR in browser code. See DSB-06.',
  }),

  // --- Settings screen: backup & audit ------------------------------------
  Object.freeze({
    id: 'DB-08',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Settings',
    element: 'Backup & audit rows (Daily database backup / Recent change history)',
    cssHook: '.ar{display:flex;justify-content:space-between}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'static',
    note:
      'Infrastructure state, owned by ops. No field and no endpoint. The locked copy already says ' +
      'so. Must stay copy, not data.',
  }),

  // --- Academics screen ----------------------------------------------------
  Object.freeze({
    id: 'DB-09',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Academics',
    element: 'Assessment card title `Science Quiz · Grade 6-A` and `Term 1 · Max 20`',
    cssHook: '.t{font-size:15px;font-weight:700}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note:
      'Requires assessment, term and class tables. None exist in the published schema. ' +
      'See DSB-04.',
  }),
  Object.freeze({
    id: 'DB-10',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Academics',
    element: 'Score inputs `.in` and grade cells',
    cssHook: 'table{min-width:640px}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'Requires marks storage and draft/review/publish state. Not published. See DSB-04.',
  }),
  Object.freeze({
    id: 'DB-11',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Academics',
    element: 'Publication workflow `.flow` steps (Teacher draft / Admin review / Publish)',
    cssHook: '.flow .d{',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note:
      'Exactly three approved steps exist (.flow > div with .d for done and .nw for current) and no ' +
      'new step may be inserted. The state vocabulary is not published. See DSB-04.',
  }),

  // --- Timetable screen ----------------------------------------------------
  Object.freeze({
    id: 'DB-12',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Timetable',
    element: '`.sch` grid period labels (08:30, 09:20, 10:10)',
    cssHook: '.sch{display:grid;grid-template-columns:70px repeat(5,1fr)}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'Requires timetable, class and section tables. Not published. See DSB-05.',
  }),
  Object.freeze({
    id: 'DB-13',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Timetable',
    element: '`.sl` subject cells (Mathematics / Science / English / Urdu)',
    cssHook: '.sl{background:color-mix(in srgb,var(--c) 14%,transparent);color:var(--c)}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note:
      'Requires a subjects table. Not published. The four subject colours are already bound via ' +
      'the per-cell --c custom property; that must not change.',
  }),
  Object.freeze({
    id: 'DB-14',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Timetable',
    element: 'Homework queue `.ar` rows',
    cssHook: '.ar{display:flex;justify-content:space-between}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'Requires a homework table. Not published. Batch G.',
  }),

  // --- Students screen: class/section labels ------------------------------
  Object.freeze({
    id: 'DB-15',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Students',
    element: '`Class` column values (`Grade 6 · A`, `Grade 4 · B`) and `All classes` select',
    cssHook: 'th{text-transform:uppercase}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note:
      'Requires class and section tables. Not published. `All classes` is the only approved ' +
      'placeholder option; it must survive when no classes exist.',
  }),
]);

export function bindingById(id) {
  return BINDINGS.find((binding) => binding.id === id) ?? null;
}

export function bindingsForScreen(screen) {
  return Object.freeze(BINDINGS.filter((binding) => binding.screen === screen));
}

export function publishableBindings() {
  return Object.freeze(BINDINGS.filter((binding) => binding.state === 'published'));
}

export function blockedBindings() {
  return Object.freeze(BINDINGS.filter((binding) => binding.kind === HookKind.BLOCKED));
}

/**
 * Structural guard: a binding contract may never authorise creating UI.
 * If a descriptor ever gains an element-creating capability, fail.
 */
export function assertNoElementCreation() {
  for (const binding of BINDINGS) {
    for (const [key, value] of Object.entries(binding)) {
      if (key === 'createsElement' || key === 'appendChild' || key === 'innerHTML') {
        throw new Error(`binding ${binding.id} declares ${key}=${value}`);
      }
    }
    if (binding.kind === HookKind.TEXT_NODE && binding.cssHook.trim() === '') {
      throw new Error(`binding ${binding.id} has no CSS hook`);
    }
  }
  return true;
}

/**
 * Drift guard: every CSS hook a binding depends on must still exist in the
 * approved reference file, so a binding cannot outlive the element it targets.
 *
 * @param {string} referenceSource text of Zee Education — School Dashboard.html
 */
export function assertBindingsMatchReference(referenceSource) {
  if (typeof referenceSource !== 'string' || referenceSource === '') {
    throw new Error('no reference source supplied');
  }
  const problems = [];
  for (const binding of BINDINGS) {
    if (binding.surface !== Surface.SCHOOL_DESKTOP) continue;
    const selector = binding.cssHook.split('{')[0].trim();
    if (selector === '') continue;
    if (!referenceSource.includes(selector)) {
      problems.push(`${binding.id}: css hook "${selector}" no longer exists in the reference`);
    }
    if (!referenceSource.includes(`'${binding.screen}'`)) {
      problems.push(`${binding.id}: screen "${binding.screen}" no longer exists in the reference`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`binding contract drifted from the reference:\n  ${problems.join('\n  ')}`);
  }
  return true;
}