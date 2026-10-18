/**
 * Session state tests. Task: B-O-05.
 *
 * Covers the four states the packet names — no-session, expired-session,
 * forbidden-role and logout — plus the transport and default-deny cases.
 * Pure logic: no DOM, no network, no storage, no layout change.
 */

import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  CONNECT_SCREEN,
  INITIAL_SESSION,
  Role,
  SessionState,
  Surface,
  TOAST_HOOK,
  bindingFor,
  canOpenScreen,
  classifySessionState,
  isKnownSessionState,
  reduceSession,
} from '../core/auth/index.js';
import { readCode } from './helpers/source-scan.js';

const HERE = dirname(fileURLToPath(import.meta.url));

describe('no-session state', () => {
  it('starts anonymous with no role', () => {
    assert.equal(INITIAL_SESSION.state, SessionState.ANONYMOUS);
    assert.equal(INITIAL_SESSION.role, null);
    assert.equal(INITIAL_SESSION.sessionPresent, false);
    assert.equal(Object.isFrozen(INITIAL_SESSION), true);
  });

  it('classifies an absent session as anonymous', () => {
    for (const input of [{}, { session: null }, { session: null, status: null }]) {
      assert.equal(classifySessionState(input), SessionState.ANONYMOUS);
    }
  });

  it('binds anonymous to the only pre-auth screen that already exists', () => {
    const binding = bindingFor(SessionState.ANONYMOUS);
    assert.equal(binding.screen, CONNECT_SCREEN);
    assert.equal(binding.hook, CONNECT_SCREEN);
    assert.equal(binding.blocker, null);
  });

  it('lets an anonymous caller reach only the Connect screen, and only when asked explicitly', () => {
    assert.equal(canOpenScreen({ anonymous: true }, Surface.MOBILE_APP, 'Connect'), true);
    assert.equal(canOpenScreen({}, Surface.MOBILE_APP, 'Connect'), false);
    assert.equal(canOpenScreen({ anonymous: true }, Surface.MOBILE_APP, 'Home'), false);
    assert.equal(canOpenScreen({ anonymous: true }, Surface.MOBILE_APP, 'Attendance'), false);
    assert.equal(canOpenScreen({ anonymous: true }, Surface.SCHOOL_DESKTOP, 'Overview'), false);
  });
});

describe('expired-session state', () => {
  it('classifies a 401 after a session existed as session-expired', () => {
    const state = classifySessionState({ session: { role: Role.TEACHER }, status: 401 });
    assert.equal(state, SessionState.SESSION_EXPIRED);
  });

  it('classifies a 401 with no session as unauthenticated, not expired', () => {
    assert.equal(classifySessionState({ session: null, status: 401 }), SessionState.UNAUTHENTICATED);
  });

  it('has no approved screen and records the blocker instead of inventing one', () => {
    const binding = bindingFor(SessionState.SESSION_EXPIRED);
    assert.equal(binding.screen, null);
    assert.equal(binding.hook, TOAST_HOOK);
    assert.equal(binding.blocker, 'BLK-01');
  });

  it('closes navigation completely, including the Connect screen', () => {
    for (const screenId of ['Connect', 'Home', 'Attendance', 'Results', 'Tasks', 'Profile']) {
      assert.equal(
        canOpenScreen({ session: { role: Role.TEACHER }, status: 401 }, Surface.MOBILE_APP, screenId),
        false,
        screenId,
      );
    }
  });
});

