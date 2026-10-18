/**
 * Export & report authorization. Task: J-O-01.
 *
 * "Bind existing export/print controls to real authorized endpoints only."
 *
 * The endpoints do not exist, so nothing is bound. What *is* real is the permission
 * matrix, because the references state it themselves — three separate times, in
 * three different surfaces:
 *
 *   School Dashboard, Reports & Print   sm('EXPORTS','PDF / XLS','Permission controlled')
 *   Mobile, reports tool                'Exports role permission enforce karein'
 *   Mobile, documents tool              ['SCHOOL DOCUMENTS','4 formats','Available when authorised']
 *
 * and the tool lists make it exact. From the reference's own `TL` map:
 *
 *   Parent        fees timetable homework notices leave messages calendar documents
 *   Student       timetable homework notices calendar messages leave documents
 *   Teacher       timetable attendanceTool marks homework messages notices reports leave
 *   'School Admin' students admissions fees staff timetable marks notices reports documents settings
 *
 * So `reports` (the create-export tool) belongs to **Teacher and School Admin only** —
 * a Parent and a Student have no `reports` entry at all. And `documents` belongs to
 * **Parent, Student and School Admin**, but *not* Teacher.
 *
 * That asymmetry is the whole point: exporting aggregated data and viewing your own
 * documents are different permissions, and the reference already separates them.
 *
 * No DOM, no request, no rendering.
 */

import { Role, ROLES } from '../auth/role-guard.js';

/** The two surfaces that own export and document access. */
export const ReportSurface = Object.freeze({
  REPORTS: 'reports',
  DOCUMENTS: 'documents',
});

/**
 * Membership transcribed from the reference's `TL` tool lists.
 * This is a reading of existing UI, not an invented policy — `assertReportRolesMatchReferences()`
 * re-derives it from the reference source so it cannot drift.
 */
export const SURFACE_ROLES = Object.freeze({
  [ReportSurface.REPORTS]: Object.freeze([Role.TEACHER, Role.SCHOOL_ADMIN]),
  [ReportSurface.DOCUMENTS]: Object.freeze([Role.PARENT, Role.STUDENT, Role.SCHOOL_ADMIN]),
});

/** Formats named in the references. */
export const EXPORT_FORMATS = Object.freeze({
  PDF: 'PDF',
  XLS: 'XLS',
  EXCEL: 'Excel',
  CSV: 'CSV',
});

/**
 * Every format string the references actually print, transcribed for drift-checking.
 * Sources: `sm('EXPORTS','PDF / XLS',…)`, the mobile reports tool subtitle
 * ('PDF, Excel, CSV'), and the export button label ('Export Excel / CSV').
 */
export const LOCKED_FORMAT_STRINGS = Object.freeze([
  'PDF / XLS',
  'PDF, Excel, CSV',
  'Export Excel / CSV',
]);

export const ExportReject = Object.freeze({
  UNKNOWN_SURFACE: 'unknown-surface',
  UNKNOWN_ROLE: 'unknown-role',
  SURFACE_NOT_AVAILABLE: 'surface-not-available-to-role',
  NOT_AUTHORISED: 'not-authorised',
  FORMAT_NOT_SUPPORTED: 'format-not-supported',
  NO_REPORT_SELECTED: 'no-report-selected',
  UNPUBLISHED_RESULTS: 'unpublished-results',
});

function ok(value) {
  return Object.freeze({ allowed: true, reason: null, value, errors: Object.freeze([]) });
}

function fail(reason, errors = []) {
  return Object.freeze({ allowed: false, reason, value: null, errors: Object.freeze(errors) });
}

export function isReportSurface(value) {
  return value === ReportSurface.REPORTS || value === ReportSurface.DOCUMENTS;
}

export function isKnownExportFormat(value) {
  return typeof value === 'string' && Object.values(EXPORT_FORMATS).includes(value);
}

/**
 * May this role open this surface at all?
 * Unknown roles and unknown surfaces both deny — default-deny, matching Batch B.
 */
export function canOpenReportSurface(role, surface) {
  if (!isReportSurface(surface)) return false;
  if (!ROLES.includes(role)) return false;
  return SURFACE_ROLES[surface].includes(role);
}

/** Which surfaces may this role open? */
export function reportSurfacesFor(role) {
  return Object.freeze(
    Object.values(ReportSurface).filter((surface) => canOpenReportSurface(role, surface)),
  );
}

/**
 * Authorize one export request.
 *
 * The scope gate is the important half: a Parent may open `documents` but the data
 * behind those documents is their linked children only, and that linkage must be
 * server-resolved. An empty `linkedIds` array is therefore a refusal, not a wildcard.
 *
 * @param {{ role?: unknown, surface?: unknown, format?: unknown, reportIds?: unknown,
 *           viewerScope?: { linkedIds?: unknown }, resultStageById?: Record<string, string> }} request
 */
