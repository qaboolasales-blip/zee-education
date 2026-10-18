/**
 * Report / export tests. Tasks: J-O-01 … J-O-04.
 * Synthetic rows only. No network. No rendering.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { Surface } from '../core/auth/index.js';
import { Role } from '../core/auth/role-guard.js';
import {
  BUILT_IN_TEMPLATES,
  CUSTOM_DESIGN_APPROVER,
  EXPORT_FORMATS,
  EXPORT_FORMATS as FORMATS,
  ExportOutcome,
  ExportReject,
  FEEDBACK_AREA,
  LOCKED_FORMAT_STRINGS,
  MISSING_REPORT_ENTITIES,
  PENDING_REPORT_CONTRACTS,
  REPORT_BINDINGS,
  REPORT_INTEGRATION_AUTHORIZED,
  ReportSurface,
  SURFACE_ROLES,
  TEMPLATE_COMMERCIAL_RULES,
  TemplateReject,
  authoriseExport,
  assertExportOutcomesMatchReferences,
  assertNoInventedReportSchemas,
  assertNoPrintDesigner,
  assertNoReportElementCreation,
  assertReportBindingsMatchReferences,
  assertReportRolesMatchReferences,
  assertSingleFeedbackArea,
  assertTemplatesMatchReferences,
  bindFeedback,
  blockedReportBindings,
  canOpenReportSurface,
  canRenderTemplate,
  classifyExportOutcome,
  describeReportBlock,
  findPendingReportContract,
  isBuiltInTemplate,
  isKnownExportFormat,
  isReportSurface,
  reportBindingById,
  reportSurfacesFor,
  selectAvailableReports,
  templateById,
  templateCatalogue,
} from '../core/reports/index.js';
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
  [Surface.PLATFORM]: readReference('Super Admin'),
});

describe('J-O-01 — export authorization follows the reference tool lists', () => {
  it('passes the reference drift guard', () => {
    assert.equal(assertReportRolesMatchReferences(REFERENCES['mobile-app'], REFERENCES['school-desktop']), true);
  });

  it('gives the reports tool to Teacher and School Admin only', () => {
    assert.deepEqual([...SURFACE_ROLES[ReportSurface.REPORTS]], [Role.TEACHER, Role.SCHOOL_ADMIN]);
    assert.equal(canOpenReportSurface(Role.TEACHER, ReportSurface.REPORTS), true);
    assert.equal(canOpenReportSurface(Role.SCHOOL_ADMIN, ReportSurface.REPORTS), true);
    assert.equal(canOpenReportSurface(Role.PARENT, ReportSurface.REPORTS), false);
    assert.equal(canOpenReportSurface(Role.STUDENT, ReportSurface.REPORTS), false);
  });

  it('gives the documents tool to Parent, Student and School Admin but not Teacher', () => {
    assert.deepEqual(
      [...SURFACE_ROLES[ReportSurface.DOCUMENTS]],
      [Role.PARENT, Role.STUDENT, Role.SCHOOL_ADMIN],
    );
    assert.equal(canOpenReportSurface(Role.TEACHER, ReportSurface.DOCUMENTS), false);
  });

  it('denies Super Admin and every unknown role by default', () => {
    for (const role of [Role.SUPER_ADMIN, 'Admin', 'teacher', '', null, 42, undefined]) {
      for (const surface of Object.values(ReportSurface)) {
        assert.equal(canOpenReportSurface(role, surface), false, `${role}/${surface}`);
      }
    }
  });

  it('denies an unknown surface', () => {
    assert.equal(isReportSurface('exports'), false);
    for (const role of [Role.TEACHER, Role.SCHOOL_ADMIN]) {
      assert.equal(
        authoriseExport({ role, surface: 'exports', reportIds: ['a'] }).reason,
        ExportReject.UNKNOWN_SURFACE,
      );
    }
  });

  it('authorises a valid teacher export', () => {
    const result = authoriseExport({
      role: Role.TEACHER,
      surface: ReportSurface.REPORTS,
      format: EXPORT_FORMATS.PDF,
      reportIds: ['attendance'],
    });
    assert.equal(result.allowed, true);
    assert.equal(result.value.format, 'PDF');
  });

  it('refuses a parent export of their documents without server-resolved linkage', () => {
    const noScope = authoriseExport({
      role: Role.PARENT,
      surface: ReportSurface.DOCUMENTS,
      reportIds: ['result-card'],
    });
    assert.equal(noScope.reason, ExportReject.NOT_AUTHORISED);

    const linked = authoriseExport({
      role: Role.PARENT,
      surface: ReportSurface.DOCUMENTS,
      reportIds: ['result-card'],
      viewerScope: { linkedIds: ['S-1'] },
    });
    assert.equal(linked.allowed, true);

    const empty = authoriseExport({
      role: Role.PARENT,
      surface: ReportSurface.DOCUMENTS,
      reportIds: ['result-card'],
      viewerScope: { linkedIds: [] },
    });
    assert.equal(empty.reason, ExportReject.NOT_AUTHORISED);
  });

  it('blocks an export that would carry an unpublished result', () => {
    const blocked = authoriseExport({
      role: Role.SCHOOL_ADMIN,
      surface: ReportSurface.REPORTS,
      reportIds: ['result-cards', 'attendance'],
      resultStageById: { 'result-cards': 'in-review' },
    });
    assert.equal(blocked.reason, ExportReject.UNPUBLISHED_RESULTS);
    assert.deepEqual([...blocked.errors], ['result-cards']);

    const allowed = authoriseExport({
      role: Role.SCHOOL_ADMIN,
      surface: ReportSurface.REPORTS,
      reportIds: ['result-cards'],
      resultStageById: { 'result-cards': 'published' },
    });
    assert.equal(allowed.allowed, true);
  });

  it('refuses an unknown format and an empty selection', () => {
    const base = { role: Role.TEACHER, surface: ReportSurface.REPORTS };
    assert.equal(authoriseExport({ ...base, format: 'docx', reportIds: ['a'] }).reason, ExportReject.FORMAT_NOT_SUPPORTED);
    assert.equal(authoriseExport({ ...base, reportIds: [] }).reason, ExportReject.NO_REPORT_SELECTED);
    assert.equal(authoriseExport({ ...base, reportIds: null }).reason, ExportReject.NO_REPORT_SELECTED);
  });

  it('knows only the formats the references name', () => {
    assert.deepEqual(Object.values(FORMATS).sort(), ['CSV', 'Excel', 'PDF', 'XLS']);
    for (const locked of LOCKED_FORMAT_STRINGS) {
      assert.ok(
        REFERENCES['school-desktop'].includes(locked) || REFERENCES['mobile-app'].includes(locked),
        locked,
      );
    }
    assert.equal(isKnownExportFormat('PDF'), true);
    assert.equal(isKnownExportFormat('pdf'), false);
  });

  it('withholds rather than blanks an unavailable surface', () => {
    const denied = selectAvailableReports(Role.PARENT, ['Attendance report', 'Fee report']);
    assert.equal(denied.permitted, false);
    assert.deepEqual([...denied.visible], []);
    assert.deepEqual([...denied.withheld], ['Attendance report', 'Fee report']);

    const allowed = selectAvailableReports(Role.TEACHER, ['Attendance report']);
    assert.equal(allowed.permitted, true);
    assert.deepEqual([...allowed.visible], ['Attendance report']);
    assert.deepEqual([...allowed.withheld], []);
  });

  it('lists the surfaces a role may open', () => {
    assert.deepEqual([...reportSurfacesFor(Role.SCHOOL_ADMIN)], ['reports', 'documents']);
    assert.deepEqual([...reportSurfacesFor(Role.TEACHER)], ['reports']);
    assert.deepEqual([...reportSurfacesFor(Role.STUDENT)], ['documents']);
    assert.deepEqual([...reportSurfacesFor(Role.SUPER_ADMIN)], []);
  });
});

describe('J-O-03 — export failures map to the one existing feedback area', () => {
  it('passes the reference drift guard', () => {
    assert.equal(assertExportOutcomesMatchReferences(REFERENCES['school-desktop'], REFERENCES[Surface.PLATFORM]), true);
  });

  it('treats 403 and 401 identically so the two are indistinguishable', () => {
    const forbidden = classifyExportOutcome({ status: 403 });
    const unauth = classifyExportOutcome({ status: 401 });
    assert.equal(forbidden.outcome, ExportOutcome.FORBIDDEN);
    assert.equal(unauth.outcome, ExportOutcome.FORBIDDEN);
    assert.equal(forbidden.toast, unauth.toast);
    assert.equal(forbidden.retryable, false);
  });

  it('maps no-data, expired-download and failed-export separately', () => {
    assert.equal(classifyExportOutcome({ status: 404 }).outcome, ExportOutcome.NO_DATA);
    assert.equal(classifyExportOutcome({ status: 200, rowCount: 0 }).outcome, ExportOutcome.NO_DATA);
    assert.equal(
      classifyExportOutcome({
        status: 200,
        exportUrl: '/reports/exports/abc',
        expiresAt: '2026-10-01T00:00:00Z',
        now: '2026-10-18T00:00:00Z',
      }).outcome,
      ExportOutcome.EXPIRED_DOWNLOAD,
    );
    assert.equal(classifyExportOutcome({ status: 500 }).outcome, ExportOutcome.FAILED_EXPORT);
    assert.equal(classifyExportOutcome({ status: 429 }).outcome, ExportOutcome.FAILED_EXPORT);
  });

  it('separates a transport failure from a rejected request', () => {
    assert.equal(classifyExportOutcome({ errorKind: 'network' }).outcome, ExportOutcome.TRANSPORT);
    assert.equal(classifyExportOutcome({ errorKind: 'network' }).retryable, true);
    assert.equal(classifyExportOutcome({}).outcome, ExportOutcome.UNKNOWN);
  });

  it('refuses to call a zero-byte export a success', () => {
    const result = classifyExportOutcome({
      status: 200,
      exportUrl: '/reports/exports/abc',
      bytes: 0,
      expiresAt: '2026-10-30T00:00:00Z',
      now: '2026-10-18T00:00:00Z',
    });
    assert.equal(result.outcome, ExportOutcome.EMPTY_DOCUMENT);
    assert.equal(result.retryable, false);
  });

  it('reports a live download with rows as ready and says nothing', () => {
    const ready = classifyExportOutcome({
      status: 200,
      exportUrl: '/reports/exports/abc',
      bytes: 2048,
      expiresAt: '2026-10-30T00:00:00Z',
      now: '2026-10-18T00:00:00Z',
    });
    assert.equal(ready.outcome, ExportOutcome.READY);
    assert.equal(ready.toast, null);
    assert.equal(bindFeedback(ready).show, false);
  });

  it('binds every failure to #toast and to nothing else', () => {
    for (const status of [403, 404, 500, 429]) {
      const feedback = bindFeedback(classifyExportOutcome({ status }));
      assert.equal(feedback.area, FEEDBACK_AREA);
      assert.equal(feedback.area.hook, '#toast');
      assert.equal(feedback.show, true);
      assert.equal(typeof feedback.message, 'string');
    }
    assert.equal(FEEDBACK_AREA.id, 'toast');
  });

  it('refuses a second feedback area, which would be a visual change', () => {
    assert.equal(assertSingleFeedbackArea(['toast']), true);
    assert.throws(() => assertSingleFeedbackArea(['toast', 'error-banner']), /visual change/);
    assert.throws(() => assertSingleFeedbackArea(['toast', 'toast']), /duplicated/);
    assert.throws(() => assertSingleFeedbackArea(['spinner']));
    assert.equal(assertSingleFeedbackArea(null), true);
  });
});

describe('J-O-02 — templates are preserved, never authored', () => {
  it('passes the reference drift guard', () => {
    assert.equal(assertTemplatesMatchReferences(REFERENCES['school-desktop'], REFERENCES[Surface.PLATFORM]), true);
  });

  it('names exactly the four built-in templates both references share', () => {
    assert.deepEqual(
      BUILT_IN_TEMPLATES.map((t) => t.name),
      ['Admission form', 'Teacher form', 'Student ID card', 'Result card'],
    );
    for (const template of BUILT_IN_TEMPLATES) {
      assert.ok(REFERENCES['school-desktop'].includes(template.name), template.name);
      assert.ok(REFERENCES[Surface.PLATFORM].includes(template.name), template.name);
      assert.equal(isBuiltInTemplate(template.id), true);
      assert.equal(isBuiltInTemplate(template.name), true);
      assert.equal(isBuiltInTemplate('report-card'), false);
    }
    assert.equal(templateById('admission-form').name, 'Admission form');
    assert.equal(templateById('nope'), null);
  });

  it('records the locked commercial rules', () => {
    assert.deepEqual({ ...TEMPLATE_COMMERCIAL_RULES.builtIn }, {
      price: 'Free', badge: 'g', note: 'Free to select',
    });
    assert.deepEqual({ ...TEMPLATE_COMMERCIAL_RULES.customDesign }, {
      price: 'One-time', badge: 'w', note: 'Charge once',
    });
    assert.deepEqual({ ...TEMPLATE_COMMERCIAL_RULES.reprints }, {
      price: 'Included', badge: 'g', note: 'Approved design use hota hai',
    });
  });

  it('lists the catalogue with the existing Preview action only', () => {
    const catalogue = templateCatalogue();
    assert.equal(catalogue.length, 4);
    for (const item of catalogue) {
      assert.equal(item.price, 'Free');
      assert.equal(item.badgeClass, 'g');
      assert.equal(item.actionLabel, 'Preview');
    }
    assert.equal(Object.isFrozen(catalogue), true);
  });

  it('renders a built-in template for an ordinary role', () => {
    for (const template of BUILT_IN_TEMPLATES) {
      const result = canRenderTemplate({
        templateId: template.id,
        role: Role.SCHOOL_ADMIN,
        resultStage: 'published',
      });
      assert.equal(result.allowed, true, template.id);
    }
  });

  it('will not render a result card from an unpublished result', () => {
    assert.equal(
      canRenderTemplate({ templateId: 'result-card', role: Role.SCHOOL_ADMIN, resultStage: 'in-review' }).reason,
      TemplateReject.CUSTOM_DESIGN_NOT_APPROVED,
    );
    assert.equal(
      canRenderTemplate({ templateId: 'result-card', role: Role.SCHOOL_ADMIN, resultStage: 'published' }).allowed,
      true,
    );
    // No stage at all means the gate was never satisfied.
    assert.equal(
      canRenderTemplate({ templateId: 'result-card', role: Role.SCHOOL_ADMIN }).reason,
      TemplateReject.CUSTOM_DESIGN_NOT_APPROVED,
    );
  });

  it('refuses to author a custom design from the client', () => {
    assert.equal(canRenderTemplate({ templateId: 'report-card', role: Role.SCHOOL_ADMIN }).reason, TemplateReject.UNKNOWN_TEMPLATE);
    assert.equal(
      canRenderTemplate({ templateId: 'report-card', role: Role.SCHOOL_ADMIN, customDesignApproved: true }).reason,
      TemplateReject.NO_APPROVED_FIELDS,
    );
    assert.equal(
      canRenderTemplate({
        templateId: 'report-card',
        role: Role.TEACHER,
        customDesignApproved: true,
        approvedFields: ['name'],
      }).reason,
      TemplateReject.DESIGN_AUTHORITY_MISMATCH,
    );
    const approved = canRenderTemplate({
      templateId: 'report-card',
      role: CUSTOM_DESIGN_APPROVER,
      customDesignApproved: true,
      approvedFields: ['name', 'cnic'],
    });
    assert.equal(approved.allowed, true);
    assert.equal(approved.value.custom, true);
    assert.equal(approved.value.templateId, null);
  });

  it('scans the whole core tree and finds no print designer', () => {
    const files = listSourceFiles(CORE_DIR);
    const sources = files.map((file) => ({
      path: file.replace(`${REPO_ROOT}\\`, '').replace(/\//g, '\\'),
      code: readCode(file),
    }));
    assert.equal(assertNoPrintDesigner(sources), true);
  });

  it('would fail on a template builder or print stylesheet', () => {
    assert.throws(() => assertNoPrintDesigner([{ path: 'a.js', code: 'el.innerHTML = tpl' }]));
    assert.throws(() => assertNoPrintDesigner([{ path: 'a.js', code: '@media print{body{}}' }]));
    assert.throws(() => assertNoPrintDesigner([{ path: 'a.js', code: 'window.print()' }]));
  });

  it('does not mistake the approved Batch D theme registry for a designer', () => {
    // `theme-tokens.js` legitimately emits --brand/--brand2. An earlier, broader
    // "style emitter" pattern flagged it, which proved the pattern too wide rather
    // than the module wrong.
    const theme = listSourceFiles(CORE_DIR).filter((f) => f.includes('theme-tokens'));
    assert.equal(theme.length, 1);
    assert.doesNotThrow(() => assertNoPrintDesigner([{ path: 'a.js', code: readCode(theme[0]) }]));
  });
});

describe('J-O-01/J-O-03 — binding contract', () => {
  it('passes the drift guard', () => {
    assert.equal(assertReportBindingsMatchReferences(REFERENCES), true);
  });

  it('never authorises creating UI', () => {
    assert.equal(assertNoReportElementCreation(), true);
  });

  it('marks every element unpublished with no field', () => {
    for (const binding of REPORT_BINDINGS) {
      assert.equal(binding.state, 'unpublished', binding.id);
      assert.equal(binding.field, null, binding.id);
    }
  });

  it('blocks the six write actions', () => {
    assert.deepEqual(
      blockedReportBindings().map((b) => b.id),
      ['JRB-01', 'JRB-02', 'JRB-07', 'JRB-11', 'JRB-14', 'JRB-16'],
    );
  });

  it('records that a result export inherits the publication gate', () => {
    assert.match(reportBindingById('JRB-04').note, /publication gate/);
    assert.match(reportBindingById('JRB-10').note, /Approved only/);
  });
});

describe('no invented report contract', () => {
  it('confirms nothing is authorized', () => {
    assert.equal(REPORT_INTEGRATION_AUTHORIZED, false);
    assert.equal(describeReportBlock().schemaPublished, false);
    assert.equal(describeReportBlock().integrationAuthorized, false);
  });

  it('covers every Batch J capability', () => {
    assert.deepEqual(
      PENDING_REPORT_CONTRACTS.map((c) => c.id).sort(),
      ['commercial-billing', 'export-create', 'export-download', 'print-render', 'report-read'],
    );
  });

  it('declares no endpoint or payload and fails closed otherwise', () => {
    assert.equal(assertNoInventedReportSchemas(), true);
    const base = {
      id: 'export-create',
      status: 'blocked-needs-provisioning-path',
      method: null,
      path: null,
      requestSchema: null,
      responseSchema: null,
      implemented: false,
    };
    assert.throws(() => assertNoInventedReportSchemas([{ ...base, path: '/reports/export' }]));
    assert.throws(() => assertNoInventedReportSchemas([{ ...base, method: 'POST' }]));
    assert.throws(() => assertNoInventedReportSchemas([{ ...base, implemented: true }]));
    assert.throws(() => assertNoInventedReportSchemas([{ ...base, status: 'published' }]));
  });

  it('lists the entities that must exist first', () => {
    assert.deepEqual(
      MISSING_REPORT_ENTITIES.map((e) => e.entity),
      ['export_jobs', 'export_row_permissions', 'print_templates', 'custom_design_approvals'],
    );
  });

  it('records the export permission contract precisely', () => {
    const contract = findPendingReportContract('export-create');
    assert.match(contract.unblockRequires, /server-side re-authorisation/);
    assert.match(contract.blocker, /usability guard, not a control/);
  });
});
