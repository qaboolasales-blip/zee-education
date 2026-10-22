/**
 * Auth contract gate. Tasks: B-O-01, B-O-02, B-O-03.
 *
 * These tests make the block self-enforcing and prove that B-O-02/B-O-03 were
 * not quietly implemented:
 *   - no auth contract document exists (the recorded B-O-01 block);
 *   - no auth contract entry carries an invented endpoint or payload;
 *   - no session storage / token handling exists anywhere in `core/`;
 *   - the API client sends no credential and has no refresh behaviour.
 *
 * If KiloCode publishes the real contract, these tests are expected to fail
 * deliberately, prompting an update of `core/auth/contracts/pending-auth-contract.js`.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  AUTH_INTEGRATION_AUTHORIZED,
  AUTH_CONTRACT_AUTH_ENDPOINTS_PUBLISHED,
  AuthContractStatus,
  AUTH_CONTRACT_DOC_EXISTS,
  AUTH_CONTRACT_DOC_STATUS,
  AUTH_CONTRACT_DOC_VERSION,
  EXPECTED_AUTH_CONTRACT_DOC,
  EXPECTED_AUTH_DESIGN_DOC,
  EXPECTED_AUTH_ENDPOINTS_DOC,
  EXPECTED_ROLE_POLICY_DOC,
  EXPECTED_ROLE_FILTER_DOC,
  EXPECTED_ROLE_FILTER_IMPL,
  EXPECTED_ROLE_POLICY_IMPL,
  PENDING_AUTH_CONTRACTS,
  PUBLISHED_AUTH_ENDPOINTS,
  PUBLISHED_AUTH_POLICY,
  SERVER_ROLE_VOCABULARY,
  SOURCE_OBSERVATIONS,
  assertNoInventedAuthSchemas,
  describeAuthBlock,
  findPendingAuthContract,
  isPublishedAuthCapability,
  serverRoleToApprovedLabel,
} from '../core/auth/contracts/pending-auth-contract.js';
import { Role } from '../core/auth/index.js';
import { createApiClient } from '../core/api/client.js';
import { listSourceFiles, readCode } from './helpers/source-scan.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const CORE_DIR = resolve(HERE, '..', 'core');

describe('B-O-01 — published auth contract state', () => {
  it('has a published contract document', () => {
    assert.equal(existsSync(resolve(REPO_ROOT, 'backend', 'docs', 'api', 'openapi-v0.md')), true);
    assert.equal(AUTH_CONTRACT_DOC_EXISTS, true);
    assert.equal(AUTH_CONTRACT_DOC_VERSION, '0.1.0');
    assert.equal(AUTH_CONTRACT_DOC_STATUS, 'DRAFT — Batch A baseline');
  });

  it('now publishes real authentication endpoints', () => {
    const doc = readFileSync(
      resolve(REPO_ROOT, 'backend', 'docs', 'api', 'openapi-v0.md'),
      'utf8',
    );

    // The contract gained a "Batch B: Authentication Endpoints" section. The
    // documented endpoint list is no longer just /health and /setup. The
    // method token may be compound (`GET/POST`), so the pattern anchors on the
    // path — a token starting with `/` — rather than on the method alternation.
    const documented = [...doc.matchAll(/^###\s+(\S+)\s+(\/\S+)/gm)].map((m) => `${m[1]} ${m[2]}`);
    assert.deepEqual(documented, ['GET /health', 'GET /setup', 'GET/POST /login', 'GET /logout', 'GET/POST /register', 'GET/POST /forgot', 'GET/POST /reset-password']);
    assert.match(doc, /## Batch B: Authentication Endpoints/);

    assert.equal(AUTH_CONTRACT_AUTH_ENDPOINTS_PUBLISHED, true);
    assert.deepEqual(
      PUBLISHED_AUTH_ENDPOINTS.map((endpoint) => endpoint.path),
      ['/login', '/logout', '/register', '/forgot', '/reset-password'],
    );
    assert.equal(existsSync(resolve(REPO_ROOT, EXPECTED_AUTH_ENDPOINTS_DOC)), true);
    assert.equal(existsSync(resolve(REPO_ROOT, EXPECTED_AUTH_DESIGN_DOC)), true);
  });

  it('publishes the credential scheme — form login via Shield session cookie', () => {
    assert.equal(
      PUBLISHED_AUTH_POLICY.credentialScheme,
      'form-based login via CodeIgniter Shield Session authenticator; session cookie set by the server on the /login 302; no bearer token, no Authorization header, no client-side storage',
    );
    // The published auth endpoints, verbatim.
    const login = PUBLISHED_AUTH_ENDPOINTS.find((endpoint) => endpoint.path === '/login');
    assert.deepEqual([...login.methods], ['GET', 'POST']);
    assert.equal(login.auth, 'None (public)');
    assert.equal(login.success, '302 redirect to configured redirect');
    assert.equal(login.failure, '200 with validation errors');
    assert.equal(login.schemaPublished, false);

    const logout = PUBLISHED_AUTH_ENDPOINTS.find((endpoint) => endpoint.path === '/logout');
    assert.deepEqual([...logout.methods], ['GET']);
    assert.equal(logout.auth, 'Required');
    assert.equal(logout.success, '302 redirect to login');
    assert.equal(logout.schemaPublished, false);

    // The published security notes, verbatim.
    assert.deepEqual([...PUBLISHED_AUTH_POLICY.publishedSecurityNotes], [
      'No credentials logged on failure/success',
      'Login attempts tracked for security',
      'Server-side role enforcement via policies/filters',
      'No role trust from client input',
    ]);
  });

  it('publishes no refresh endpoint and no identity endpoint', () => {
    const paths = PUBLISHED_AUTH_ENDPOINTS.map((endpoint) => endpoint.path);
    assert.ok(!paths.includes('refresh'));
    assert.ok(!paths.includes('/me'));
    assert.ok(!paths.some((path) => /introspect|current-user|whoami/i.test(path)));
  });

  it('transcribes the contract policy without inventing a credential scheme', () => {
    assert.deepEqual([...PUBLISHED_AUTH_POLICY.authenticatedEndpointRequirements], [
      'Valid session or token',
      'Server-side tenant resolution',
      'Explicit CORS allowlist match (never wildcard)',
    ]);
    assert.equal(PUBLISHED_AUTH_POLICY.errorSemantics[401], 'Unauthenticated');
    assert.equal(PUBLISHED_AUTH_POLICY.errorSemantics[403], 'Forbidden — valid auth but insufficient scope');
  });

  it('has backend auth implementation wired through Shield', () => {
    // Inspect the declared route PATH only, so unrelated words in a controller
    // name (e.g. "Home") cannot produce a false positive. The snapshot below is
    // the full string-literal route surface; the auth routes themselves are
    // registered by service('auth')->routes($routes), which reads
    // config('AuthRoutes')->routes and registers Shield controllers under its
    // own namespace — not as string literals in Routes.php. This test asserts
    // that wiring is still present, NOT that the rest of the surface is auth.
    const routes = readFileSync(resolve(REPO_ROOT, 'backend', 'app', 'Config', 'Routes.php'), 'utf8');
    const declaredPaths = [...routes.matchAll(/\$routes->\w+\(\s*'([^']*)'/g)].map((m) => m[1]);
    assert.deepEqual(declaredPaths, [
      'health',
      'setup',
      'install',
      '/',
      'preflight',
      'database',
      'database',
      'admin',
      'admin',
      'install/done',
      'api/school',
      'students',
      'students',
      'invoices',
      // G6: staff and fees routes moved into the school-admin-only group, so
      // the second api/school literal now follows them (paths unchanged;
      // attendance keeps school_admin,teacher).
      'staff',
      'fees/invoices',
      'fees/receipts',
      'staff',
      'receipts',
      'api/school',
      'attendance',
      'attendance/batch',
      'attendance',
      'overview',
      'marks',
      'marks',
      'assessments',
      'assessments/status',
      'timetable',
      'timetable',
      'homework',
      'notices',
      'notices',
      'settings',
      'options',
      // School branding/config is a School Admin decision, so the settings
      // write sits in its own role-gated group.
      'api/school',
      'settings',
      'api/school',
      'export/(:any)',
      'print/(:any)',
      'api/health',
      'api/csrf',
      'api/connect',
      'resolve',
      'verify',
      'api/connect',
      'invite',
      'connect/qr',
      'admin/schools',
      '/',
      '/',
      'provision',
      'api/admin',
      'schools',
      'schools',
      'tickets',
      'tickets',
      'ratebook',
      'ratebook',
      'settings',
      'settings',
      'reminders',
      'reminders',
      'quotes',
      'quotes',
      'installations',
      'template-requests',
      'export/(:any)',
      'print/(:any)',
      '/',
      'portal',
      'api/admin/billing',
      'summary',
      'upcomings',
      'plans',
      'invoices/(:num)',
      'issue',
      'invoice',
      'pay',
      'void',
      'revoke',
      'renew',
      'school',
      'm',
    ]);
    assert.match(routes, /service\('auth'\)->routes\(\$routes\)/);

    const controllers = readdirSync(resolve(REPO_ROOT, 'backend', 'app', 'Controllers')).join(' ');
    assert.doesNotMatch(controllers, /auth|login|session|token|user|role|permission/i);
    assert.match(controllers, /Health|Home|Setup/);
  });

  it('has no user, session, token, permission or account table', () => {
    // KiloCode added `2026-10-18_000005_create_platform_roles.php` as part of
    // B-K-03. It is a SEED of the existing Shield `auth_groups` table — it
    // calls `table('auth_groups')->insertBatch(...)` and creates no table of
    // its own. A role seed is legitimate Batch B work; a user/session/token
    // table is not. So the check is on TABLE-CREATING migrations, not on the
    // word "role" appearing in a filename.
    //
    // `create_user_school_access` is the ADR-003 user-to-school access map
    // (control plane), not a users table. It trips the naive substring scan
    // below, so it is named explicitly as allowed — the singular alternations
    // stay in the regex so any NEW create_user_* migration is still caught.
    const migrationsDir = resolve(REPO_ROOT, 'backend', 'app', 'Database', 'Migrations');
    const migrationFiles = readdirSync(migrationsDir);
    const allowedException = '2026-10-18_000009_create_user_school_access.php';
    assert.ok(
      migrationFiles.includes(allowedException),
      'the user_school_access migration is present, so the exception cannot silently rot',
    );
    const names = migrationFiles.filter((name) => name !== allowedException).join(' ');
    assert.doesNotMatch(names, /create_(users|user|sessions|session|tokens|token|permissions|permission|accounts|account|auth_identities|auth_logins|auth_token_logins|auth_remember_tokens|auth_groups_users|auth_permissions_users)/i);
    assert.match(names, /schools|school_domains/);
    assert.ok(names.includes('platform_roles'), 'the platform_roles seed migration is present');
  });

  it('has no model layer for school-local data in the control plane', () => {
    // Same discriminator as the provisioning gate. KiloCode added a `SchoolLocal`
    // subdirectory (D-K-01) holding `AcademicSessionModel.php`, which maps to an
    // `academic_sessions` table that belongs to the PER-SCHOOL database, not the
    // control plane — so it is CORRECT and is checked separately. The control
    // plane itself must still contain only AuditEventModel and SchoolsModel.
    //
    // The forbidden-name scan is scoped to FILES in the top-level Models
    // directory, because `AcademicSessionModel.php` lives in SchoolLocal/ and
    // legitimately contains the word "Session". A subdirectory name is not a
    // model, so it is excluded from the name scan but still listed in the
    // directory assertion above.
    const models = readdirSync(resolve(REPO_ROOT, 'backend', 'app', 'Models'));
    assert.deepEqual(models, ['.gitkeep', 'AuditEventModel.php', 'SchoolLocal', 'SchoolsModel.php']);
    const schoolLocal = readdirSync(resolve(REPO_ROOT, 'backend', 'app', 'Models', 'SchoolLocal'));
    // FeeModel was split into FeeInvoiceModel + FeeReceiptModel with the fees
    // surface (invoices + receipts); same ADR-001 directory boundary.
    assert.deepEqual(schoolLocal, ['AcademicSessionModel.php','AssessmentModel.php','FeeInvoiceModel.php','FeeReceiptModel.php','HomeworkModel.php','NoticeModel.php','TimetableModel.php']);
    const topLevelFiles = models.filter((name) => name.endsWith('.php')).join(' ');
    for (const forbidden of [
      'Student', 'Guardian', 'Staff', 'Teacher', 'Attendance', 'Result',
      'Fee', 'Invoice', 'Payment', 'Discount', 'Fine', 'Timetable',
      'Homework', 'Notice', 'Assessment', 'Mark', 'Class', 'Section',
      'Subject', 'Session', 'Assignment', 'Export', 'PrintTemplate',
      'Commercial', 'Support', 'License', 'Renewal',
    ]) {
      assert.doesNotMatch(topLevelFiles, new RegExp(forbidden), `no ${forbidden} model may exist in the control plane`);
    }
    assert.ok(topLevelFiles.includes('AuditEventModel') && topLevelFiles.includes('SchoolsModel'));
  });

  it('names the documents KiloCode publishes the contract in', () => {
    assert.equal(EXPECTED_AUTH_CONTRACT_DOC, 'backend/docs/api/openapi-v0.md');
    assert.equal(EXPECTED_AUTH_ENDPOINTS_DOC, 'backend/docs/auth-endpoints.md');
    assert.equal(EXPECTED_AUTH_DESIGN_DOC, 'backend/docs/authentication-design.md');
  });
});

describe('B-O-03 — no invented auth contract', () => {
  it('covers the five auth capabilities the packet implies', () => {
    assert.deepEqual(
      PENDING_AUTH_CONTRACTS.map((contract) => contract.id).sort(),
      ['current-identity', 'login', 'logout', 'refresh', 'role-permissions'],
    );
  });

  it('marks login, logout and role-permissions as published, and the other two as blocked', () => {
    assert.equal(isPublishedAuthCapability('login'), true);
    assert.equal(isPublishedAuthCapability('logout'), true);
    assert.equal(isPublishedAuthCapability('role-permissions'), true);
    for (const id of ['refresh', 'current-identity']) {
      assert.equal(isPublishedAuthCapability(id), false, `${id} must not be published`);
    }
  });

  it('declares no endpoint, method or payload for any capability', () => {
    assert.equal(assertNoInventedAuthSchemas(), true);
    for (const contract of PENDING_AUTH_CONTRACTS) {
      // Three capabilities are now PUBLISHED — `login`, `logout` and
      // `role-permissions` — because the contract genuinely publishes those
      // endpoints and that vocabulary. But the contract publishes NO request
      // field names and NO JSON response body for any auth endpoint (success
      // is a 302 redirect, not a payload), and NO per-endpoint permission map.
      // So the schema fields stay null for every capability, published or not.
      assert.equal(contract.method, null, `${contract.id}.method`);
      assert.equal(contract.path, null, `${contract.id}.path`);
      assert.equal(contract.requestSchema, null, `${contract.id}.requestSchema`);
      assert.equal(contract.responseSchema, null, `${contract.id}.responseSchema`);
      assert.equal(contract.implemented, false, `${contract.id}.implemented`);
    }
  });

  it('does not authorize auth integration', () => {
    assert.equal(AUTH_INTEGRATION_AUTHORIZED, false);
  });

  it('fails closed if a schema or implementation claim is introduced', () => {
    const base = {
      id: 'login',
      status: AuthContractStatus.PUBLISHED,
      method: null,
      path: null,
      requestSchema: null,
      responseSchema: null,
      implemented: false,
    };
    // A published status is legal, but nothing else may be claimed with it.
    assert.doesNotThrow(() => assertNoInventedAuthSchemas([{ ...base }]));
    assert.throws(() => assertNoInventedAuthSchemas([{ ...base, path: '/api/login' }]));
    assert.throws(() => assertNoInventedAuthSchemas([{ ...base, method: 'POST' }]));
    assert.throws(() => assertNoInventedAuthSchemas([{ ...base, requestSchema: { username: 'string' } }]));
    assert.throws(() => assertNoInventedAuthSchemas([{ ...base, responseSchema: { token: 'string' } }]));
    assert.throws(() => assertNoInventedAuthSchemas([{ ...base, implemented: true }]));
    // An unknown status string is also rejected.
    assert.throws(() => assertNoInventedAuthSchemas([{ ...base, status: 'ready' }]));
  });

  it('records source observations as non-contracts', () => {
    assert.ok(SOURCE_OBSERVATIONS.length > 0);
    for (const observation of SOURCE_OBSERVATIONS) {
      assert.equal(observation.contract, false);
      assert.ok(observation.observation.length > 0);
    }
  });

  it('summarizes the block without leaking payload detail', () => {
    const summary = describeAuthBlock();
    // The contract document now exists AND now covers authentication.
    assert.equal(summary.exists, true);
    assert.equal(summary.contractCoversAuthentication, true);
    assert.equal(summary.backendAuthImplementationPresent, true);
    assert.equal(summary.authIntegrationAuthorized, false);
    assert.equal(summary.capabilities.length, 5);
    const serialized = JSON.stringify(summary);
    assert.doesNotMatch(serialized, /requestSchema|responseSchema|"token"|password/i);
  });

  it('looks capabilities up by id', () => {
    assert.equal(findPendingAuthContract('login').id, 'login');
    assert.equal(findPendingAuthContract('nonexistent'), null);
  });

  it('is deeply frozen', () => {
    for (const contract of PENDING_AUTH_CONTRACTS) {
      assert.equal(Object.isFrozen(contract), true);
    }
    assert.throws(() => {
      'use strict';
      PENDING_AUTH_CONTRACTS[0].implemented = true;
    });
  });
});

describe('B-O-02 — no session storage or token handling anywhere in core/', () => {
  const files = listSourceFiles(CORE_DIR);
  const rel = (file) => relative(REPO_ROOT, file).split(sep).join('/');

  /**
   * Files that legitimately contain credential NAMES, because they are the
   * guards that forbid them (a denylist has to name what it denies).
   * These are exempt from the name-based patterns only — never from the
   * storage or logging patterns below.
   */
  const DENYLIST_DECLARERS = new Set([
    'frontend/core/api/config.js',
    'frontend/core/auth/contracts/pending-auth-contract.js',
    'frontend/core/auth/session-state.js',
  ]);

  /**
   * Unambiguous bans: these can never legitimately appear anywhere, not even in
   * a denylist, and never in prose that is being executed as a string.
   */
  const absolutePatterns = [
    { label: 'localStorage', pattern: /\blocalStorage\b/ },
    { label: 'sessionStorage', pattern: /\bsessionStorage\b/ },
    { label: 'IndexedDB', pattern: /\bindexedDB\b/ },
    { label: 'document.cookie', pattern: /document\s*\.\s*cookie/ },
    { label: 'cookieStore', pattern: /\bcookieStore\b/ },
    { label: 'console output', pattern: /console\s*\./ },
  ];

  /**
   * Name-based bans: a credential name must never be *used*, only *named* by a
   * denylist. Scanned everywhere except the guard files themselves.
   */
  const namePatterns = [
    { label: 'Authorization header', pattern: /\bAuthorization\b/ },
    { label: 'Bearer scheme', pattern: /\bBearer\b/ },
    { label: 'Basic scheme', pattern: /\bBasic\s+[A-Za-z0-9]/ },
    { label: 'access_token', pattern: /access[_-]?token/i },
    { label: 'refresh_token', pattern: /refresh[_-]?token/i },
    { label: 'jwt', pattern: /\bjwt\b/i },
  ];

  it('scans every module of the core tree', () => {
    assert.ok(files.length >= 14, `expected the core tree to be scanned, got ${files.length}`);
    const names = files.map(rel);
    for (const required of [
      'frontend/core/api/client.js',
      'frontend/core/api/config.js',
      'frontend/core/api/errors.js',
      'frontend/core/auth/role-guard.js',
      'frontend/core/auth/screen-registry.js',
      'frontend/core/auth/session-state.js',
      'frontend/core/auth/contracts/pending-auth-contract.js',
      'frontend/core/format/money.js',
    ]) {
      assert.ok(names.includes(required), `${required} must be covered by the scan`);
    }
  });

  for (const { label, pattern } of absolutePatterns) {
    it(`contains no ${label} in any module`, () => {
      const offenders = files.filter((file) => pattern.test(readCode(file))).map(rel);
      assert.deepEqual(offenders, [], `${label} must not appear in executable code under frontend/core`);
    });
  }

  for (const { label, pattern } of namePatterns) {
    it(`uses ${label} nowhere, only names it in a denylist`, () => {
      const offenders = files
        .filter((file) => !DENYLIST_DECLARERS.has(rel(file)))
        .filter((file) => pattern.test(readCode(file)))
        .map(rel);
      assert.deepEqual(offenders, [], `${label} must not be used outside its own denylist`);
    });
  }

  it('confirms the exempt files really are only denylist declarations', () => {
    for (const guardFile of DENYLIST_DECLARERS) {
      const absolute = absolutePatterns.filter(({ pattern }) =>
        pattern.test(readCode(resolve(REPO_ROOT, guardFile))),
      );
      assert.deepEqual(
        absolute.map((entry) => entry.label),
        [],
        `${guardFile} must still respect the absolute bans`,
      );
    }
  });

  it('has no refresh or login request implementation', () => {
    const offenders = files
      .filter((file) =>
        /\.(post|get)\(\s*['"`][^'"`]*(login|logout|refresh|signin|sign-in|token)/i.test(readCode(file)),
      )
      .map(rel);
    assert.deepEqual(offenders, []);
  });
});

