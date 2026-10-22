# Reference-UI Hash Manifest — Verification Guide (C-00.2)

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-00.2** (Batch A)
- Created: 2026-10-17

## Purpose

`reference-hashes.sha256` pins the three approved, pixel-locked reference UI files by SHA-256 so any future agent (or CI) can prove the approved UI has not been altered byte-for-byte.

The three reference files are **read-only, 100% pixel-locked approved UI**. They must never be edited, reformatted, renamed, moved or replaced. This manifest is evidence, not permission to modify them.

## Canonical location the hashes refer to

The hashes were computed over the read-only copies at:

```text
zee_education_multi_agent_handoff/agents/cline/reference_ui/
├── Zee Education — Mobile App Preview.html
├── Zee Education — School Dashboard.html
└── Zee Education — Super Admin.html
```

Identical approved copies also exist under `agents/kilocode/reference_ui/`, `agents/opencode/reference_ui/`, the shared `reference_ui/`, and `uploads/`. All mirror the same three hashes (confirmed by the executed checks in `quality/docs/current-state-audit.md` §4.1).

The manifest stores **bare filenames** (no directory), so run file-based verifiers from inside the `reference_ui` folder, or supply the path explicitly as shown below.

## Source of truth

These values were produced by an executed `Get-FileHash -Algorithm SHA256` on 2026-10-17 and **match** the locked values published in `shared_readonly/REFERENCE_UI_LOCK.md`. If this manifest and that lock file ever disagree, treat `REFERENCE_UI_LOCK.md` as authoritative and investigate.

## How a future agent verifies (any of the three)

### Method 1 — PowerShell (Windows), explicit comparison

```powershell
$ref = 'F:\Project\zee Education update\zee_education_multi_agent_handoff\agents\cline\reference_ui'
$expected = @(
  'deec1fceb15cdf4af44d174a65ff27261b1ad87d7418087f3783fa8bbbb73d9f  Zee Education — Mobile App Preview.html',
  '56d82bef4b1ef5ede1811fc12da0f643b1db0c328926b24de4f10f5d78a6948d  Zee Education — School Dashboard.html',
  'df876fbc699389c5e1128d99678ead93c3ac1e4340a4a805948e8d5ba606cb30  Zee Education — Super Admin.html'
)
$ok = $true
foreach ($line in $expected) {
  $hash, $name = $line -split '\s{2}', 2
  $actual = (Get-FileHash -Algorithm SHA256 (Join-Path $ref $name)).Hash.ToLower()
  if ($actual -ne $hash) { $ok = $false; "MISMATCH: $name`n  expected $hash`n  actual   $actual" }
  else { "OK: $name" }
}
if ($ok) { 'UI LOCK OK — 3/3 reference files unchanged.'; exit 0 } else { 'UI LOCK VIOLATION'; exit 1 }
```

### Method 2 — `sha256sum` (Git-Bash / Linux / macOS)

```bash
cd "zee_education_multi_agent_handoff/agents/cline/reference_ui"
sha256sum -c "../../../../../quality/ui/reference-hashes.sha256"
```

Expected: three lines each ending in `OK`, exit code `0`. (If your `sha256sum` is strict about line endings and the manifest was checked out with CRLF, verify with Method 1 or 3 instead — do **not** reformat the reference files to make a check pass.)

### Method 3 — OpenCode's runtime verifier (compares its own manifest)

```bash
cd frontend
node tools/verify-reference-ui.mjs
```

Expected: `UI LOCK OK — 3/3 reference files unchanged.` and exit code `0`. This re-hashes the reference files and compares them to `frontend/tools/reference-ui.lock.json` (same three hashes).

## Result on 2026-10-17 (executed)

All three methods agree: **3/3 MATCH, exit 0.** Recorded in `quality/docs/current-state-audit.md` §4.1–§4.2.

## If a check fails

1. **Never** edit a reference file, this manifest, or the shared lock to make the check pass.
2. Identify what changed the file (formatting, line-ending normalisation, minification, rename, copy, tool auto-fix) and **revert that change**.
3. Record the regression as a finding with evidence (expected vs actual hash, and the diff of whatever caused it).
4. Escalate to the owner: the approved UI may only change on direct owner instruction (`UNIVERSAL_RULES.md` Safety Override §1, LAW 1).

## Scope note

A matching hash proves **byte identity** of the approved source only. It does **not** prove the rendered runtime screens are pixel-identical after data binding — that is the separate Batch B visual regression gate (C-10.3), specified in `quality/docs/ui-regression-checklist.md`.