describe('forbidden-role state', () => {
  it('classifies 403 as role-forbidden whether or not a session existed', () => {
    assert.equal(
      classifySessionState({ session: { role: Role.STUDENT }, status: 403 }),
      SessionState.ROLE_FORBIDDEN,
    );
    assert.equal(classifySessionState({ session: null, status: 403 }), SessionState.ROLE_FORBIDDEN);
  });

  it('has no approved screen and records the blocker', () => {
    const binding = bindingFor(SessionState.ROLE_FORBIDDEN);
    assert.equal(binding.screen, null);
    assert.equal(binding.hook, TOAST_HOOK);
    assert.equal(binding.blocker, 'BLK-02');
  });

  it('keeps an authenticated role from opening a module it lacks', () => {
    const input = { session: { role: Role.STUDENT }, status: 403 };
    assert.equal(canOpenScreen(input, Surface.MOBILE_APP, 'Connect'), false);
    assert.equal(canOpenScreen(input, Surface.MOBILE_APP, 'Home'), false);
    assert.equal(canOpenScreen(input, Surface.MOBILE_APP, 'fees'), false);
  });

  it('denies Super Admin on learner surfaces even with a valid 200 session', () => {
    const input = { session: { role: Role.SUPER_ADMIN }, status: 200 };
    assert.equal(canOpenScreen(input, Surface.SCHOOL_DESKTOP, 'Students'), false);
    assert.equal(canOpenScreen(input, Surface.MOBILE_APP, 'Home'), false);
    assert.equal(canOpenScreen(input, Surface.PLATFORM, 'Overview'), true);
  });
});

describe('logout state', () => {
  it('drops the session locally and returns to the anonymous state', () => {
    const authenticated = reduceSession(INITIAL_SESSION, {
      type: 'observe',
      session: { role: Role.SCHOOL_ADMIN },
      status: 200,
    });
    assert.equal(authenticated.state, SessionState.AUTHENTICATED);
    assert.equal(authenticated.role, Role.SCHOOL_ADMIN);

    const loggedOut = reduceSession(authenticated, { type: 'logout' });
    assert.equal(loggedOut.state, SessionState.ANONYMOUS);
    assert.equal(loggedOut.role, null);
    assert.equal(loggedOut.sessionPresent, false);
  });

  it('performs no request on logout, because no endpoint is contracted', () => {
    // The reducer is synchronous and pure: calling it cannot await or fetch.
    const result = reduceSession(INITIAL_SESSION, { type: 'logout' });
    assert.equal(typeof result.then, 'undefined');
    assert.equal(Object.isFrozen(result), true);
  });

  it('records that there is no approved logout control in any reference', () => {
    // No hook is declared for logout because none exists; the blocker is owned
    // by the auth UI blocker register, not invented here.
    assert.equal(bindingFor(SessionState.ANONYMOUS).blocker, null);
    assert.equal(bindingFor(SessionState.UNKNOWN).blocker, 'BLK-02');
  });
});

describe('authenticated state', () => {
  it('classifies a success status with a session as authenticated', () => {
    const state = classifySessionState({ session: { role: Role.PARENT }, status: 200 });
    assert.equal(state, SessionState.AUTHENTICATED);
  });

  it('defers navigation to the role guard', () => {
    const input = { session: { role: Role.TEACHER }, status: 200 };
    assert.equal(canOpenScreen(input, Surface.MOBILE_APP, 'Attendance'), true);
    assert.equal(canOpenScreen(input, Surface.MOBILE_APP, 'marks'), true);
    assert.equal(canOpenScreen(input, Surface.MOBILE_APP, 'fees'), false);
    assert.equal(canOpenScreen(input, Surface.PLATFORM, 'Overview'), false);
  });

  it('treats any 2xx as a success', () => {
    for (const status of [200, 201, 204]) {
      assert.equal(classifySessionState({ session: { role: Role.TEACHER }, status }), SessionState.AUTHENTICATED);
    }
  });
});

