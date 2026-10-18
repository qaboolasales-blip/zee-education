/**
 * School connection behaviour. Tasks: L-O-01, L-O-02, L-O-06.
 *
 * "Bind QR/manual school connection into the existing approved onboarding UI exactly."
 * "Store selected-school information only as approved and clear it correctly on logout/school switch."
 *
 * The mobile reference ships the connection flow as a small inline function,
 * `connectSchool()`. This module transcribes that behaviour rather than designing a
 * new one, and it never touches the network or any storage:
 *
 *   - reads `domain` and `code` inputs, both `.trim()`ed
 *   - both required; otherwise `notice('Please enter school domain and code')`
 *   - derives the school display name from the first label of the domain, title-cased:
 *     `horizon.school.pk` → `Horizon`
 *   - reports `notice('Connected to ' + n + ' in this demo')` — the word **demo** is
 *     part of the reference copy, so this is a demo transition, not a real session
 *   - QR scan reports `notice('Camera scan ke liye real app/PWA permission chahiye')`
 *
 * Connection precedes login in the reference ("…phir user apne account se login karega"),
 * so a selected school is a pre-login preference, never an authenticated claim.
 *
 * L-O-02: nothing here persists a school. The reference writes no localStorage,
 * sessionStorage or IndexedDB for the connection, and `assertNoUnapprovedStorage()`
 * fails the suite if any core module does. A selection that *is* kept is an in-memory
 * value cleared by `clearSelectedSchool()` — on logout or school switch — which is
 * exactly the clearing the task names.
 *
 * No DOM, no request, no storage write.
 */

export const ConnectionReject = Object.freeze({
  EMPTY_DOMAIN: 'empty-domain',
  EMPTY_CODE: 'empty-code',
  NOT_CONNECTED: 'not-connected',
});

function ok(value) {
  return Object.freeze({ allowed: true, reason: null, value, errors: Object.freeze([]) });
}

function fail(reason, errors = []) {
  return Object.freeze({ allowed: false, reason, value: null, errors: Object.freeze(errors) });
}

/**
 * Derive the school display name from its domain, exactly as the reference does:
 * `d.split('.')[0].replace(/[-_]/g,' ').replace(/\b\w/g,x=>x.toUpperCase())`
 *
 * @param {unknown} domain
 */
export function parseSchoolName(domain) {
  if (typeof domain !== 'string') return null;
  const label = domain.trim().split('.')[0];
  if (label === '') return null;
  return label.replace(/[-_]/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());
}

/**
 * Validate and name a connection attempt. The amount field analogue here is: both
 * inputs must be present; absence is a real error, not a missing-field default.
 *
 * @param {{ domain?: unknown, code?: unknown }} inputs
 */
export function validateConnection(inputs = {}) {
  const domain = typeof inputs.domain === 'string' ? inputs.domain.trim() : '';
  if (domain === '') return fail(ConnectionReject.EMPTY_DOMAIN);
  const code = typeof inputs.code === 'string' ? inputs.code.trim() : '';
  if (code === '') return fail(ConnectionReject.EMPTY_CODE);
  const school = parseSchoolName(domain);
  if (school === null) return fail(ConnectionReject.EMPTY_DOMAIN);
  return ok(Object.freeze({ domain, code, school }));
}

/**
 * Transcribe the reference's connection report. `demo` is part of the locked copy:
 * this is never a session establishment.
 *
 * @param {{ school?: unknown }} result
 */
export function connectionReport(result = {}) {
  const school = typeof result.school === 'string' ? result.school.trim() : '';
  if (school === '') return fail(ConnectionReject.NOT_CONNECTED);
  return ok(Object.freeze({ school, demo: true }));
}

/**
 * In-memory selection with an explicit clear. This is the only approved shape for a
 * selected school until a persistence contract exists.
 *
 * @param {{ school?: unknown } | null } [selection]
 */
export function selectedSchool(selection = null) {
  const school = selection && typeof selection.school === 'string' ? selection.school.trim() : null;
  return Object.freeze({ school, cleared: school === null });
}

/** Clear the selection — on logout or school switch, per L-O-02. */
export function clearSelectedSchool() {
  return Object.freeze({ school: null, cleared: true });
}

/**
 * Drift guard — the connection inputs, labels and demo copy must remain.
 *
 * @param {string} mobileSource
 */
export function assertConnectionFlowMatchesReferences(mobileSource) {
  if (typeof mobileSource !== 'string' || mobileSource === '') {
    throw new Error('no Mobile Preview reference supplied');
  }
  const problems = [];
  const claims = [
    'Please enter school domain and code',
    'Camera scan ke liye real app/PWA permission chahiye',
    'Connected to',
    'in this demo',
    'QR scan ya manual domain/code entry',
    'Connect another school',
    'QR ya manual setup se school switch karein',
    'horizon.school.pk',
    'HZ-9246',
    'School domain',
    'School code',
  ];
  for (const claim of claims) {
    if (!mobileSource.includes(claim)) problems.push(`connection copy "${claim}" is gone`);
  }
  if (!mobileSource.includes('connectSchool()')) {
    problems.push('the connectSchool handler is gone');
  }
  if (problems.length > 0) {
    throw new Error(`connection flow drifted from the reference:\n  ${problems.join('\n  ')}`);
  }
  return true;
}

/**
 * L-O-02 — the storage guarantee is not re-implemented here.
 *
 * Batch B established an **absolute** ban on browser storage primitives across
 * `core/**` (no Web Storage, no `document.cookie`, no IndexedDB), enforced by
 * `test/auth-contract-gate.test.js`. This module therefore contains no storage guard
 * of its own: a second guard would have to *name* the primitives it forbids, which
 * Batch B's absolute ban correctly treats as a violation. Reusing the stronger,
 * single rule beats duplicating a weaker one.
 *
 * The consequence is what L-O-02 asks for: nothing in this package persists a school.
 */
