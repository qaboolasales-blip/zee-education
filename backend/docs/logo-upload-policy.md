# Logo Upload Policy (D-K-02)

## Safety Requirements
- No public arbitrary-file upload
- Allowed file types: jpg, jpeg, png, webp only
- Max file size: 2MB
- Filename sanitized to prevent path traversal
- Stored outside web root or in protected directory
- No execution permissions
- Validation on MIME type and extension
- School-scoped access control

## Implementation Guidelines
- Server-side validation (never trust client)
- Use CI4's validation rules
- Store in `writable/uploads/schools/{school_id}/` or similar protected path
- Return only safe paths, never full system paths to client
- Rate limit upload endpoints
- Audit all logo changes (log who, when, what - no file contents)

## Security Notes
- Block PHP files and executables
- Prevent double extensions
- Use random/safe filenames
- CSRF protection on upload forms
- Role-restricted (School Admin/Super Admin only)
