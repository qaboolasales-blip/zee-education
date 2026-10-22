# UI Regression Checklist — C-00.3

- Agent: Cline (QA, Security & Operations owner)
- Microtask: **C-00.3** (Batch A)
- Created: 2026-10-17
- Owner of execution: Cline (`quality/`). The plan being executed here complements OpenCode's `frontend/docs/ui-lock-test-plan.md`; OpenCode owns the read-only hash verifier but must not write into `quality/`.

## 0. What "100% pixel-identical" means (restated for QA execution)

A screen passes only if **all four** hold at the same time:

1. **Byte identity** — the three reference HTML files still hash to their locked SHA-256 (see `quality/ui/reference-hashes.sha256`).
2. **Structure identity** — same DOM tree, element order, tag/class/id/attribute set as the reference at the same viewport.
3. **Visual identity** — same computed styles, geometry and rendered pixels at the reference viewports.
4. **Content-range identity** — every visible string is byte-for-byte one already in the reference, or produced by `frontend/core/format/` with a value that reproduces such a string.

Failing any of the four is a UI-lock violation requiring a **revert**, never an edit to the approved reference (`UNIVERSAL_RULES.md` Safety Override §1 / LAW 1).

## 1. Status of this checklist in Batch A

| Gate | Batch A status |
|------|----------------|
| Byte-identity hash gate | **Executed — PASS (3/3)** on 2026-10-17 (see `quality/docs/current-state-audit.md` §4.1–§4.2) |
| Structure / visual / content-range / pixel-diff | **Planned check — BLOCKED (C-10.3)** until OpenCode binds live data to a runtime page. No runtime page exists yet, which is correct for Batch A. |

Everything from §3 onward is a **planned check** to be run in Batch B. It is written so a later agent can execute it without ambiguity.

## 2. Capture determinism (prerequisites before any visual run)

- Same machine, same browser build, same OS display scaling, DPR fixed per tier below.
- Browser extensions disabled, devtools closed, animations/transitions replayed identically (or disabled via a controlled capture mode that does **not** alter the reference CSS).
- Both reference and runtime served from `http://localhost`/`127.0.0.1` equivalents; fonts fully loaded before capture.
- Colour scheme forced explicitly for each pass (do not rely on OS default).

## 3. Viewport matrix (desktop / tablet / phone)

Capture reference and runtime at each tier; pixel-diff threshold is **0**. Anti-aliasing noise is fixed by the capture environment, never by raising the threshold.

| Tier | Viewport (CSS px) | DPR | Why |
|------|-------------------|-----|-----|
| Desktop wide | 1600 × 1000 | 1 | Base `.shell` grid `268px 1fr`, `.wrap` max-width |
| Desktop narrow | 1281 × 900 | 1 | Just above the 1280px breakpoint |
| Tablet edge | 1280 × 900 | 1 | Stats reflow to 3 cols |
| Tablet edge | 1101 × 900 | 1 | Just above sidebar-offcanvas |
| Tablet edge | 1100 × 900 | 1 | `.side` becomes 280px overlay; `.shade` appears |
| Small tablet edge | 781 × 900 | 1 | Just above mobile switch |
| Mobile edge | 780 × 900 | 1 | Bottom nav `.bt` appears; search hidden; header height override |
| Mobile edge | 481 × 900 | 1 | Just above single-column switch |
| Mobile narrow | 480 × 900 | 1 | Stats collapse to 1 column |
| Phone frame (mobile preview) | 390 × 844 | 3 | `.phone` fixed 390×780 frame; island/safe-area insets |

## 4. Light / dark mode passes (4 passes)

Run the full §3 matrix for each colour-scheme condition and compare:

- [ ] Pass 1 — `light` forced (`prefers-color-scheme: light` + `data-theme="light"`).
- [ ] Pass 2 — `dark` forced (`prefers-color-scheme: dark` + `data-theme="dark"`).
- [ ] Pass 3 — system `light` with no `data-theme` attribute.
- [ ] Pass 4 — system `dark` with no `data-theme` attribute.

The reference uses `@media(prefers-color-scheme:dark)` with `:root:not([data-theme="light"])` and `:root[data-theme="dark"]`. All four passes must match the reference exactly.

## 5. Feature-specific regression items

For each item: compare reference vs runtime at every applicable §3 viewport and assert **no visible change**. Record PASS/FAIL with a screenshot path on failure.

### 5.1 Navigation

