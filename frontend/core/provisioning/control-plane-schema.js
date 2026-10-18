/**
 * Control-plane schema registry. Task: C-O-01.
 *
 * SCOPE OF THIS FILE
 *  A frozen transcription of the control-plane schema KiloCode has actually
 *  published, so the frontend can validate and shape values against something
 *  real instead of guessing.
 *
 *  Provenance is the migration file, not a summary document. Every enum value,
 *  column name, nullability and default below is copied from these files:
 *    backend/app/Database/Migrations/
 *      2026-10-18_000001_create_schools_table.php
 *      2026-10-18_000002_create_school_domains_table.php
 *      2026-10-18_000003_create_provisioning_jobs_table.php
 *      2026-10-18_000004_create_platform_audit_events_table.php
 *  Cross-checked against:
 *    backend/docs/migration-plan.md
 *    backend/docs/control-plane-data-boundary.md
 *
 * WHAT THIS IS NOT
 *  - Not an API contract. No school-registry or provisioning ENDPOINT exists
 *    (see `contracts/pending-provisioning-contract.js`).
 *  - Not authorization. A browser-supplied school id or domain is never trusted.
 *  - No display labels. Mapping an enum to visible copy requires approved
 *    strings, which do not exist for these values (see C-O-06).
 *  - No rendering. This module has no DOM access.
 */

/** Lifecycle states of a `schools` row, verbatim from migration 000001. */
export const SCHOOL_STATUS_VALUES = Object.freeze([
  'pending',
  'active',
  'suspended',
  'decommissioned',
]);

/** Lifecycle operations of a `provisioning_jobs` row, verbatim from 000003. */
export const PROVISIONING_JOB_TYPES = Object.freeze([
  'install',
  'migrate',
  'suspend',
  'resume',
  'decommission',
]);

/** Execution states of a `provisioning_jobs` row, verbatim from 000003. */
export const PROVISIONING_JOB_STATUSES = Object.freeze([
  'pending',
  'running',
  'completed',
  'failed',
]);

/** Audit actors of a `platform_audit_events` row, verbatim from 000004. */
export const AUDIT_ACTOR_TYPES = Object.freeze(['super_admin', 'system', 'installer']);

/**
 * Server defaults that the frontend must assume when a field is absent.
 * These are column defaults, so they are contract facts, not guesses.
 */
export const SCHEMA_DEFAULTS = Object.freeze({
  'schools.status': 'pending',
  'schools.timezone': 'Asia/Karachi',
  'schools.currency': 'PKR',
  'schools.locale': 'en',
  'school_domains.is_primary': 0,
  'provisioning_jobs.status': 'pending',
  'provisioning_jobs.attempts': 0,
});

/**
 * Column metadata. `nullable` and `hasDefault` are taken from the migration;
 * `default` is the literal only where the migration states one.
 */
function column(type, { nullable = false, hasDefault = false, default: def = null, maxLength = null } = {}) {
  return Object.freeze({ type, nullable, hasDefault, default: def, maxLength });
}

const ID = () => column('BIGINT', { hasDefault: true });

