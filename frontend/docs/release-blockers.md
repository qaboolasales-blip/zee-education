# Pilot release blockers — Batch N

Every item below is blocked on work owned by another agent, or on Cline's harness.
N-O-01 and N-O-04 are complete.

Status vocabulary: **BLOCKED** = cannot proceed without the named dependency.

---

## NB-01 — No deployed build to compare

**BLOCKED — Cline**

N-O-02 requires a final approved UI comparison in deployed browsers at real device widths. This package ships no UI and nothing is deployed. The SHA-256 reference lock proves the reference files are unchanged; it cannot prove a build renders them.

**Unblock requires:** Cline's harness approval, a built and deployed app, and the owner's go/no-go.

---

## NB-02 — No pilot environment for PDF flows

**BLOCKED — KiloCode + deployment**

N-O-03 requires validating manual PDF sharing/download flows in a pilot environment. There is no render endpoint (GCB-06) and no deployed school. The *boundary* is enforced by Batch G and re-checked by `assertReleaseShareBoundary()`; the live flow cannot be exercised.

**Unblock requires:** the render contract, a provisioned school, and a pilot environment.

---

## NB-03 — Pilot go-live is an owner decision

**BLOCKED — owner**

The Batch N exit gate requires the owner to explicitly approve pilot go-live. That decision is outside this package's authority and is recorded, not performed.

---

## Completed in this batch

| Task | Status |
| --- | --- |
| N-O-01 validate production relative endpoints | **DONE and enforced** — `productionReadiness()` / `assertProductionConfig()` |
| N-O-02 final approved UI comparison in deployed browsers | **BLOCKED (NB-01)** |
| N-O-03 validate manual PDF flows in pilot environment | **BLOCKED (NB-02)** — boundary re-checked client-side |
| N-O-04 role onboarding/help text | **DONE (external documentation)** — `docs/role-onboarding.md` |

No blocker was resolved by guessing.
