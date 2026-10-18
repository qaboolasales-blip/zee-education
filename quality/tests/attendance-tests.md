# Attendance Tests — Batch F

- Agent: Cline (QA/Security/Ops). Microtasks **F-C-01..F-C-04**. 2026-10-17.
- State check: **no** attendance schema/endpoint/auth exists (Controllers=Health/Home/Setup; Models/Libraries/Filters empty; only 4 control-plane migrations). "Execute" tasks BLOCKED; UI-lock re-verified.

## F-C-01 — Duplicate / forbidden / cross-school attendance — **BLOCKED (spec ready)**
- Cannot execute: no attendance subsystem. Evidence needed: school-local attendance schema + auth + role scope.
- Spec (complements `role-policy-test-cases.md` RP-SA-02/RP-T-01/03):
  - ATT-01 Mark a student twice for the same date → rejected/idempotent, no double count.
  - ATT-02 Teacher marks an unassigned class → **403**.
  - ATT-03 Parent/Student marks attendance → **403** (read-only roles).
  - ATT-04 School A marks School B's class → **403/404**.
  - ATT-05 Invalid status value (not Present/Absent/Leave) → **400**.
  - ATT-06 Back-dating/future-dating outside allowed window → validated per policy.

## F-C-02 — Corrections traceable, not silently destructive — **BLOCKED (spec ready)**
- Cannot execute: no attendance write/correction logic. Evidence needed: implemented attendance + audit.
- Spec: ATT-C01 changing Present→Absent leaves an audit trail (who/when/from/to); ATT-C02 no silent overwrite of an approved record; ATT-C03 correction does not hard-delete the original audit event; ATT-C04 bulk correction is transactional (all-or-nothing).

## F-C-03 — Parent sees only linked child attendance — **BLOCKED (spec ready)**
- Cannot execute: no attendance data/auth. Evidence needed: linked-child model + auth.
- Spec: ATT-P01 Parent lists attendance → only linked child(ren); ATT-P02 Parent requests a non-linked child's attendance → **403/404**; ATT-P03 Parent export scoped to linked children only.

## F-C-04 — Visual UI-lock regression review — **DEFERRED (reference verified intact)**
- **Executed now:** `node tools/verify-reference-ui.mjs` → **`UI LOCK OK — 3/3`**. No runtime attendance page exists to capture (frontend is non-visual), so a pixel diff is deferred.
- When a runtime attendance screen binds data, run `quality/docs/ui-regression-checklist.md` §3–§7 (threshold 0). No visual change is claimed or expected.

## Status
- Executed now: F-C-04 reference byte-lock (3/3). Blocked: F-C-01/02/03 (no attendance/auth implementation). Nothing unexecuted is claimed passing.
