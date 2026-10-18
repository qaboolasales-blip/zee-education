# UI-Lock Comparison After Data Binding — D-C-04

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **D-C-04** (Batch D — Run UI-lock comparisons after data binding)
- Created: 2026-10-17
- Status: **Cannot run a pixel comparison yet — there is no runtime page that binds live data.** What *can* be verified now (and was) is recorded below. The pixel-diff procedure itself is already specified in `quality/docs/ui-regression-checklist.md`.

## 1. Why a full comparison cannot run yet (verified 2026-10-17)

- `frontend/` still contains **no `.html`/`.htm`/CSS/asset runtime page** (recursive search returned none). OpenCode's layer is **non-visual** (adapters/formatters/selectors only, by design for these batches).
- Therefore there is no rendered screen to capture beside the reference, so the §3/§7 viewport pixel-diff in `ui-regression-checklist.md` has nothing to diff against. This is the expected Batch-B/D state, not a regression.

## 2. What WAS verified (real, executed)

| Check | Command | Result |
|-------|---------|--------|
| Reference byte-integrity | `node tools/verify-reference-ui.mjs` | **`UI LOCK OK — 3/3`** — the three approved files are unchanged |
| Adapter/format layer health | `node --test "test/*.test.js"` | **`pass 675, fail 0`** (154 suites) |
| No UI invented by integration layer | Frontend `drift-guard`/`binding contract`/`never authorises creating UI` cases (within the 675) | Pass — formatters/selectors reproduce only locked strings/geometry; they refuse to authorise UI creation |
| Theme lock | Frontend `theme-tokens`/`approved palettes`/`themeDeclarations` cases | Pass — only `--brand`/`--brand2` themable; 8 locked swatches; no palette drift |

These confirm the **integration layer cannot drift the UI on its own** and the **approved source is byte-identical**. They do **not** substitute for a rendered pixel comparison once a runtime page exists.

## 3. The comparison to run once a runtime page binds data (deferred)

When OpenCode ships a runtime page that binds live data into the approved hooks, execute `quality/docs/ui-regression-checklist.md` §3–§7:
- Capture reference + runtime at all §3 viewports (desktop/tablet/phone) and all §4 colour passes (light/dark).
- Pixel-diff each pair at **threshold 0**; assert structure + content-range identity (§5/§6).
- Store baselines under `quality/`. Any visible diff → **REVERT** the integration change, never edit the reference.

## 4. Execution status vs exit gate

- **Pixel comparison: BLOCKED (deferred)** — no runtime data-bound page exists yet. Ties to `ops/release-gates.md` G3b and the Batch D exit gate.
- **Verified now (real):** reference UI byte-identical (3/3); integration layer provably does not invent/drift UI (675/675 incl. drift-guards). This satisfies the *spirit* of "no UI change occurred" for the current non-visual state.
- Nothing pixel-level is claimed as passing; that is explicitly deferred, not skipped.