- [ ] Desktop sidebar `.nav` renders the same buttons in the same order; active item `.on` styling unchanged.
- [ ] School Dashboard `data-p` screens: Overview, Students, Attendance, Academics, Fees & Accounts, Staff & HR, Timetable, Reports & Print, Settings.
- [ ] Super Admin `data-p` screens: Overview, Schools & Installs, Plans & Add-ons, Billing & Renewals, Print Templates, Support Tickets, System Settings.
- [ ] `#crumb` breadcrumb text and `#q` search box unchanged.
- [ ] Sidebar collapse (`.shell.collapsed`) toggles identically with no layout drift.

### 5.2 Dark header (sticky top bar)

- [ ] Header height `78px` desktop / `66px` at ≤780px (the `m3-dashboard-refresh` override), unchanged.
- [ ] Header contents (brand, search, mode toggle, user chip) aligned identically in light and dark passes.
- [ ] No colour/gradient/shadow shift on the header between reference and runtime.

### 5.3 Hamburger drawer (offcanvas sidebar on small screens)

- [ ] At ≤1100px `.side` becomes a 280px fixed overlay and `.shade` appears — identical geometry and scrim opacity.
- [ ] Hamburger button toggles the drawer open/closed with the same transition and z-order.
- [ ] Drawer traps the same focus and closes on shade click exactly as the reference behaves.

### 5.4 Mobile bottom nav

- [ ] `.bt` hidden above 780px; visible at/below 780px; height `64px` (`66px` after the M3 override).
- [ ] Bottom-nav tabs and their labels/icons identical; active tab styling unchanged.
- [ ] Safe-area insets respected: `env(safe-area-inset-bottom)` spacing on `#toast` and bottom nav unchanged.
- [ ] Mobile Preview bottom-nav tabs (`data-t`): Home, Attendance, Results, Tasks, Profile — identical.
- [ ] Mobile Preview `.phone` frame remains `390 × 780`; `.island` stays decorative; status chrome stays fake.

### 5.5 Cross-cutting visual invariants

- [ ] Focus ring still `3px solid color-mix(in srgb,var(--brand) 45%,white)` with `2px` offset.
- [ ] Chart SVG still `preserveAspectRatio="none"` with the same `viewBox`; no chart library substituted.
- [ ] Donut still uses `conic-gradient` on `.donut`; no image/SVG swap.
- [ ] Table `min-width` unchanged (640px school dashboard / 760px super admin) and `.tb` still scrolls horizontally.
- [ ] `#toast` geometry unchanged (`bottom:calc(24px + env(safe-area-inset-bottom))`, `border-radius:14px`, `.show` transition).
- [ ] No console errors; no 404s for fonts/icons (all icons are text glyphs — no icon font may be added).
- [ ] RTL readiness: switching to `اردو · RTL` requires no new CSS.
- [ ] Print styles: reports/ID cards print identically; no print CSS introduced.
- [ ] Zoom 100% and 200% render without layout drift.

## 6. Content-range identity checks

- [ ] Every rendered money value reproduces a locked reference format: `PKR 1.08M`/`PKR 1.46M` (compact M), `PKR 296K`/`PKR 12.5k` (compact K), `PKR 12,500`/`PKR 65,000`/`PKR 42,000` (grouped).
- [ ] Dates/times reproduce locked formats: `10:00 AM` (zero-padded 12-hour), `16 October 2026` (long), `20 Oct` (short), `2m ago`/`1h ago` (relative), `91.7%` (percent), `31L` (lakh).
- [ ] Not-yet-due renewal cells render the em-dash `—` placeholder.
- [ ] No real student/guardian data is used in any capture — sample/mock values only.

## 7. Merge gate (run before merging any integration work)

```text
[ ] 1. node frontend/tools/verify-reference-ui.mjs   -> UI LOCK OK, exit 0
[ ] 2. backend suite green with Laragon PHP          -> OK (22+ tests), see preflight
[ ] 3. reference captured at all §3 viewports        -> baseline PNGs stored under quality/
[ ] 4. runtime captured at all §3 viewports          -> candidate PNGs
[ ] 5. pixel diff per viewport (all §4 passes)       -> 0 differing pixels (threshold 0)
[ ] 6. §5 feature items                              -> all PASS
[ ] 7. §6 content-range rules                        -> all PASS
[ ] 8. any difference                                -> REVERT, do not adjust the reference
```

## 8. Non-goals

- This checklist authorises no visual change and cannot be used to justify one.
- It does not certify any live API integration.
- A matching hash alone is not sufficient — visual/pixel identity must be proven separately in Batch B.

