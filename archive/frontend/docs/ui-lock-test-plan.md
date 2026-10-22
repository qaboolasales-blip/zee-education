# UI Lock Test Plan (O-00.3)

How to prove, before and after any integration, that the runtime screens are
still 100% pixel-identical to the three approved reference designs.

**Owner of this document:** OpenCode (`frontend/`).
**Owner of the executed regression harness:** Cline (`quality/`). OpenCode may
only publish the plan and the read-only hash verifier; per
`ARCHITECTURE_BOUNDARY.md`, OpenCode must not write into `quality/`.

## 0. What "100% pixel-identical" means here

A screen passes only if all four hold simultaneously:

1. **Byte identity of the approved design source** — the three reference HTML
   files still hash to their locked SHA-256 values.
2. **Structure identity** — same DOM tree, same element order, same tag/class/
   id/attribute set as the reference, at the same viewport.
3. **Visual identity** — same computed styles, same geometry, same rendered
   pixels at the reference viewports.
4. **Content-range identity** — every visible string and every rendered value is
   byte-for-byte one of the strings already present in the reference, or is
   produced by `frontend/core/format/` with a value that reproduces such a
   string.

Failing any of the four is a UI-lock violation and requires a revert, per
`UNIVERSAL_RULES.md` LAW 1 and the Zee Education Safety Override §1.

## 1. Stage 1 — reference file hash gate (automatable now)

```bash
cd frontend
node tools/verify-reference-ui.mjs
```

Expected: `UI LOCK OK — 3/3 reference files unchanged.` and exit code `0`.

Any other output is a violation. **Never** "fix" the failure by editing a
reference file, the manifest, or by reformatting line endings — investigate and
revert the change that caused it.

Manifest: `frontend/tools/reference-ui.lock.json`.

| File | SHA-256 |
|------|---------|
| `Zee Education — Mobile App Preview.html` | `deec1fceb15cdf4af44d174a65ff27261b1ad87d7418087f3783fa8bbbb73d9f` |
| `Zee Education — School Dashboard.html` | `56d82bef4b1ef5ede1811fc12da0f643b1db0c328926b24de4f10f5d78a6948d` |
| `Zee Education — Super Admin.html` | `df876fbc699389c5e1128d99678ead93c3ac1e4340a4a805948e8d5ba606cb30` |

## 2. Stage 2 — viewport matrix

The runtime screen and the reference must be captured at identical viewport
sizes, identical device scale factor and identical colour scheme. Both must be
served from `http://localhost`/`127.0.0.1`-equivalent local origins with **no**
browser extension, no devtools open, and the same browser build on both sides.

| Tier | Viewport (CSS px) | DPR | Required because |
|---|---|---|---|
| Desktop wide | `1600 × 1000` | 1 | Base `.shell` grid `268px 1fr`, `.wrap` `max-width:1500px` |
| Desktop narrow | `1281 × 900` | 1 | Just above the `1280px` breakpoint |
| Tablet / breakpoint edge | `1280 × 900` | 1 | `.stats` 5→3 cols, `.g3` reflow (school dashboard); 4→2 cols (super admin) |
| Tablet / breakpoint edge | `1101 × 900` | 1 | Just above the sidebar-offcanvas breakpoint |
| Tablet / breakpoint edge | `1100 × 900` | 1 | `.side` becomes a 280px fixed overlay; `.shade` appears |
| Small tablet / breakpoint edge | `781 × 900` | 1 | Just above the mobile layout switch |
| Mobile / breakpoint edge | `780 × 900` | 1 | Bottom nav `.bt` appears, `.search`/`.hl` hidden, `.top` height override |
| Mobile / breakpoint edge | `481 × 900` | 1 | Just above the single-column switch |
| Mobile narrow | `480 × 900` | 1 | `.stats` and `.tp` collapse to 1 column |
| Phone frame (mobile preview) | `390 × 844` | 3 | `.phone` is a fixed `390 × 780` frame; island/safe-area insets |
| Tablet portrait (mobile preview) | `761 × 1024` | 2 | `.stage` 3-col → 2-col at `1100px` |
| Phone portrait (mobile preview) | `390 × 844` | 3 | `.stage` → 1 column at `760px`; `.phone` becomes `100%` width |

**Breakpoint-edge rule.** Always capture at *both* sides of every breakpoint
found in the reference. Reference breakpoints in force:

- School Dashboard: `1280px`, `1100px`, `780px`, `480px` (and a second `780px`
  block inside `<style id="m3-dashboard-refresh">`).
- Super Admin: `1280px`, `1100px`, `780px`, `480px`.
- Mobile App Preview: `1100px`, `760px`.

