# Integration, security & recovery blockers — Batch M

Every item below is blocked on work owned by another agent, or on Cline's harness.
M-O-02 and M-O-03 are complete and continuously enforced.

Status vocabulary: **BLOCKED** = cannot proceed without the named dependency.

---

## MB-01 — No merged real APIs to run flows against

**BLOCKED — KiloCode**

M-O-01 requires executing all role flows against the merged real APIs. The published contract still contains only `GET /health` and `GET /setup`; there is no auth, provisioning, people, attendance, curriculum, assessment, fee, commercial or report endpoint. Every earlier batch recorded the same absence, so this is the umbrella blocker behind them all.

**Unblock requires:** KiloCode publishes the remaining contracts, provisions a school, and the flows can be executed for real.

---

## MB-02 — No school database, so backup/restore cannot be evidenced

**BLOCKED — KiloCode**

The mobile reference lists `Backup & audit` as `Infrastructure-controlled`, which is a backend concern. No school database exists, so there is nothing to back up or restore and no restore to test.

**Unblock requires:** KiloCode implements backup/restore in the control plane and records evidence.

---

## MB-03 — UI regression comparison cannot be run

**BLOCKED — Cline**

M-O-04 requires a rendered comparison against all three references at desktop/tablet/mobile widths. This package ships no UI, so a rendered comparison is impossible. Cline owns the UI-lock regression harness and it is not approved to run.

The only automated guarantee this package can make is the SHA-256 lock (`npm run test:ui-lock`), which proves the *reference files* are unchanged — not that a build renders them.

**Unblock requires:** Cline's harness approval and the owner's review/merge of Batches A–M.

---

## Completed in this batch

| Task | Status |
| --- | --- |
| M-O-01 execute all role flows against merged real APIs | **BLOCKED (MB-01)** |
| M-O-02 verify loading/error/empty states use existing approved UI | **DONE and enforced** — no custom state surface can be created; the approved pair is drift-guarded |
| M-O-03 verify no dev URLs, credentials or debug data remain | **DONE and enforced** — three scans, whole-tree clean, two self-flag/false-positive classes found and fixed |
| M-O-04 run desktop/tablet/mobile UI regression | **BLOCKED (MB-03)** |

No blocker was resolved by guessing.
