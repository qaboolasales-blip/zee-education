/**
 * Commercial / license / support binding contract. Task: K-O-01.
 *
 * "Bind existing Super Admin commercial/license/support areas to the real contract only."
 *
 * The real contract is absent, so all 14 descriptors are `state: 'unpublished'` with
 * `field: null`. Note that the *styles* are fully known — K-O-02 is complete — because
 * the reference ships its own status-to-badge mapping.
 */

import { HookKind } from '../fees/element-bindings.js';
import { Surface } from '../auth/screen-registry.js';

export { HookKind };

/** @type {ReadonlyArray<Readonly<object>>} */
export const COMMERCIAL_BINDINGS = Object.freeze([
  // --- Overview: the four existing `.stat` tiles ----------------------------
  Object.freeze({
    id: 'KCB-01',
    surface: Surface.PLATFORM,
    screen: 'Overview',
    element: '`Total school installs` `.stat` tile — `28` / `24 active — 4 provisioning`',
    cssHook: '.stat strong{',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Accent is `--c:#fff` in the reference and is pinned by the tile, not the data.',
  }),
  Object.freeze({
    id: 'KCB-02',
    surface: Surface.PLATFORM,
    screen: 'Overview',
    element: '`Upcoming renewals` `.stat` tile — `5` / `next: 28 Oct 2026` / `5 due soon`',
    cssHook: '.stat strong{',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Accent `#f59e0b`. Renewal dates need the commercial contract.',
  }),
  Object.freeze({
    id: 'KCB-03',
    surface: Surface.PLATFORM,
    screen: 'Overview',
    element: '`Licensed revenue` `.stat` tile — `PKR 1.46M`',
    cssHook: '.stat strong{',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Accent `#10b981`. `PKR 1.46M` is a locked sample, not a computed revenue figure.',
  }),
  Object.freeze({
    id: 'KCB-04',
    surface: Surface.PLATFORM,
    screen: 'Overview',
    element: '`Open support tickets` `.stat` tile — `7` / `2 waiting`',
    cssHook: '.stat strong{',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Accent `#ec4899`.',
  }),
  Object.freeze({
    id: 'KCB-05',
    surface: Surface.PLATFORM,
    screen: 'Overview',
    element: '`Installation & renewal trend` `.bars` chart + `.lg` legend',
    cssHook: '.bars{',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note:
      'The chart is inline SVG built by the reference. No module may rebuild it, and no series ' +
      'data contract exists.',
  }),

  // --- Schools & Installs ----------------------------------------------------
  Object.freeze({
    id: 'KCB-06',
    surface: Surface.PLATFORM,
    screen: 'Schools & Installs',
    element: '`.pe` school cell — initials tile + name + city',
    cssHook: '.pe{',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'Batch E already established that this `.pe` cell is a school identity, not a person.',
  }),
  Object.freeze({
    id: 'KCB-07',
    surface: Surface.PLATFORM,
    screen: 'Schools & Installs',
    element: '`Plan` column',
    cssHook: '.pe{',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Plans observed: `Starter`, `Growth`, `Complete`. No plan catalogue contract exists.',
  }),
  Object.freeze({
    id: 'KCB-08',
    surface: Surface.PLATFORM,
    screen: 'Schools & Installs',
    element: '`Database` column badge — `Dedicated` `.g`, anything else `.w`',
    cssHook: '.bd{',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note:
      'Transcribed from `x[4] is "Dedicated" ? "g" : "w"`. A missing database kind is not "Dedicated".',
  }),
  Object.freeze({
    id: 'KCB-09',
    surface: Surface.PLATFORM,
    screen: 'Schools & Installs',
    element: '`Status` column badge — `Active` `.g`, `Renewal due` `.w`, else `.n`',
    cssHook: '.bd{',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note:
      'Transcribed from `stc`. An unrecognised state must keep `.n` — never fall through to `Active` ' +
      '(KB-01).',
  }),
  Object.freeze({
    id: 'KCB-10',
    surface: Surface.PLATFORM,
    screen: 'Schools & Installs',
    element: '`Renewal` column — date, or `—` when absent',
    cssHook: '.pe{',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'The reference itself renders `—` for a school still being set up.',
  }),
  Object.freeze({
    id: 'KCB-11',
    surface: Surface.PLATFORM,
    screen: 'Overview',
    element: '`Renewals needing attention` `.rr` rows — `Due in 4d`',
    cssHook: '.rr{',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'Relative due text reuses the existing relative-time treatment, not a new one.',
  }),

  // --- Billing & Renewals ----------------------------------------------------
  Object.freeze({
    id: 'KCB-12',
    surface: Surface.PLATFORM,
    screen: 'Billing & Renewals',
    element: '`School rate book` rows — plan + amount',
    cssHook: '.pn{',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'Sample amounts only. `42,000` must come from a contract before it means anything.',
  }),
  Object.freeze({
    id: 'KCB-13',
    surface: Surface.PLATFORM,
    screen: 'Billing & Renewals',
    element: '`🔔 Prepare reminder` link',
    cssHook: '.pn{',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note:
      'The reference states `Preview only — email not connected`. No adapter may report a send ' +
      '(KB-04).',
  }),

  // --- Support Tickets -------------------------------------------------------
  Object.freeze({
    id: 'KCB-14',
    surface: Surface.PLATFORM,
    screen: 'Support Tickets',
    element: '`.tk` ticket rows — `ZE-1048 · App connection code · Normal · Today`',
    cssHook: '.tk{',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'Priorities observed: `Normal`, `Low`, `High`. No ticket contract exists.',
  }),
]);

export function commercialBindingById(id) {
  return COMMERCIAL_BINDINGS.find((binding) => binding.id === id) ?? null;
}

export function blockedCommercialBindings() {
  return Object.freeze(COMMERCIAL_BINDINGS.filter((binding) => binding.kind === HookKind.BLOCKED));
}

export function assertNoCommercialElementCreation() {
  for (const binding of COMMERCIAL_BINDINGS) {
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

export function assertCommercialBindingsMatchReferences(referenceSources) {
  const problems = [];
  for (const binding of COMMERCIAL_BINDINGS) {
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
    throw new Error(`commercial binding contract drifted:\n  ${problems.join('\n  ')}`);
  }
  return true;
}
