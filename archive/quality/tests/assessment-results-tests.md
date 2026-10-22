# Assessments, Marks, Review & Results — Batch H

- Agent: Cline (QA/Security/Ops). Microtasks **H-C-01..H-C-04**. 2026-10-17.
- State check: **no** assessment/marks/results schema, no auth, no publish workflow in backend. Frontend carries a non-visual assessment **lifecycle client module** whose tests pass (within **675/675**), but client logic is not authorization.

## H-C-01 — Teacher scope, admin review, early-publication negative tests — **BLOCKED (spec ready)**
- Cannot execute: no backend marks/review/publish flow. Evidence needed: school-local assessment schema + auth + role scope.
- Spec (complements `role-policy-test-cases.md` RP-T-02/05, RP-SA-03):
  - AS-01 Teacher enters marks for an assigned subject → **200**; unassigned → **403**.
  - AS-02 Teacher publishes results → **403** (School Admin only).
  - AS-03 Marks visible to Parent/Student before publish → **denied** (draft/review withheld).
  - AS-04 School Admin reviews/approves then publishes → allowed.
  - AS-05 Cross-school marks access → **403/404**.

## H-C-02 — Calculation edge cases & audit history — **BLOCKED (spec ready)**
- Cannot execute: no calculation engine. Evidence needed: implemented marks/result computation.
- Spec: AS-C01 max-score bounds enforced (no negative/over-max); AS-C02 rounding/percent deterministic; AS-C03 aggregate ignores invalid rows rather than fabricating; AS-C04 every state change (submit/review/publish/return) audited (who/when/from/to); AS-C05 no silent overwrite of a published result.

## H-C-03 — Parent/student cannot access draft/reviewed (unpublished) results — **BLOCKED (spec ready)**
- Cannot execute: no result records/auth. Evidence needed: results + linkage + auth.
- Spec: AS-P01 Parent/Student requesting an unpublished result → **denied**; AS-P02 Parent without server-resolved linkage → **denied**; AS-P03 only published results reach Parent/Student views/exports; AS-P04 Super Admin denied learner results by default (control plane).

## H-C-04 — UI lock around result screens — **DEFERRED (reference verified intact)**
- **Executed now:** reference UI **3/3 unchanged** (verifier). No runtime result screen exists to capture (frontend non-visual), so pixel diff is deferred to the batch where a result page binds data (`ui-regression-checklist.md` §3–§7).

## Status
- Executed now: H-C-04 reference byte-lock (3/3); frontend lifecycle/gate client tests pass (675/675) but are **not** server authorization. Blocked: H-C-01/02/03 (no backend assessment/auth). Nothing unexecuted is claimed passing.
