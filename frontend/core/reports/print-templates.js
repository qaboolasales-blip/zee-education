/**
 * Print templates and the commercial rules around them. Task: J-O-02.
 *
 * "Preserve existing template visual designs exactly; do not build a new print designer."
 *
 * The references describe a catalogue, not an editor. Four built-in templates are
 * free and pre-rendered by the reference itself as CSS art (`.pv` is a styled box,
 * not an image), and a custom design is something only the Super Admin approves.
 *
 *   School Dashboard  'Free built-in templates' → 4 × `.card.tpl`, each 'Free to select'
 *                     sm('CUSTOM SCHOOL DESIGN','Super Admin controlled',
 *                        'Custom design ek baar approve aur charge hota hai')
 *   Super Admin       'Built-in forms free hain; custom HTML/CSS design Super Admin controlled hai.'
 *                     Design fee     → bd('w','Charge once')
 *                     Future reprints → bd('g','Included')
 *
 * So the commercial rule set the exit gate asks for is readable straight from the UI:
 * built-in templates are free, a custom design is charged once, and reprints of an
 * approved design are included.
 *
 * The important constraint is negative. This module must never be able to author a
 * template: `assertNoPrintDesigner()` fails if anything in `core/` grows a template
 * markup generator, inline style emitter or design-token writer.
 *
 * No DOM, no CSS, no rendering.
 */

import { stripCommentsAndLiterals } from '../fees/payment-boundary.js';

/** The four built-in templates, named exactly as both references name them. */
export const BUILT_IN_TEMPLATES = Object.freeze([
  Object.freeze({ id: 'admission-form', name: 'Admission form' }),
  Object.freeze({ id: 'teacher-form', name: 'Teacher form' }),
  Object.freeze({ id: 'student-id-card', name: 'Student ID card' }),
  Object.freeze({ id: 'result-card', name: 'Result card' }),
]);

/** Every built-in template is free. Stated in both references. */
export const TEMPLATE_COMMERCIAL_RULES = Object.freeze({
  builtIn: Object.freeze({ price: 'Free', badge: 'g', note: 'Free to select' }),
  customDesign: Object.freeze({ price: 'One-time', badge: 'w', note: 'Charge once' }),
  reprints: Object.freeze({ price: 'Included', badge: 'g', note: 'Approved design use hota hai' }),
});

/** Who may approve a custom design. Only Super Admin — stated in the reference. */
export const CUSTOM_DESIGN_APPROVER = 'Super Admin';

export const TemplateReject = Object.freeze({
  UNKNOWN_TEMPLATE: 'unknown-template',
  CUSTOM_DESIGN_NOT_APPROVED: 'custom-design-not-approved',
  NO_APPROVED_FIELDS: 'no-approved-fields',
  DESIGN_AUTHORITY_MISMATCH: 'design-authority-mismatch',
});

function ok(value) {
  return Object.freeze({ allowed: true, reason: null, value, errors: Object.freeze([]) });
}

function fail(reason, errors = []) {
  return Object.freeze({ allowed: false, reason, value: null, errors: Object.freeze(errors) });
}

export function isBuiltInTemplate(idOrName) {
  return BUILT_IN_TEMPLATES.some(
    (template) => template.id === idOrName || template.name === idOrName,
  );
}

export function templateById(id) {
  return BUILT_IN_TEMPLATES.find((template) => template.id === id) ?? null;
}

/**
 * The catalogue as the existing cards render it: name, commercial badge and the
 * existing `Preview` link label. Nothing here generates markup.
 */
export function templateCatalogue() {
  return Object.freeze(
    BUILT_IN_TEMPLATES.map((template) =>
      Object.freeze({
        ...template,
        price: TEMPLATE_COMMERCIAL_RULES.builtIn.price,
        badgeClass: TEMPLATE_COMMERCIAL_RULES.builtIn.badge,
        actionLabel: 'Preview',
      }),
    ),
  );
}

/**
 * Can this template be rendered for printing?
 *
 * The Result card carries a rule from Batch H rather than from this batch: a result
 * card may only be produced from published results. The reference says so on the
 * mobile documents card — 'Published results only'.
 *
 * @param {{ templateId?: unknown, role?: unknown, customDesignApproved?: unknown,
 *           approvedFields?: unknown, resultStage?: string }} request
 */
