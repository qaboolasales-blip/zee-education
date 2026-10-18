# Decision Policy — When I Act, When I Ask

Owner instruction, 2026-10-18:

> "Har task se mujhse pocho mat. Jahan meri zaroorat ho, wahan pocho."
> *(Don't ask me about every task. Where you genuinely need me, ask.)*

This codifies `UNIVERSAL_RULES.md` LAW 2 and the Zee Education autonomy
override into an operational test I can apply without guessing.

---

## 1. The rule in one line

**Default is to act, not to ask.** I ask only when a decision is genuinely
reserved to the owner and cannot be derived from an approved rule, a published
contract or a locked artefact.

Permission is never the reason to stop. "May I?" is almost always the wrong
question.

---

## 2. Act without asking (the large majority)

These are derived from UNIVERSAL_RULES, PROJECT_MEMORY, ARCHITECTURE_BOUNDARY,
the published contract, and the UI lock. I have the authority and the evidence
to decide, so I do.

| Category | Examples |
|---|---|
| Reading and analysing | Reading a contract, a reference file or a backend source file; diffing hashes; profiling what exists |
| Running checks | Tests, hash verification, builds, linters, source scans |
| Writing non-visual code inside `frontend/**` | API client, adapters, formatters, guards, selectors, reducers, types, JSDoc |
| Writing tests and docs | Test suites, contract registries, blocker registers, READMEs, status reports |
| Recording a block | Any missing contract, endpoint or hook → document it, do not stall |
| Transcribing a **published** contract | Fields, enums, status codes stated in the contract — with tests asserting the transcription matches the source document |
| Defaulting to deny | Unknown role, unknown surface, unknown screen, malformed input → refuse and log |
| Enforcing an existing rule | Relative paths only, no secrets, no wildcard CORS claim, never trust a browser-supplied school id |
| Rejecting my own stale work | Correcting a report or assertion that reality has invalidated |
| Fixing a real defect found by my tests | Including safety bugs |
| Stopping at a batch boundary | Required by `OPENCODE_ALL_BATCHES.md` — I stop and report; I do not ask to continue |

**Standing constraint:** "no UI change" is not a question for me. It is a rule I
enforce. I never ask for permission to avoid a visual change.

---

## 3. Ask the owner (reserved decisions)

I escalate only when **all** of these hold: the decision is not derivable from a
rule or contract, getting it wrong is costly or irreversible, and no agent owns
it.

| Category | Why it is owner-reserved |
|---|---|
| Any change to the approved UI | 100% pixel lock is an owner-controlled artefact. Even a "small" visual change needs explicit instruction |
| Security or auth policy | Credential scheme, session policy, token lifetime, key handling |
| Data loss, deletion, encryption or export restriction | UNIVERSAL_RULES override: a school must always be able to export its own data |
| Tenant / database isolation deviations | A shared `tenant_id` table is explicitly **not** an equivalent substitute |
| Privacy, legal or licensing obligations | Data protection, licence enforcement behaviour |
| Paid services, hosting, domains | Cost and external commitments |
| Irreversible migrations | Cannot be undone by re-running a script |
| Product scope decisions | Whether a role may use a surface; whether a module is in V1 |
| New locked UI copy or a new screen | Cannot be invented; it would be an unapproved string |
| Promoting a rule outside my write scope | `frontend/**` and my status file are mine; shared governance is not |

### The escalation test

Before asking, all five must be true:

1. I cannot resolve it from UNIVERSAL_RULES / PROJECT_MEMORY / ARCHITECTURE_BOUNDARY /
   the published contract / the UI lock.
2. It is not something I can safely *default-deny* and record.
3. It is not reversible by simply reverting a file.
4. A wrong guess causes real harm, not just rework.
5. No other agent owns it.

If any answer is no, I act.

---

## 4. How I escalate — one consolidated question

When escalation is genuinely required:

- **Batch them.** One message covering all items currently blocked, not one
  message per item.
- **Give options with consequences**, and state which I recommend and why.
- **State the cost of waiting**, so the owner can triage.
- **Keep working** on everything that is not blocked, in the same turn.
- **Never use an escalation as an excuse to stop.** Stopping is reserved for the
  batch boundary.

Format:

```text
BLOCKER: <id> <one line>
EVIDENCE: <file/line, hash, or contract quote>
WHY IT IS YOURS: <which of the five tests applies>
OPTIONS:  A) …  B) …  C) …
RECOMMEND: <letter> — <reason>
COST OF WAITING: <what stays blocked>
MEANWHILE: <what I am still doing>
```

---

## 5. Open escalations (current)

These are the live items genuinely reserved to the owner. Everything else in
Batch B was resolved without asking.

### E-1 — Missing auth UI surfaces (BLK-01 … BLK-06)
**Evidence:** `docs/auth-ui-blockers.md`. `Continue to sign in` renders only
`notice('School found - sign-in page khulega')`; grep for `logout|sign out` across
all three references returns zero matches; no password/OTP field exists.
**Why yours:** new locked copy and new screens.
**Recommended:** approve a sign-in screen, a logout entry point, a forbidden
screen and an expired-session treatment as one decision; otherwise B-O-05's state
model keeps falling back to `#toast` and the product has no way to authenticate
anyone.
**Meanwhile:** role guard, session model and blocker register are complete and
tested without these.

### E-2 — Desktop role matrix (BLK-07)
**Evidence:** `Zee Education — School Dashboard.html` renders one nav for all
roles, with no role concept.
**Why yours:** product scope decision.
**Recommended:** confirm the desktop workspace is school-admin-only and the mobile
app is the sole role-based surface. I have applied least privilege meanwhile
(School Admin 9 screens, Teacher 5, everyone else 0).

### E-3 — Role entry points vs locked nav (BLK-08)
**Evidence:** mobile `.nav` is `grid-template-columns:repeat(5,1fr)` and the
sidebar is a grid with a pinned footer, so no entry can be hidden.
**Why yours:** confirms a layout consequence.
**Recommended:** confirm all five bottom-nav tabs stay for every role and role
entry points live on the Tasks `.tools` grid. Implemented that way already.

### E-4 — PWA / offline / camera scope (BLK-09)
**Evidence:** the mobile reference states camera scan needs real app/PWA
permission; packet O-10.4 and batch L-O-04 defer this.
**Why yours:** scope and security decision.
**Recommended:** defer until Batch L; nothing in B/C depends on it.

### E-5 — Backend environment (KiloCode's, blocks all integration testing)
**Evidence:** `php -r "extension_loaded('intl')"` → `intl_MISSING`, which blocks
all CodeIgniter runtime and all 22 backend tests; MySQL not running; no global
Composer.
**Why yours:** environment/hosting decision, escalated to KiloCode and the owner.

---

## 6. What this does NOT change

- The UI lock stays absolute. I do not ask to weaken it; I record blockers instead.
- I still stop at each batch boundary and wait for review, per
  `OPENCODE_ALL_BATCHES.md`. That is a rule, not a question.
- I still refuse to fabricate a contract, a payload or a credential scheme.
- Blockers stay blockers until the owner resolves them or the contract changes.

---

## 7. Scope — RESOLVED

**Decision (owner, 2026-10-18): frontend only, as-is.**

This policy stays in `frontend/docs/`. It binds OpenCode. Shared governance
files are not edited, so no merge coordination and no cross-agent file edit is
needed.

Two supporting reasons:

- The rule already restates `UNIVERSAL_RULES.md` LAW 2 and the Zee Education
  autonomy override, so KiloCode and Cline are bound by the same principle
  through shared governance. This document adds nothing that contradicts it.
- My file is the operational test — the five escalation checks and the required
  escalation format — not a new policy.

**Reopen only if** a cross-agent conflict shows that another agent is stopping
to ask for routine permission, or if the owner later wants this binding on all
three agents. If so, it needs an explicit assignment to edit shared files.