/**
 * Provisioning selector / normalization tests. Task: C-O-05.
 * Synthetic payloads only. No real school, no real domain, no network.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FORBIDDEN_CLIENT_FIELDS,
  PUBLISHED_ERROR_STATUSES,
  PROVISIONING_JOB_STATUSES,
  PROVISIONING_JOB_TYPES,
  RejectReason,
  SCHOOL_STATUS_VALUES,
  classifyProvisioningJob,
  classifyProvisioningOutcome,
  domainFor,
  isValidSchoolDomain,
  schoolNameFor,
  validateAttempts,
  validateAuditActorType,
  validateClientPayload,
  validateEnum,
  validateIsPrimary,
  validateProvisioningJobStatus,
  validateProvisioningJobType,
  validateSchoolDomain,
  validateSchoolStatus,
} from '../core/provisioning/index.js';

const EMPTY = '—';

describe('school domain validation — synthetic hostnames', () => {
  it('accepts the shapes already stored in the locked references', () => {
    for (const domain of [
      'horizon.school.pk',
      'brightfuture.edu.pk',
      'alnoor.school.pk',
      'crescent.edu.pk',
      'school.example.com',
    ]) {
      assert.equal(isValidSchoolDomain(domain), true, domain);
      assert.equal(validateSchoolDomain(domain).valid, true, domain);
    }
  });

  it('never rewrites the stored hostname, only trims it', () => {
    assert.equal(validateSchoolDomain('  horizon.school.pk  ').value, 'horizon.school.pk');
    assert.equal(validateSchoolDomain('HORIZON.school.pk').valid, true);
    assert.equal(validateSchoolDomain('HORIZON.school.pk').value, 'HORIZON.school.pk');
  });

  it('rejects malformed domains with a closed reason set', () => {
    const cases = [
      ['', RejectReason.MISSING],
      ['   ', RejectReason.MISSING],
      [null, RejectReason.MISSING],
      [undefined, RejectReason.MISSING],
      [42, RejectReason.NOT_A_STRING],
      ['localhost', RejectReason.MALFORMED_DOMAIN],
      ['horizon', RejectReason.MALFORMED_DOMAIN],
      ['horizon.school.pk.', RejectReason.MALFORMED_DOMAIN],
      ['.horizon.school.pk', RejectReason.MALFORMED_DOMAIN],
      ['horizon..school.pk', RejectReason.MALFORMED_DOMAIN],
      ['https://horizon.school.pk', RejectReason.MALFORMED_DOMAIN],
      ['user@horizon.school.pk', RejectReason.MALFORMED_DOMAIN],
      ['horizon.school.pk:8080', RejectReason.MALFORMED_DOMAIN],
      ['horizon.school.pk/path', RejectReason.MALFORMED_DOMAIN],
      ['horizon.school.p', RejectReason.MALFORMED_DOMAIN],
      ['horizon.school.123', RejectReason.MALFORMED_DOMAIN],
      ['-horizon.school.pk', RejectReason.MALFORMED_DOMAIN],
      ['horizon-.school.pk', RejectReason.MALFORMED_DOMAIN],
      [`${'a'.repeat(200)}.pk`, RejectReason.TOO_LONG],
    ];
    for (const [input, reason] of cases) {
      const result = validateSchoolDomain(input);
      assert.equal(result.valid, false, `${String(input)} must be rejected`);
      assert.equal(result.reason, reason, `${String(input)} reason`);
    }
  });

  it('returns a closed, frozen error list, never free-form text', () => {
    assert.equal(Object.isFrozen(validateSchoolDomain('bad').errors), true);
    assert.deepEqual([...validateSchoolDomain('bad').errors], []);
  });
});

describe('enum validation against published values', () => {
  it('accepts every published value', () => {
    for (const value of SCHOOL_STATUS_VALUES) {
      assert.equal(validateSchoolStatus(value).valid, true, value);
    }
    for (const value of PROVISIONING_JOB_TYPES) {
      assert.equal(validateProvisioningJobType(value).valid, true, value);
    }
    for (const value of PROVISIONING_JOB_STATUSES) {
      assert.equal(validateProvisioningJobStatus(value).valid, true, value);
    }
  });

  it('rejects anything outside the published enumeration', () => {
    // Notably rejects the statuses the locked Super Admin reference displays,
    // because they are NOT the published enum values.
    for (const value of ['Active', 'Provisioning', 'Renewal due', 'Setup in progress']) {
      assert.equal(validateSchoolStatus(value).valid, false, value);
      assert.equal(validateSchoolStatus(value).reason, RejectReason.NOT_IN_ENUM, value);
    }
    assert.equal(validateSchoolStatus('enabled').valid, false);
    assert.equal(validateProvisioningJobType('reinstall').valid, false);
    assert.equal(validateProvisioningJobStatus('busy').valid, false);
    assert.equal(validateAuditActorType('school_admin').valid, false);
    assert.equal(validateAuditActorType('super_admin').valid, true);
  });

  it('returns the allowed set on rejection so a caller can report it safely', () => {
    const result = validateEnum('nope', SCHOOL_STATUS_VALUES);
    assert.equal(result.valid, false);
    assert.deepEqual([...result.errors], [...SCHOOL_STATUS_VALUES]);
  });

  it('rejects missing and non-string values', () => {
    for (const value of [null, undefined, '', '   ', 42, {}, []]) {
      assert.equal(validateEnum(value, SCHOOL_STATUS_VALUES).valid, false, String(value));
    }
  });
});

describe('TINYINT and INT UNSIGNED columns', () => {
  it('accepts the documented is_primary values and defaults to false', () => {
    assert.equal(validateIsPrimary(1).value, true);
    assert.equal(validateIsPrimary(0).value, false);
    assert.equal(validateIsPrimary(true).value, true);
    assert.equal(validateIsPrimary(false).value, false);
    assert.equal(validateIsPrimary(undefined).value, false, 'column default is 0');
    assert.equal(validateIsPrimary(2).valid, false);
    assert.equal(validateIsPrimary('yes').valid, false);
  });

  it('accepts only non-negative integers for attempts and defaults to 0', () => {
    assert.equal(validateAttempts(0).value, 0);
    assert.equal(validateAttempts(3).value, 3);
    assert.equal(validateAttempts('3').value, 3);
    assert.equal(validateAttempts(undefined).value, 0);
    for (const value of [-1, 1.5, 'x', NaN, Infinity]) {
      assert.equal(validateAttempts(value).valid, false, String(value));
    }
  });
});

describe('client payload allow-listing', () => {
  it('accepts a minimal, contract-shaped create payload', () => {
    const result = validateClientPayload(
      { name: 'Horizon Public School', timezone: 'Asia/Karachi', currency: 'PKR', locale: 'en' },
      ['name', 'timezone', 'currency', 'locale', 'plan_code'],
    );
    assert.equal(result.valid, true);
    assert.equal(Object.isFrozen(result.value), true);
  });

  it('rejects fields the browser may neither set nor read', () => {
    for (const field of FORBIDDEN_CLIENT_FIELDS) {
      const result = validateClientPayload({ [field]: 'x' }, ['name']);
      assert.equal(result.valid, false, field);
      assert.equal(result.reason, RejectReason.FORBIDDEN_FIELD, field);
      assert.deepEqual([...result.errors], [field]);
    }
  });

  it('rejects unknown fields so an uncontracted field is never silently sent', () => {
    const result = validateClientPayload({ name: 'X', tenant_id: 7, admin: true }, ['name']);
    assert.equal(result.valid, false);
    assert.equal(result.reason, RejectReason.UNKNOWN_FIELD);
    assert.deepEqual([...result.errors].sort(), ['admin', 'tenant_id']);
  });

  it('rejects a browser-supplied school id outright', () => {
    // PROJECT_MEMORY: never trust a browser-supplied school ID for authorization.
    const result = validateClientPayload({ school_id: 42 }, ['name']);
    assert.equal(result.valid, false);
  });

  it('rejects a non-object payload', () => {
    for (const value of [null, 'x', 42, []]) {
      assert.equal(validateClientPayload(value, ['name']).valid, false);
    }
  });
});

describe('provisioning job classification', () => {
  it('classifies synthetic jobs across the published status enum', () => {
    for (const status of PROVISIONING_JOB_STATUSES) {
      const result = classifyProvisioningJob({ type: 'install', status, attempts: 1 });
      assert.equal(result.state, status);
      assert.equal(result.valid ?? true, true);
    }
  });

  it('flags a failed job without exposing its error detail', () => {
    const result = classifyProvisioningJob({
      type: 'install',
      status: 'failed',
      attempts: 3,
      error_message: 'SQLSTATE[28000] password authentication failed for user zee',
    });
    assert.equal(result.state, 'failed');
    assert.equal(result.mayShowError, true);
    assert.equal(result.attempts, 3);
    assert.equal(JSON.stringify(result).includes('SQLSTATE'), false);
    assert.equal(JSON.stringify(result).includes('password'), false);
  });

  it('never grants error visibility to a non-failed job', () => {
    for (const status of ['pending', 'running', 'completed']) {
      assert.equal(classifyProvisioningJob({ type: 'install', status }).mayShowError, false, status);
    }
  });

  it('reports nothing to classify when there is no job at all', () => {
    for (const job of [null, undefined, 'nope', 42]) {
      const result = classifyProvisioningJob(job);
      assert.equal(result.state, 'unknown', String(job));
      assert.equal(result.mayShowError, false);
    }
  });

  it('rejects a malformed job instead of guessing', () => {
    for (const job of [
      {},
      { type: 'install' },
      { status: 'running' },
      { type: 'reinstall', status: 'running' },
      { type: 'install', status: 'busy' },
      { type: 'install', status: 'running', attempts: -2 },
    ]) {
      const result = classifyProvisioningJob(job);
      assert.equal(result.state, 'invalid', JSON.stringify(job));
      assert.equal(result.mayShowError, false);
    }
  });

  it('never claims retry safety — that is a server guarantee', () => {
    const result = classifyProvisioningJob({ type: 'install', status: 'failed', attempts: 1 });
    assert.equal(Object.keys(result).includes('mayRetry'), false);
  });
});

describe('error normalization using only published statuses', () => {
  it('uses exactly the six statuses the contract publishes', () => {
    assert.deepEqual([...PUBLISHED_ERROR_STATUSES], [400, 401, 403, 404, 429, 500]);
  });

  it('maps each published status to a safe outcome', () => {
    assert.equal(classifyProvisioningOutcome(400).outcome, 'rejected');
    assert.equal(classifyProvisioningOutcome(401).outcome, 'unauthenticated');
    assert.equal(classifyProvisioningOutcome(403).outcome, 'forbidden');
    assert.equal(classifyProvisioningOutcome(404).outcome, 'not-found');
    assert.equal(classifyProvisioningOutcome(429).outcome, 'rate-limited');
    assert.equal(classifyProvisioningOutcome(500).outcome, 'server-error');
  });

  it('collapses any unpublished status to unknown rather than interpreting it', () => {
    for (const status of [409, 418, 422, 201, 204, 301, 0, null, undefined, '400', 400.5]) {
      const result = classifyProvisioningOutcome(status);
      assert.equal(result.outcome, 'unknown', String(status));
      assert.equal(result.status, null, String(status));
      assert.equal(result.reason, 'unpublished-status');
    }
  });

  it('specifically cannot interpret 409 Conflict, which the contract omits', () => {
    // Duplicate school creation is exactly the case the Batch C exit gate cares
    // about, and 409 is not in the published error table.
    assert.equal(classifyProvisioningOutcome(409).outcome, 'unknown');
  });

  it('emits no server text and no free-form reason', () => {
    for (const status of PUBLISHED_ERROR_STATUSES) {
      const result = classifyProvisioningOutcome(status);
      assert.deepEqual(Object.keys(result).sort(), ['outcome', 'reason', 'status']);
      assert.equal(Object.isFrozen(result), true);
      assert.match(result.reason, /^[a-z-]+$/);
    }
  });
});

describe('approved text-node rendering', () => {
  it('renders a school name or the empty marker, never a blank cell', () => {
    assert.equal(schoolNameFor('Horizon Public School'), 'Horizon Public School');
    assert.equal(schoolNameFor('  Horizon  '), 'Horizon');
    for (const value of [null, undefined, '', '   ', 42, {}, [], true]) {
      assert.equal(schoolNameFor(value), EMPTY, String(value));
    }
  });

  it('never coerces a non-string into a name, because the column is VARCHAR NOT NULL', () => {
    assert.equal(schoolNameFor(42), EMPTY);
    assert.equal(schoolNameFor(true), EMPTY);
  });

  it('renders a domain or the empty marker, never a malformed value', () => {
    assert.equal(domainFor('horizon.school.pk'), 'horizon.school.pk');
    for (const value of [null, '', 'localhost', 'https://horizon.school.pk', 42]) {
      assert.equal(domainFor(value), EMPTY, String(value));
    }
  });

  it('never emits undefined, null, NaN or [object Object]', () => {
    const rendered = [schoolNameFor(undefined), domainFor({})].join('|');
    assert.doesNotMatch(rendered, /undefined|null|NaN|\[object Object\]/);
  });
});