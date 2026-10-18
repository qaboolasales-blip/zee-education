/**
 * Role → approved-screen guard tests. Task: B-O-04.
 * Pure logic. No DOM. No network. No UI rendering.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FIXED_TAB_COUNT,
  MOBILE_APP_FEATURES,
  MOBILE_APP_TABS,
  NAV_ENTRIES_MAY_NOT_BE_HIDDEN,
  PLATFORM_SCREENS,
  Role,
  ROLES,
  SCHOOL_DESKTOP_SCREENS,
  Surface,
  allowedMobileFeatures,
  allowedScreens,
  approvedScreens,
  assertApprovedScreen,
  canOpen,
  isApprovedScreen,
  isApprovedSurface,
  isKnownRole,
  openDecision,
  roleSource,
  screenKind,
} from '../core/auth/index.js';

describe('screen registry — mirrors the locked references exactly', () => {
  it('registers the School Dashboard nav ids, in locked order', () => {
    assert.deepEqual([...approvedScreens(Surface.SCHOOL_DESKTOP)], [
      'Overview',
      'Students',
      'Attendance',
      'Academics',
      'Fees & Accounts',
      'Staff & HR',
      'Timetable',
      'Reports & Print',
      'Settings',
    ]);
    assert.equal(approvedScreens(Surface.SCHOOL_DESKTOP).length, SCHOOL_DESKTOP_SCREENS.length);
  });

  it('excludes the "menu" drawer control, which is not a screen', () => {
    assert.equal(isApprovedScreen(Surface.SCHOOL_DESKTOP, 'menu'), false);
    assert.equal(isApprovedScreen(Surface.SCHOOL_DESKTOP, 'Settings'), true);
  });

  it('registers exactly five mobile tabs and records that the count is fixed', () => {
    assert.deepEqual([...MOBILE_APP_TABS], ['Home', 'Attendance', 'Results', 'Tasks', 'Profile']);
    assert.equal(FIXED_TAB_COUNT, 5);
  });

  it('registers the mobile F registry and excludes the attendanceTool alias', () => {
    assert.ok(MOBILE_APP_FEATURES.includes('fees'));
    assert.ok(MOBILE_APP_FEATURES.includes('documents'));
    assert.equal(MOBILE_APP_FEATURES.includes('attendanceTool'), false);
    assert.equal(isApprovedScreen(Surface.MOBILE_APP, 'attendanceTool'), false);
  });

  it('registers the Super Admin platform nav ids, in locked order', () => {
    assert.deepEqual([...approvedScreens(Surface.PLATFORM)], [
      'Overview',
      'Schools & Installs',
      'Plans & Add-ons',
      'Billing & Renewals',
      'Print Templates',
      'Support Tickets',
      'System Settings',
    ]);
  });

  it('denies unknown surfaces and unknown screens', () => {
    for (const surface of ['school-dashboard', 'admin', '', null, undefined, 42]) {
      assert.equal(isApprovedSurface(surface), false);
      assert.deepEqual([...approvedScreens(surface)], []);
    }
    assert.equal(isApprovedScreen(Surface.MOBILE_APP, 'Login'), false);
    assert.equal(isApprovedScreen(Surface.MOBILE_APP, 'ResetPassword'), false);
    assert.equal(isApprovedScreen(Surface.MOBILE_APP, 'payments'), false);
    assert.equal(isApprovedScreen(Surface.MOBILE_APP, null), false);
  });

  it('records provenance and screen kinds for auditing', () => {
    assert.equal(screenKind(Surface.SCHOOL_DESKTOP, 'Students'), 'screen');
    assert.equal(screenKind(Surface.MOBILE_APP, 'Home'), 'tab');
    assert.equal(screenKind(Surface.MOBILE_APP, 'Connect'), 'pre-auth');
    assert.equal(screenKind(Surface.MOBILE_APP, 'fees'), 'feature');
    assert.equal(screenKind(Surface.MOBILE_APP, 'nope'), null);
    assert.match(roleSource(Role.PARENT), /TL\.Parent/);
  });

  it('assertApprovedScreen refuses to mint a new screen', () => {
    assert.equal(assertApprovedScreen(Surface.PLATFORM, 'System Settings'), 'System Settings');
    assert.throws(() => assertApprovedScreen(Surface.PLATFORM, 'Login'));
    assert.throws(() => assertApprovedScreen(Surface.SCHOOL_DESKTOP, 'Payroll'));
  });

  it('records that nav entries may not be hidden without a visual change', () => {
    assert.equal(NAV_ENTRIES_MAY_NOT_BE_HIDDEN, true);
  });

  it('is frozen so the allow-list cannot be widened at runtime', () => {
    for (const list of [
      approvedScreens(Surface.MOBILE_APP),
      MOBILE_APP_TABS,
      MOBILE_APP_FEATURES,
      PLATFORM_SCREENS,
      SCHOOL_DESKTOP_SCREENS,
      ROLES,
    ]) {
      assert.equal(Object.isFrozen(list), true);
    }
    assert.throws(() => {
      'use strict';
      MOBILE_APP_FEATURES.push('payroll');
    });
  });
});

describe('role guard — default deny', () => {
  it('denies every unknown role on every surface', () => {
    for (const role of ['Admin', 'superadmin', 'parent', '', null, undefined, 42, {}]) {
      assert.equal(isKnownRole(role), false);
      for (const surface of [Surface.SCHOOL_DESKTOP, Surface.MOBILE_APP, Surface.PLATFORM]) {
        assert.deepEqual([...allowedScreens(role, surface)], [], `${role}/${surface} must be empty`);
        assert.equal(canOpen(role, surface, 'Overview'), false);
      }
    }
  });

  it('denies every unknown surface even for a valid role', () => {
    for (const surface of ['nope', '', null]) {
      assert.deepEqual([...allowedScreens(Role.SCHOOL_ADMIN, surface)], []);
      assert.equal(canOpen(Role.SCHOOL_ADMIN, surface, 'Overview'), false);
    }
  });

  it('never authorizes a screen that is not in the registry', () => {
    for (const role of ROLES) {
      for (const surface of [Surface.SCHOOL_DESKTOP, Surface.MOBILE_APP, Surface.PLATFORM]) {
        for (const screenId of ['Login', 'Logout', 'ResetPassword', 'Payroll', 'Unknown']) {
          assert.equal(canOpen(role, surface, screenId), false);
        }
      }
    }
  });
});

describe('platform surface — Super Admin only', () => {
  it('gives Super Admin every platform screen', () => {
    assert.deepEqual([...allowedScreens(Role.SUPER_ADMIN, Surface.PLATFORM)], [...PLATFORM_SCREENS]);
  });

  it('denies every non-Super-Admin role on the platform surface', () => {
    for (const role of [Role.ANONYMOUS, Role.PARENT, Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN]) {
      assert.deepEqual([...allowedScreens(role, Surface.PLATFORM)], []);
    }
  });

  it('does not let Super Admin browse school or learner surfaces', () => {
    // PROJECT_MEMORY: "Super Admin does not browse learner data by default."
    assert.deepEqual([...allowedScreens(Role.SUPER_ADMIN, Surface.SCHOOL_DESKTOP)], []);
    assert.deepEqual([...allowedScreens(Role.SUPER_ADMIN, Surface.MOBILE_APP)], []);
    assert.equal(canOpen(Role.SUPER_ADMIN, Surface.SCHOOL_DESKTOP, 'Students'), false);
  });
});

describe('school-desktop surface', () => {
  it('gives School Admin all nine screens', () => {
    assert.deepEqual([...allowedScreens(Role.SCHOOL_ADMIN, Surface.SCHOOL_DESKTOP)], [
      ...SCHOOL_DESKTOP_SCREENS,
    ]);
  });

  it('limits Teacher to the modules a teacher can actually use', () => {
    assert.deepEqual([...allowedScreens(Role.TEACHER, Surface.SCHOOL_DESKTOP)], [
      'Overview',
      'Attendance',
      'Academics',
      'Timetable',
      'Reports & Print',
    ]);
  });

  it('withholds fees, staff, students and settings from Teacher', () => {
    for (const screenId of ['Fees & Accounts', 'Staff & HR', 'Students', 'Settings']) {
      assert.equal(canOpen(Role.TEACHER, Surface.SCHOOL_DESKTOP, screenId), false, screenId);
    }
  });

  it('denies Parent and Student on the desktop surface by default', () => {
    // The desktop reference has no role concept at all; partitioning it is an
    // owner product decision (BLK-07), so least privilege applies.
    for (const role of [Role.PARENT, Role.STUDENT]) {
      assert.deepEqual([...allowedScreens(role, Surface.SCHOOL_DESKTOP)], []);
    }
  });

  it('denies anonymous on the desktop surface', () => {
    assert.deepEqual([...allowedScreens(Role.ANONYMOUS, Surface.SCHOOL_DESKTOP)], []);
  });
});

describe('mobile-app surface', () => {
  it('gives anonymous only the pre-auth Connect screen', () => {
    assert.deepEqual([...allowedScreens(Role.ANONYMOUS, Surface.MOBILE_APP)], ['Connect']);
    assert.equal(canOpen(Role.ANONYMOUS, Surface.MOBILE_APP, 'Home'), false);
    assert.equal(canOpen(Role.ANONYMOUS, Surface.MOBILE_APP, 'Connect'), true);
  });

  it('gives every authenticated mobile role all five fixed tabs', () => {
    for (const role of [Role.PARENT, Role.STUDENT, Role.TEACHER, Role.SCHOOL_ADMIN]) {
      const allowed = allowedScreens(role, Surface.MOBILE_APP);
      for (const tab of MOBILE_APP_TABS) {
        assert.equal(allowed.includes(tab), true, `${role} must keep the ${tab} tab`);
      }
    }
  });

  it('never widens a role beyond the reference TL map', () => {
    // Set-equal to the reference TL list; emission order is registry order.
    const expected = {
      [Role.PARENT]: ['fees', 'timetable', 'homework', 'notices', 'leave', 'messages', 'calendar', 'documents'],
      [Role.STUDENT]: ['timetable', 'homework', 'notices', 'calendar', 'messages', 'leave', 'documents'],
      [Role.TEACHER]: ['timetable', 'marks', 'homework', 'messages', 'notices', 'reports', 'leave'],
      [Role.SCHOOL_ADMIN]: [
        'students',
        'admissions',
        'fees',
        'staff',
        'timetable',
        'marks',
        'notices',
        'reports',
        'documents',
        'settings',
      ],
    };
    for (const [role, features] of Object.entries(expected)) {
      const actual = [...allowedMobileFeatures(role)];
      assert.deepEqual([...actual].sort(), [...features].sort(), role);
    }
  });

  it('emits features in approved registry order, never in TL order', () => {
    for (const role of ROLES) {
      const actual = [...allowedMobileFeatures(role)];
      const positions = actual.map((id) => approvedScreens(Surface.MOBILE_APP).indexOf(id));
      assert.deepEqual([...positions].sort((a, b) => a - b), positions, role);
    }
  });

  it('keeps financial and HR modules away from Parent, Student and Teacher', () => {
    for (const role of [Role.PARENT, Role.STUDENT]) {
      for (const feature of ['students', 'staff', 'settings', 'admissions', 'marks']) {
        assert.equal(canOpen(role, Surface.MOBILE_APP, feature), false, `${role}/${feature}`);
      }
    }
    // Teacher legitimately has `marks` but never the directory or money modules.
    for (const feature of ['students', 'staff', 'settings', 'admissions', 'fees']) {
      assert.equal(canOpen(Role.TEACHER, Surface.MOBILE_APP, feature), false, `Teacher/${feature}`);
    }
  });

  it('keeps fees away from Student and Teacher but available to Parent and School Admin', () => {
    assert.equal(canOpen(Role.PARENT, Surface.MOBILE_APP, 'fees'), true);
    assert.equal(canOpen(Role.SCHOOL_ADMIN, Surface.MOBILE_APP, 'fees'), true);
    assert.equal(canOpen(Role.STUDENT, Surface.MOBILE_APP, 'fees'), false);
    assert.equal(canOpen(Role.TEACHER, Surface.MOBILE_APP, 'fees'), false);
  });

  it('keeps marks (draft/adjudication) away from Parent and Student', () => {
    assert.equal(canOpen(Role.TEACHER, Surface.MOBILE_APP, 'marks'), true);
    assert.equal(canOpen(Role.SCHOOL_ADMIN, Surface.MOBILE_APP, 'marks'), true);
    assert.equal(canOpen(Role.PARENT, Surface.MOBILE_APP, 'marks'), false);
    assert.equal(canOpen(Role.STUDENT, Surface.MOBILE_APP, 'marks'), false);
  });

  it('keeps school settings away from everyone except School Admin', () => {
    for (const role of [Role.PARENT, Role.STUDENT, Role.TEACHER]) {
      assert.equal(canOpen(role, Surface.MOBILE_APP, 'settings'), false);
    }
    assert.equal(canOpen(Role.SCHOOL_ADMIN, Surface.MOBILE_APP, 'settings'), true);
  });

  it('always preserves approved screen order, never a custom order', () => {
    const approved = [...approvedScreens(Surface.MOBILE_APP)];
    for (const role of ROLES) {
      const allowed = [...allowedScreens(role, Surface.MOBILE_APP)];
      const positions = allowed.map((id) => approved.indexOf(id));
      assert.deepEqual([...positions].sort((a, b) => a - b), positions, role);
    }
  });

  it('returns a frozen list', () => {
    assert.equal(Object.isFrozen(allowedScreens(Role.TEACHER, Surface.MOBILE_APP)), true);
    assert.equal(Object.isFrozen(allowedMobileFeatures(Role.TEACHER)), true);
  });
});

describe('openDecision', () => {
  it('grants only a fully valid role + surface + approved screen', () => {
    const ok = openDecision(Role.TEACHER, Surface.MOBILE_APP, 'Attendance');
    assert.deepEqual(ok, { allowed: true, role: 'Teacher', surface: 'mobile-app', screenId: 'Attendance' });
    assert.equal(Object.isFrozen(ok), true);
  });

  it('denies and nulls the invalid part without throwing', () => {
    assert.deepEqual(openDecision('nope', Surface.MOBILE_APP, 'Attendance'), {
      allowed: false,
      role: null,
      surface: 'mobile-app',
      screenId: 'Attendance',
    });
    assert.deepEqual(openDecision(Role.TEACHER, 'nope', 'Attendance'), {
      allowed: false,
      role: 'Teacher',
      surface: null,
      screenId: null,
    });
    assert.deepEqual(openDecision(Role.TEACHER, Surface.MOBILE_APP, 'Payroll'), {
      allowed: false,
      role: 'Teacher',
      surface: 'mobile-app',
      screenId: null,
    });
  });

  it('denies a valid triple when the role lacks the module', () => {
    assert.equal(openDecision(Role.STUDENT, Surface.MOBILE_APP, 'fees').allowed, false);
  });
});