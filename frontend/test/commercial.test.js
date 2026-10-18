/**
 * Commercial / license / support tests. Tasks: K-O-01 … K-O-04.
 * Synthetic records only. No network. No rendering.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { Surface } from '../core/auth/index.js';
import { Role } from '../core/auth/role-guard.js';
import { DataCategory } from '../core/people/privacy-policy.js';
import {
  COMMERCIAL_BINDINGS,
  COMMERCIAL_INTEGRATION_AUTHORIZED,
  DatabaseKind,
  LicenseStatus,
  MISSING_COMMERCIAL_ENTITIES,
  NEUTRAL_BADGE,
  PENDING_COMMERCIAL_CONTRACTS,
  SUPPORT_ACTIONS,
  SUPPORT_FORBIDDEN_CATEGORIES,
  SupportReject,
  commercialBindingById,
  commercialSummary,
  databaseBadge,
  describeCommercialBlock,
  findPendingCommercialContract,
  licenseBadge,
  licenseStateFor,
  normaliseCommercialRecord,
  parseRenewal,
  prepareRenewalReminder,
  assertCommercialBindingsMatchReferences,
  assertLicenseStatesMatchReferences,
  assertNoCommercialElementCreation,
  assertNoInventedCommercialSchemas,
  assertSupportIsolation,
  assertSupportRulesMatchReferences,
  authoriseSupportAction,
  blockedCommercialBindings,
  scopeForSupportAction,
} from '../core/commercial/index.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REF_DIR = resolve(REPO_ROOT, 'zee_education_multi_agent_handoff', 'agents', 'opencode', 'reference_ui');
const PLATFORM = readFileSync(resolve(REF_DIR, readdirSync(REF_DIR).find((n) => n.includes('Super Admin'))), 'utf8');

const H = LicenseStatus.ACTIVE;
const D = DatabaseKind.DEDICATED;

const RECORDS = [
  { name: 'Horizon Public School', city: 'Islamabad', domain: 'horizon.school.pk', plan: 'Growth', database: D, status: H, renewalDate: '28 Oct 2026' },
  { name: 'Bright Future Academy', city: 'Rawalpindi', domain: 'brightfuture.edu.pk', plan: 'Starter', database: D, status: H, renewalDate: '31 Oct 2026' },
  { name: 'Al-Noor Model School', city: 'Taxila', domain: 'alnoor.school.pk', plan: 'Complete', database: D, status: LicenseStatus.RENEWAL_DUE, renewalDate: '12 Oct 2026' },
  { name: 'Crescent School', city: 'Islamabad', domain: 'crescent.edu.pk', plan: 'Starter', database: 'Provisioning', status: 'Setup in progress', renewalDate: '—' },
];

describe('K-O-02 — licence state uses only the existing badge classes', () => {
  it('passes the reference drift guard', () => {
    assert.equal(assertLicenseStatesMatchReferences(PLATFORM), true);
  });

  it('transcribes the reference mapping exactly', () => {
    assert.equal(licenseBadge(H), 'g');
    assert.equal(licenseBadge(LicenseStatus.RENEWAL_DUE), 'w');
    assert.equal(licenseBadge('Setup in progress'), NEUTRAL_BADGE);
    assert.equal(databaseBadge(D), 'g');
    assert.equal(databaseBadge('Provisioning'), 'w');
    assert.equal(databaseBadge(null), 'w');
  });

  it('never lets an unknown licence state fall through to Active', () => {
    // The whole point of the module: a lapsed licence must not look healthy.
    for (const value of ['Expired', 'Suspended', 'Trial', 'active', '', null, undefined, 42]) {
      assert.equal(licenseBadge(value), NEUTRAL_BADGE, String(value));
    }
    const state = licenseStateFor({ ...RECORDS[0], status: 'Expired' });
    assert.equal(state.known, false);
    assert.equal(state.badge, NEUTRAL_BADGE);
    assert.equal(state.active, false);
    assert.equal(state.renewalDue, false);
  });

  it('reports the two known states plainly', () => {
    const active = licenseStateFor(RECORDS[0], { now: '2026-10-18T00:00:00Z' });
    assert.equal(active.known, true);
    assert.equal(active.active, true);
    assert.equal(active.renewalDue, false);
    assert.equal(active.badge, 'g');

    const due = licenseStateFor(RECORDS[2], { now: '2026-10-18T00:00:00Z' });
    assert.equal(due.known, true);
    assert.equal(due.renewalDue, true);
    assert.equal(due.active, false);
    assert.equal(due.badge, 'w');
  });

  it('normalises the four reference rows', () => {
    const rows = RECORDS.map(normaliseCommercialRecord);
    for (const row of rows) assert.equal(row.valid, true, row.reason);
    assert.deepEqual(
      rows.map((r) => r.statusBadge),
      ['g', 'g', 'w', 'n'],
    );
    assert.deepEqual(
      rows.map((r) => r.databaseBadge),
      ['g', 'g', 'g', 'w'],
    );
  });

  it('renders the existing — for a school with no renewal date', () => {
    const row = normaliseCommercialRecord(RECORDS[3]);
    assert.equal(row.renewalText, '—');
    assert.equal(row.renewalDate, null);
    assert.equal(row.renewalDays, null);
    assert.equal(parseRenewal({ renewalDate: '' }).text, '—');
    assert.equal(parseRenewal({ renewalDate: 'not-a-date' }).text, '—');
  });

  it('computes the existing "Due in 4d" shape from Asia/Karachi dates', () => {
    const renewal = parseRenewal({ renewalDate: '22 Oct 2026', now: '2026-10-18T00:00:00Z' });
    assert.equal(renewal.days, 4);
    const past = parseRenewal({ renewalDate: '12 Oct 2026', now: '2026-10-18T00:00:00Z' });
    assert.equal(past.days, -6);
  });

  it('refuses a record with no school name rather than inventing one', () => {
    for (const bad of [null, undefined, 'x', 42, [], {}, { name: '  ' }]) {
      assert.equal(normaliseCommercialRecord(bad).valid, false, JSON.stringify(bad));
    }
  });

  it('withholds a summary instead of zeroing missing commercial data', () => {
    assert.equal(commercialSummary([]).reason, 'no-commercial-records');
    assert.equal(commercialSummary([]).present, false);
    assert.equal(commercialSummary([{ status: H }]).reason, 'all-records-invalid');
  });

  it('counts active, due and unknown states', () => {
    const summary = commercialSummary(RECORDS);
    assert.equal(summary.present, true);
    assert.equal(summary.installs, 4);
    assert.equal(summary.activeCount, 2);
    assert.equal(summary.renewalDueCount, 1);
    assert.equal(summary.unknownStatusCount, 1);
    assert.equal(summary.invalidCount, 0);
  });

  it('reports a partial ledger instead of quietly dropping rows', () => {
    const summary = commercialSummary([...RECORDS, { name: '' }]);
    assert.equal(summary.reason, 'partial');
    assert.equal(summary.invalidCount, 1);
    assert.equal(summary.installs, 4);
  });
});

describe('K-O-03 — support may see installation health, not school records', () => {
  it('passes both isolation checks', () => {
    assert.equal(assertSupportIsolation(), true);
    assert.equal(assertSupportRulesMatchReferences(PLATFORM), true);
  });

  it('allows Super Admin to read installation health', () => {
    const result = authoriseSupportAction({
      role: Role.SUPER_ADMIN,
      action: SUPPORT_ACTIONS.VIEW_INSTALLATION_HEALTH,
    });
    assert.equal(result.allowed, true);
    assert.equal(result.value.scope, 'installation-health');
  });

  it('refuses every support action for every other role', () => {
    for (const role of [Role.TEACHER, Role.PARENT, Role.STUDENT, null, undefined]) {
      for (const action of Object.values(SUPPORT_ACTIONS)) {
        const result = authoriseSupportAction({ role, action });
        assert.equal(result.allowed, false, `${role}/${action}`);
        assert.equal(result.reason, SupportReject.ROLE_NOT_PERMITTED, `${role}/${action}`);
      }
    }
  });

  it('refuses an unknown action', () => {
    assert.equal(
      authoriseSupportAction({ role: Role.SUPER_ADMIN, action: 'drop-database' }).reason,
      SupportReject.UNKNOWN_ACTION,
    );
    assert.equal(scopeForSupportAction('drop-database'), null);
  });

  it('refuses to reach school data through a support surface', () => {
    for (const category of SUPPORT_FORBIDDEN_CATEGORIES) {
      const result = authoriseSupportAction({
        role: Role.SUPER_ADMIN,
        action: SUPPORT_ACTIONS.VIEW_INSTALLATION_HEALTH,
        category,
      });
      assert.equal(result.allowed, false, category);
      assert.equal(result.reason, SupportReject.FORBIDDEN_CATEGORY, category);
    }
    assert.equal(
      SUPPORT_FORBIDDEN_CATEGORIES.includes(DataCategory.FEE_RECORDS),
      true,
    );
  });

  it('requires an audited reason before approved logs may be read', () => {
    const bare = authoriseSupportAction({
      role: Role.SUPER_ADMIN,
      action: SUPPORT_ACTIONS.VIEW_APPROVED_LOGS,
    });
    assert.equal(bare.reason, SupportReject.AUDIT_REASON_REQUIRED);

    const reasoned = authoriseSupportAction({
      role: Role.SUPER_ADMIN,
      action: SUPPORT_ACTIONS.VIEW_APPROVED_LOGS,
      auditedReason: '  ZE-1042 escalation  ',
    });
    assert.equal(reasoned.allowed, true);
    assert.equal(reasoned.value.auditedReason, 'ZE-1042 escalation');
  });

  it('prepares a reminder and never claims it was sent', () => {
    const result = prepareRenewalReminder({
      school: 'Al-Noor Model School',
      renewalDate: '12 Oct 2026',
      preparedBy: Role.SUPER_ADMIN,
    });
    assert.equal(result.allowed, true);
    assert.equal(result.value.state, 'prepared');
    assert.equal(result.value.sent, false);
    assert.equal(result.value.channel, null);
    assert.equal(result.value.reason, SupportReject.EMAIL_NOT_CONNECTED);
  });

  it('refuses a reminder without a school, a date or authority', () => {
    assert.equal(
      prepareRenewalReminder({ renewalDate: '12 Oct 2026', preparedBy: Role.SUPER_ADMIN }).reason,
      SupportReject.UNKNOWN_RENEWAL,
    );
    assert.equal(
      prepareRenewalReminder({ school: 'X', preparedBy: Role.SUPER_ADMIN }).reason,
      SupportReject.UNKNOWN_RENEWAL,
    );
    assert.equal(
      prepareRenewalReminder({ school: 'X', renewalDate: '12 Oct 2026', preparedBy: Role.STUDENT }).reason,
      SupportReject.ROLE_NOT_PERMITTED,
    );
  });
});

describe('K-O-01/K-O-02 — binding contract', () => {
  const references = { [Surface.PLATFORM]: PLATFORM };

  it('passes the drift guard', () => {
    assert.equal(assertCommercialBindingsMatchReferences(references), true);
    assert.equal(assertNoCommercialElementCreation(), true);
  });

  it('marks every element unpublished with no field', () => {
    for (const binding of COMMERCIAL_BINDINGS) {
      assert.equal(binding.state, 'unpublished', binding.id);
      assert.equal(binding.field, null, binding.id);
    }
  });

  it('blocks the two write actions', () => {
    assert.deepEqual(blockedCommercialBindings().map((b) => b.id), ['KCB-05', 'KCB-13']);
  });

  it('records the unknown-status rule and the unsent reminder', () => {
    assert.match(commercialBindingById('KCB-09').note, /never fall through to `Active`/);
    assert.match(commercialBindingById('KCB-13').note, /may report a send/);
  });
});

describe('no invented commercial contract', () => {
  it('confirms nothing is authorized', () => {
    assert.equal(COMMERCIAL_INTEGRATION_AUTHORIZED, false);
    assert.equal(describeCommercialBlock().schemaPublished, false);
  });

  it('covers every Batch K capability', () => {
    assert.deepEqual(
      PENDING_COMMERCIAL_CONTRACTS.map((c) => c.id).sort(),
      ['commercial-read', 'license-state', 'renewal-reminder', 'support-logs', 'support-tickets'],
    );
  });

  it('declares no endpoint or payload and fails closed otherwise', () => {
    assert.equal(assertNoInventedCommercialSchemas(), true);
    const base = {
      id: 'commercial-read',
      status: 'blocked-needs-provisioning-path',
      method: null,
      path: null,
      requestSchema: null,
      responseSchema: null,
      implemented: false,
    };
    assert.throws(() => assertNoInventedCommercialSchemas([{ ...base, path: '/commercial' }]));
    assert.throws(() => assertNoInventedCommercialSchemas([{ ...base, implemented: true }]));
    assert.throws(() => assertNoInventedCommercialSchemas([{ ...base, status: 'published' }]));
  });

  it('lists the entities that must exist first', () => {
    assert.deepEqual(
      MISSING_COMMERCIAL_ENTITIES.map((e) => e.entity),
      ['school_plans', 'school_licenses', 'school_renewals', 'school_addons', 'support_tickets', 'support_audit'],
    );
  });

  it('states the licence vocabulary as the blocking question', () => {
    assert.match(findPendingCommercialContract('license-state').unblockRequires, /never assumed to be `Active`/);
  });
});
