# Reference UI Audit (O-00.1)

Read-only inspection of the three approved, pixel-locked reference designs.
No reference file was edited, renamed, moved, reformatted or copied into a runtime page.

- Task: **O-00.1**
- Agent: OpenCode (UI-safe Frontend Integration Owner)
- Audit date: 2026-10-17
- Workspace root: `F:\Project\zee Education update`
- Hash algorithm: SHA-256 (lowercase hex, computed with `Get-FileHash`)

## Audited files

Reference root inspected (read-only):

`zee_education_multi_agent_handoff/agents/opencode/reference_ui/`

| # | File | Bytes | SHA-256 |
|---|------|-------|---------|
| 1 | `Zee Education — Mobile App Preview.html` | 31169 | `deec1fceb15cdf4af44d174a65ff27261b1ad87d7418087f3783fa8bbbb73d9f` |
| 2 | `Zee Education — School Dashboard.html` | 34230 | `56d82bef4b1ef5ede1811fc12da0f643b1db0c328926b24de4f10f5d78a6948d` |
| 3 | `Zee Education — Super Admin.html` | 32473 | `df876fbc699389c5e1128d99678ead93c3ac1e4340a4a805948e8d5ba606cb30` |

### Lock comparison against `shared_readonly/REFERENCE_UI_LOCK.md`

| File | Expected hash (shared lock) | Computed hash | Result |
|------|------------------------------|---------------|--------|
| Mobile App Preview | `deec1fce…73d9f` | `deec1fce…73d9f` | **MATCH** |
| School Dashboard | `56d82bef…6948d` | `56d82bef…6948d` | **MATCH** |
| Super Admin | `df876fbc…cb30` | `df876fbc…cb30` | **MATCH** |

UI-lock status at audit time: **intact — 3/3 hashes identical to the approved lock.**

## Structural inventory (observed, non-visual facts only)

These are read-only observations recorded so that future integration binds to
existing hooks. They are **not** a licence to alter any of these values.

### 1. `Zee Education — School Dashboard.html`

- Single self-contained file: inline `<style>` (2 style blocks) + inline `<script>`.
- Style blocks: base token block, plus `<style id="m3-dashboard-refresh">`.
- Design tokens (`:root`): `--brand`, `--brand2`, `--bg`, `--card`, `--ink`,
  `--muted`, `--line`, `--soft`, `--side`, `--shadow`.
- Dark scheme selectors: `@media(prefers-color-scheme:dark)` with
  `:root:not([data-theme="light"])` and `:root[data-theme="dark"]`.
- Shell: `.shell` grid `268px 1fr`; `.shell.collapsed` collapses the sidebar.
- Existing stable DOM ids (integration candidates, unchanged):
  `shell`, `nav`, `mb`, `crumb`, `q`, `wrap`, `bt`, `toast`, `mode`.
- Screens keyed by `data-p` (desktop nav + mobile bottom nav):
  `Overview`, `Students`, `Attendance`, `Academics`, `Fees & Accounts`,
  `Staff & HR`, `Timetable`, `Reports & Print`, `Settings`.
- Breakpoints present: `1280px`, `1100px`, `780px`, `480px` (plus a second
  `780px` override inside the `m3-dashboard-refresh` block).
- Data currently rendered from hard-coded in-page literals
  (`ST`, `SC`, `pts`, `days`, `L`, `att`, `F`, `KP`, `PL`, `STC`, `schoolsRows`).

### 2. `Zee Education — Super Admin.html`

- Single self-contained file; same token/shell/chart vocabulary as the school
  dashboard, different brand pair (`--brand:#3558c8`, `--brand2:#1b2a6b`).
- Style blocks: base block, plus `<style id="m3-dashboard-refresh">`.
- Existing stable DOM ids: `shell`, `nav`, `mb`, `crumb`, `q`, `wrap`, `bt`,
  `toast`, `mode`.
- Screens keyed by `data-p`:
  `Overview`, `Schools & Installs`, `Plans & Add-ons`, `Billing & Renewals`,
  `Print Templates`, `Support Tickets`, `System Settings`.
- Breakpoints present: `1280px`, `1100px`, `780px`, `480px`.
- Hard-coded commercial sample data in `SC`, `ST`, plan catalogue `PL`,
  ticket list, rate book, `schoolsRows()`.

### 3. `Zee Education — Mobile App Preview.html`

- Single self-contained file; phone-frame preview page (not the app itself).
- Style blocks: base block, plus `<style id="m3-refresh">`.
- Existing stable DOM ids: `page`, `roles`, `domain`, `code`, `rl`, `hint`,
  `sn`, `rs`, `screen`, `nav`, `themes`, `toast`.
- Role selector values: `Parent`, `Student`, `Teacher`, `School Admin`.
- Bottom nav tabs (`data-t`): `Home`, `Attendance`, `Results`, `Tasks`,
  `Profile`.
- Feature registry `F` keys observed: `fees`, `timetable`, `homework`,
  `notices`, `messages`, `leave`, `calendar`, `marks`, `reports`, `students`,
  `admissions`, `staff`, `settings`, `documents`, `attendanceTool`.
- Per-role tool lists `TL` already encode least-privilege scoping
  (e.g. Parent has no `students`/`staff`/`marks` entry).
- Breakpoints present: `1100px`, `760px`.
- Hard-coded literals: `KP` (per-role KPI tiles), `S` (sample marks),
  `F` row data, `date` string `'Tuesday, 20 October 2026'`.

## Locked-value observations relevant to future formatting

These are recorded so that the formatters in `frontend/core/format/` can be
aligned later without touching the UI. **No UI change is proposed here.**

| Locked UI string | Where it appears | Formatter implication |
|---|---|---|
| `PKR 1.08M`, `PKR 1.46M` | School dashboard + Super Admin stat cards | compact M-suffix |
| `PKR 296K`, `PKR 12.5k` | School dashboard stat cards | compact K-suffix |
| `PKR 12,500`, `PKR 65,000`, `PKR 42,000` | tables, receipts, rate book | grouped 3-digit |
| `—` | Super Admin renewal column for not-yet-due records | empty placeholder |
| `10:00 AM`, `02:00 PM` | School dashboard calendar lines | zero-padded 12-hour |
| `16 October 2026`, `Friday · 16 October 2026` | School dashboard header | long date |
| `20 Oct`, `28 Oct`, `25 Oct`, `15 Oct` | calendar, due dates, tickets | short date |
| `2m ago`, `12m ago`, `1h ago` | Recent activity list | relative minutes |
| `91.7%`, `94.2%` | attendance stat tiles | percent |
| `31L`, `22L`, `34L` | monthly fee bars (lakh shorthand) | separate lakh formatter needed in a later batch |

## Re-verification

`frontend/tools/verify-reference-ui.mjs` recomputes these hashes and compares
them against the locked manifest in `frontend/tools/reference-ui.lock.json`.

```bash
node tools/verify-reference-ui.mjs
```

Exit code `0` = every reference file matches the approved lock.

## Constraints honoured

- No reference file was opened for writing.
- No reference HTML was copied into `frontend/` or into any runtime page.
- `frontend/` contains no HTML, CSS, SVG or asset file at all.
- Hash values are recorded as evidence only; they are not a substitute for
  `frontend/docs/ui-lock-test-plan.md` visual regression testing.