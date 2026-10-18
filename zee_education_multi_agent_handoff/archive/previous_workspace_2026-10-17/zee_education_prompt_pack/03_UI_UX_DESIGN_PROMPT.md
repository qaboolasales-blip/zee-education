# Prompt 03 — Premium UI/UX and Design System

Use `00_MASTER_CONTEXT_PROMPT.md`. Inspect the existing React/Vite/MUI UI before modifying it. Improve all School Dashboard pages, Super Admin pages and role-based mobile views; do not polish only the overview.

## Design direction

- Keep the product calm, clean, high-end and content-first.
- The selected school theme is the base brand color for logo, selected navigation, primary actions and important highlights.
- Support exactly eight base theme families: Brown, Red, Orange, Yellow, Green, Blue, Navy Blue and Purple; each has usable light, main and dark gradient tones.
- Add a controlled multi-color palette for KPI categories, chart series, data groups and semantic states. Assign consistent meaning and legends. Do not make every card a bright gradient.
- Neutral backgrounds/surfaces should allow data colors to remain clear.
- Validate contrast, especially Yellow/Orange. Use dark text or darker gradient stops where required. Do not convey a status by color alone.

## UX requirements

- Inspect all buttons, menus, forms, filters, tabs and search. Every control needs a real action or an explicit demo/coming-later state.
- Add consistent loading, empty, error, validation, success and permission-denied states.
- Support keyboard navigation, focus visibility, touch targets, semantic headings/tables, chart alternatives, reduced motion and WCAG AA-oriented contrast.
- Test from narrow mobile widths through desktop. Prevent page-level horizontal overflow; tables may scroll inside clear containers.
- Ensure English, Roman Urdu and Urdu RTL direction changes work for tables, icons, dialogs, spacing and mixed-language content.
- Preserve school theme in school/mobile context. Super Admin theme must not silently overwrite a school’s theme.

## Process

1. First produce a screen audit, design-token table and screen-by-screen acceptance checklist.
2. Implement approved screen groups incrementally, using current MUI components where possible.
3. Run build plus responsive and accessibility checks after each group.
4. Report remaining mock/simulated controls honestly.