export const CONTROL_PLANE_ENTITIES = Object.freeze({
  schools: Object.freeze({
    entity: 'schools',
    migration: '2026-10-18_000001_create_schools_table.php',
    purpose: 'School identity and installation record. Never learner data (ADR-001).',
    primaryKey: 'id',
    columns: Object.freeze({
      id: ID(),
      name: column('VARCHAR', { maxLength: 191 }),
      status: column('ENUM', { hasDefault: true, default: 'pending' }),
      plan_code: column('VARCHAR', { nullable: true, maxLength: 64 }),
      timezone: column('VARCHAR', { hasDefault: true, default: 'Asia/Karachi', maxLength: 64 }),
      currency: column('VARCHAR', { hasDefault: true, default: 'PKR', maxLength: 8 }),
      locale: column('VARCHAR', { hasDefault: true, default: 'en', maxLength: 8 }),
      created_at: column('DATETIME'),
      updated_at: column('DATETIME'),
    }),
    enums: Object.freeze({ status: SCHOOL_STATUS_VALUES }),
    implemented: true,
  }),

  school_domains: Object.freeze({
    entity: 'school_domains',
    migration: '2026-10-18_000002_create_school_domains_table.php',
    purpose: 'Verified hostnames for each school; one primary domain per school.',
    primaryKey: 'id',
    columns: Object.freeze({
      id: ID(),
      school_id: column('BIGINT'),
      domain: column('VARCHAR', { maxLength: 191 }),
      is_primary: column('TINYINT', { hasDefault: true, default: 0 }),
      verified_at: column('DATETIME', { nullable: true }),
      created_at: column('DATETIME'),
    }),
    enums: Object.freeze({}),
    uniqueKeys: Object.freeze(['school_id,domain']),
    foreignKeys: Object.freeze({ school_id: 'schools.id' }),
    implemented: true,
  }),

  provisioning_jobs: Object.freeze({
    entity: 'provisioning_jobs',
    migration: '2026-10-18_000003_create_provisioning_jobs_table.php',
    purpose:
      'Installation and lifecycle workflow state. Contains NO credential columns; connection ' +
      'details are encrypted separately per ADR-108.',
    primaryKey: 'id',
    columns: Object.freeze({
      id: ID(),
      school_id: column('BIGINT'),
      type: column('ENUM'),
      status: column('ENUM', { hasDefault: true, default: 'pending' }),
      target_database: column('VARCHAR', { maxLength: 191 }),
      attempts: column('INT', { hasDefault: true, default: 0 }),
      error_message: column('TEXT', { nullable: true }),
      started_at: column('DATETIME', { nullable: true }),
      completed_at: column('DATETIME', { nullable: true }),
      created_at: column('DATETIME'),
    }),
    enums: Object.freeze({ type: PROVISIONING_JOB_TYPES, status: PROVISIONING_JOB_STATUSES }),
    foreignKeys: Object.freeze({ school_id: 'schools.id' }),
    implemented: true,
  }),

  platform_audit_events: Object.freeze({
    entity: 'platform_audit_events',
    migration: '2026-10-18_000004_create_platform_audit_events_table.php',
    purpose:
      'Immutable audit log. Append-only: application code must never UPDATE or DELETE rows.',
    primaryKey: 'id',
    columns: Object.freeze({
      id: ID(),
      actor_type: column('ENUM'),
      actor_id: column('BIGINT', { nullable: true }),
      action: column('VARCHAR', { maxLength: 64 }),
      target_type: column('VARCHAR', { maxLength: 64 }),
      target_id: column('BIGINT', { nullable: true }),
      ip_address: column('VARCHAR', { nullable: true, maxLength: 45 }),
      created_at: column('DATETIME'),
    }),
    enums: Object.freeze({ actor_type: AUDIT_ACTOR_TYPES }),
    appendOnly: true,
    implemented: true,
  }),
});

export const IMPLEMENTED_ENTITIES = Object.freeze(
  Object.keys(CONTROL_PLANE_ENTITIES).filter((key) => CONTROL_PLANE_ENTITIES[key].implemented === true),
);

/**
 * Entities the data-boundary document permits in the control plane but which
 * have NO migration yet. Recorded so the frontend never assumes they exist.
 */
export const DOCUMENTED_BUT_UNIMPLEMENTED_ENTITIES = Object.freeze([
  Object.freeze({
    entity: 'commercial_records',
    source: 'backend/docs/control-plane-data-boundary.md',
    holds: 'Licensing and billing metadata — line items, plan, price, dates, no PII',
    migration: null,
  }),
  Object.freeze({
    entity: 'support_tickets',
    source: 'backend/docs/control-plane-data-boundary.md',
    holds: 'Support case metadata — subject, status, priority, assignment, no conversation content',
    migration: null,
  }),
]);

/**
 * Fields the approved UI displays or requires that have NO published column.
 * These are hard blockers, recorded rather than guessed (C-O-06).
 */