Adding, removing or moving any of these is an automatic violation.

## 3. Stage 3 — deterministic capture requirements

| Requirement | Value |
|---|---|
| Colour scheme | `light` (and one `dark` pass, see §4) |
| `prefers-reduced-motion` | `reduce` for capture, so `.wrap`/`.screen` entry animations are not mid-flight |
| `prefers-color-scheme` | forced explicitly so the `@media(prefers-color-scheme:dark)` block does not drift with the OS |
| Fonts | `Inter` or the documented fallback stack `ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif`; if Inter is unavailable on the capture machine, capture reference and runtime on the **same** machine so both render identically |
| Scroll position | capture every screen from scroll offset `0`, and one full-page capture |
| Data | runtime must be captured with fixture data that reproduces the reference's visible strings (see §5), otherwise differences caused by data must be separable from differences caused by layout |
| Browser console | must be clean of errors and warnings; a warning is treated as a failure because it usually signals a changed DOM expectation |
| Determinism | `animations: disabled`, `caret: hide`, `fonts: wait for document.fonts.ready` |

Recommended tools (Cline to select and pin in `quality/`): Playwright or
Puppeteer for capture, `pixelmatch` for pixel diffing, `jest-image-snapshot`
only if a stable alternative is unavailable.

## 4. Colour-scheme passes

The references declare dark values through three selectors:

```css
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }
:root[data-theme="dark"] { … }
```

So a complete pass requires:

1. `prefers-color-scheme: light` + no `data-theme`.
2. `prefers-color-scheme: dark` + no `data-theme` (OS-driven dark).
3. `data-theme="light"` set while OS prefers dark.
4. `data-theme="dark"` set while OS prefers light.

All four must match. The toggle in the references (`#mode` / `.ib.mode` /
`.mode`) only flips `data-theme`; it must keep doing exactly that and nothing else.

## 5. Stage 4 — content-range comparison (the data-safe half of the gate)

Because a runtime screen will show real records instead of the reference's hard
coded literals, a plain pixel diff is only meaningful if the runtime data is
chosen to reproduce the reference strings. Therefore the fixture set used for
UI-lock regression **must** be the reference's own values:

| Reference literal to reproduce | Where | Source of truth |
|---|---|---|
| `842`, `736`, `42`, `91.7%`, `PKR 1.08M` | School dashboard stat tiles | `ST` array |
| `Horizon Public School`, `Islamabad · School workspace` | `.sc` | literal |
| `Friday · 16 October 2026`, `Good morning, Ayesha ☀` | `.hd` | literal |
| `Muhammad Ayan`, `ST-2026-041`, `Grade 6 · A`, `Imran Khan` | Students table | literal |
| `28 / 28`, `INV-1024`, `PKR 12,500`, `Bank · 294012`, `Paid`, `Due` | Attendance/Fees | literals |
| `Grade 6 · Section A · 16 Oct`, `P`/`A`/`L` | Attendance register | literal |
| `08:30`, `Mathematics`, `Room 12` | Timetable | literal |
| `Admission form`, `Teacher form`, `Student ID card`, `Result card` | Reports/Print | literal |
| `28`, `24 active · 4 provisioning`, `PKR 1.46M`, `7` | Super Admin stat tiles | `ST` array |
| `—` (renewal column) | Super Admin installs table | `SC` array |
| `Al-Noor Model School`, `Complete · PKR 65,000`, `Due in 4d` | Renewals | literal |
| `SUGGESTED`, `Create quote`, `Custom quote per school` | Plan cards | `PL()` |
| `ZE-1048`, `App connection code`, `Normal`, `Today` | Support tickets | literal |
| `Ayesha Khan`, `842`, `94.2%`, `PKR 12.5k`, `Due 25 Oct` | Mobile role tiles | `KP` |
| `Tuesday, 20 October 2026` | Mobile `.hello` | `date` literal |

Reproducing these strings requires the formatters in `frontend/core/format/` to
behave exactly as recorded in `frontend/docs/reference-ui-audit.md`
(“Locked-value observations relevant to future formatting”).

### Content-range rules (independent of pixel diffing)

| Rule | Check |
|---|---|
| C-1 No new strings | Every visible string at integration time must exist in the reference **or** be produced by a formatter from a value that maps to a reference string. `grep` the reference for any new literal. |
| C-2 No `undefined`/`NaN`/`null` leakage | Scan rendered text for `undefined`, `NaN`, `null`, `[object Object]` — must be zero occurrences. This is why `frontend/core/format/empty.js` exists. |
| C-3 No truncation of the layout | A longer real value must not be "fixed" by shrinking font, changing padding or hiding overflow. If a value does not fit, that is a data/UI decision for the owner. |
| C-4 No new tokens | No new CSS custom property may be introduced or repurposed; `--brand`, `--brand2`, `--bg`, `--card`, `--ink`, `--muted`, `--line`, `--soft`, `--side`, `--shadow` values are locked. |
| C-5 No new attributes with visual effect | `style` may only set values already produced by reference code (`--h`, `--c`, `--k`, `width`, `--brand`, `--brand2`). |

