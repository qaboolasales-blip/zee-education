# Role Filter Implementation (B-K-06)

## RoleFilter
- Class: `App\Filters\RoleFilter`
- Enforces server-side role-based access control
- Redirects unauthenticated users to login
- Checks if authenticated user belongs to required roles (comma-separated or array)
- Redirects with error if access denied

## Usage
Apply as filter: `role:super_admin` or `role:school_admin,teacher` etc.

## Security
- All authorization decisions made server-side
- No client-controlled role data trusted
- Filter checks group membership via Shield's user model
- Browser cannot self-assign roles (enforced server-side)

Registered in Filters config as alias `role`.
