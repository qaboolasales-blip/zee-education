# School Code / QR Pre-Auth Data-Leak Review — C-C-05

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-C-05** (Batch C — Verify manual school code and QR flow do not reveal school data before authentication)
- Created: 2026-10-17
- Invariant: a school code (manual or via QR) is a **routing hint only — never a credential**. No school operational data may be returned before authentication. Ties to `security-threat-model.md` §3 (CODE-1..CODE-4).

## 1. Verified current state (real, read 2026-10-17)

- **No school-code or QR flow exists yet.** The `schools` table (migration 000001) has **no** `school_code`/QR column (only identity/lifecycle/branding/timezone/currency/locale). `school_domains` (000002) holds hostnames only. There is **no** school-code lookup endpoint or QR controller; Controllers are only Health/Home/Setup.
- **The only pre-authentication endpoints today are `/health` and `/setup`.** Both are verified to return **no school/tenant/learner data** by the passing `HealthTest` (asserts no tenant/learner terms, no credentials/server detail) and `SetupTest` (no credential input, writes nothing). These are part of `OK (27 tests, 107 assertions)`.
- **Conclusion (real):** there is currently **no** school-code/QR path that could reveal school data before authentication, because the feature does not exist and the two existing pre-auth endpoints are leak-free. So C-C-05 is **satisfied-by-absence today**, and becomes a live check when the flow is built (Batch L).

## 2. Planned checks — for when the school-code/QR flow is implemented (Batch L)

Prefix `SCC`. Each asserts **no data before auth**.

| ID | Check | Expected |
|----|-------|----------|
| SCC-01 | Code lookup returns only routing/confirmation | A code lookup (manual or QR-resolved) returns at most a **name/branding for confirmation**, never students/fees/attendance/staff |
| SCC-02 | Code alone grants zero data | Present a **valid** school code with **no** login | No operational school data returned; only a login prompt |
| SCC-03 | Code is not authentication | Possessing a correct code must not authenticate any session | No session/role granted by the code itself |
| SCC-04 | No enumeration | Brute-force/guess codes | Rate-limited; response does not confirm/deny existence beyond need (CODE-1) |
| SCC-05 | QR tampering | Alter the QR payload to a wrong/phishing target | Server-side validation; cannot redirect credentials to an attacker instance; shows confirm-name (CODE-2) |
| SCC-06 | Code is server-validated, not client-trusted | Tamper code in transit/body | Server resolves the code server-side; a browser-supplied school/slug is never trusted for data/authorization (ADR-003) |
| SCC-07 | Wrong-tenant code | Use school A's code to reach school B data | Code selects the instance; session still scoped; **no B data** without B auth (CODE-4) |
| SCC-08 | Pre-auth responses leak nothing | Capture every pre-auth school-code/QR response | No student/guardian/staff/fee fields; no secrets |

## 3. Execution status

- **Current-state verification: DONE (real).** No school-code/QR flow or field exists; the only pre-auth endpoints (`/health`,`/setup`) are verified leak-free (27/27 suite). Nothing today reveals school data before authentication.
- **Future-flow checks (SCC-01..SCC-08): PLANNED** for Batch L (mobile/PWA school-connection flow). Not executable now because the feature is not built.
- Nothing in §2 is claimed as passing. Ties to `ops/release-gates.md` G7 and Batch L exit gate.
