/**
 * Connection / role-launch binding contract. Tasks: L-O-01 … L-O-05.
 *
 * "Bind QR/manual school connection into the existing approved onboarding UI exactly."
 * "Launch the existing appropriate role experience after login; no new navigation design."
 * "Verify mobile internal scrollbar remains hidden as approved."
 *
 * Every descriptor names an element that already exists. All are `state: 'unpublished'`
 * with `field: null`: the connection flow is transcribed demo behaviour (the reference
 * says `in this demo`), and nothing here establishes a session or persists a school.
 */

import { HookKind } from '../fees/element-bindings.js';
import { Surface } from '../auth/screen-registry.js';

export { HookKind };

/** @type {ReadonlyArray<Readonly<object>>} */
export const CONNECTION_BINDINGS = Object.freeze([
  // --- Mobile: First-time school connection ---------------------------------
  Object.freeze({
    id: 'LCB-01',
    surface: Surface.MOBILE_APP,
    screen: 'First-time school connection',
    element: '`domain` input — `aria-label="School domain"`, value `horizon.school.pk`',
    cssHook: 'id="domain"',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note: 'Both domain and code are required; `connectSchool()` trims and validates them.',
  }),
  Object.freeze({
    id: 'LCB-02',
    surface: Surface.MOBILE_APP,
    screen: 'First-time school connection',
    element: '`code` input — `aria-label="School code"`, value `HZ-9246`',
    cssHook: 'id="code"',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note:
      'Migration 000007 (C-K-02) added a UNIQUE `schools.school_code` column (VARCHAR 50, ' +
      'nullable) and `docs/provisioning-state-machine.md` documents the character rule ' +
      '(3-50 chars, alphanumeric + hyphens/underscores, no PII, uniqueness enforced at database ' +
      'level). So the COLUMN exists. What is still missing is the SEMANTICS: no published payload ' +
      'format, no signature, no expiry, no revocation and no endpoint that accepts or returns a ' +
      'code. The frontend may validate the character set against the published rule, but it may ' +
      'not bind, persist or transmit the code to any endpoint, because no such endpoint exists. ' +
      'See PUB-01.',
  }),
  Object.freeze({
    id: 'LCB-03',
    surface: Surface.MOBILE_APP,
    screen: 'First-time school connection',
    element: '`Connect school` button — `connectSchool()`',
    cssHook: '.btn{',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note:
      'The reference transition is a demo notice (`in this demo`). No session is ' +
      'established and no backend contract exists for it (LCB-03).',
  }),
  Object.freeze({
    id: 'LCB-04',
    surface: Surface.MOBILE_APP,
    screen: 'First-time school connection',
    element: '`Scan QR code` button — `notice(\'Camera scan ke liye real app/PWA permission chahiye\')`',
    cssHook: '.btn{',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note:
      'QR generation is `QR secure backend se generate hoga` in the School Dashboard; ' +
      'the mobile scan needs a real app/PWA permission the frontend does not have.',
  }),
  Object.freeze({
    id: 'LCB-05',
    surface: Surface.MOBILE_APP,
    screen: 'First-time school connection',
    element: '`Open onboarding screen` — `tab=\'Connect\'`',
    cssHook: '.btn.ghost{',
    kind: HookKind.ATTRIBUTE,
    field: null,
    state: 'unpublished',
    note: 'The onboarding screen is existing approved UI; this binding only opens it.',
  }),
  Object.freeze({
    id: 'LCB-06',
    surface: Surface.MOBILE_APP,
    screen: 'First-time school connection',
    element: 'connection-before-login copy — `phir user apne account se login karega`',
    cssHook: '.hero{',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'A selected school is a pre-login preference, not an authenticated claim.',
  }),

  // --- Mobile: role launch --------------------------------------------------
  Object.freeze({
    id: 'LCB-07',
    surface: Surface.MOBILE_APP,
    screen: 'Home',
    element: 'role buttons — `data-r` values `Parent`, `Student`, `Teacher`, `School Admin`',
    cssHook: '#roles button',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note:
      'Clicking sets `role=b.dataset.r; tab=\'Home\'; feat=\'\'` — existing screens only, ' +
      'no new navigation design.',
  }),
  Object.freeze({
    id: 'LCB-08',
    surface: Surface.MOBILE_APP,
    screen: 'Connect',
    element: '`WELCOME TO ZEE EDUCATION` hero + `.tools` grid',
    cssHook: '.hero{',
    kind: HookKind.TEXT_NODE,
    field: null,
    state: 'unpublished',
    note: 'Tools shown are `allowedMobileFeatures(role)` — Batch E tool lists restated.',
  }),

  // --- Mobile: resilience ----------------------------------------------------
  Object.freeze({
    id: 'LCB-09',
    surface: Surface.MOBILE_APP,
    screen: 'Home',
    element: '`.screen` scroll container with internal scrollbar hidden',
    cssHook: '.screen::-webkit-scrollbar{',
    kind: HookKind.BLOCKED,
    field: null,
    state: 'unpublished',
    note:
      'The reference hides the scrollbar (`display:none` + `scrollbar-width:none`). ' +
      'L-O-05: this must not change.',
  }),
]);

export function connectionBindingById(id) {
  return CONNECTION_BINDINGS.find((binding) => binding.id === id) ?? null;
}

export function blockedConnectionBindings() {
  return Object.freeze(CONNECTION_BINDINGS.filter((binding) => binding.kind === HookKind.BLOCKED));
}

export function assertNoConnectionElementCreation() {
  for (const binding of CONNECTION_BINDINGS) {
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

export function assertConnectionBindingsMatchReferences(referenceSources) {
  const problems = [];
  for (const binding of CONNECTION_BINDINGS) {
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
    throw new Error(`connection binding contract drifted:\n  ${problems.join('\n  ')}`);
  }
  return true;
}
