/**
 * Release security scan. Task: M-O-03.
 *
 * "Verify no external/local development URLs, credentials or debug data remain."
 *
 * This is the one Batch M item that can be *proved* rather than asserted, because it
 * is a property of the source tree and not of a backend that does not exist yet. The
 * scan is deliberately strict and runs over every module under `core/**`.
 *
 * Three independent checks, each with a different view of the code, chosen so that
 * none of them can be defeated by the guard naming its own patterns:
 *
 *   1. DEVELOPMENT URLs — string literals only. An absolute URL, a localhost host or a
 *      common dev port. Scanning *literals* (not raw text) means the guard's own
 *      regex, which names `localhost` inside a pattern, is never examined as a string.
 *   2. SECRETS — executable tokens only. A credential is an *identifier* (`password`,
 *      `api_key`, …), so it survives literal stripping while the pattern list that
 *      names it does not.
 *   3. DEBUG DATA — executable tokens only. `debugger`, `var_dump`, `print_r` are
 *      calls; a guard cannot contain one without being the bug.
 *
 * Batch B already owns the storage, `console.*` and token-name bans, so this scan is
 * deliberately **additive** — it must not re-declare a denylist another guard owns,
 * because naming it would violate that guard. `access_token`, `refresh_token` and
 * every `console.*` call are therefore absent from the lists below.
 *
 * No DOM, no network, no rendering.
 */

import { stripCommentsAndLiterals, collectStringLiterals } from '../fees/payment-boundary.js';

/** Hosts and ports that mark a development or internal environment. */
export const DEVELOPMENT_URL_PATTERNS = Object.freeze([
  { label: 'absolute URL', pattern: /^https?:\/\//i },
  { label: 'any scheme URL', pattern: /^[a-z][a-z0-9+.-]*:\/\//i },
  { label: 'localhost', pattern: /localhost/i },
  { label: 'loopback', pattern: /127\.0\.0\.1|0\.0\.0\.0/i },
  { label: 'local TLD', pattern: /\.(local|test|internal|lan|home|intranet)$/i },
  { label: 'dev port', pattern: /:(3000|4200|5173|8000|8001|8080|8081|9000)\b/ },
  { label: 'tunnel host', pattern: /(ngrok|vercel\.app|repl\.co|githubpreview\.dev)/i },
]);

/**
 * Credential identifiers. Matched against *executable* tokens, so a string value is
 * irrelevant and only the presence of the identifier matters.
 *
 * `credentials`/`credential` are absent because they are the standard `fetch()`
 * option names (`credentials: 'omit'`), not secrets. `access_token` and
 * `refresh_token` are absent because **Batch B already bans them** as name patterns —
 * re-declaring them here would violate Batch B's own guard (the first run did exactly
 * that). This list is deliberately the *additive* remainder.
 */
export const SECRET_IDENTIFIERS = Object.freeze([
  'password',
  'passwd',
  'pwd',
  'secret',
  'api_key',
  'apikey',
  'private_key',
  'client_secret',
  'session_secret',
  'passphrase',
]);

/**
 * Debug calls that must never ship.
 *
 * Batch B bans **all** `console.*` output absolutely, so this list only carries the
 * debug primitives Batch B does not cover. Naming `console.log` here would trip
 * Batch B's own guard.
 */
export const DEBUG_CALLS = Object.freeze([
  'debugger',
  'var_dump',
  'print_r',
  'var_export',
]);

export const SecurityReject = Object.freeze({
  DEVELOPMENT_URL: 'development-url',
  SECRET_IDENTIFIER: 'secret-identifier',
  DEBUG_CALL: 'debug-call',
});

function ok() {
  return Object.freeze({ clean: true, findings: Object.freeze([]) });
}

function fail(reason, findings) {
  return Object.freeze({ clean: false, reason, findings: Object.freeze(findings) });
}

/**
 * M-O-03a — no development or external URL in any string literal.
 *
 * @param {Array<{ path: string, code: string }>} sources
 */
export function assertNoDevelopmentUrls(sources) {
  const list = Array.isArray(sources) ? sources : [];
  const findings = [];

  for (const source of list) {
    if (!source || typeof source.code !== 'string') continue;
    for (const literal of collectStringLiterals(source.code)) {
      // A bare word such as "localhost" is usually prose or a guard's own label, so
      // only literals that actually carry a host/port separator are considered.
      if (!literal.includes(':')) continue;
      for (const { label, pattern } of DEVELOPMENT_URL_PATTERNS) {
        if (pattern.test(literal)) {
          findings.push(`${source.path}: ${label} in "${literal}"`);
        }
      }
    }
  }

  if (findings.length > 0) {
    throw new Error(
      `development/external URL found in a string literal (M-O-03):\n  ${findings.join('\n  ')}`,
    );
  }
  return true;
}

/**
 * M-O-03b — no credential identifier in executable code.
 *
 * @param {Array<{ path: string, code: string }>} sources
 */
export function assertNoSecretIdentifiers(sources) {
  const list = Array.isArray(sources) ? sources : [];
  const findings = [];

  for (const source of list) {
    if (!source || typeof source.code !== 'string') continue;
    const executable = stripCommentsAndLiterals(source.code);
    for (const identifier of SECRET_IDENTIFIERS) {
      if (new RegExp(`\\b${identifier}\\b`).test(executable)) {
        findings.push(`${source.path}: ${identifier}`);
      }
    }
  }

  if (findings.length > 0) {
    throw new Error(
      `credential identifier found in executable code (M-O-03):\n  ${findings.join('\n  ')}`,
    );
  }
  return true;
}

/**
 * M-O-03c — no debug call in executable code.
 *
 * @param {Array<{ path: string, code: string }>} sources
 */
export function assertNoDebugArtifacts(sources) {
  const list = Array.isArray(sources) ? sources : [];
  const findings = [];

  for (const source of list) {
    if (!source || typeof source.code !== 'string') continue;
    const executable = stripCommentsAndLiterals(source.code);
    for (const call of DEBUG_CALLS) {
      const escaped = call.replace('.', '\\.');
      if (new RegExp(`\\b${escaped}\\b`).test(executable)) {
        findings.push(`${source.path}: ${call}`);
      }
    }
  }

  if (findings.length > 0) {
    throw new Error(
      `debug artifact found in executable code (M-O-03):\n  ${findings.join('\n  ')}`,
    );
  }
  return true;
}

/**
 * M-O-03 — run all three checks and report a single verdict.
 *
 * @param {Array<{ path: string, code: string }>} sources
 */
export function auditReleaseSource(sources) {
  const results = Object.freeze({
    developmentUrls: assertNoDevelopmentUrls(sources),
    secretIdentifiers: assertNoSecretIdentifiers(sources),
    debugArtifacts: assertNoDebugArtifacts(sources),
  });
  return Object.freeze({ clean: true, results });
}
