/**
 * Observable session state model. Task: B-O-05.
 *
 * SCOPE — read this before using anything here.
 *
 * 1. There is NO published **authentication** contract. The published
 *    `backend/docs/api/openapi-v0.md` (v0.1.0) defines only the control-plane
 *    Batch A endpoints and states a future auth *policy*, with no auth
 *    endpoint, credential scheme or payload (see `pending-auth-contract.js`).
 *    This model therefore assumes no request/response payload.
 *
 *    The status semantics it DOES rely on are contract-backed:
 *      401 = "Unauthenticated"
 *      403 = "Forbidden — valid auth but insufficient scope"
 *    The 401/403 split is stable; the exact codes for lockout, CSRF failure and
 *    token expiry are NOT yet contracted and must be revisited then.
 *
 * 2. There is NO session storage here, and none may be added until the contract
 *    is reviewed (B-O-02). This module holds no token, reads no `localStorage`,
 *    no `sessionStorage`, no `document.cookie` and no `IndexedDB`. `session` is
 *    a plain in-memory value the caller owns.
 *
 * 3. Every state declares the approved hook it may use. Where the locked
 *    references provide no hook, `hook` is `null` and `blocker` names the
 *    recorded gap (B-O-06). Nothing here may create UI.
 *
 * 4. This module performs no network call. There is no login, logout or refresh
 *    request, because no such endpoint has been contracted (B-O-03).
 */

import { canOpen } from './role-guard.js';

/** Observable session states. */
export const SessionState = Object.freeze({
  ANONYMOUS: 'anonymous',
  AUTHENTICATED: 'authenticated',
  SESSION_EXPIRED: 'session-expired',
  UNAUTHENTICATED: 'unauthenticated',
  ROLE_FORBIDDEN: 'role-forbidden',
  TRANSPORT_ERROR: 'transport-error',
  UNKNOWN: 'unknown',
});

/**
 * The only pre-authentication screen that exists in a locked reference:
 * the Connect onboarding screen of the Mobile App Preview, reached through the
 * existing "Open onboarding screen" control.
 */
export const CONNECT_SCREEN = 'Connect';

/** The one approved transient-status channel: the existing `#toast` element. */
export const TOAST_HOOK = '#toast';

/**
 * hook: the existing approved hook that may present this state, or `null`.
 * blocker: the recorded gap ID when no hook exists.
 *
 * Provenance of every `null` hook is documented in
 * `frontend/docs/auth-ui-blockers.md`.
 */
const STATE_BINDINGS = Object.freeze({
  [SessionState.ANONYMOUS]: Object.freeze({
    screen: CONNECT_SCREEN,
    hook: CONNECT_SCREEN,
    blocker: null,
    note: 'The only pre-auth screen that already exists in a locked reference.',
  }),
  [SessionState.AUTHENTICATED]: Object.freeze({
    screen: null,
    hook: null,
    blocker: null,
    note: 'The role guard selects approved screens; no new hook is required.',
  }),
  [SessionState.SESSION_EXPIRED]: Object.freeze({
    screen: null,
    hook: TOAST_HOOK,
    blocker: 'BLK-01',
    note: 'No expired-session screen or copy exists in any locked reference.',
  }),
  [SessionState.UNAUTHENTICATED]: Object.freeze({
    screen: null,
    hook: TOAST_HOOK,
    blocker: 'BLK-01',
    note: 'No sign-in screen exists; "Continue to sign in" only shows a toast.',
  }),
  [SessionState.ROLE_FORBIDDEN]: Object.freeze({
    screen: null,
    hook: TOAST_HOOK,
    blocker: 'BLK-02',
    note: 'No forbidden / not-authorised screen exists in any locked reference.',
  }),
  [SessionState.TRANSPORT_ERROR]: Object.freeze({
    screen: null,
    hook: TOAST_HOOK,
    blocker: null,
    note: 'The existing toast is sufficient; no new element required.',
  }),
  [SessionState.UNKNOWN]: Object.freeze({
    screen: null,
    hook: TOAST_HOOK,
    blocker: 'BLK-02',
    note: 'Default-deny: an unclassifiable result must not grant access.',
  }),
});

