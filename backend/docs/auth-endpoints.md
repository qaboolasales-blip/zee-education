# Authentication Endpoints (B-K-05)

## Available Endpoints (via Shield)
Shield provides standard authentication endpoints registered via `service('auth')->routes($routes);`:

- `GET/POST /login` - User login
- `GET/POST /register` - User registration (if enabled)
- `GET /logout` - Logout current session
- `GET/POST /magic-link` - Magic link login
- `GET/POST /forgot` - Password recovery
- `GET/POST /reset-password` - Password reset

## Current Session
Current authenticated user accessible via `auth()->user()` helper. Session state managed by Shield's Session authenticator.

## Security
- Login/logout enforce server-side session management
- CSRF protection enabled by default
- No role/school data trusted from client input
- Endpoints return appropriate redirects based on config
