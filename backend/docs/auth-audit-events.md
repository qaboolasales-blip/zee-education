# Authentication Audit Events (B-K-07)

## Audit Service
- Class: `App\Libraries\AuditService`
- Logs authentication events to `platform_audit_events` table
- Never logs secrets, credentials, or sensitive data (passwords, tokens, etc.)

## Logged Events
- `login_success` - Successful authentication
- `login_failure` - Failed authentication attempt (no identifier credentials logged)
- `logout` - User logout

## Security
- All events include timestamp, IP address (when available), actor info
- No PII beyond IDs
- Table is append-only by design (no UPDATE/DELETE from app code)
- Actor types constrained to allowed values

## Usage
```php
$auditor = new \App\Libraries\AuditService();
$auditor->logLoginSuccess($userId);
$auditor->logLoginFailure();
$auditor->logLogout($userId);
```
