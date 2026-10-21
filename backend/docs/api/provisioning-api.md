# Provisioning API Contract (C-K-10)

## Authorization
All provisioning endpoints require Super Admin role (enforced by `superadmin` filter).

## Endpoints

### POST /admin/schools/provision
Provision a new school with dedicated database.

**Auth:** Super Admin required
**Content-Type:** application/json

**Request:**
```json
{
  "name": "School Name",
  "school_code": "SCHOOL001",
  "contact_email": "admin@school.example",
  "db_config": {
    "hostname": "localhost",
    "database": "school_db_name",
    "username": "db_user",
    "password": "secure_password"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "school_id": 123,
  "state": "completed"
}
```

**Response (400/403):**
```json
{
  "success": false,
  "error": "Sanitized error message (no credentials)"
}
```

## Security
- Credentials never logged
- Super Admin only
- Idempotent - safe to retry
- Dedicated DB per school
- No school-local data in control plane
- Audit events logged for all provisioning actions

## Testing
Synthetic end-to-end test covers provisioning flow without affecting real data.
