/**
 * Approved attendance binding contract. Task: F-O-02.
 *
 * "Bind class/date/student data through existing hooks only."
 *
 * Nothing can be bound yet — no attendance table and no endpoint. What this module
 * provides is the binding contract for every attendance element that already
 * exists, with the exact hook kind, the exact attribute a future write would
 * target, and whether a published field exists behind it.
 *
 * Enforced structurally:
 *   - `assertNoAttendanceElementCreation()`
 *   - `assertAttendanceBindingsMatchReferences()` re-reads both references so a
 *     binding cannot outlive its target element.
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
export const ATTENDANCE_BINDINGS = Object.freeze([
  // --- School Dashboard: Attendance register --------------------------------
  Object.freeze({
    id: 'FAB-01',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Attendance',
    element: 'Register card title `Grade 6 · Section A · 16 Oct`',
    cssHook: '.t{font-size:15px;font-weight:700}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Requires class, section and academic-date fields. None exist (DSB-04).',
  }),
  Object.freeze({
    id: 'FAB-02',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Attendance',
    element: '`.ar` row — student name + ID',
    cssHook: '.ar{display:flex;justify-content:space-between}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note: 'Requires the students table (Batch E block).',
  }),
  Object.freeze({
    id: 'FAB-03',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Attendance',
    element: '`.ch` P / A / L buttons and their `.on` state',
    cssHook: '.ch{display:flex;gap:4px}',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note:
      'The ONLY place all three approved statuses exist. `.on.P` green, `.on.A` red, ' +
      '`.on.L` amber. Never add a fourth control (FAT-02).',
  }),
  Object.freeze({
    id: 'FAB-04',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Attendance',
    element: '`CLASS PROGRESS` `.sm` card — `<strong>` value and `<span>` note',
    cssHook: '.sm{padding:20px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Existing approved shape is "28 / 28". Producible via the summary formatter.',
  }),
  Object.freeze({
    id: 'FAB-05',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Attendance',
    element: '`PARENT ALERTS` `.sm` card',
    cssHook: '.sm{padding:20px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note:
      'Requires parent-notification tracking. The locked copy already states SMS is not in V1; ' +
      'this must remain app-only.',
  }),
  Object.freeze({
    id: 'FAB-06',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Attendance',
    element: '`✓ Submit register` primary button',
    cssHook: '.btn.p{background:linear-gradient(110deg,var(--brand),var(--brand2))}',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note: 'No attendance endpoint. Feedback must reuse `#toast` only.',
  }),

  // --- School Dashboard: Overview summary -----------------------------------
  Object.freeze({
    id: 'FAB-07',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Overview',
    element: '`Attendance today` stat tile — `label`, `strong`, `small`, `.up` delta',
    cssHook: '.stat strong{display:block;font-size:26px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Existing approved shape is "91.7%" / "above target" / "2.6%".',
  }),
  Object.freeze({
    id: 'FAB-08',
    surface: Surface.SCHOOL_DESKTOP,
    screen: 'Overview',
    element: '`Attendance overview` SVG chart — path `d`, circles, gridlines',
    cssHook: '.chart{height:230px;margin-top:14px}',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note:
      'The chart is inline SVG with preserveAspectRatio="none". Its geometry must keep the ' +
      'existing viewBox; a chart library may not be substituted.',
  }),

  // --- Mobile Preview: attendance ------------------------------------------
  Object.freeze({
    id: 'FAB-09',
    surface: Surface.MOBILE_APP,
    screen: 'Attendance',
    element: '`.hello` header `Grade 6 · Section A · Today` and `h3` title',
    cssHook: '.screen h3{font-size:24px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Title flips to "Class attendance" for staff only, per the reference.',
  }),
  Object.freeze({
    id: 'FAB-10',
    surface: Surface.MOBILE_APP,
    screen: 'Attendance',
    element: '`.list .row` entries with `.pill.g` / `.pill.r`',
    cssHook: '.pill{font-size:11px;font-weight:700;padding:5px 10px}',
    kind: HookKind.ROW_TEMPLATE,
    field: null,
    state: 'unpublished',
    note:
      'BINARY SURFACE. The reference renders only Present/Absent — there is no Leave pill, and ' +
      'the staff toggle is `att[i]===0?1:0`. Adding Leave here would be a visible change (FAT-02).',
  }),
  Object.freeze({
    id: 'FAB-11',
    surface: Surface.MOBILE_APP,
    screen: 'Attendance',
    element: '`Submit attendance` button (staff only)',
    cssHook: '.btn{width:100%;margin-top:10px}',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note: 'No endpoint; the reference itself calls it "Attendance submitted in demo".',
  }),
  Object.freeze({
    id: 'FAB-12',
    surface: Surface.MOBILE_APP,
    screen: 'Attendance',
    element: '`hero` label / `strong` / `small` / `.bar i` width',
    cssHook: '.hero{background:linear-gradient(135deg,var(--brand),var(--brand2))}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Parent hero already reads "Present" / "Attendance today - 94.2% this month".',
  }),
  Object.freeze({
    id: 'FAB-13',
    surface: Surface.MOBILE_APP,
    screen: 'Attendance',
    element: 'KPI tiles: Parent "94.2%", Teacher "1 pending", School Admin "92%"',
    cssHook: '.kpi b{display:block;font-size:18px}',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Each KPI is role-specific in the approved reference; the role must drive which tile is filled.',
  }),
]);

export function attendanceBindingById(id) {
  return ATTENDANCE_BINDINGS.find((binding) => binding.id === id) ?? null;
}

export function blockedAttendanceBindings() {
  return Object.freeze(ATTENDANCE_BINDINGS.filter((binding) => binding.kind === HookKind.BLOCKED));
}

export function assertNoAttendanceElementCreation() {
  for (const binding of ATTENDANCE_BINDINGS) {
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
export function assertAttendanceBindingsMatchReferences(referenceSources) {
  const problems = [];
  for (const binding of ATTENDANCE_BINDINGS) {
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
    throw new Error(`attendance binding contract drifted from the references:\n  ${problems.join('\n  ')}`);
  }
  return true;
}