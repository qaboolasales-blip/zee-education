# Zee Education — 3-Agent Development Handoff

This package lets **KiloCode**, **OpenCode** and **Cline** work in parallel without changing each other’s work or changing approved UI.

## Important: do not use one shared working folder

Create a private Git repository first, then create three separate working copies/worktrees:

```text
zee-education-kilocode
zee-education-opencode
zee-education-cline
```

Give each agent only its own packet folder plus the three reference HTML files included inside it.

| Agent | Packet | Allowed write path | Main responsibility |
|---|---|---|---|
| KiloCode | `agents/kilocode/KILOCODE_AGENT_PACKET.md` | `backend/**` only | CodeIgniter backend/control plane |
| OpenCode | `agents/opencode/OPENCODE_AGENT_PACKET.md` | `frontend/**` only | UI-safe API adapter/PWA integration layer |
| Cline | `agents/cline/CLINE_AGENT_PACKET.md` | `quality/**`, `ops/**` only | QA, security, test and operations artifacts |

## Non-negotiable coordination rules

1. Every agent must read its own packet and `shared/UNIVERSAL_RULES.md` first.
2. The files in every `reference_ui/` folder are **read-only approved UI**. Their hashes must not change.
3. Agents cannot edit another agent’s allowed path, any `reference_ui/` file, shared rules, root Git config or archive files.
4. Every agent works in its own Git branch/worktree. Never use `git reset --hard`, force push, broad file formatting, mass renaming or global search/replace.
5. An agent can only mark its own task complete after a real check/test and must update only its own packet/tracker in its own worktree.
6. Initial simultaneous work is limited to the unblocked microtasks in each packet. Tasks marked `BLOCKED` wait for the documented dependency/merge.
7. Merge order after Batch A: **KiloCode backend foundation → OpenCode integration layer → Cline quality/operations artifacts**. Resolve conflicts manually; do not let an agent auto-merge other work.

## Current truth

- Approved visual prototypes exist for School Dashboard, Super Admin and Mobile App.
- They are not production-connected; static/sample values and UI demos are not backend features.
- CodeIgniter 4 + MySQL/MariaDB is approved for backend.
- Development target is Windows/Laragon with PHP 8.2+, Composer and MySQL/MariaDB.
- One installation + one database per school remains mandatory.

## Start now

1. Copy this handoff package into all three project worktrees.
2. Give each agent its own agent packet only.
3. Let all three execute their **Batch A** microtasks.
4. Read each final report and merge only after tests/checks are shown.
