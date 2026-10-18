/**
 * Hardening tests. Tasks: M-O-02, M-O-03.
 * The M-O-03 scans are the deliverable: they are provable properties of the source tree.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { Surface } from '../core/auth/index.js';
import {
  APPROVED_STATE_SURFACES,
  DEBUG_CALLS,
  DEVELOPMENT_URL_PATTERNS,
  FORBIDDEN_STATE_SURFACES,
  INTEGRATION_AUTHORIZED,
  PENDING_INTEGRATION_CONTRACTS,
  SECRET_IDENTIFIERS,
  assertApprovedStateSurfacesOnly,
  assertNoCustomStateSurface,
  assertNoDebugArtifacts,
  assertNoDevelopmentUrls,
  assertNoInventedIntegrationSchemas,
  assertNoSecretIdentifiers,
  assertStateSurfacesMatchReferences,
  auditReleaseSource,
  describeIntegrationBlock,
} from '../core/hardening/index.js';
import { listSourceFiles, readCode } from './helpers/source-scan.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REF_DIR = resolve(REPO_ROOT, 'zee_education_multi_agent_handoff', 'agents', 'opencode', 'reference_ui');
const CORE_DIR = resolve(REPO_ROOT, 'frontend', 'core');

function readReference(fragment) {
  const matches = readdirSync(REF_DIR).filter((name) => name.includes(fragment));
  assert.equal(matches.length, 1, `exactly one reference containing "${fragment}"`);
  return readFileSync(resolve(REF_DIR, matches[0]), 'utf8');
}

const REFERENCES = Object.freeze({
  'school-desktop': readReference('School Dashboard'),
  'mobile-app': readReference('Mobile App Preview'),
  platform: readReference('Super Admin'),
});

function coreSources() {
  return listSourceFiles(CORE_DIR).map((file) => ({
    path: file.replace(`${REPO_ROOT}\\`, '').replace(/\//g, '\\'),
    code: readCode(file),
  }));
}

describe('M-O-02 — every loading/error/empty state uses existing approved UI', () => {
  it('passes the reference drift guard', () => {
    assert.equal(assertStateSurfacesMatchReferences(REFERENCES), true);
  });

  it('scans the whole core tree and creates no new state surface', () => {
    assert.equal(assertNoCustomStateSurface(coreSources()), true);
  });

  it('would fail on a spinner, skeleton or DOM write', () => {
    assert.throws(() => assertNoCustomStateSurface([{ path: 'a.js', code: "el.innerHTML = '<div class=\"skeleton\"></div>'" }]));
    assert.throws(() => assertNoCustomStateSurface([{ path: 'a.js', code: "el.appendChild(node)" }]));
    assert.throws(() => assertNoCustomStateSurface([{ path: 'a.js', code: 'document.createElement("div")' }]));
  });

  it('names exactly the two approved feedback surfaces', () => {
    assert.deepEqual(Object.keys(APPROVED_STATE_SURFACES), ['toast', 'card']);
    assert.equal(APPROVED_STATE_SURFACES.toast.hook, '#toast');
    assert.equal(APPROVED_STATE_SURFACES.card.hook, '.card{');
  });

  it('refuses a third state surface, which would be a visual change', () => {
    assert.equal(assertApprovedStateSurfacesOnly(['toast', 'card']), true);
    assert.throws(() => assertApprovedStateSurfacesOnly(['toast', 'card', 'spinner']), /visual change/);
    assert.throws(() => assertApprovedStateSurfacesOnly(['toast', 'banner']));
    assert.equal(assertApprovedStateSurfacesOnly([]), true);
  });

  it('the forbidden list is closed', () => {
    assert.deepEqual(
      [...FORBIDDEN_STATE_SURFACES],
      ['spinner', 'skeleton', 'shimmer', 'placeholder-block', 'loading-bar', 'error-banner', 'error-modal', 'snackbar', 'drawer-backdrop'],
    );
  });
});

describe('M-O-03 — no development URLs, credentials or debug data', () => {
  it('scans the whole core tree and finds no development URL', () => {
    assert.equal(assertNoDevelopmentUrls(coreSources()), true);
  });

  it('catches every development URL shape', () => {
    const cases = [
      "const u = 'http://localhost:8080'",
      "const u = 'https://staging.example.com'",
      "const u = 'https://api.test/v1'",
      "const u = 'https://x.ngrok.io'",
      "const u = 'ftp://files.local/x'",
      "const u = 'http://127.0.0.1:3000'",
    ];
    for (const code of cases) {
      assert.throws(() => assertNoDevelopmentUrls([{ path: 'a.js', code }]), code);
    }
  });

  it('does not flag a relative API path', () => {
    assert.equal(assertNoDevelopmentUrls([{ path: 'a.js', code: "const u = '/fee/school-slug/invoices'" }]), true);
    assert.equal(assertNoDevelopmentUrls([{ path: 'a.js', code: "const u = 'health'" }]), true);
    assert.equal(assertNoDevelopmentUrls([{ path: 'a.js', code: "const u = 'report_export.csv'" }]), true);
  });

  it('scans the whole core tree and finds no secret identifier', () => {
    assert.equal(assertNoSecretIdentifiers(coreSources()), true);
  });

  it('catches a credential identifier in executable code', () => {
    assert.throws(() => assertNoSecretIdentifiers([{ path: 'a.js', code: "const cfg = { password: 'x' }" }]));
    assert.throws(() => assertNoSecretIdentifiers([{ path: 'a.js', code: 'const api_key = "k"' }]));
    assert.throws(() => assertNoSecretIdentifiers([{ path: 'a.js', code: 'const private_key = "k"' }]));
  });

  it('leaves console and token-name bans to Batch B', () => {
    // Batch B bans every console.* call and the access_token/refresh_token names.
    // Re-declaring them here would violate Batch B's own guard.
    assert.ok(!SECRET_IDENTIFIERS.includes('access_token'));
    assert.ok(!SECRET_IDENTIFIERS.includes('refresh_token'));
    for (const call of DEBUG_CALLS) assert.ok(!call.startsWith('console.'), call);
  });

  it('ignores a credential named only inside a string', () => {
    // A pattern list may name a secret; that is not a secret.
    assert.equal(assertNoSecretIdentifiers([{ path: 'a.js', code: "const forbidden = ['password', 'secret']" }]), true);
  });

  it('scans the whole core tree and finds no debug artifact', () => {
    assert.equal(assertNoDebugArtifacts(coreSources()), true);
  });

  it('catches every debug call', () => {
    for (const call of DEBUG_CALLS) {
      const code = call === 'debugger' ? 'debugger;' : `${call}("x")`;
      assert.throws(() => assertNoDebugArtifacts([{ path: 'a.js', code }]), call);
    }
  });

  it('ignores a debug call named only inside a string', () => {
    assert.equal(assertNoDebugArtifacts([{ path: 'a.js', code: "const deny = ['console.log']" }]), true);
  });

  it('reports one clean verdict for the whole tree', () => {
    const verdict = auditReleaseSource(coreSources());
    assert.equal(verdict.clean, true);
    assert.deepEqual(Object.keys(verdict.results), ['developmentUrls', 'secretIdentifiers', 'debugArtifacts']);
  });

  it('keeps the pattern lists closed', () => {
    assert.equal(DEVELOPMENT_URL_PATTERNS.length, 7);
    assert.ok(SECRET_IDENTIFIERS.includes('password'));
    assert.ok(SECRET_IDENTIFIERS.includes('api_key'));
    // Standard fetch option names are not secrets.
    assert.ok(!SECRET_IDENTIFIERS.includes('credentials'));
    assert.ok(DEBUG_CALLS.includes('debugger'));
    assert.ok(DEBUG_CALLS.includes('var_dump'));
  });
});

describe('no invented integration contract', () => {
  it('confirms nothing is authorized', () => {
    assert.equal(INTEGRATION_AUTHORIZED, false);
    assert.equal(describeIntegrationBlock().schemaPublished, false);
  });

  it('covers the integration, recovery and regression capabilities', () => {
    assert.deepEqual(
      PENDING_INTEGRATION_CONTRACTS.map((c) => c.id),
      ['integration-smoke', 'backup-restore', 'ui-regression-matrix'],
    );
  });

  it('declares no endpoint or payload and fails closed otherwise', () => {
    assert.equal(assertNoInventedIntegrationSchemas(), true);
    const base = {
      id: 'integration-smoke',
      status: 'blocked-needs-provisioning-path',
      method: null,
      path: null,
      requestSchema: null,
      responseSchema: null,
      implemented: false,
    };
    assert.throws(() => assertNoInventedIntegrationSchemas([{ ...base, method: 'GET' }]));
    assert.throws(() => assertNoInventedIntegrationSchemas([{ ...base, implemented: true }]));
  });
});