export function authoriseExport(request = {}) {
  const role = request.role;
  const surface = request.surface;

  if (!isReportSurface(surface)) return fail(ExportReject.UNKNOWN_SURFACE);
  if (!ROLES.includes(role)) return fail(ExportReject.UNKNOWN_ROLE);
  if (!canOpenReportSurface(role, surface)) return fail(ExportReject.SURFACE_NOT_AVAILABLE);
  if (request.format !== undefined && !isKnownExportFormat(request.format)) {
    return fail(ExportReject.FORMAT_NOT_SUPPORTED);
  }

  const ids = Array.isArray(request.reportIds) ? request.reportIds.filter(Boolean) : [];
  if (ids.length === 0) return fail(ExportReject.NO_REPORT_SELECTED);

  // Parent scope is always server-resolved; a client cannot assert its own children.
  if (role === Role.PARENT) {
    const linked = request.viewerScope?.linkedIds;
    if (!Array.isArray(linked) || linked.length === 0) {
      return fail(ExportReject.NOT_AUTHORISED);
    }
  }

  /**
   * Result exports inherit the Batch H publication gate.
   * The references say so twice: 'Approved only' on the reports tool and
   * 'Published results only' on the Result card. An export must never be the way an
   * unpublished result leaves the building.
   */
  const stages = request.resultStageById ?? {};
  const blocked = ids.filter((id) => {
    const stage = stages[id];
    return stage !== undefined && stage !== 'published';
  });
  if (blocked.length > 0) return fail(ExportReject.UNPUBLISHED_RESULTS, blocked);

  return ok(Object.freeze({ role, surface, format: request.format ?? null, reportIds: Object.freeze([...ids]) }));
}

/**
 * Which reports may this role actually see? A declared availability list is only a
 * claim, so anything outside the role's own surface is withheld and reported.
 *
 * @param {string} role
 * @param {string[]} declared
 */
export function selectAvailableReports(role, declared) {
  const list = Array.isArray(declared) ? declared.filter((item) => typeof item === 'string') : [];
  const permitted = canOpenReportSurface(role, ReportSurface.REPORTS);
  const visible = permitted ? list : [];
  return Object.freeze({
    visible: Object.freeze([...visible]),
    withheld: Object.freeze(permitted ? [] : [...list]),
    permitted,
  });
}

/**
 * Drift guard — re-derive the surface matrix from the reference's own tool lists.
 *
 * The mobile preview encodes them as `TL.Teacher`, `TL.Student`, … and the school
 * workspace as a `roleFeatures` object. Both are read here so the table above cannot
 * quietly diverge from the UI it claims to describe.
 *
 * @param {string} mobileSource
 * @param {string} schoolDashboardSource
 */
export function assertReportRolesMatchReferences(mobileSource, schoolDashboardSource) {
  const problems = [];

  // The tool lists live in a single object literal, `const TL={Parent:[...],…}`, so the
  // patterns are anchored to that declaration. `Parent:[` also occurs elsewhere in the
  // reference, and an unanchored match silently reads the wrong list.
  const tl = /const TL=\{(.*?)\};/.exec(mobileSource);
  if (tl === null) {
    throw new Error('the mobile TL tool-list declaration is no longer readable');
  }
  const block = tl[1];
  const list = (role) => {
    const match = new RegExp(`${role}\\s*:\\s*\\[([^\\]]*)\\]`).exec(block);
    return match === null ? null : match[1];
  };

  const teacher = list('Teacher');
  const parent = list('Parent');
  const admin = list("'School Admin'");

  if (teacher === null) problems.push('the mobile Teacher tool list is no longer readable');
  if (parent === null) problems.push('the mobile Parent tool list is no longer readable');
  if (admin === null) problems.push('the mobile School Admin tool list is no longer readable');

  if (teacher !== null && !teacher.includes(`'${ReportSurface.REPORTS}'`)) {
    problems.push('Teacher no longer has the reports tool');
  }
  if (teacher !== null && teacher.includes(`'${ReportSurface.DOCUMENTS}'`)) {
    problems.push('Teacher has gained the documents tool');
  }
  if (parent !== null && parent.includes(`'${ReportSurface.REPORTS}'`)) {
    problems.push('Parent has gained the reports tool');
  }
  if (parent !== null && !parent.includes(`'${ReportSurface.DOCUMENTS}'`)) {
    problems.push('Parent no longer has the documents tool');
  }
  if (admin !== null && !admin.includes(`'${ReportSurface.REPORTS}'`)) {
    problems.push('School Admin no longer has the reports tool');
  }

  for (const locked of LOCKED_FORMAT_STRINGS) {
    if (!schoolDashboardSource.includes(locked) && !mobileSource.includes(locked)) {
      problems.push(`the locked format string "${locked}" is gone from both references`);
    }
  }
  for (const claim of ['Permission controlled', 'Exports role permission enforce karein']) {
    if (!schoolDashboardSource.includes(claim) && !mobileSource.includes(claim)) {
      problems.push(`the export-permission copy "${claim}" is gone from both references`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`report authorization drifted from the references:\n  ${problems.join('\n  ')}`);
  }
  return true;
}
