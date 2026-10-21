# School Structure API Contract (D-K-06, D-K-08)

## Authorization
All endpoints require authentication with appropriate roles (School Admin, Super Admin for management; Teacher for assignments as applicable).

## Endpoints (school-local, server-side school connection enforced)

### Academic Sessions
- GET /school/sessions - list
- POST /school/sessions - create (School Admin+)
- PUT/PATCH /school/sessions/{id} - update
- DELETE /school/sessions/{id} - archive/delete (role-restricted)

### Classes/Sections/Subjects
- GET/POST/PUT/DELETE for classes, sections, subjects
- Teacher assignment endpoints with scope enforcement

## Security
- Server-side school connection enforced (no cross-tenant access)
- Role enforcement via policies/filters
- Validation for duplicates/archives
- Audit significant configuration changes (D-K-08)
- No public endpoints

## Notes
- Tenant isolation per ADR-003
- Server-side tenant resolution only (never trust browser-supplied slug)
