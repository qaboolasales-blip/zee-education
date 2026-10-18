/**
 * UI state audit. Task: M-O-02.
 *
 * "Verify all loading/error/empty states use existing approved UI behavior only."
 *
 * The references have no spinner, no skeleton, no shimmer, no error banner, no modal
 * and no snackbar. Their only feedback affordances are `#toast` (via `notice()`) and
 * the existing card/tile/badge areas. Batch A already established the same rule for
 * the empty marker (`—` from `core/format/empty.js`).
 *
 * So this module audits that nothing in `core/**` manufactures a new state surface.
 * It is deliberately about *creation*, because a state that is never created cannot be
 * styled into a visual change.
 *
 * No DOM, no rendering.
 */

/** Surfaces that would each be a visible addition if they appeared. */
export const FORBIDDEN_STATE_SURFACES = Object.freeze([
  'spinner',
  'skeleton',
  'shimmer',
  'placeholder-block',
  'loading-bar',
  'error-banner',
  'error-modal',
  'snackbar',
  'drawer-backdrop',
]);

/**
 * Names the only two feedback surfaces the references actually have.
 * `toast` is `#toast`; `card` is the existing `.card`/`.sm` area that already carries
 * errors and empty values.
 */
export const APPROVED_STATE_SURFACES = Object.freeze({
  toast: { hook: '#toast', source: 'notice()' },
  card: { hook: '.card{', source: 'existing tiles and cards' },
});

/**
 * M-O-02 — assert no loading/error/empty surface is created.
 *
 * @param {Array<{ path: string, code: string }>} sources
 */
export function assertNoCustomStateSurface(sources) {
  const list = Array.isArray(sources) ? sources : [];
  const DECLARATION_MODULES = ['core/hardening/ui-state-audit.js'];
  const isDeclaration = (path) =>
    DECLARATION_MODULES.some((module) => path.replace(/\\/g, '/').endsWith(module));

  const creationPatterns = [
    { label: 'DOM element creation', pattern: /\bdocument\.createElement\s*\(/ },
    { label: 'innerHTML write', pattern: /\.innerHTML\s*=/ },
    { label: 'appendChild', pattern: /\.appendChild\s*\(/ },
    { label: 'insertAdjacentHTML', pattern: /insertAdjacentHTML\s*\(/ },
  ];

  const problems = [];
  for (const source of list) {
    if (!source || typeof source.code !== 'string') continue;
    if (isDeclaration(source.path)) continue;
    for (const { label, pattern } of creationPatterns) {
      if (pattern.test(source.code)) problems.push(`${source.path}: ${label}`);
    }
    // A forbidden surface named outside a declaration module is a visual change.
    for (const surface of FORBIDDEN_STATE_SURFACES) {
      if (new RegExp(`['"\`]${surface}['"\`]`).test(source.code)) {
        problems.push(`${source.path}: forbidden state surface "${surface}"`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`a new UI state surface would be a visual change:\n  ${problems.join('\n  ')}`);
  }
  return true;
}

/**
 * M-O-02 — the feedback surface inventory must stay exactly the approved pair.
 *
 * @param {string[]} declared
 */
export function assertApprovedStateSurfacesOnly(declared) {
  const list = Array.isArray(declared) ? declared.filter((x) => typeof x === 'string') : [];
  const allowed = Object.keys(APPROVED_STATE_SURFACES);
  const problems = list.filter((surface) => !allowed.includes(surface));
  if (problems.length > 0) {
    throw new Error(
      `an unapproved state surface would be a visual change: ${problems.join(', ')}`,
    );
  }
  return true;
}

/**
 * M-O-02 — the references must still state the approved state surfaces and must not
 * have gained a spinner, skeleton, banner or modal.
 *
 * @param {Record<string, string>} referenceSources
 */
export function assertStateSurfacesMatchReferences(referenceSources) {
  const problems = [];
  const surfaces = ['school-desktop', 'mobile-app', 'platform'];
  for (const key of surfaces) {
    const source = referenceSources[key];
    if (typeof source !== 'string' || source === '') {
      problems.push(`no reference source supplied for surface "${key}"`);
      continue;
    }
    for (const surface of FORBIDDEN_STATE_SURFACES) {
      if (source.includes(surface)) problems.push(`${key}: the reference gained "${surface}"`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`UI state surfaces drifted:\n  ${problems.join('\n  ')}`);
  }
  return true;
}
