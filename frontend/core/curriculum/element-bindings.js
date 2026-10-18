/**
 * Approved curriculum binding contract + navigation policy.
 * Tasks: G-O-01 and G-O-02.
 *
 * "Bind timetable/homework/notice data to existing approved areas only" and
 * "Use existing navigation, drawers and bottom nav; do not add a new menu."
 *
 * Two structural guarantees:
 *
 *  - `assertNoCurriculumElementCreation()` — no descriptor may authorise creating
 *    UI, and no navigation descriptor may introduce an entry that is not already
 *    present in a locked reference.
 *  - `assertNavigationMatchesReferences()` re-reads the references so the approved
 *    navigation sets cannot drift.
 *
 * The navigation policy matters because the approved layouts are fixed-shape:
 * the mobile `.nav` is `grid-template-columns:repeat(5,1fr)` and always renders
 * five tabs, and the desktop sidebar is a grid with a pinned footer. Adding or
 * removing an entry in either place is a layout change, not a feature (BLK-08).
 *
 * No DOM, no rendering, no CSS.
 */

import { MOBILE_APP_TABS, PLATFORM_SCREENS, SCHOOL_DESKTOP_SCREENS, Surface } from '../auth/screen-registry.js';

export const HookKind = Object.freeze({
  TEXT_NODE: 'existing-text-node',
  ATTRIBUTE: 'existing-attribute',
  ROW_TEMPLATE: 'existing-row-template',
  BLOCKED: 'blocked-no-approved-hook',
});

/** @type {ReadonlyArray<Readonly<object>>} */
export const CURRICULUM_BINDINGS = Object.freeze([
  // --- Timetable ------------------------------------------------------------
  Object.freeze({
    id: 'GCB-01',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Timetable',
    element: '`.sch` grid — period column plus five weekday columns',
    cssHook: '.sch{display:grid;grid-template-columns:70px repeat(5,1fr);min-width:620px}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'The grid shape is fixed at five weekdays. Cells may be filled or left blank only.',
  }),
  Object.freeze({
    id: 'GCB-02',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Timetable',
    element: '`.sl` subject cells and their `--c` accent',
    cssHook: '.sl{border-radius:10px;font-weight:600;',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note: 'Only the four approved subject accents exist. No fifth colour (GCB-02).',
  }),
  Object.freeze({
    id: 'GCB-03',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Timetable',
    element: '`Grade 6 · Section A` / `Week of 19 Oct` header',
    cssHook: '.t{font-size:15px;font-weight:700}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Requires class, section and academic-week fields (DSB-04).',
  }),
  Object.freeze({
    id: 'GCB-04',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Timetable',
    element: '`Homework queue` `.ar` rows — title, class + due, `Open` link',
    cssHook: '.ar{display:flex;justify-content:space-between}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'Requires the homework table. Row count may vary — the list is variable length.',
  }),
  Object.freeze({
    id: 'GCB-05',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Timetable',
    element: '`＋ Homework` and `＋ Timetable entry` buttons',
    cssHook: '.btn{border:1px solid var(--line);background:var(--card);',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note: 'No endpoints, and no approved composer layout (GCB-05).',
  }),

  // --- Mobile timetable / homework / notices ---------------------------------
  Object.freeze({
    id: 'GCB-06',
    surface: Surface.MOBILE_APP,
    screen: 'timetable',
    element: '`TODAY · GRADE 6-A` block plus `.list .row` periods with `.pill.n`',
    cssHook: '.row{display:flex;justify-content:space-between}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'Existing approved shape: time + subject + room.',
  }),
  Object.freeze({
    id: 'GCB-07',
    surface: Surface.MOBILE_APP,
    screen: 'homework',
    element: '`DUE SOON` hero plus `.list .row` with a `.prog i` width',
    cssHook: '.prog i{display:block;height:100%;',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'Progress is expressed only through `.prog i` width — no new progress element.',
  }),
  Object.freeze({
    id: 'GCB-08',
    surface: Surface.MOBILE_APP,
    screen: 'notices',
    element: '`LATEST` hero plus `.list .row` with `.pill.g/.w/.n`',
    cssHook: '.pill{font-size:11px;font-weight:700;padding:5px 10px}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'Only the existing pill classes may be used for a notice state.',
  }),
  Object.freeze({
    id: 'GCB-09',
    surface: Surface.MOBILE_APP,
    screen: 'notices',
    element: '`Create notice` action',
    cssHook: '.btn{width:100%;margin-top:10px;',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note: 'No endpoint and no approved composer layout. School Admin only (GCB-05).',
  }),

  // --- Reports / print / share ----------------------------------------------
  Object.freeze({
    id: 'GCB-10',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Reports & Print',
    element: '`⇩ Export Excel / CSV` and `▣ Print / PDF` buttons',
    cssHook: '.btn.p{border:0;color:#fff;',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note: 'No export or render endpoint. Feedback must reuse `#toast` only.',
  }),
  Object.freeze({
    id: 'GCB-11',
    surface: Surface.MOBILE_APP,
    screen: 'Results',
    element: '`Share result PDF` button (Parent / Student)',
    cssHook: '.btn.ghost{background:var(--card);color:var(--brand);',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note:
      'The manual V1 boundary. Only a user-initiated PDF share is permitted — see ' +
      'core/curriculum/share-boundary.js.',
  }),
  Object.freeze({
    id: 'GCB-12',
    surface: Surface.MOBILE_APP,
    screen: 'Profile',
    element: '`↗ Share result PDF on WhatsApp` button (Parent Home)',
    cssHook: '.btn.ghost{background:var(--card);color:var(--brand);',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note:
      'The label names the user-chosen destination. The code must never choose or call it (GCB-01).',
  }),
]);

