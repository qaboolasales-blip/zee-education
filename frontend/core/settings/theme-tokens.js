/**
 * Approved theme token registry. Task: D-O-03.
 *
 * "Use existing base-color/multicolor theme mechanisms only; never alter visual
 * tokens."
 *
 * This module is the enforcement point for that rule. It contains ONLY:
 *   - the exact swatch pairs that already exist in the approved references,
 *   - the exact base brand values the references declare in `:root`,
 *   - the exact two CSS custom properties the references' own `setTheme()` sets.
 *
 * It cannot add a colour, a token name, or a surface. A new palette entry would
 * be a visible UI change to an approved screen, so it is structurally
 * impossible here.
 *
 * This module contains no CSS, no DOM access and no rendering. It returns frozen
 * data that a future binding layer may pass to the references' existing
 * `setTheme(a, b)` helper, which is the only mechanism the approved UI uses.
 */

import { Surface } from '../auth/screen-registry.js';

const pair = (brand, brand2) => Object.freeze({ brand, brand2, key: `${brand}|${brand2}` });

/**
 * The only CSS custom properties the approved references ever write.
 *
 * School Dashboard:  function setTheme(a,b){root.style.setProperty('--brand',a);root.style.setProperty('--brand2',b);…}
 * Super Admin:       identical
 * Mobile Preview:    the theme buttons set --brand and --brand2 as well
 *
 * No other custom property is ever mutated for theming. `--bg`, `--card`,
 * `--ink`, `--muted`, `--line`, `--soft`, `--side` and `--shadow` are palette
 * tokens and are deliberately NOT themable.
 */
export const THEME_TOKEN_NAMES = Object.freeze(['--brand', '--brand2']);

/**
 * Palette tokens that are never themable, restated so the guard is explicit.
 * `--side` exists only in the two desktop references (the mobile preview has no
 * sidebar), which is why this list is used for *rejection*, not for existence.
 */
export const PROTECTED_TOKENS = Object.freeze([
  '--bg',
  '--card',
  '--ink',
  '--muted',
  '--line',
  '--soft',
  '--side',
  '--shadow',
]);

/**
 * Base brand values declared in each reference's `:root`, verbatim.
 * School Dashboard and Mobile Preview share the same pair; Super Admin differs.
 */
export const DEFAULT_BRAND = Object.freeze({
  [Surface.SCHOOL_DESKTOP]: pair('#2563eb', '#1e3a8a'),
  [Surface.MOBILE_APP]: pair('#2563eb', '#1e3a8a'),
  [Surface.PLATFORM]: pair('#3558c8', '#1b2a6b'),
});

/**
 * The eight swatch buttons already rendered by
 * `.th .tm[aria-label="theme"]` in each reference, in locked order.
 *
 * The 7th swatch differs by workspace: Super Admin uses `#3558c8/#1b2a6b`
 * (its own brand pair) where the school workspace and mobile app use
 * `#3b4fb8/#1e2a5e`. This is a locked difference and is preserved exactly.
 */
export const THEME_SWATCHES = Object.freeze({
  [Surface.SCHOOL_DESKTOP]: Object.freeze([
    pair('#92573a', '#4c291b'),
    pair('#e11d48', '#9f1239'),
    pair('#ea580c', '#9a3412'),
    pair('#ca8a04', '#854d0e'),
    pair('#059669', '#065f46'),
    pair('#2563eb', '#1e3a8a'),
    pair('#3b4fb8', '#1e2a5e'),
    pair('#7c3aed', '#4c1d95'),
  ]),
  [Surface.MOBILE_APP]: Object.freeze([
    pair('#92573a', '#4c291b'),
    pair('#e11d48', '#9f1239'),
    pair('#ea580c', '#9a3412'),
    pair('#ca8a04', '#854d0e'),
    pair('#059669', '#065f46'),
    pair('#2563eb', '#1e3a8a'),
    pair('#3b4fb8', '#1e2a5e'),
    pair('#7c3aed', '#4c1d95'),
  ]),
  [Surface.PLATFORM]: Object.freeze([
    pair('#92573a', '#4c291b'),
    pair('#e11d48', '#9f1239'),
    pair('#ea580c', '#9a3412'),
    pair('#ca8a04', '#854d0e'),
    pair('#059669', '#065f46'),
    pair('#2563eb', '#1e3a8a'),
    pair('#3558c8', '#1b2a6b'),
    pair('#7c3aed', '#4c1d95'),
  ]),
});

/** Every reference renders exactly eight theme buttons. */
export const THEME_SWATCH_COUNT = 8;

/** Lowercase 6-digit hex, matching every value in the references. */
const HEX = /^#[0-9a-f]{6}$/;

