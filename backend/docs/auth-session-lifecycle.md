# Authentication Session/Token Lifecycle (B-K-04)

## Session Configuration (Shield defaults, documented)
- Default authenticator: Session (`$defaultAuthenticator = 'session'`)
- Session field: `user` stored in session
- Remember-me: enabled (`allowRemembering = true`), cookie name `remember`, length 30 days
- Session idle/expiry controlled by CodeIgniter session configuration; logout invalidates session

## Token Support
- Access tokens, HMAC, and JWT authenticators available (JWT disabled by default)
- Authentication chain checks session, tokens, hmac in order

## Security Rules

### Logout
- Explicit logout endpoint terminates session and remember token
- After logout, user redirected to login page (per Shield config)

### Password Management
- Minimum password length: 8 characters (NIST-aligned)
- Password validators: Composition, NothingPersonal (prevents personal info), Dictionary
- Password reset via magic links enabled (configurable)
- Force password reset on first login configurable

### Account Protection
- Login attempt tracking via Shield's auth_logins table
- Lockout behavior: Configurable via actions and throttling (Shield supports login throttling)
- Magic link lifetime: 1 hour (HOUR constant)
- Account activation can be enforced via register action (disabled by default; can enable as needed)

### Session Security
- Server-side session storage; no client-side role trust
- Session regeneration on login (Shield handles — live-verified 2026-10-20, probe H1/H2 in `quality/docs/security-runtime-review.md`)
- Remember tokens stored securely and can be revoked on logout

## Implementation Notes
- All rules enforced server-side
- No secrets logged in audit events
- Session/token lifecycle managed by Shield with these documented constraints