describe('B-O-03 — the API client carries no credential and no refresh behaviour', () => {
  function fakeFetch() {
    throw new Error('fakeFetch must not be called in gate tests');
  }

  it('sends no Authorization, Cookie or token header', async () => {
    let captured = null;
    const api = createApiClient({ basePath: '/api' }, {
      env: {},
      fetchImpl: async (url, init) => {
        captured = { url, init };
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          text: async () => '{}',
        };
      },
    });

    await api.post('/anything', { json: { a: 1 } });

    const headerNames = Object.keys(captured.init.headers);
    for (const name of headerNames) {
      assert.doesNotMatch(name, /authorization|cookie|token|secret|api-key/i, name);
    }
    assert.deepEqual([...headerNames].sort(), ['accept', 'content-type']);
    assert.equal(captured.init.credentials, 'same-origin');
  });

  it('exposes no refresh, login or logout method', () => {
    const api = createApiClient({ basePath: '/api' }, { env: {}, fetchImpl: fakeFetch });
    assert.deepEqual(Object.keys(api).sort(), [
      'basePath',
      'buildUrl',
      'credentials',
      'get',
      'post',
      'request',
      'timeoutMs',
    ]);
    for (const forbidden of ['refresh', 'login', 'logout', 'setToken', 'withAuth']) {
      assert.equal(api[forbidden], undefined, forbidden);
    }
  });

  it('does not retry a 401 automatically', async () => {
    let calls = 0;
    const api = createApiClient({ basePath: '/api' }, {
      env: {},
      fetchImpl: async () => {
        calls += 1;
        return {
          ok: false,
          status: 401,
          headers: { get: () => null },
          text: async () => '',
        };
      },
    });

    await assert.rejects(() => api.get('/anything'), (error) => error.kind === 'http' && error.status === 401);
    assert.equal(calls, 1, 'a 401 must not trigger an automatic retry');
  });

  it('still sends no Authorization header even though /login and /logout are now published', async () => {
    // The contract now publishes a credential scheme — form login via a
    // server-side Shield session cookie — but it publishes no bearer token
    // and no Authorization header, and no client-side storage. The client
    // must therefore keep sending no credential header of any kind, and must
    // keep relying on same-origin cookies the browser manages.
    let captured = null;
    const api = createApiClient({ basePath: '/api' }, {
      env: {},
      fetchImpl: async (url, init) => {
        captured = { url, init };
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          text: async () => '{}',
        };
      },
    });

    await api.get('/login');
    const headerNames = Object.keys(captured.init.headers);
    for (const name of headerNames) {
      assert.doesNotMatch(name, /authorization|cookie|token|secret|api-key/i, name);
    }
    // A GET carries no body, so the client sends only `accept`. That is the
    // real, tested behaviour — asserting `content-type` here would be wrong.
    assert.deepEqual([...headerNames].sort(), ['accept']);
    assert.equal(captured.init.credentials, 'same-origin');
    // And it must still refuse to build an absolute URL, because the contract's
    // Base URL section documents `http://localhost:8080/` for server-side use
    // only — browser code must stay relative (UNIVERSAL_RULES LAW 4).
    assert.match(captured.url, /^\/api\/login$/);
  });
});

