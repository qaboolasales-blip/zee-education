# Authentication Implementation Design (B-K-01)

## Choice
We recommend **CodeIgniter 4 Shield** as the authentication library for the Super Admin control plane.

## Rationale
- **CI4-native and official ecosystem**: Shield is maintained by the CodeIgniter team/community and designed specifically for CI4.
- **Security posture**: Provides secure password handling (bcrypt/Argon2 via framework), login throttling, account activation, password reset flows, and CSRF protection integration.
- **Role/permission support**: Includes groups and permissions which align well with Super Admin/School Admin/Teacher/Parent/Student roles (Batch B scope).
- **Active maintenance & compatibility**: Compatible with CI4 4.7+, MIT-licensed, well-documented.
- **Lower implementation risk**: Reduces custom auth surface area while allowing policy middleware/filters to enforce server-side authorization rules.

## Package Details
- Package: `codeigniter4/shield`
- Version constraint: `^1.2` (compatible with CI4 4.x)
- License: MIT
- Source: https://github.com/codeigniter4/shield

## Security Considerations
- No role trust from client input - roles enforced server-side via policies/filters (B-K-06)
- Passwords never logged; audit events for auth actions without secrets (B-K-07)
- Session/token lifecycle managed by Shield with configurable timeouts; logout and lockout rules will be configured per requirements (B-K-04)
- Follows ADR-008 (CORS allowlist, no wildcard on auth endpoints)

## Next Steps
- Add Shield to composer dependencies
- Publish auth API contract
- Implement custom policies for the 5 role types (Super Admin, School Admin, Teacher, Parent/Guardian, Student)
