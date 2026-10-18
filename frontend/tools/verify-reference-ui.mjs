#!/usr/bin/env node
/**
 * Reference UI lock verifier (supports O-00.1 and O-00.3).
 *
 * READ-ONLY. This tool only reads the approved reference HTML files and the
 * lock manifest, and compares their SHA-256 hashes. It never writes to the
 * reference directory.
 *
 * Usage:
 *   node tools/verify-reference-ui.mjs
 *   node tools/verify-reference-ui.mjs --dir "<path to reference_ui>"
 *   ZEE_REFERENCE_UI_DIR="<path>" node tools/verify-reference-ui.mjs
 *
 * Exit codes:
 *   0 = every file matches the approved lock
 *   1 = at least one mismatch / missing / extra file (UI LOCK VIOLATION)
 */

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REFERENCE_DIR = resolve(HERE, '..', '..', 'zee_education_multi_agent_handoff', 'agents', 'opencode', 'reference_ui');

function readEnv(name) {
  return typeof process !== 'undefined' && process.env ? process.env[name] : undefined;
}

function resolveReferenceDir(argv) {
  const flagIndex = argv.indexOf('--dir');
  if (flagIndex !== -1 && argv[flagIndex + 1]) {
    return resolve(argv[flagIndex + 1]);
  }
  const fromEnv = readEnv('ZEE_REFERENCE_UI_DIR');
  if (fromEnv && fromEnv.trim()) {
    return resolve(fromEnv.trim());
  }
  return DEFAULT_REFERENCE_DIR;
}

async function listReferenceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
    .map((entry) => entry.name)
    .sort();
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  const dir = resolveReferenceDir(process.argv.slice(2));
  const lockUrl = new URL('./reference-ui.lock.json', import.meta.url);
  const lock = JSON.parse(await readFile(lockUrl, 'utf8'));

  let present;
  try {
    present = await listReferenceFiles(dir);
  } catch (cause) {
    process.stdout.write(`FAIL reference directory is not readable: ${dir}\n${cause.message}\n`);
    process.exitCode = 1;
    return;
  }

  const expected = new Map(lock.files.map((file) => [file.name, file]));
  const problems = [];
  const rows = [];

  for (const name of present) {
    const file = expected.get(name);
    const bytes = await readFile(join(dir, name));
    const actual = sha256(bytes);

    if (!file) {
      problems.push(`unexpected file not present in the approved lock: ${name}`);
      rows.push({ name, result: 'UNEXPECTED', actual, expected: null, size: bytes.length });
      continue;
    }

    if (actual !== file.sha256) {
      problems.push(`hash mismatch: ${name}`);
    } else if (bytes.length !== file.bytes) {
      problems.push(`byte-size mismatch: ${name}`);
    }

    rows.push({
      name,
      result: actual === file.sha256 && bytes.length === file.bytes ? 'MATCH' : 'MISMATCH',
      actual,
      expected: file.sha256,
      size: bytes.length,
    });
  }

  for (const name of expected.keys()) {
    if (!present.includes(name)) {
      problems.push(`locked file is missing from the reference directory: ${name}`);
      rows.push({ name, result: 'MISSING', actual: null, expected: expected.get(name).sha256, size: null });
    }
  }

  for (const row of rows) {
    process.stdout.write(`${row.result.padEnd(11)}${row.name}\n`);
    process.stdout.write(`            bytes=${row.size}\n`);
    process.stdout.write(`            sha256=${row.actual ?? '(none)'}\n`);
  }

  if (problems.length === 0) {
    process.stdout.write(`\nUI LOCK OK — ${rows.length}/${lock.files.length} reference files unchanged.\n`);
    return;
  }

  process.stdout.write('\nUI LOCK VIOLATION\n');
  for (const problem of problems) {
    process.stdout.write(`  - ${problem}\n`);
  }
  process.stdout.write(
    '\nPer REFERENCE_UI_LOCK.md: revert any change to an approved reference file.\n',
  );
  process.exitCode = 1;
}

await main();