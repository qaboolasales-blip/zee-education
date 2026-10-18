# Delivery Note

Give this entire agent folder to the matching agent.

The folder contains:

- the agent packet with rules, memory, completed tasks and remaining microtasks;
- `reference_ui/` with three read-only approved UI HTML files;
- `shared_readonly/` with governance, project memory, UI-lock hashes and boundary contract.

The agent must write code only in its allowed path in its own separate Git worktree. It must not edit this handoff folder, the reference UI files or another agent's work.