## 6. Stage 5 — manual comparison checklist

Run per screen, per viewport from §2, on the rendered page. Cline records pass/fail.

| ID | Manual check |
|---|---|
| M-1 | Sidebar width `268px`; collapse via `.shell.collapsed` still animates and hides with `opacity:0;pointer-events:none` |
| M-2 | Sticky header height is `78px` desktop / `66px` ≤ `780px` (the `m3-dashboard-refresh` overrides `72px`/`64px`) |
| M-3 | Bottom nav `.bt` hidden above `780px`, visible at/below; height `64px` (`66px` after the M3 override) |
| M-4 | Safe-area insets still respected (`env(safe-area-inset-*)`) |
| M-5 | Focus ring still `3px solid color-mix(in srgb,var(--brand) 45%,white)` with `2px` offset |
| M-6 | Table `min-width` still `640px` (school dashboard) / `760px` (super admin) and `.tb` still scrolls |
| M-7 | Chart SVG still `preserveAspectRatio="none"` with the same `viewBox`; no chart library substituted |
| M-8 | Donut still uses a `conic-gradient` on `.donut`; no image/SVG swap |
| M-9 | Focus/active/hover states on `.nav button.on`, `.btn.p`, `.lk`, `.ch button.on` unchanged |
| M-10 | `#toast` geometry unchanged (`bottom:calc(24px + env(safe-area-inset-bottom))`, `border-radius:14px`, `.show` transition) |
| M-11 | Mobile preview `.phone` frame remains `390 × 780`, `.island` remains decorative, `.status` chrome still fake |
| M-12 | RTL readiness: switching to `اردو · RTL` must not require any new CSS; if it does, that is a new UI decision |
| M-13 | Print styles: reports/ID cards print identically — no print CSS was introduced |
| M-14 | Zoom 100% and 200% render without layout drift |
| M-15 | No console errors; no 404s for fonts/icons (all icons are text glyphs in the reference — no icon font may be added) |

## 7. Stage 6 — regression gate for any integration change

Before merging any integration work:

```text
[ ] 1. node tools/verify-reference-ui.mjs            → UI LOCK OK, exit 0
[ ] 2. npm test                                      → all unit tests pass
[ ] 3. reference captured at all §2 viewports        → baseline PNG stored under quality/
[ ] 4. runtime captured at all §2 viewports          → candidate PNGs
[ ] 5. pixel diff per viewport                       → 0 differing pixels (threshold 0)
[ ] 6. §5 content-range rules C-1..C-5               → all pass
[ ] 7. §6 manual checklist M-1..M-15                → all pass
[ ] 8. §4 colour-scheme passes 1..4                  → all match
[ ] 9. any difference → REVERT, do not adjust the reference
```

A pixel-diff threshold greater than zero is not acceptable for this project.
Anti-aliasing noise must be eliminated by fixing the capture environment
(same machine, same browser build, same DPR, fonts loaded), not by raising the
threshold.

## 8. Batch A status of this gate

| Stage | Status in Batch A |
|---|---|
| 1 — reference hash gate | **Live.** `frontend/tools/verify-reference-ui.mjs`, passing 3/3. |
| 2 — viewport matrix | **Defined here.** Not executed; no runtime page exists yet (correctly — Batch A must not copy a reference into a runtime page). |
| 3 — capture determinism | **Defined here.** Tool selection/execution is Cline's. |
| 4 — colour-scheme passes | **Defined here.** |
| 5 — content-range comparison | **Partially live.** Enforceable today as rules only; the formatter unit tests in `frontend/test/` prove the string-producing half. |
| 6 — manual checklist | **Defined here.** Requires a runtime page → blocked until Batch B. |
| 7 — merge gate | **Defined here.** Cannot run yet: nothing is bound. |
| 8 — status | Recorded in `frontend/docs/reference-ui-audit.md` and the agent status file. |

## 9. Non-goals

- This plan does not authorise any visual change, and none of its steps may be
  used to justify one.
- It does not replace `quality/` artefacts owned by Cline.
- It does not certify any live API integration. No backend contract exists yet
  (see `frontend/docs/backend-contract-dependency.md`).