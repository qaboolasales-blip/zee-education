/**
 * Approved theme token tests. Task: D-O-03.
 *
 * The critical assertion in this file is that the frontend theme registry still
 * matches the three approved reference files, byte-for-byte in the swatch and
 * base-token values. If anyone edits a palette in the references, this fails.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { Surface } from '../core/auth/index.js';
import {
  DEFAULT_BRAND,
  PROTECTED_TOKENS,
  THEME_SWATCHES,
  THEME_SWATCH_COUNT,
  THEME_TOKEN_NAMES,
  assertThemeTokensOnly,
  assertThemesMatchReferences,
  isApprovedHex,
  resolveThemeSwatch,
  themeDeclarations,
  themePairCount,
} from '../core/settings/index.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REF_DIR = resolve(
  REPO_ROOT,
  'zee_education_multi_agent_handoff',
  'agents',
  'opencode',
  'reference_ui',
);

const REFERENCE_FILES = Object.freeze({
  [Surface.SCHOOL_DESKTOP]: 'Zee Education — School Dashboard.html',
  [Surface.MOBILE_APP]: 'Zee Education — Mobile App Preview.html',
  [Surface.PLATFORM]: 'Zee Education — Super Admin.html',
});

const SOURCES = Object.fromEntries(
  Object.entries(REFERENCE_FILES).map(([surface, file]) => [
    surface,
    readFileSync(resolve(REF_DIR, file), 'utf8'),
  ]),
);

describe('theme registry matches the approved references', () => {
  it('passes the drift guard', () => {
    assert.equal(assertThemesMatchReferences(SOURCES), true);
  });

  it('fails when a reference palette changes', () => {
    const altered = {
      ...SOURCES,
      [Surface.SCHOOL_DESKTOP]: SOURCES[Surface.SCHOOL_DESKTOP].replace(
        "['#2563eb','#1e3a8a']",
        "['#2563ed','#1e3a8b']",
      ),
    };
    assert.throws(() => assertThemesMatchReferences(altered));
  });

  it('fails when a reference themes a third property', () => {
    const altered = {
      ...SOURCES,
      [Surface.PLATFORM]: `${SOURCES[Surface.PLATFORM]}.setProperty('--bg','#fff')`,
    };
    assert.throws(() => assertThemesMatchReferences(altered));
  });

  it('fails when a reference drops one of the two themable tokens', () => {
    const altered = {
      ...SOURCES,
      [Surface.MOBILE_APP]: SOURCES[Surface.MOBILE_APP].replace("setProperty('--brand2'", "setProperty('x'"),
    };
    assert.throws(() => assertThemesMatchReferences(altered));
  });

  it('fails when no reference source is supplied', () => {
    assert.throws(() => assertThemesMatchReferences({}));
  });
});

describe('themable tokens', () => {
  it('allows exactly --brand and --brand2, and nothing else', () => {
    assert.deepEqual([...THEME_TOKEN_NAMES], ['--brand', '--brand2']);
    assert.equal(
      assertThemeTokensOnly({ '--brand': '#2563eb', '--brand2': '#1e3a8a' }),
      true,
    );
  });

  it('rejects every attempt to theme a palette token', () => {
    for (const token of PROTECTED_TOKENS) {
      assert.throws(() => assertThemeTokensOnly({ [token]: '#ffffff' }), token);
    }
    assert.throws(() => assertThemeTokensOnly({ '--brand-size': '#ffffff' }));
    assert.throws(() => assertThemeTokensOnly({ color: '#ffffff' }));
  });

  it('rejects non-hex or non-lowercase-hex values', () => {
    for (const value of ['2563eb', '#2563EB', '#fff', '#2563ebbb', 'red', '', null, 42]) {
      assert.throws(() => assertThemeTokensOnly({ '--brand': value }), String(value));
    }
    assert.equal(isApprovedHex('#2563eb'), true);
    assert.equal(isApprovedHex('#2563EB'), false);
  });

  it('rejects a non-object declaration bag', () => {
    for (const value of [null, 'x', 42, []]) {
      assert.throws(() => assertThemeTokensOnly(value));
    }
  });

  it('lists the palette tokens that must never be themable', () => {
    assert.deepEqual([...PROTECTED_TOKENS], [
      '--bg',
      '--card',
      '--ink',
      '--muted',
      '--line',
      '--soft',
      '--side',
      '--shadow',
    ]);
  });
});

describe('approved palettes', () => {
  it('has exactly eight swatches per surface, matching the eight buttons', () => {
    for (const surface of Object.keys(THEME_SWATCHES)) {
      assert.equal(themePairCount(surface), THEME_SWATCH_COUNT, surface);
      assert.equal(THEME_SWATCH_COUNT, 8);
    }
  });

  it('reproduces the school workspace palette in locked order', () => {
    assert.deepEqual(
      THEME_SWATCHES[Surface.SCHOOL_DESKTOP].map((entry) => entry.key),
      [
        '#92573a|#4c291b',
        '#e11d48|#9f1239',
        '#ea580c|#9a3412',
        '#ca8a04|#854d0e',
        '#059669|#065f46',
        '#2563eb|#1e3a8a',
        '#3b4fb8|#1e2a5e',
        '#7c3aed|#4c1d95',
      ],
    );
  });

  it('preserves the locked 7th-swatch difference between school and platform', () => {
    // Super Admin uses its own brand pair where the school workspace uses indigo.
    assert.deepEqual(
      THEME_SWATCHES[Surface.PLATFORM].map((entry) => entry.key),
      [
        '#92573a|#4c291b',
        '#e11d48|#9f1239',
        '#ea580c|#9a3412',
        '#ca8a04|#854d0e',
        '#059669|#065f46',
        '#2563eb|#1e3a8a',
        '#3558c8|#1b2a6b',
        '#7c3aed|#4c1d95',
      ],
    );
    assert.notEqual(
      THEME_SWATCHES[Surface.PLATFORM][6].brand,
      THEME_SWATCHES[Surface.SCHOOL_DESKTOP][6].brand,
    );
  });

  it('keeps the mobile preview identical to the school workspace', () => {
    assert.deepEqual(
      THEME_SWATCHES[Surface.MOBILE_APP].map((e) => e.key),
      THEME_SWATCHES[Surface.SCHOOL_DESKTOP].map((e) => e.key),
    );
  });

  it('declares the base brand each reference actually ships', () => {
    assert.deepEqual({ ...DEFAULT_BRAND[Surface.SCHOOL_DESKTOP] }, {
      brand: '#2563eb',
      brand2: '#1e3a8a',
      key: '#2563eb|#1e3a8a',
    });
    assert.equal(DEFAULT_BRAND[Surface.PLATFORM].brand, '#3558c8');
  });

  it('contains no duplicate colour pair inside a palette', () => {
    for (const surface of Object.keys(THEME_SWATCHES)) {
      const keys = THEME_SWATCHES[surface].map((entry) => entry.key);
      assert.equal(new Set(keys).size, keys.length, surface);
    }
  });
});

describe('resolveThemeSwatch', () => {
  it('resolves an approved index', () => {
    assert.deepEqual({ ...resolveThemeSwatch(Surface.SCHOOL_DESKTOP, 0) }, {
      brand: '#92573a',
      brand2: '#4c291b',
      key: '#92573a|#4c291b',
    });
  });

  it('falls back to the surface default for an out-of-range index', () => {
    for (const index of [-1, 8, 99, 1.5, '2', null, undefined, NaN]) {
      assert.deepEqual(
        { ...resolveThemeSwatch(Surface.SCHOOL_DESKTOP, index) },
        { ...DEFAULT_BRAND[Surface.SCHOOL_DESKTOP] },
        String(index),
      );
    }
  });

  it('throws for a surface with no approved palette', () => {
    assert.throws(() => resolveThemeSwatch('admin', 0));
    assert.throws(() => resolveThemeSwatch(null, 0));
  });

  it('never returns a colour that is not in the approved palette', () => {
    for (let index = 0; index < THEME_SWATCH_COUNT; index += 1) {
      for (const surface of Object.keys(THEME_SWATCHES)) {
        const resolved = resolveThemeSwatch(surface, index);
        assert.equal(isApprovedHex(resolved.brand), true);
        assert.equal(isApprovedHex(resolved.brand2), true);
        assert.ok(
          THEME_SWATCHES[surface].some((entry) => entry.key === resolved.key) ||
            DEFAULT_BRAND[surface].key === resolved.key,
        );
      }
    }
  });
});

describe('themeDeclarations', () => {
  it('emits exactly the two properties the references setTheme() writes', () => {
    const declarations = themeDeclarations(Surface.SCHOOL_DESKTOP, 1);
    assert.deepEqual({ ...declarations }, { '--brand': '#e11d48', '--brand2': '#9f1239' });
    assert.deepEqual(Object.keys(declarations).sort(), ['--brand', '--brand2']);
    assert.equal(Object.isFrozen(declarations), true);
  });

  it('themes exactly --brand and --brand2 in every reference, whatever the mechanism', () => {
    for (const surface of Object.keys(SOURCES)) {
      const themed = [...SOURCES[surface].matchAll(/setProperty\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
      assert.deepEqual([...new Set(themed)].sort(), ['--brand', '--brand2'], surface);
    }
  });

  it('matches the setTheme(a, b) signature used by both desktop references', () => {
    for (const surface of [Surface.SCHOOL_DESKTOP, Surface.PLATFORM]) {
      assert.match(
        SOURCES[surface],
        /function setTheme\(a,b\)\{root\.style\.setProperty\('--brand',a\)/,
        surface,
      );
      assert.match(SOURCES[surface], /setProperty\('--brand2',b\)/, surface);
    }
  });

  it('notes that the mobile preview themes via dataset instead of setTheme()', () => {
    // Documented difference, not drift: the phone preview binds the same two
    // properties from data attributes on its own theme buttons.
    assert.doesNotMatch(SOURCES[Surface.MOBILE_APP], /function setTheme/);
    assert.match(SOURCES[Surface.MOBILE_APP], /setProperty\('--brand',b\.dataset\.a\)/);
  });

  it('never emits a property the reference does not already set', () => {
    for (const surface of Object.keys(THEME_SWATCHES)) {
      for (const name of Object.keys(themeDeclarations(surface, 0))) {
        assert.ok(SOURCES[surface].includes(`setProperty('${name}'`), `${surface} ${name}`);
      }
    }
  });
});

describe('immutability', () => {
  it('freezes every palette so a new colour cannot be injected at runtime', () => {
    for (const surface of Object.keys(THEME_SWATCHES)) {
      assert.equal(Object.isFrozen(THEME_SWATCHES[surface]), true, surface);
      assert.equal(Object.isFrozen(DEFAULT_BRAND[surface]), true, surface);
      for (const entry of THEME_SWATCHES[surface]) {
        assert.equal(Object.isFrozen(entry), true);
      }
    }
    assert.throws(() => {
      'use strict';
      THEME_SWATCHES[Surface.SCHOOL_DESKTOP].push({ brand: '#000000', brand2: '#000000' });
    });
    assert.throws(() => {
      'use strict';
      THEME_TOKEN_NAMES.push('--accent');
    });
  });
});