export function curriculumBindingById(id) {
  return CURRICULUM_BINDINGS.find((binding) => binding.id === id) ?? null;
}

export function blockedCurriculumBindings() {
  return Object.freeze(CURRICULUM_BINDINGS.filter((binding) => binding.kind === HookKind.BLOCKED));
}

/**
 * The complete set of navigation entries a runtime may ever expose.
 * Nothing outside these lists may be added to a nav, drawer or bottom bar.
 */
export const APPROVED_NAVIGATION = Object.freeze({
  [Surface.SCHOOL_DESKTOP]: Object.freeze({
    sidebar: SCHOOL_DESKTOP_SCREENS,
    bottomBar: Object.freeze(['Overview', 'Students', 'Attendance', 'Fees & Accounts', 'menu']),
    drawerControl: 'menu',
  }),
  [Surface.MOBILE_APP]: Object.freeze({
    bottomBar: MOBILE_APP_TABS,
    entryPoint: 'Tasks',
  }),
  [Surface.PLATFORM]: Object.freeze({
    sidebar: PLATFORM_SCREENS,
    bottomBar: Object.freeze(['Overview', 'Schools & Installs', 'Billing & Renewals', 'Support Tickets', 'menu']),
    drawerControl: 'menu',
  }),
});

export function isApprovedNavEntry(surface, entry) {
  const config = APPROVED_NAVIGATION[surface];
  if (!config) return false;
  if (config.drawerControl === entry) return true;
  if (Array.isArray(config.sidebar) && config.sidebar.includes(entry)) return true;
  if (Array.isArray(config.bottomBar) && config.bottomBar.includes(entry)) return true;
  if (config.entryPoint === entry) return true;
  return false;
}

/**
 * Validate a proposed navigation change. Always refuses: Batch G may not add,
 * remove or reorder a navigation entry, because both approved layouts are
 * fixed-shape and any change is a visual change.
 *
 * @param {{ surface: string, entry: string }} proposal
 */
export function validateNavigationChange(proposal = {}) {
  const { surface, entry } = proposal;

  if (!APPROVED_NAVIGATION[surface]) {
    return Object.freeze({ allowed: false, reason: 'unknown-surface' });
  }
  if (!isApprovedNavEntry(surface, entry)) {
    return Object.freeze({ allowed: false, reason: 'not-an-approved-entry' });
  }
  // Even an approved entry may not be added, removed or reordered.
  return Object.freeze({
    allowed: false,
    reason: 'navigation-is-fixed-by-the-ui-lock',
    note:
      'Both the 5-column mobile tab bar and the desktop sidebar grid are fixed-shape. Adding, ' +
      'removing or reordering an entry is a visual change (BLK-08). Role-based entry points ' +
      'belong on the variable-length Tasks/tools grid instead.',
  });
}

export function assertNoCurriculumElementCreation() {
  for (const binding of CURRICULUM_BINDINGS) {
    for (const forbidden of ['createsElement', 'appendChild', 'innerHTML', 'insertRow', 'newMenu']) {
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
 * Drift guard: every binding hook, screen and navigation entry must still exist
 * in the approved references.
 *
 * @param {Record<string, string>} referenceSources surface -> file text
 */
export function assertCurriculumBindingsMatchReferences(referenceSources) {
  const problems = [];

  for (const binding of CURRICULUM_BINDINGS) {
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

  for (const [surface, config] of Object.entries(APPROVED_NAVIGATION)) {
    const source = referenceSources[surface];
    if (typeof source !== 'string' || source === '') continue;
    for (const entry of [...(config.sidebar ?? []), ...(config.bottomBar ?? [])]) {
      if (!source.includes(`'${entry}'`)) {
        problems.push(`${surface}: nav entry "${entry}" no longer exists in the reference`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`curriculum contract drifted from the references:\n  ${problems.join('\n  ')}`);
  }
  return true;
}