/** The initial state: no session, nothing loaded. */
export const INITIAL_SESSION = Object.freeze({
  state: SessionState.ANONYMOUS,
  role: null,
  sessionPresent: false,
  lastStatus: null,
});

export function isKnownSessionState(state) {
  return typeof state === 'string' && Object.values(SessionState).includes(state);
}

/** The approved presentation for a state. Frozen. */
export function bindingFor(state) {
  return STATE_BINDINGS[state] ?? STATE_BINDINGS[SessionState.UNKNOWN];
}

/**
 * Classify the observable session state.
 *
 * A session only counts as present when it carries a usable role string: a
 * session object without an identified role cannot be trusted to authorize
 * anything, so it never yields AUTHENTICATED.
 *
 * Contract-backed semantics (openapi-v0.md "Error responses"):
 *   401 = Unauthenticated
 *   403 = Forbidden — valid auth but insufficient scope
 *
 * @param {{
 *   session?: { role?: string|null } | null,
 *   status?: number | null,
 *   errorKind?: string | null,
 * }} [input]
 * @returns {string} one of {@link SessionState}
 */
export function classifySessionState(input = {}) {
  const session = input?.session;

  // A malformed session value is a programming error, not a clean anonymous
  // state. Map it to default-deny UNKNOWN so it can never reach the pre-auth
  // Connect screen by accident.
  if (session !== undefined && session !== null && typeof session !== 'object') {
    return SessionState.UNKNOWN;
  }

  const role = extractRole(session);
  const hasSession = role !== null;
  const status = Number.isInteger(input?.status) ? input.status : null;
  const errorKind = typeof input?.errorKind === 'string' ? input.errorKind : null;

  if (errorKind !== null) return SessionState.TRANSPORT_ERROR;
  if (status === 401) return hasSession ? SessionState.SESSION_EXPIRED : SessionState.UNAUTHENTICATED;
  if (status === 403) return SessionState.ROLE_FORBIDDEN;
  if (status !== null && status >= 200 && status < 300) {
    return hasSession ? SessionState.AUTHENTICATED : SessionState.UNKNOWN;
  }
  if (status !== null) return SessionState.UNKNOWN;
  return hasSession ? SessionState.UNKNOWN : SessionState.ANONYMOUS;
}

function extractRole(session) {
  if (!session || typeof session !== 'object') return null;
  const role = session.role;
  if (typeof role !== 'string') return null;
  return role.trim() === '' ? null : role;
}

/**
 * Pure reducer. No storage, no network, no side effects.
 *
 * Events:
 *   `{ type: 'observe', session, status, errorKind }` — record an outcome.
 *   `{ type: 'logout' }`                            — drop the session locally.
 *
 * `logout` performs NO request: no logout endpoint has been contracted
 * (see `pending-auth-contract.js`, item `logout`).
 *
 * @param {object} current
 * @param {{ type: string }} event
 */
export function reduceSession(current = INITIAL_SESSION, event = {}) {
  const base = isKnownSessionState(current?.state) ? current : INITIAL_SESSION;

  if (event?.type === 'logout') {
    return Object.freeze({ ...INITIAL_SESSION });
  }

  if (event?.type !== 'observe') return Object.freeze({ ...base });

  const status = Number.isInteger(event.status) ? event.status : null;

  return Object.freeze({
    state: classifySessionState({ session: event.session, status, errorKind: event.errorKind ?? null }),
    role: extractRole(event.session),
    sessionPresent: extractRole(event.session) !== null,
    lastStatus: status,
  });
}

/**
 * Guard for navigation: combines the session state with the role guard.
 * Default deny — a missing, unknown or expired session can open nothing except
 * the pre-auth Connect screen, and only when that screen is explicitly asked
 * for by an anonymous surface.
 *
 * @param {{ session?: object|null, status?: number|null, errorKind?: string|null, anonymous?: boolean }} input
 * @param {string} surface
 * @param {string} screenId
 */
export function canOpenScreen(input = {}, surface, screenId) {
  const state = classifySessionState(input);

  if (state === SessionState.ANONYMOUS) {
    return input.anonymous === true && screenId === CONNECT_SCREEN;
  }
  if (state !== SessionState.AUTHENTICATED) {
    return false;
  }
  return canOpen(input.session?.role ?? null, surface, screenId);
}