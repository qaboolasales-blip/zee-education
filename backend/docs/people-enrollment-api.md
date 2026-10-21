# People & Enrollment API Contract (E-K-08)

## Policies (E-K-06)
- Parent-child access: Parents/guardians only access linked children; server-side enforcement
- Teacher assignment restrictions: Teachers scoped to assigned classes/sections/subjects
- Privacy: Only authorized roles; no cross-tenant access
- School isolation enforced server-side

## Endpoints
- Students: CRUD with role restrictions, admission number uniqueness, archival support
- Guardians: CRUD with link management
- Staff: Profile management, account linking
- Enrollments: History tracking with transfer/withdraw/archive states

## Validation (E-K-05)
- Unique admission numbers (students)
- Unique employee IDs (staff)
- Duplicate checks on all entities
- Protected endpoints with role enforcement
- Server-side school connection required

## Testing (E-K-07)
- Synthetic fixtures
- Tests for links, duplicates, archives, forbidden access
- Privacy/role/isolation tests with synthetic data

## Data Retention (E-K-01)
- Archived records retained per policy; no automatic deletion
- GDPR/privacy considerations documented
- Export on request per school data ownership
