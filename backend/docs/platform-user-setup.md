# Platform User Setup (B-K-02)

## Implementation
Using CodeIgniter 4 Shield's built-in authentication system.

## User Model & Migration
- Shield provides `App\Models\UserModel` (or uses Shield's models) with secure password hashing via framework's password hasher (bcrypt by default, configurable).
- Migration `2020-12-28-223112_create_auth_tables` creates:
  - `users` table with `username`, `email`, `password_hash`, `status`, `status_message`, `active`, `last_active`, etc.
- Passwords are never stored in plaintext; only secure hashes.
- All authentication fields are server-controlled; no client-controlled role assignment fields exposed in user registration flows.

## Security Constraints
- No role trust from client input: Roles/groups are managed server-side only. Authorization decisions use server-side policies (filters/middleware), not client-supplied claims.
- Password validation and hashing handled by Shield's secure defaults.
- Account status fields prevent unauthorized access.

This satisfies B-K-02 requirements using Shield's battle-tested implementation.
