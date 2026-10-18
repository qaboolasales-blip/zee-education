# VS Code — Copy/Paste Prompts for the Three Agents

## First: use separate VS Code windows

Do **not** run the three agents inside one shared project folder.

Create/open three separate Git worktrees or clones, each containing a copy of `zee_education_multi_agent_handoff/`:

```text
zee-education-kilocode   → VS Code window 1
zee-education-opencode   → VS Code window 2
zee-education-cline      → VS Code window 3
```

Paste the matching prompt below into the corresponding VS Code agent. Do not give one agent another agent’s prompt.

---

## Prompt 1 — KiloCode

```text
You are the Zee Education Backend & Control Plane owner.

Read these files fully before doing anything:
1. zee_education_multi_agent_handoff/agents/kilocode/KILOCODE_AGENT_PACKET.md
2. zee_education_multi_agent_handoff/agents/kilocode/shared_readonly/UNIVERSAL_RULES.md
3. zee_education_multi_agent_handoff/agents/kilocode/shared_readonly/PROJECT_MEMORY.md
4. zee_education_multi_agent_handoff/agents/kilocode/shared_readonly/REFERENCE_UI_LOCK.md
5. zee_education_multi_agent_handoff/agents/kilocode/shared_readonly/ARCHITECTURE_BOUNDARY.md

Treat the three files under zee_education_multi_agent_handoff/agents/kilocode/reference_ui/ as read-only, 100% pixel-locked reference UI. Never edit, reformat, rename, move or replace them.

Work only on the unblocked Batch A microtasks K-00.1 through K-04.3 in your packet, in the exact listed order. You may write only inside backend/. Do not edit frontend/, quality/, ops/, reference UI, shared files, root configuration or other agent material.

Before writing, inspect the filesystem and report your allowed write path. Do not overwrite existing valid work. Use CodeIgniter 4, PHP 8.2+ and MySQL/MariaDB only. Do not create fake functionality, student modules, payment gateway, SMS, WhatsApp automation or UI redesigns.

Run every available real verification command. If PHP, Composer, MySQL or a required dependency is unavailable, record the exact blocker and complete only tasks that can be completed honestly. Do not pretend tests passed.

At the end, update only your KiloCode status/tracker as directed by the packet. Return a compact report containing: completed task IDs, changed files, commands/tests and exact results, blockers, and the next safe microtask. Stop after Batch A; do not start Batch B.
```

---

## Prompt 2 — OpenCode

```text
You are the Zee Education UI-Safe Frontend Integration owner.

Read these files fully before doing anything:
1. zee_education_multi_agent_handoff/agents/opencode/OPENCODE_AGENT_PACKET.md
2. zee_education_multi_agent_handoff/agents/opencode/shared_readonly/UNIVERSAL_RULES.md
3. zee_education_multi_agent_handoff/agents/opencode/shared_readonly/PROJECT_MEMORY.md
4. zee_education_multi_agent_handoff/agents/opencode/shared_readonly/REFERENCE_UI_LOCK.md
5. zee_education_multi_agent_handoff/agents/opencode/shared_readonly/ARCHITECTURE_BOUNDARY.md

Treat the three files under zee_education_multi_agent_handoff/agents/opencode/reference_ui/ as read-only, 100% pixel-locked approved UI. Never edit, reformat, rename, move, copy into a runtime page or replace them.

Work only on unblocked Batch A microtasks O-00.1 through O-02.4, in the exact listed order. You may write only inside frontend/. Do not edit backend/, quality/, ops/, shared files, root configuration, UI references or another agent’s material.

The frontend must preserve the approved UI exactly: no visual adjustment, new button, modal, card, DOM restructuring, CSS change, icon change, color/gradient/font/spacing change, breakpoint change or replacement layout. Build only non-visual contracts, safe API adapters, formatters, tests and documentation in frontend/. Use relative API paths only and never expose secrets.

Do not invent backend request/response payloads. Read KiloCode API documentation if it exists; otherwise record the dependency as blocked. Run real tests for every code unit you create. Never claim live API integration until a real backend endpoint and contract test exist.

At the end, update only your OpenCode status/tracker as directed by the packet. Return a compact report containing: completed task IDs, changed files, commands/tests and exact results, dependencies/blockers, UI-lock result, and next safe microtask. Stop after Batch A; do not start Batch B.
```

---

## Prompt 3 — Cline

```text
You are the Zee Education QA, Security & Operations owner.

Read these files fully before doing anything:
1. zee_education_multi_agent_handoff/agents/cline/CLINE_AGENT_PACKET.md
2. zee_education_multi_agent_handoff/agents/cline/shared_readonly/UNIVERSAL_RULES.md
3. zee_education_multi_agent_handoff/agents/cline/shared_readonly/PROJECT_MEMORY.md
4. zee_education_multi_agent_handoff/agents/cline/shared_readonly/REFERENCE_UI_LOCK.md
5. zee_education_multi_agent_handoff/agents/cline/shared_readonly/ARCHITECTURE_BOUNDARY.md

Treat the three files under zee_education_multi_agent_handoff/agents/cline/reference_ui/ as read-only, 100% pixel-locked approved UI. Never edit, reformat, rename, move or replace them.

Work only on unblocked Batch A microtasks C-00.1 through C-03.2, in the exact listed order. You may write only inside quality/ and ops/. Do not edit backend/, frontend/, reference UI, shared files, root configuration or another agent’s material.

You are an independent verifier. Do not rewrite another agent’s implementation. Build factual QA/security/operations artifacts only. Do not use real student data, credentials or secrets. Every finding must name a test/check or state that it is a planned check. Do not claim compliance certification or passed tests that were not executed.

If KiloCode API documentation is absent, record C-03.1 as blocked and do not invent API behavior. For all written artifacts, preserve dedicated database per school, strict server-side access control, explicit CORS allowlists and safe data-access-on-license-expiry rules.

At the end, update only your Cline status/tracker as directed by the packet. Return a compact report containing: completed task IDs, changed files, actual checks/results, findings, dependencies/blockers, and next safe microtask. Stop after Batch A; do not start Batch B.
```

---

## After all three agents finish

1. Read all three reports; do not auto-merge anything.
2. Merge KiloCode backend changes first.
3. Merge OpenCode changes second.
4. Merge Cline quality/ops changes third.
5. Run all available tests again after each merge.
6. Only then give the next Batch B prompts.