export function isApprovedHex(value) {
  return typeof value === 'string' && HEX.test(value);
}

export function themePairCount(surface) {
  return THEME_SWATCHES[surface]?.length ?? 0;
}

/**
 * Resolve an existing swatch to its two token values.
 * Out-of-range or unknown input returns the surface default rather than
 * inventing a colour.
 *
 * @param {string} surface
 * @param {number} index
 * @returns {{ brand: string, brand2: string, key: string }}
 */
export function resolveThemeSwatch(surface, index) {
  const swatches = THEME_SWATCHES[surface];
  const fallback = DEFAULT_BRAND[surface];

  if (!Array.isArray(swatches) || fallback === undefined) {
    throw new Error(`no approved theme palette exists for surface "${surface}"`);
  }
  if (!Number.isInteger(index) || index < 0 || index >= swatches.length) {
    return fallback;
  }
  return swatches[index];
}

/**
 * Reject any attempt to theme a token the approved UI never themes.
 * @param {Record<string, string>} declarations
 */
export function assertThemeTokensOnly(declarations) {
  if (declarations === null || typeof declarations !== 'object' || Array.isArray(declarations)) {
    throw new Error('theme declarations must be a plain object');
  }
  const rejected = Object.keys(declarations).filter((name) => !THEME_TOKEN_NAMES.includes(name));
  if (rejected.length > 0) {
    throw new Error(`not themable in the approved UI: ${rejected.join(', ')}`);
  }
  for (const [name, value] of Object.entries(declarations)) {
    if (!isApprovedHex(value)) {
      throw new Error(`value for ${name} is not an approved lowercase hex colour`);
    }
  }
  return true;
}

/**
 * Build the exact declaration object the references' own `setTheme()` would
 * apply. Returns nothing else — no third token, no extra property.
 *
 * @param {string} surface
 * @param {number} index
 */
export function themeDeclarations(surface, index) {
  const { brand, brand2 } = resolveThemeSwatch(surface, index);
  const declarations = { '--brand': brand, '--brand2': brand2 };
  assertThemeTokensOnly(declarations);
  return Object.freeze(declarations);
}

/**
 * Drift guard: the registry must keep matching the approved reference files.
 * Re-reads them on every test run, so a palette or base-token edit fails loudly.
 *
 * @param {Record<string, string>} referenceSources surface -> file text
 */
export function assertThemesMatchReferences(referenceSources) {
  const problems = [];
  const surfaces = Object.keys(THEME_SWATCHES);

  for (const surface of surfaces) {
    const source = referenceSources[surface];
    if (typeof source !== 'string' || source === '') {
      problems.push(`no reference source supplied for surface "${surface}"`);
      continue;
    }
    for (const entry of THEME_SWATCHES[surface]) {
      if (!source.includes(`['${entry.brand}','${entry.brand2}']`)) {
        problems.push(`${surface}: swatch ${entry.key} is not present in its reference`);
      }
    }
    const base = DEFAULT_BRAND[surface];
    if (!source.includes(`--brand:${base.brand}`) || !source.includes(`--brand2:${base.brand2}`)) {
      problems.push(`${surface}: base brand ${base.key} is not declared in its reference :root`);
    }
    if (!source.includes("setProperty('--brand'") || !source.includes("setProperty('--brand2'")) {
      problems.push(`${surface}: reference no longer themes exactly --brand and --brand2`);
    }
  }

  // The strongest available check: every `setProperty('…')` call anywhere in a
  // reference must target exactly --brand or --brand2. This is mechanism-
  // agnostic, so it holds for the desktop `setTheme(a, b)` helper and for the
  // mobile preview's dataset-driven theme buttons alike.
  for (const surface of surfaces) {
    const source = referenceSources[surface];
    if (typeof source !== 'string' || source === '') continue;

    const themed = [...source.matchAll(/setProperty\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    const illegal = [...new Set(themed)].filter((name) => !THEME_TOKEN_NAMES.includes(name));
    if (illegal.length > 0) {
      problems.push(`${surface}: reference themes non-themable properties: ${illegal.join(', ')}`);
    }
    for (const required of THEME_TOKEN_NAMES) {
      if (!themed.includes(required)) {
        problems.push(`${surface}: reference no longer themes ${required}`);
      }
    }
  }

  // Any palette token the reference declares must never be themed.
  for (const surface of surfaces) {
    const source = referenceSources[surface];
    if (typeof source !== 'string' || source === '') continue;
    for (const token of PROTECTED_TOKENS) {
      if (source.includes(`setProperty('${token}'`) || source.includes(`setProperty("${token}"`)) {
        problems.push(`${surface}: reference now themes protected token ${token}`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`theme registry drifted from the approved references:\n  ${problems.join('\n  ')}`);
  }
  return true;
}