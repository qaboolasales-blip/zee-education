# Mobile/PWA Connection, Role Launch & Resilience — Batch L

- Agent: Cline (QA/Security/Ops). Microtasks **L-C-01..L-C-04**. 2026-10-17.
- State check: **no** school-code/QR flow, no auth, no mobile runtime page (frontend non-visual). Extends `school-code-qr-preauth-review.md` (C-C-05).

## L-C-01 — QR replay / expiry / revocation / rate-limit — **BLOCKED (spec ready)**
- Cannot execute: no QR flow. Evidence needed: implemented school-code/QR + auth.
- Spec (extends SCC-04/05): QR-01 a QR/code is single-tenant and cannot be replayed to another school; QR-02 code/QR expires; QR-03 revoked/rotated code rejected; QR-04 code lookup rate-limited (no enumeration); QR-05 tampered QR payload rejected server-side; QR-06 code alone grants no data/session.

## L-C-02 — School selection cannot be changed by client tampering after auth — **BLOCKED (spec ready)**
- Cannot execute: no auth/tenant binding. Evidence needed: auth + server-resolved school.
- Spec: MS-01 after login, tampering `school_id`/`school_slug`/code in transit or storage has no effect (school resolved server-side from session — ADR-003); MS-02 switching schools requires re-authentication; MS-03 a forged school cookie/token claim is rejected.

## L-C-03 — Each mobile role sees only permitted features/data — **BLOCKED (spec ready; client-layer partial)**
- **Client-layer note (real):** the approved Mobile App Preview reference encodes least-privilege per-role tool lists (Parent has no `students`/`staff`/`marks`), and OpenCode's role-guard/session-state default-deny client tests pass (within 675/675). This is client scoping only, not authorization.
- **Blocked (server):** no role/data endpoints exist. Evidence needed: auth + role scope. Spec: reuse `role-policy-test-cases.md` RP-P/RP-ST/RP-T + `unauthorized-route-test-cases.md` on mobile role sessions; assert each role's feature/data set is server-enforced.

## L-C-04 — Mobile UI-lock comparison & keyboard/accessibility — **DEFERRED (reference verified intact)**
- **Executed now:** reference UI **3/3 unchanged** (verifier). The `Mobile App Preview.html` is a static phone-frame reference (`.phone` 390×780); there is **no runtime mobile page** to capture, so a pixel diff and keyboard/a11y pass are deferred.
- When a runtime mobile page exists, run `ui-regression-checklist.md` (phone tier 390×844 DPR3, safe-area insets, bottom-nav `.bt`) plus keyboard/focus/RTL checks. No visual change is claimed.

## Status
- Executed now: L-C-04 reference byte-lock (3/3). Client-layer role scoping observed (not authorization). Blocked: L-C-01/02/03 (no QR/auth/tenant binding). Reference UI unchanged (3/3). Nothing unexecuted is claimed passing.
