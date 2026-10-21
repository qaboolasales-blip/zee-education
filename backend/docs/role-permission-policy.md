# Role/Permission Policy (B-K-03)

## Roles Defined
1. **super_admin** - Super Administrator (full platform access)
2. **school_admin** - School Administrator (manage own school)
3. **teacher** - Teacher (assigned classes/subjects)
4. **parent** - Parent/Guardian (view child information)  
5. **student** - Student (view own information)

## Implementation
- Groups stored in Shield's `auth_groups` table (seeded via migration)
- Policies in `app/Policies/RolePolicy.php` enforce server-side checks
- Authorization is never trusted from client input - all checks use server-side role verification
- Role assignments are managed only by authorized administrators (server-side)

## Security Principle
"Browser cannot self-assign a role/school" - enforced by server-side validation and policy checks; no client-controlled role fields in public endpoints.