export function canRenderTemplate(request = {}) {
  const id = request.templateId;

  if (!isBuiltInTemplate(id)) {
    // The only other thing that exists is an approved custom design, and nothing may
    // author one here.
    if (request.customDesignApproved === true) {
      const fields = Array.isArray(request.approvedFields) ? request.approvedFields.filter(Boolean) : [];
      if (fields.length === 0) return fail(TemplateReject.NO_APPROVED_FIELDS);
      if (request.role !== CUSTOM_DESIGN_APPROVER) {
        return fail(TemplateReject.DESIGN_AUTHORITY_MISMATCH);
      }
      return ok(Object.freeze({ templateId: null, custom: true, fields: Object.freeze([...fields]) }));
    }
    return fail(TemplateReject.UNKNOWN_TEMPLATE);
  }

  const template = templateById(id);
  if (request.role === CUSTOM_DESIGN_APPROVER) {
    // The approver is not the audience; a custom-design decision must not leak into
    // a built-in render.
    return ok(Object.freeze({ templateId: template.id, custom: false, fields: null }));
  }

  /**
   * The Result card inherits the Batch H gate rather than a rule of its own.
   * `request.resultStage === 'published'` is required — an absent stage means the
   * gate was never satisfied, so it must not be treated as a pass.
   */
  if (template.id === 'result-card' && request.resultStage !== 'published') {
    return fail(TemplateReject.CUSTOM_DESIGN_NOT_APPROVED, [request.resultStage ?? null]);
  }

  return ok(Object.freeze({ templateId: template.id, custom: false, fields: null }));
}

/**
 * J-O-02 — prove no print designer exists.
 *
 * The failure mode this guards against is subtle: "generate the template HTML" is a
 * one-line convenience that would silently replace the reference's pre-rendered
 * designs with generated ones, which is exactly the redesign J-O-02 forbids.
 *
 * The scan is over *executable* tokens, so it needs no exemption: naming `.innerHTML`
 * inside a regex literal — as another guard legitimately does — is invisible to it,
 * while actually calling it is not. An earlier version scanned raw text and therefore
 * flagged `core/hardening/ui-state-audit.js`, a different guard that names the same
 * primitives. Naming a forbidden primitive is not the same as using it.
 *
 * State-surface names (`spinner`, `skeleton`, …) are deliberately **not** checked
 * here: Batch M owns the UI-state audit, and overlapping the two lists would make each
 * guard flag the other.
 *
 * @param {Array<{ path: string, code: string }>} sources
 */
export function assertNoPrintDesigner(sources) {
  const list = Array.isArray(sources) ? sources : [];

  const patterns = [
    { label: 'print stylesheet', pattern: /@media\s+print|@page\b|print-color-adjust/ },
    { label: 'DOM element creation', pattern: /\bdocument\.createElement\s*\(/ },
    { label: 'template markup builder', pattern: /\.innerHTML|insertAdjacentHTML|document\.write/ },
    { label: 'print typography override', pattern: /@font-face|\bFontFace\b|document\.fonts/ },
    { label: 'print window', pattern: /\.print\(\)|window\.open\(/ },
  ];

  const problems = [];
  for (const source of list) {
    if (!source || typeof source.code !== 'string') continue;
    const executable = stripCommentsAndLiterals(source.code);
    for (const { label, pattern } of patterns) {
      if (pattern.test(executable)) problems.push(`${source.path}: ${label}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`a print designer would replace the approved designs:\n  ${problems.join('\n  ')}`);
  }
  return true;
}

/**
 * Drift guard — the catalogue and its commercial rules must still be the ones the
 * references describe.
 *
 * @param {string} schoolDashboardSource
 * @param {string} platformSource
 */
export function assertTemplatesMatchReferences(schoolDashboardSource, platformSource) {
  const problems = [];
  for (const template of BUILT_IN_TEMPLATES) {
    if (!schoolDashboardSource.includes(template.name)) {
      problems.push(`built-in template "${template.name}" is gone from the School Dashboard`);
    }
    if (!platformSource.includes(template.name)) {
      problems.push(`built-in template "${template.name}" is gone from Super Admin`);
    }
  }
  const claims = [
    ['Free to select', schoolDashboardSource],
    ['CUSTOM SCHOOL DESIGN', schoolDashboardSource],
    ['Super Admin controlled', schoolDashboardSource],
    ['Charge once', platformSource],
    ['Included', platformSource],
    ['custom HTML/CSS design Super Admin controlled hai', platformSource],
  ];
  for (const [claim, source] of claims) {
    if (!source.includes(claim)) problems.push(`the commercial copy "${claim}" is gone`);
  }
  if (problems.length > 0) {
    throw new Error(`print template contract drifted:\n  ${problems.join('\n  ')}`);
  }
  return true;
}
