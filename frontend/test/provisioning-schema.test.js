/**
 * Control-plane schema transcription tests. Task: C-O-01 / C-O-05.
 *
 * These tests read KiloCode's migration files and prove the frontend
 * transcription still matches them, so a schema change cannot silently drift.
 * Reading KiloCode's files is permitted; writing to them is not.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  AUDIT_ACTOR_TYPES,
  CONTROL_PLANE_ENTITIES,
  DOCUMENTED_BUT_UNIMPLEMENTED_ENTITIES,
  IMPLEMENTED_ENTITIES,
  PROPOSED_PLAN_LABELS,
  PROVISIONING_JOB_STATUSES,
  PROVISIONING_JOB_TYPES,
  SCHEMA_DEFAULTS,
  SCHOOL_STATUS_VALUES,
  UNPUBLISHED_FIELDS,
  assertSchemaMatchesMigrations,
  columnMeta,
  entityMeta,
} from '../core/provisioning/index.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIGRATIONS = resolve(REPO_ROOT, 'backend', 'app', 'Database', 'Migrations');

const SOURCES = Object.fromEntries(
  Object.values(CONTROL_PLANE_ENTITIES).map((meta) => {
    const primary = readFileSync(resolve(MIGRATIONS, meta.migration), 'utf8');
    // `schools` is built across three migrations: 000001 creates it, 000006
    // extends it and 000007 adds school_code. The drift guard must scan all
    // three, so concatenate them for that entity.
    if (meta.entity === 'schools') {
      return [
        meta.entity,
        [
          primary,
          readFileSync(resolve(MIGRATIONS, '2026-10-18_000006_extend_schools_table.php'), 'utf8'),
          readFileSync(resolve(MIGRATIONS, '2026-10-18_000007_add_school_code.php'), 'utf8'),
        ].join('\n'),
      ];
    }
    return [meta.entity, primary];
  }),
);

describe('published control-plane schema', () => {
  it('matches the migration files exactly', () => {
    assert.equal(assertSchemaMatchesMigrations(SOURCES), true);
  });

  it('fails loudly when a transcription drifts from its migration', () => {
    assert.throws(() =>
      assertSchemaMatchesMigrations({ ...SOURCES, schools: SOURCES.schools.replace("'active'", "'enabled'") }),
    );
    assert.throws(() =>
      assertSchemaMatchesMigrations({ ...SOURCES, provisioning_jobs: SOURCES.provisioning_jobs.replace("'running'", "'busy'") }),
    );
    assert.throws(() => assertSchemaMatchesMigrations({ ...SOURCES, schools: '' }));
  });

  it('registers exactly the four implemented entities', () => {
    assert.deepEqual([...IMPLEMENTED_ENTITIES].sort(), [
      'platform_audit_events',
      'provisioning_jobs',
      'school_domains',
      'schools',
    ]);
  });
});

describe('published enum values', () => {
  it('transcribes schools.status', () => {
    assert.deepEqual([...SCHOOL_STATUS_VALUES], ['pending', 'active', 'suspended', 'decommissioned']);
  });

  it('transcribes provisioning_jobs.type and .status', () => {
    assert.deepEqual([...PROVISIONING_JOB_TYPES], ['install', 'migrate', 'suspend', 'resume', 'decommission']);
    assert.deepEqual([...PROVISIONING_JOB_STATUSES], ['pending', 'running', 'completed', 'failed']);
  });

  it('transcribes platform_audit_events.actor_type', () => {
    assert.deepEqual([...AUDIT_ACTOR_TYPES], ['super_admin', 'system', 'installer']);
  });

  it('matches every enum value against its migration text', () => {
    for (const value of SCHOOL_STATUS_VALUES) {
      assert.ok(SOURCES.schools.includes(`'${value}'`), value);
    }
    for (const value of PROVISIONING_JOB_TYPES) {
      assert.ok(SOURCES.provisioning_jobs.includes(`'${value}'`), value);
    }
    for (const value of PROVISIONING_JOB_STATUSES) {
      assert.ok(SOURCES.provisioning_jobs.includes(`'${value}'`), value);
    }
    for (const value of AUDIT_ACTOR_TYPES) {
      assert.ok(SOURCES.platform_audit_events.includes(`'${value}'`), value);
    }
  });
});

describe('column metadata', () => {
  it('marks name as required and plan_code as nullable, per migration 000001', () => {
    assert.equal(columnMeta('schools', 'name').nullable, false);
    assert.equal(columnMeta('schools', 'name').maxLength, 191);
    assert.equal(columnMeta('schools', 'plan_code').nullable, true);
    assert.equal(columnMeta('schools', 'plan_code').maxLength, 64);
  });

  it('records the server defaults the frontend may assume', () => {
    assert.equal(SCHEMA_DEFAULTS['schools.status'], 'pending');
    assert.equal(SCHEMA_DEFAULTS['schools.timezone'], 'Asia/Karachi');
    assert.equal(SCHEMA_DEFAULTS['schools.currency'], 'PKR');
    assert.equal(SCHEMA_DEFAULTS['schools.locale'], 'en');
    assert.equal(SCHEMA_DEFAULTS['provisioning_jobs.attempts'], 0);
    assert.equal(SCHEMA_DEFAULTS['school_domains.is_primary'], 0);
  });

  it('records that provisioning_jobs stores no credential column', () => {
    const columns = Object.keys(entityMeta('provisioning_jobs').columns);
    for (const forbidden of ['password', 'secret', 'credentials', 'dsn', 'host', 'username']) {
      assert.equal(columns.includes(forbidden), false, forbidden);
    }
    assert.match(entityMeta('provisioning_jobs').purpose, /ADR-108/);
  });

  it('records the unique key and foreign keys', () => {
    assert.deepEqual([...entityMeta('school_domains').uniqueKeys], ['school_id,domain']);
    assert.deepEqual({ ...entityMeta('school_domains').foreignKeys }, { school_id: 'schools.id' });
    assert.equal(entityMeta('platform_audit_events').appendOnly, true);
  });

  it('returns null for an unknown entity or column', () => {
    assert.equal(entityMeta('students'), null);
    assert.equal(columnMeta('students', 'name'), null);
    // `address` is now a real column on schools (migration 000006, C-K-01), so
    // the null case needs a column that genuinely does not exist.
    assert.equal(columnMeta('schools', 'nonexistent_column'), null);
  });
});

describe('documented but unimplemented entities', () => {
  it('records commercial_records and support_tickets as permitted but not built', () => {
    assert.deepEqual(
      DOCUMENTED_BUT_UNIMPLEMENTED_ENTITIES.map((entry) => entry.entity).sort(),
      ['commercial_records', 'support_tickets'],
    );
    for (const entry of DOCUMENTED_BUT_UNIMPLEMENTED_ENTITIES) {
      assert.equal(entry.migration, null);
    }
  });

  it('confirms no migration exists for them', () => {
    const dataBoundary = readFileSync(
      resolve(REPO_ROOT, 'backend', 'docs', 'control-plane-data-boundary.md'),
      'utf8',
    );
    for (const entry of DOCUMENTED_BUT_UNIMPLEMENTED_ENTITIES) {
      assert.match(dataBoundary, new RegExp(entry.entity));
    }
    const migrationText = Object.values(SOURCES).join('\n');
    for (const entry of DOCUMENTED_BUT_UNIMPLEMENTED_ENTITIES) {
      assert.equal(
        migrationText.includes(`createTable('${entry.entity}'`),
        false,
        `${entry.entity} now has a migration; update the record`,
      );
    }
  });
});

describe('ADR-001 isolation is a constant, not a column', () => {
  it('has no isolation-mode column anywhere in the schema', () => {
    for (const meta of Object.values(CONTROL_PLANE_ENTITIES)) {
      for (const column of Object.keys(meta.columns)) {
        assert.doesNotMatch(column, /tenant|isolation|shared/i, column);
      }
    }
  });

  it('is recorded as such in the published data boundary', () => {
    const dataBoundary = readFileSync(
      resolve(REPO_ROOT, 'backend', 'docs', 'control-plane-data-boundary.md'),
      'utf8',
    );
    assert.match(dataBoundary, /dedicated database/i);
    assert.match(dataBoundary, /tenant_id/);
  });
});

describe('unpublished fields are recorded, not invented', () => {
  it('covers every gap the approved Super Admin / connection UI needs', () => {
    assert.deepEqual(
      UNPUBLISHED_FIELDS.map((entry) => entry.id).sort(),
      ['PUB-01', 'PUB-02', 'PUB-03', 'PUB-04', 'PUB-05', 'PUB-06', 'PUB-07'],
    );
    for (const entry of UNPUBLISHED_FIELDS) {
      assert.ok(entry.field.length > 0);
      assert.ok(entry.uiHook.length > 0, entry.id);
      assert.ok(entry.note.length > 0, entry.id);
    }
  });

  it('confirms the school connection code truly has no column', () => {
    // `plan_code` and `school_code` are the only code-like columns. `school_code`
    // was added by migration 000007 (C-K-02) as a unique 3-50-char identifier,
    // NOT a connection secret — so PUB-01 is narrowed to what is still
    // unpublished: the code has no published semantics, no payload contract and
    // no way for the frontend to validate or bind it.
    const codeLike = [];
    for (const meta of Object.values(CONTROL_PLANE_ENTITIES)) {
      for (const column of Object.keys(meta.columns)) {
        if (/code/i.test(column)) codeLike.push(`${meta.entity}.${column}`);
      }
    }
    assert.deepEqual(codeLike, ['schools.plan_code', 'schools.school_code']);
  });

  it('confirms plan_code carries no pricing', () => {
    for (const meta of Object.values(CONTROL_PLANE_ENTITIES)) {
      for (const column of Object.keys(meta.columns)) {
        assert.doesNotMatch(column, /price|pricing|amount|fee/i, column);
      }
    }
  });
});

describe('proposed plan labels', () => {
  it('carries labels only, never pricing', () => {
    assert.deepEqual([...PROPOSED_PLAN_LABELS], ['Starter', 'Growth', 'Complete']);
    assert.equal(JSON.stringify(PROPOSED_PLAN_LABELS).match(/\d/), null);
  });

  it('matches the labels already displayed in the locked Super Admin reference', () => {
    const reference = readFileSync(
      resolve(
        REPO_ROOT,
        'zee_education_multi_agent_handoff',
        'agents',
        'opencode',
        'reference_ui',
        'Zee Education — Super Admin.html',
      ),
      'utf8',
    );
    for (const label of PROPOSED_PLAN_LABELS) {
      assert.ok(reference.includes(`'${label}'`), `${label} must already exist in the locked reference`);
    }
  });

  it('matches the labels documented in shared project memory', () => {
    const memory = readFileSync(
      resolve(
        REPO_ROOT,
        'zee_education_multi_agent_handoff',
        'shared',
        'PROJECT_MEMORY.md',
      ),
      'utf8',
    );
    assert.match(memory, /Starter\/Growth\/Complete/);
  });
});

describe('registry immutability', () => {
  it('is frozen so published values cannot be widened at runtime', () => {
    for (const list of [
      SCHOOL_STATUS_VALUES,
      PROVISIONING_JOB_TYPES,
      PROVISIONING_JOB_STATUSES,
      AUDIT_ACTOR_TYPES,
      PROPOSED_PLAN_LABELS,
      UNPUBLISHED_FIELDS,
    ]) {
      assert.equal(Object.isFrozen(list), true);
    }
    assert.throws(() => {
      'use strict';
      SCHOOL_STATUS_VALUES.push('trial');
    });
    assert.throws(() => {
      'use strict';
      UNPUBLISHED_FIELDS[0].field = 'invented';
    });
  });
});