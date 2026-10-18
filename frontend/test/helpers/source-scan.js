/**
 * Test helper: read JavaScript source with comments removed.
 *
 * The B-O-02 / B-O-03 compliance guards scan `frontend/core/**` for forbidden
 * APIs. Those guards must inspect EXECUTABLE CODE only: several modules
 * deliberately *document in prose* that they never touch `localStorage`, and a
 * naive text scan would flag its own documentation and force the guard to be
 * weakened or the documentation to be censored.
 *
 * Limitation: this is a deliberately small stripper, not a parser. It is
 * sufficient because `frontend/core/**` is small, dependency-free and does not
 * embed block-comment-like text inside string literals.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Remove `/* ... *\/` block comments and `// ...` line comments.
 * @param {string} source
 * @returns {string}
 */
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, ' ');
}

/**
 * Read a source file with comments stripped.
 * @param {string} absolutePath
 */
export function readCode(absolutePath) {
  return stripComments(readFileSync(absolutePath, 'utf8'));
}

/**
 * Recursively list `.js` / `.mjs` files.
 * @param {string} dir
 * @returns {string[]}
 */
export function listSourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSourceFiles(full));
    else if (entry.isFile() && /\.(js|mjs)$/.test(entry.name)) out.push(full);
  }
  return out.sort();
}