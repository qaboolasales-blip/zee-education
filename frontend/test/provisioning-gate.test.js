/**
 * Provisioning contract gate. Tasks: C-O-03 / C-O-04.
 *
 * Proves the block is self-enforcing and that neither a QR parser nor a
 * provisioning API call was quietly implemented.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  DOCUMENTED_BUT_UNIMPLEMENTED_ENTITIES,
  EXPECTED_PROVISIONING_CONTRACT_DOC,
  PENDING_PROVISIONING_CONTRACTS,
  PROVISIONING_ENDPOINTS_PUBLISHED,
  PROVISIONING_INTEGRATION_AUTHORIZED,
  PROVISIONING_SCHEMA_PUBLISHED,
  ProvisioningContractStatus,
  SOURCE_OBSERVATIONS,
  assertNoInventedProvisioningSchemas,
  describeProvisioningBlock,
  findPendingProvisioningContract,
} from '../core/provisioning/index.js';
import { listSourceFiles, readCode } from './helpers/source-scan.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const CORE_DIR = resolve(HERE, '..', 'core');

describe('C-O-04 — the provisioning surface is published on the control plane only', () => {
  it('publishes the documented control-plane route surface', () => {
    // Snapshot of every string-literal route path in Routes.php, in declaration
    // order. A new route must be added here deliberately — this is the gate
    // that keeps the published surface reviewable. Shield's own auth routes are
    // registered via service('auth')->routes() and never appear as literals.
    const routes = readFileSync(resolve(REPO_ROOT, 'backend', 'app', 'Config', 'Routes.php'), 'utf8');
    const paths = [...routes.matchAll(/\$routes->\w+\(\s*'([^']*)'/g)].map((m) => m[1]);
    assert.deepEqual(paths, [
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
      'api/school',
      'staff',
      'attendance',
      'fees/invoices',
      'fees/receipts',
      'api/health',
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
      '/',
      'portal',
      'api/admin/billing',
      'summary',
      'upcomings',
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
    assert.equal(PROVISIONING_ENDPOINTS_PUBLISHED, true);
  });

  it('has no model layer for school-local data in the control plane', () => {
    // KiloCode added two control-plane models plus a SchoolLocal subdirectory:
    //   - `Models/AuditEventModel.php` (B-K-07) — over `platform_audit_events`,
    //     append-only, no school-local data.
    //   - `Models/SchoolsModel.php` (C-K-01) — over the `schools` control-plane
    //     table, which holds install/registry metadata, NOT school-local people
    //     or academic data (ADR-001).
    //   - `Models/SchoolLocal/AcademicSessionModel.php` (D-K-01) — a school-LOCAL
    //     model, which is CORRECT: it lives in a subdirectory and maps to an
    //     `academic_sessions` table that belongs to the per-school database, not
    //     the control plane. The ADR-001 boundary is a directory boundary as
    //     well as a data one.
    // The assertion is therefore on WHAT exists in `Models/` (control plane)
    // versus what exists in `Models/SchoolLocal/` (school local). No Student,
    // Guardian, Staff, Attendance, Result, Fee, Timetable, Homework, Notice,
    // Assessment, Mark, Class, Section, Subject, Session, TeacherAssignment,
    // Invoice, Payment, Discount, Fine, Export, PrintTemplate,
    // CommercialRecord, SupportTicket, License or Renewal model may exist in
    // the control plane, because all of those are school-local (ADR-001).
    const models = readdirSync(resolve(REPO_ROOT, 'backend', 'app', 'Models'));
    const schoolLocal = readdirSync(resolve(REPO_ROOT, 'backend', 'app', 'Models', 'SchoolLocal'));
    assert.deepEqual(models, ['.gitkeep', 'AuditEventModel.php', 'SchoolLocal', 'SchoolsModel.php']);
    // FeeModel was split into FeeInvoiceModel + FeeReceiptModel when the fees
    // surface grew invoices and receipts (backend-tested via SchoolApi).
    assert.deepEqual(schoolLocal, ['AcademicSessionModel.php','AssessmentModel.php','FeeInvoiceModel.php','FeeReceiptModel.php','HomeworkModel.php','NoticeModel.php','TimetableModel.php']);
    // The forbidden-name scan is scoped to FILES in the top-level Models
    // directory, because `AcademicSessionModel.php` lives in SchoolLocal/ and
    // legitimately contains the word "Session". A subdirectory name is not a
    // model, so it is excluded from the name scan but still listed in the
    // directory assertion above.
    const topLevelFiles = models.filter((name) => name.endsWith('.php')).join(' ');
    for (const forbidden of [
      'Student', 'Guardian', 'Staff', 'Teacher', 'Attendance', 'Result',
      'Fee', 'Invoice', 'Payment', 'Discount', 'Fine', 'Timetable',
      'Homework', 'Notice', 'Assessment', 'Mark', 'Class', 'Section',
      'Subject', 'Session', 'Assignment', 'Export', 'PrintTemplate',
      'Commercial', 'Support', 'License', 'Renewal',
    ]) {
      assert.ok(!topLevelFiles.includes(forbidden), `no ${forbidden} model may exist in the control plane`);
    }
    // `SchoolsModel` is allowed because it maps to the `schools` control-plane
    // table (install/registry metadata only, ADR-001). It must not be a
    // school-LOCAL model — the table name is the discriminator.
    assert.ok(models.includes('SchoolsModel.php'));
  });

  it('documents the schema and endpoints separately', () => {
    assert.equal(PROVISIONING_SCHEMA_PUBLISHED, true);
    assert.equal(PROVISIONING_INTEGRATION_AUTHORIZED, false);
    assert.equal(existsSync(resolve(REPO_ROOT, EXPECTED_PROVISIONING_CONTRACT_DOC)), true);
  });
});

describe('C-O-03/C-O-04 — no invented provisioning contract', () => {
  it('covers every capability Batch C needs', () => {
    assert.deepEqual(
      PENDING_PROVISIONING_CONTRACTS.map((contract) => contract.id).sort(),
      ['plan-catalogue', 'qr-payload', 'school-connection-code', 'school-provisioning', 'school-registry'],
    );
  });

  it('records real backend endpoints and invents no payload schemas', () => {
    assert.equal(assertNoInventedProvisioningSchemas(), true);
    for (const contract of PENDING_PROVISIONING_CONTRACTS) {
      // Payload shapes are never modelled here, published or not — they live
      // in the backend documents.
      assert.equal(contract.requestSchema, null);
      assert.equal(contract.responseSchema, null);
      if (contract.status === ProvisioningContractStatus.PUBLISHED) {
        assert.equal(typeof contract.method, 'string');
        assert.equal(typeof contract.path, 'string');
        assert.equal(contract.implemented, true);
      } else {
        assert.equal(contract.method, null);
        assert.equal(contract.path, null);
        assert.equal(contract.implemented, false);
      }
    }
  });

  it('fails closed if a schema or implementation claim is introduced', () => {
    const base = {
      id: 'school-registry',
      status: ProvisioningContractStatus.BLOCKED_NOT_CONTRACTED,
      method: null,
      path: null,
      requestSchema: null,
      responseSchema: null,
      implemented: false,
    };
    assert.throws(() => assertNoInventedProvisioningSchemas([{ ...base, path: '/schools' }]));
    assert.throws(() => assertNoInventedProvisioningSchemas([{ ...base, method: 'POST' }]));
    assert.throws(() => assertNoInventedProvisioningSchemas([{ ...base, requestSchema: { name: 'string' } }]));
    assert.throws(() => assertNoInventedProvisioningSchemas([{ ...base, responseSchema: { data: [] } }]));
    assert.throws(() => assertNoInventedProvisioningSchemas([{ ...base, implemented: true }]));
    assert.doesNotThrow(() => assertNoInventedProvisioningSchemas([base]));
  });

  it('records source observations as non-contracts', () => {
    assert.ok(SOURCE_OBSERVATIONS.length >= 3);
    for (const observation of SOURCE_OBSERVATIONS) {
      assert.equal(observation.contract, false);
    }
  });

  it('looks capabilities up by id', () => {
    assert.equal(findPendingProvisioningContract('qr-payload').id, 'qr-payload');
    assert.equal(findPendingProvisioningContract('nope'), null);
  });

  it('summarizes the block without leaking payload data', () => {
    const summary = describeProvisioningBlock();
    assert.equal(summary.schemaPublished, true);
    assert.equal(summary.endpointsPublished, true);
    assert.equal(summary.integrationAuthorized, false);
    assert.equal(summary.capabilities.length, 5);
    assert.doesNotMatch(JSON.stringify(summary), /requestSchema|responseSchema|password/i);
  });

  it('is deeply frozen', () => {
    for (const contract of PENDING_PROVISIONING_CONTRACTS) {
      assert.equal(Object.isFrozen(contract), true);
    }
    assert.throws(() => {
      'use strict';
      PENDING_PROVISIONING_CONTRACTS[0].implemented = true;
    });
  });
});

describe('no QR parser or provisioning call was implemented', () => {
  const files = listSourceFiles(resolve(CORE_DIR, 'provisioning'));
  const rel = (file) => file.replace(`${REPO_ROOT}\\`, '').replace(/\//g, '\\');

  it('scans the provisioning modules', () => {
    assert.ok(files.length >= 4, `expected the provisioning tree, got ${files.length}`);
  });

  it('contains no QR decoding or payload parsing', () => {
    const offenders = files
      .filter((file) =>
        /\b(jwt|qrcode|qr_decode|decodeQr|parseQr|jimp|zxing|crypto\.subtle|atob|btoa)\b/i.test(readCode(file)),
      )
      .map(rel);
    assert.deepEqual(offenders, []);
  });

  it('performs no cryptography and verifies no signature', () => {
    // Matches actual crypto API usage, not the word "signature" in a blocker
    // description. An uncontracted QR payload must not be signed or verified here.
    const cryptoUsage =
      /\b(crypto\.subtle|node:crypto|createHmac|createSign|createVerify|timingSafeEqual|new\s+HMAC|jwt\.|jose|subtle\.)/i;
    const offenders = files.filter((file) => cryptoUsage.test(readCode(file))).map(rel);
    assert.deepEqual(offenders, []);
  });

  it('contains no transport call to an uncontracted provisioning endpoint', () => {
    const offenders = files
      .filter((file) =>
        /\.(post|get|put|patch|delete)\(\s*['"`][^'"`]*(school|provision|qr|install|registry|decommission)/i.test(
          readCode(file),
        ),
      )
      .map(rel);
    assert.deepEqual(offenders, []);
  });

  it('contains no database name, credential or audit column access', () => {
    const offenders = files
      .filter((file) =>
        new RegExp('\\b(password|db_password|dbpasswd|mysql:|mariadb:|dsn)\\b', 'i').test(readCode(file)),
      )
      .map(rel);
    assert.deepEqual(offenders, []);
  });
});

describe('ADR-001 is respected by the published schema record', () => {
  it('does not model any shared-tenant arrangement', () => {
    const text = Object.values(DOCUMENTED_BUT_UNIMPLEMENTED_ENTITIES).map((e) => e.holds).join(' ');
    assert.doesNotMatch(text, /tenant_id/i);
  });
});