export const UNPUBLISHED_FIELDS = Object.freeze([
  Object.freeze({
    id: 'PUB-01',
    field: 'school connection code',
    uiHook: 'Mobile Preview #code input, `Connect school`, Profile `School code: HZ-9246`; School Dashboard Settings → App connection `Code` input',
    note:
      'schools and school_domains contain NO code column. The code has no published field, so it ' +
      'cannot be validated, bound or persisted by the frontend.',
  }),
  Object.freeze({
    id: 'PUB-02',
    field: 'renewal date',
    uiHook: 'Super Admin `Schools & Installs` table `Renewal` column, `Renewals needing attention` rows, `Upcoming renewals` stat',
    note:
      'No renewal/licence column exists on schools, and commercial_records has no migration yet.',
  }),
  Object.freeze({
    id: 'PUB-03',
    field: 'plan label',
    uiHook: 'Super Admin `Plan` column and plan cards (Starter / Growth / Complete)',
    note:
      'schools.plan_code is VARCHAR(64) and references a plan, never pricing. Plan labels exist only ' +
      'as PROPOSED labels in PROJECT_MEMORY.md; no plan table or enumeration is published.',
  }),
  Object.freeze({
    id: 'PUB-04',
    field: 'database isolation mode',
    uiHook: 'Super Admin `Database` column badge (`Dedicated`)',
    note:
      'ADR-001 makes a dedicated database per school a CONSTANT rule, not a column. There is ' +
      'nothing to bind; the badge is correctly static copy.',
  }),
  Object.freeze({
    id: 'PUB-05',
    field: 'per-step install lifecycle stage',
    uiHook: 'Super Admin `Install lifecycle` flow: 1 Approved → 2 Database → 3 Migration → 4 Domain → 5 Active',
    note:
      'provisioning_jobs has only two enum fields (type, status) and status is pending/running/' +
      'completed/failed. Five named stages have no published representation.',
  }),
  Object.freeze({
    id: 'PUB-06',
    field: 'QR payload',
    uiHook: 'Mobile Preview `.qrart` + `▣ Scan QR code`; School Dashboard `▣ Generate app QR`',
    note:
      'No payload format, signature, expiry or revocation contract. The reference states a ' +
      'production QR is short-lived and revocable, but publishes nothing to validate against.',
  }),
  Object.freeze({
    id: 'PUB-07',
    field: 'school address / contact / branding',
    uiHook: 'Super Admin `Schools & Installs` (implied school identity), School Dashboard `School branding`',
    note:
      'The data-boundary document says schools "Contains: Name, address, contact, branding, status, ' +
      'plan, domain", but migration 000001 creates only name/status/plan_code/timezone/currency/locale. ' +
      'Address, contact and branding columns are NOT implemented.',
  }),
]);

/** Proposed plan labels, with provenance. Never carries pricing. */
export const PROPOSED_PLAN_LABELS = Object.freeze(['Starter', 'Growth', 'Complete']);

/**
 * Drift guard: the transcription must keep matching the migration files.
 * Throws if an enum value, column or entity no longer appears in its source.
 *
 * @param {Record<string, string>} migrationSources entity -> file text
 */
export function assertSchemaMatchesMigrations(migrationSources) {
  const problems = [];

  for (const [key, meta] of Object.entries(CONTROL_PLANE_ENTITIES)) {
    const source = migrationSources[key];
    if (typeof source !== 'string' || source === '') {
      problems.push(`no migration source supplied for entity "${key}"`);
      continue;
    }
    for (const columnName of Object.keys(meta.columns)) {
      if (!source.includes(`'${columnName}'`)) {
        problems.push(`${key}.${columnName} is not present in ${meta.migration}`);
      }
    }
    for (const [enumName, values] of Object.entries(meta.enums)) {
      for (const value of values) {
        if (!source.includes(`'${value}'`)) {
          problems.push(`${key}.${enumName} value '${value}' is not present in ${meta.migration}`);
        }
      }
    }
  }

  for (const meta of DOCUMENTED_BUT_UNIMPLEMENTED_ENTITIES) {
    if (meta.migration !== null) problems.push(`${meta.entity} must stay recorded as unimplemented`);
  }

  if (problems.length > 0) {
    throw new Error(`control-plane schema drifted from its migrations:\n  ${problems.join('\n  ')}`);
  }
  return true;
}

export function entityMeta(name) {
  return CONTROL_PLANE_ENTITIES[name] ?? null;
}

export function columnMeta(entity, columnName) {
  return CONTROL_PLANE_ENTITIES[entity]?.columns?.[columnName] ?? null;
}