/**
 * Inventory of screens that ALREADY EXIST in the three approved reference
 * designs. Task: B-O-04.
 *
 * This file is an allow-list, not a feature list. Every entry is copied from a
 * value that is literally present in a locked reference file:
 *
 *  - `school-desktop` ids are the exact `data-p` values rendered into
 *    `#nav` / `#bt` of `Zee Education — School Dashboard.html`.
 *  - `mobile-app` tab ids are the exact `data-t` values rendered into `#nav` of
 *    `Zee Education — Mobile App Preview.html`; feature ids are the exact `F`
 *    registry keys passed to `op()`.
 *  - `platform` ids are the exact `data-p` values rendered into `#nav` /
 *    `#bt` of `Zee Education — Super Admin.html`.
 *
 * If an id is not in this registry, no code in this package may navigate to it,
 * render it, or invent it. `assertApprovedScreen()` is the enforcement point.
 *
 * This module contains no DOM access, no rendering and no styling. It returns
 * frozen data only.
 */

/** The three navigation surfaces that exist in the approved references. */
export const Surface = Object.freeze({
  SCHOOL_DESKTOP: 'school-desktop',
  MOBILE_APP: 'mobile-app',
  PLATFORM: 'platform',
});

const SCHOOL_DESKTOP_SOURCE =
  'Zee Education — School Dashboard.html :: #nav/#bt rendered from N[] via data-p';
const MOBILE_APP_TAB_SOURCE =
  'Zee Education — Mobile App Preview.html :: #nav rendered from NAV[] via data-t';
const MOBILE_APP_FEATURE_SOURCE =
  'Zee Education — Mobile App Preview.html :: F{} registry keys opened via op()';
const PLATFORM_SOURCE =
  'Zee Education — Super Admin.html :: #nav/#bt rendered from N[] via data-p';

/**
 * School Dashboard navigation screens (9), in locked order.
 *
 * `menu` is deliberately ABSENT: it is a `#bt` value that opens the sidebar
 * drawer, not a screen.
 */
export const SCHOOL_DESKTOP_SCREENS = Object.freeze([
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

/**
 * Mobile app bottom-navigation tabs (5) — locked count, see `FIXED_TAB_COUNT`.
 */
export const MOBILE_APP_TABS = Object.freeze(['Home', 'Attendance', 'Results', 'Tasks', 'Profile']);

/** Pre-authentication screen reachable from the approved "Open onboarding screen" control. */
export const MOBILE_APP_PRE_AUTH_SCREEN = 'Connect';

/**
 * Mobile app feature sub-screens that already exist in the `F` registry.
 *
 * `attendanceTool` is deliberately ABSENT: in the reference it is an alias whose
 * only behaviour is `go('Attendance')`, so it is not a separate screen.
 */
export const MOBILE_APP_FEATURES = Object.freeze([
  'fees',
  'timetable',
  'homework',
  'notices',
  'messages',
  'leave',
  'calendar',
  'marks',
  'reports',
  'students',
  'admissions',
  'staff',
  'settings',
  'documents',
]);

/** Super Admin platform navigation screens (7), in locked order. */
export const PLATFORM_SCREENS = Object.freeze([
  'Overview',
  'Schools & Installs',
  'Plans & Add-ons',
  'Billing & Renewals',
  'Print Templates',
  'Support Tickets',
  'System Settings',
]);

/**
 * The mobile `.nav` is `grid-template-columns:repeat(5,1fr)` and the reference
 * always renders exactly five tabs. Removing or hiding a tab therefore changes
 * the locked layout. Role-based *entry points* must live on the `Tasks` screen
 * instead, whose `.tools` grid is variable length.
 */
export const FIXED_TAB_COUNT = MOBILE_APP_TABS.length;

/** Sidebar/drawer navigation is a vertical grid with a pinned footer, so
 *  removing a nav entry also shifts locked layout. Entries must not be hidden. */
export const NAV_ENTRIES_MAY_NOT_BE_HIDDEN = true;

/** Provenance for every registered screen id, so the registry stays auditable. */
export const SCREEN_PROVENANCE = Object.freeze({
  [Surface.SCHOOL_DESKTOP]: Object.freeze(SCHOOL_DESKTOP_SCREENS.map((id) => Object.freeze({
    id,
    kind: 'screen',
    source: SCHOOL_DESKTOP_SOURCE,
  }))),
  [Surface.MOBILE_APP]: Object.freeze([
    ...MOBILE_APP_TABS.map((id) => Object.freeze({ id, kind: 'tab', source: MOBILE_APP_TAB_SOURCE })),
    Object.freeze({ id: MOBILE_APP_PRE_AUTH_SCREEN, kind: 'pre-auth', source: MOBILE_APP_FEATURE_SOURCE }),
    ...MOBILE_APP_FEATURES.map((id) => Object.freeze({ id, kind: 'feature', source: MOBILE_APP_FEATURE_SOURCE })),
  ]),
  [Surface.PLATFORM]: Object.freeze(PLATFORM_SCREENS.map((id) => Object.freeze({
    id,
    kind: 'screen',
    source: PLATFORM_SOURCE,
  }))),
});

const ALL_BY_SURFACE = Object.freeze({
  [Surface.SCHOOL_DESKTOP]: Object.freeze(SCHOOL_DESKTOP_SCREENS),
  [Surface.MOBILE_APP]: Object.freeze([...MOBILE_APP_TABS, MOBILE_APP_PRE_AUTH_SCREEN, ...MOBILE_APP_FEATURES]),
  [Surface.PLATFORM]: Object.freeze(PLATFORM_SCREENS),
});

/** Every surface name that exists in the approved references. */
export const SURFACES = Object.freeze(Object.keys(ALL_BY_SURFACE).map((key) => Object.freeze(key)));

export function isApprovedSurface(surface) {
  return Object.prototype.hasOwnProperty.call(ALL_BY_SURFACE, surface);
}

/** All approved screen ids for a surface, in locked order. Frozen. */
export function approvedScreens(surface) {
  const list = ALL_BY_SURFACE[surface];
  return list === undefined ? Object.freeze([]) : list;
}

export function isApprovedScreen(surface, screenId) {
  if (typeof screenId !== 'string') return false;
  return approvedScreens(surface).includes(screenId);
}

export function screenKind(surface, screenId) {
  const entry = SCREEN_PROVENANCE[surface]?.find((item) => item.id === screenId);
  return entry === undefined ? null : entry.kind;
}

/**
 * Test/support helper. Throws when a screen id is not part of a locked
 * reference, so a typo can never become a new "screen".
 */
export function assertApprovedScreen(surface, screenId) {
  if (!isApprovedScreen(surface, screenId)) {
    throw new Error(`"${screenId}" is not an approved screen of surface "${surface}"`);
  }
  return screenId;
}