/**
 * B-O-02 / B-O-03 — DELIVERED, contract-backed.
 *
 * These two tasks were BLOCKED in Batch B because no auth contract existed.
 * KiloCode published one on 2026-10-18. The published scheme is a server-side
 * Shield session cookie with no bearer token, no Authorization header and no
 * client-side storage — which is exactly the posture the existing policies
 * already enforced. The tests below now assert the contract-backed reason
 * rather than a precaution, so they cannot regress silently.
 */
describe('B-O-02/B-O-03 — delivered once the contract was published', () => {
  const files = listSourceFiles(CORE_DIR);
  const rel = (file) => relative(REPO_ROOT, file).split(sep).join('/');

  it('publishes a credential scheme that requires no client-side storage', () => {
    assert.equal(
      PUBLISHED_AUTH_POLICY.credentialScheme,
      'form-based login via CodeIgniter Shield Session authenticator; session cookie set by the server on the /login 302; no bearer token, no Authorization header, no client-side storage',
    );
    // The scheme is server-side cookie based, so there is nothing for the
    // browser to store. That is a property of the contract, not a
    // precaution, and it is what justifies the absolute bans below.
    assert.match(PUBLISHED_AUTH_POLICY.credentialScheme, /session cookie set by the server/);
    // The published scheme names what it does NOT use, so assert the positive
    // form rather than a negated regex against the same string.
    assert.match(PUBLISHED_AUTH_POLICY.credentialScheme, /form-based login/);
    assert.match(PUBLISHED_AUTH_POLICY.credentialScheme, /Shield Session authenticator/);
  });

  it('publishes no refresh endpoint, so no refresh behaviour can exist', () => {
    const paths = PUBLISHED_AUTH_ENDPOINTS.map((endpoint) => endpoint.path);
    assert.ok(!paths.includes('refresh'));
    assert.ok(!paths.some((path) => /token|refresh|rotate/i.test(path)));
    const api = createApiClient({ basePath: '/api' }, { env: {}, fetchImpl: () => { throw new Error('must not be called'); } });
    for (const forbidden of ['refresh', 'login', 'logout', 'setToken', 'withAuth']) {
      assert.equal(api[forbidden], undefined, forbidden);
    }
  });

  it('publishes no identity/introspection endpoint, so the role still cannot be read from the browser', () => {
    const paths = PUBLISHED_AUTH_ENDPOINTS.map((endpoint) => endpoint.path);
    assert.ok(!paths.includes('/me'));
    assert.ok(!paths.some((path) => /introspect|current-user|whoami|profile/i.test(path)));
    // auth()->user() is a server-side helper documented in auth-endpoints.md,
    // not an HTTP endpoint.
    assert.equal(isPublishedAuthCapability('current-identity'), false);
  });

  it('publishes the role vocabulary and the server-side enforcement mechanism', () => {
    // KiloCode published `docs/role-permission-policy.md` (B-K-03) and
    // `docs/role-filter-implementation.md` (B-K-06), plus `app/Filters/RoleFilter.php`
    // and `app/Policies/RolePolicy.php`. The role vocabulary is now defined and
    // the enforcement is server-side. That is enough to mark the capability
    // PUBLISHED and to map server roles onto the approved screens — but it is
    // NOT enough to authorize frontend binding, because the vocabulary is a
    // server-side group name, not a claim the browser can read or assert.
    assert.equal(isPublishedAuthCapability('role-permissions'), true);
    const contract = findPendingAuthContract('role-permissions');
    assert.equal(contract.status, AuthContractStatus.PUBLISHED);
    assert.match(contract.blocker, /per-endpoint permission requirement map/);
    assert.match(contract.blocker, /403 response/);
    assert.match(contract.blocker, /must never be treated as a security boundary/);
    const rolePolicy = readFileSync(
      resolve(REPO_ROOT, 'backend', 'docs', 'role-permission-policy.md'),
      'utf8',
    );
    const filterDoc = readFileSync(
      resolve(REPO_ROOT, 'backend', 'docs', 'role-filter-implementation.md'),
      'utf8',
    );
    for (const role of ['super_admin', 'school_admin', 'teacher', 'parent', 'student']) {
      assert.ok(rolePolicy.includes(role), `role vocabulary must name ${role}`);
    }
    assert.match(rolePolicy, /Authorization is never trusted from client input/);
    assert.match(filterDoc, /Browser cannot self-assign roles/);
    assert.equal(existsSync(resolve(REPO_ROOT, 'backend', 'app', 'Filters', 'RoleFilter.php')), true);
    assert.equal(existsSync(resolve(REPO_ROOT, 'backend', 'app', 'Policies', 'RolePolicy.php')), true);

    // The guard's published server-vocabulary map must cover all five, and its
    // labels must match the approved Role constants (cross-checked below).
    const vocabulary = Object.keys(SERVER_ROLE_VOCABULARY);
    assert.deepEqual(vocabulary.sort(), ['parent', 'school_admin', 'student', 'super_admin', 'teacher']);
  });

  it('cross-checks the vocabulary labels against the approved Role constants', () => {
    // The vocabulary is a contract record, not a copy of role-guard.js, so the
    // two must be checked against each other rather than assumed identical.
    // If they drift, the guard would translate a server role to a label the
    // approved product model does not recognise.
    assert.deepEqual(
      Object.entries(SERVER_ROLE_VOCABULARY),
      [
        ['super_admin', Role.SUPER_ADMIN],
        ['school_admin', Role.SCHOOL_ADMIN],
        ['teacher', Role.TEACHER],
        ['parent', Role.PARENT],
        ['student', Role.STUDENT],
      ],
    );
  });

  it('translates server role group names to approved labels, and denies unknowns', () => {
    // The vocabulary is a CONTRACT (published), so the guard can translate
    // between the Shield group name and the approved label without guessing.
    // An unknown group name must never be widened to a known role.
    assert.equal(serverRoleToApprovedLabel('super_admin'), Role.SUPER_ADMIN);
    assert.equal(serverRoleToApprovedLabel('school_admin'), Role.SCHOOL_ADMIN);
    assert.equal(serverRoleToApprovedLabel('teacher'), Role.TEACHER);
    assert.equal(serverRoleToApprovedLabel('parent'), Role.PARENT);
    assert.equal(serverRoleToApprovedLabel('student'), Role.STUDENT);
    assert.equal(serverRoleToApprovedLabel('admin'), null);
    assert.equal(serverRoleToApprovedLabel('Super_Admin'), null);
    assert.equal(serverRoleToApprovedLabel('teacher '), null);
    assert.equal(serverRoleToApprovedLabel(null), null);
    assert.equal(serverRoleToApprovedLabel(undefined), null);
    assert.equal(serverRoleToApprovedLabel(42), null);
  });

  it('publishes no request field names and no JSON body for any auth endpoint', () => {
    for (const endpoint of PUBLISHED_AUTH_ENDPOINTS) {
      assert.equal(endpoint.schemaPublished, false, `${endpoint.path} must not claim a published schema`);
    }
    for (const contract of PENDING_AUTH_CONTRACTS) {
      assert.equal(contract.method, null, `${contract.id}.method`);
      assert.equal(contract.path, null, `${contract.id}.path`);
      assert.equal(contract.requestSchema, null, `${contract.id}.requestSchema`);
      assert.equal(contract.responseSchema, null, `${contract.id}.responseSchema`);
      assert.equal(contract.implemented, false, `${contract.id}.implemented`);
    }
  });

  it('keeps the credential header bans absolute even though a scheme now exists', () => {
    // The scheme is a cookie, so the absolute bans are still correct: the
    // browser must never attach an Authorization header, a Bearer token or a
    // client-set Cookie header, and must never read or write any storage.
    const absolutePatterns = [
      { label: 'localStorage', pattern: /\blocalStorage\b/ },
      { label: 'sessionStorage', pattern: /\bsessionStorage\b/ },
      { label: 'IndexedDB', pattern: /\bindexedDB\b/ },
      { label: 'document.cookie', pattern: /document\s*\.\s*cookie/ },
      { label: 'cookieStore', pattern: /\bcookieStore\b/ },
      { label: 'console output', pattern: /console\s*\./ },
    ];
    for (const { label, pattern } of absolutePatterns) {
      const offenders = files.filter((file) => pattern.test(readCode(file))).map(rel);
      assert.deepEqual(offenders, [], `${label} must still not appear in executable code`);
    }
  });
});
