# Shared Hosting Constraints (C-K-05)

## Dedicated Database Creation
- On shared hosting, creating new databases may be restricted
- May require control panel API or manual creation
- Some hosts limit number of databases
- Need to check user privileges (CREATE DATABASE permission)

## Connection Workflow
1. Validate provided credentials (sanitized, no logging)
2. Create database if permitted
3. Apply school-local migrations to dedicated DB only
4. Never touch control-plane DB with school data
5. Store encrypted connection metadata (future ADR-108)

## Constraints to Document
- Super Admin must have appropriate DB privileges in target environment
- For managed/shared hosting, provisioning may require pre-created databases
- Connection pooling and character set (utf8mb4)
- Separate DB group per school for isolation

## Recommendations
- Support both auto-create (if allowed) and pre-created DB modes
- Fail gracefully with clear error messages (sanitized)
- No credentials exposed in errors or logs