describe('transport error and default deny', () => {
  it('classifies a transport failure', () => {
    for (const kind of ['network', 'timeout', 'abort']) {
      assert.equal(
        classifySessionState({ session: { role: Role.TEACHER }, errorKind: kind }),
        SessionState.TRANSPORT_ERROR,
        kind,
      );
    }
  });

  it('does not convert a transport failure into an authenticated session', () => {
    const input = { session: { role: Role.TEACHER }, errorKind: 'network' };
    assert.equal(canOpenScreen(input, Surface.MOBILE_APP, 'Attendance'), false);
  });

  it('defaults to unknown and denies, for any unclassifiable outcome', () => {
    for (const input of [
      { status: 500 },
      { status: 418 },
      { session: { role: Role.TEACHER } },
      { session: 'not-an-object' },
      { session: {}, status: 200 },
    ]) {
      assert.equal(classifySessionState(input), SessionState.UNKNOWN, JSON.stringify(input));
    }
    assert.equal(
      canOpenScreen({ session: { role: Role.TEACHER }, status: 500 }, Surface.MOBILE_APP, 'Home'),
      false,
    );
  });

  it('never grants access without a role, even on a 200', () => {
    assert.equal(canOpenScreen({ session: {}, status: 200 }, Surface.MOBILE_APP, 'Home'), false);
    assert.equal(canOpenScreen({ status: 200 }, Surface.MOBILE_APP, 'Home'), false);
  });
});

describe('reduceSession', () => {
  it('ignores unknown events and malformed current state', () => {
    const base = reduceSession(INITIAL_SESSION, { type: 'nonsense' });
    assert.equal(base.state, SessionState.ANONYMOUS);
    const garbage = reduceSession('not-a-state', { type: 'logout' });
    assert.equal(garbage.state, SessionState.ANONYMOUS);
  });

  it('never treats a session without an identified role as authenticated', () => {
    const result = reduceSession(INITIAL_SESSION, {
      type: 'observe',
      session: { role: 42 },
      status: 200,
    });
    assert.equal(result.state, SessionState.UNKNOWN);
    assert.equal(result.role, null);
    assert.equal(result.sessionPresent, false);
  });

  it('records the observed status', () => {
    assert.equal(reduceSession(INITIAL_SESSION, { type: 'observe', status: 403 }).lastStatus, 403);
    assert.equal(reduceSession(INITIAL_SESSION, { type: 'logout' }).lastStatus, null);
  });
});

describe('state bindings', () => {
  it('declares a binding for every known state', () => {
    for (const state of Object.values(SessionState)) {
      assert.equal(isKnownSessionState(state), true);
      const binding = bindingFor(state);
      assert.equal(typeof binding.note, 'string');
      assert.ok(binding.note.length > 0);
      assert.ok(binding.hook === null || typeof binding.hook === 'string');
    }
  });

  it('falls back to the default-deny binding for an unknown state', () => {
    assert.equal(bindingFor('nonsense').blocker, 'BLK-02');
    assert.equal(bindingFor(undefined).blocker, 'BLK-02');
  });

  it('declares no screen for any auth error state, because none is approved', () => {
    for (const state of [
      SessionState.SESSION_EXPIRED,
      SessionState.UNAUTHENTICATED,
      SessionState.ROLE_FORBIDDEN,
    ]) {
      assert.equal(bindingFor(state).screen, null);
      assert.notEqual(bindingFor(state).blocker, null);
    }
  });
});

describe('no storage and no side effects (B-O-02 compliance)', () => {
  const code = readCode(resolve(HERE, '..', 'core', 'auth', 'session-state.js'));

  it('contains no browser storage or cookie access in executable code', () => {
    for (const forbidden of [
      'localStorage',
      'sessionStorage',
      'indexedDB',
      'document.cookie',
      'Cookie',
      'Authorization',
      'Bearer',
      'fetch(',
    ]) {
      assert.equal(code.includes(forbidden), false, `session-state.js must not use ${forbidden}`);
    }
  });

  it('contains no console output, so nothing can be logged', () => {
    assert.equal(/console\s*\./.test(code), false);
  });

  it('never mutates its input state object', () => {
    const input = { state: SessionState.ANONYMOUS, role: null, sessionPresent: false, lastStatus: null };
    const snapshot = JSON.stringify(input);
    reduceSession(input, { type: 'observe', session: { role: Role.TEACHER }, status: 200 });
    reduceSession(input, { type: 'logout' });
    assert.equal(JSON.stringify(input), snapshot);
  });
});