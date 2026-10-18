/**
 * Result lifecycle and the publication gate. Tasks: H-O-01, H-O-02, H-O-04.
 *
 * Goal: teacher entry -> School Admin review -> publish, with the property the
 * Batch H exit gate demands: **only reviewed/published results reach parent and
 * student views.**
 *
 * THE APPROVED LIFECYCLE
 *  The locked UI documents all three stages itself, in two places:
 *
 *  School Dashboard — Academics:
 *    .flow div.d  "1 Teacher draft"
 *    .flow div.nw "2 Admin review"
 *    .flow div    "3 Publish"
 *    badge        "Awaiting review"
 *
 *  Mobile Preview — marks feature + Results screen:
 *    ['Teacher draft',   'Validated',              'Done',    'g']
 *    ['Admin review',    'Before publication',     'Review',  'w']
 *    ['Published result','Parents see approved only','Locked', 'n']
 *    "Awaiting admin review" · "Save draft for review" · "Approve & publish"
 *
 *  So the vocabulary is fixed at three stages, and there is **no room for a fourth
 *  step**: `.flow` renders exactly three `<div>`s and its classes are pre-styled.
 *
 * DEFAULT DENY
 *  `canRoleViewResult()` withholds unless the lifecycle is published for any role
 *  that is not the author or the reviewer. A parent or student therefore cannot
 *  receive an unpublished result even if the server mistakenly sends one — the
 *  client refuses rather than renders.
 *
 * No DOM, no rendering, no network.
 */

import { DataCategory, mayView, scopeFor } from '../people/privacy-policy.js';
import { Role } from '../auth/role-guard.js';

/** The three approved lifecycle stages, verbatim from the references. */
export const ResultStage = Object.freeze({
  DRAFT: 'draft',
  IN_REVIEW: 'in-review',
  PUBLISHED: 'published',
});

/**
 * Exact locked strings per surface. A future binding may only reuse these; any
 * other wording would be a new locked string (HAB-02).
 *
 * Note step 3 differs between surfaces: the desktop flow says "3 Publish" while the
 * mobile marks list says "Published result". Both are locked, so both are recorded.
 */
export const STAGE_LABELS = Object.freeze({
  [ResultStage.DRAFT]: Object.freeze({
    mobile: 'Teacher draft',
    desktopText: 'Teacher draft',
    desktopFlow: '1 Teacher draft',
    pill: 'g',
    pillNote: 'Done',
  }),
  [ResultStage.IN_REVIEW]: Object.freeze({
    mobile: 'Admin review',
    desktopText: 'Admin review',
    desktopFlow: '2 Admin review',
    pill: 'w',
    pillNote: 'Review',
  }),
  [ResultStage.PUBLISHED]: Object.freeze({
    mobile: 'Published result',
    desktopText: 'Publish',
    desktopFlow: '3 Publish',
    pill: 'n',
    pillNote: 'Locked',
  }),
});

/** The Approved Review badge shown while a result awaits review. */
export const AWAITING_REVIEW_LABEL = 'Awaiting review';

/** Exactly three steps exist in the approved `.flow`. */
export const FLOW_STEP_COUNT = 3;

/** Which stage each approved `.flow` step represents, in locked order. */
export const FLOW_STEPS = Object.freeze([
  Object.freeze({ index: 1, stage: ResultStage.DRAFT, className: 'd' }),
  Object.freeze({ index: 2, stage: ResultStage.IN_REVIEW, className: 'nw' }),
  Object.freeze({ index: 3, stage: ResultStage.PUBLISHED, className: '' }),
]);

/** Closed rejection reasons. No free-form text can reach UI copy. */
export const LifecycleReject = Object.freeze({
  UNKNOWN_STAGE: 'unknown-stage',
  NOT_A_TRANSITION: 'not-a-transition',
  ROLE_NOT_PERMITTED: 'role-not-permitted',
  NOT_PUBLISHED: 'not-published',
  SCOPE_UNRESOLVED: 'scope-unresolved',
  NO_RESULT: 'no-result',
});

/**
 * Legal transitions, keyed `from -> to`, each naming the role that may perform
 * it.
 *
 * Authority is per ACTION, not per stage. That distinction matters: the teacher
 * performs `Save draft for review`, which moves the result INTO the review stage,
 * so the teacher must be permitted to enter `in-review` even though the School
 * Admin owns its content. The School Admin performs `Approve & publish` and the
 * return-for-changes action.
 *
 * `draft -> draft` is the teacher editing their own draft (no stage change).
 */
const TRANSITIONS = Object.freeze({
  [ResultStage.DRAFT]: Object.freeze({
    [ResultStage.DRAFT]: Object.freeze([Role.TEACHER]),
    [ResultStage.IN_REVIEW]: Object.freeze([Role.TEACHER]),
  }),
  [ResultStage.IN_REVIEW]: Object.freeze({
    [ResultStage.DRAFT]: Object.freeze([Role.SCHOOL_ADMIN]),
    [ResultStage.PUBLISHED]: Object.freeze([Role.SCHOOL_ADMIN]),
  }),
  [ResultStage.PUBLISHED]: Object.freeze({}),
});

export function isResultStage(value) {
  return typeof value === 'string' && Object.values(ResultStage).includes(value);
}

/** Roles that may move a result INTO a given stage from the current one. */
export function rolesForTransition(from, to) {
  if (!isResultStage(from) || !isResultStage(to)) return Object.freeze([]);
  return TRANSITIONS[from][to] ?? Object.freeze([]);
}

export function roleMayEnterStage(role, to, from) {
  if (!isResultStage(to) || !isResultStage(from)) return false;
  return rolesForTransition(from, to).includes(role);
}

/**
 * Can this transition happen?
 *
 * `in-review -> draft` is the "return for changes" path. It has **no approved
 * control** in the references, so it is modelled but recorded as HAB-03 rather
 * than given a UI hook.
 */
export function canTransition(from, to, role) {
  if (!isResultStage(from) || !isResultStage(to)) {
    return Object.freeze({ allowed: false, reason: LifecycleReject.UNKNOWN_STAGE });
  }
  if (!rolesForTransition(from, to).length || rolesForTransition(from, to).length === 0) {
    return Object.freeze({ allowed: false, reason: LifecycleReject.NOT_A_TRANSITION });
  }
  if (!rolesForTransition(from, to).includes(role)) {
    return Object.freeze({ allowed: false, reason: LifecycleReject.ROLE_NOT_PERMITTED });
  }
  return Object.freeze({ allowed: true, reason: null });
}

/** Apply a transition, returning a frozen result envelope. */
export function transition(from, to, role) {
  const decision = canTransition(from, to, role);
  if (!decision.allowed) {
    return Object.freeze({ allowed: false, reason: decision.reason, stage: from });
  }
  return Object.freeze({ allowed: true, reason: null, stage: to });
}

/**
 * The `.flow` state for a current stage: which step is `d` (done), which is `nw`
 * (current), and how far the flow has advanced. Structure only.
 *
 * @param {string} currentStage
 */
export function flowState(currentStage) {
  if (!isResultStage(currentStage)) {
    return Object.freeze({ valid: false, currentStep: null, doneSteps: 0, steps: Object.freeze([]) });
  }
  const currentIndex = FLOW_STEPS.findIndex((step) => step.stage === currentStage);
  return Object.freeze({
    valid: true,
    currentStep: currentIndex + 1,
    doneSteps: currentIndex,
    steps: Object.freeze(
      FLOW_STEPS.map((step) =>
        Object.freeze({
          index: step.index,
          label: STAGE_LABELS[step.stage].desktopFlow,
          className: step.index < currentIndex + 1 ? 'd' : step.index === currentIndex + 1 ? 'nw' : '',
        }),
      ),
    ),
  });
}

/** The pill class/text for a stage, for the mobile marks list. */
export function pillFor(currentStage) {
  if (!isResultStage(currentStage)) {
    return Object.freeze({ pill: 'n', label: '', note: '', known: false });
  }
  const labels = STAGE_LABELS[currentStage];
  return Object.freeze({ pill: labels.pill, label: labels.mobile, note: labels.pillNote, known: true });
}

/**
 * Can this role see this result?
 *
 * Three independent conditions, ALL required:
 *  1. the privacy matrix grants the role the `academic_results` category;
 *  2. where the scope is `own` / `linked-children`, the caller supplies the
 *     server-resolved scope — the client never assumes it;
 *  3. for Parent and Student the stage MUST be `published`. This is the Batch H
 *     exit-gate rule, enforced in code.
 *
 * Super Admin is denied by the privacy matrix, before any stage is considered.
 *
 * @param {string} role
 * @param {{ stage?: unknown, resultId?: unknown }} result
 * @param {{ ownId?: unknown, linkedIds?: readonly unknown[]|null, assignedClassRefs?: readonly string[]|null }} [viewerScope]
 */
export function canRoleViewResult(role, result, viewerScope = {}) {
  if (!mayView(role, DataCategory.ACADEMIC_RESULTS)) {
    return Object.freeze({ allowed: false, reason: LifecycleReject.ROLE_NOT_PERMITTED });
  }
  if (!isResultStage(result?.stage)) {
    return Object.freeze({ allowed: false, reason: LifecycleReject.NO_RESULT });
  }

  const scope = scopeFor(role, DataCategory.ACADEMIC_RESULTS);
  if (scope === 'own' && (viewerScope.ownId === undefined || viewerScope.ownId === null)) {
    return Object.freeze({ allowed: false, reason: LifecycleReject.SCOPE_UNRESOLVED });
  }
  if (scope === 'linked-children') {
    const linked = viewerScope.linkedIds;
    if (!Array.isArray(linked) || linked.length === 0) {
      return Object.freeze({ allowed: false, reason: LifecycleReject.SCOPE_UNRESOLVED });
    }
  }

  // THE GATE. A parent or student may only ever see a published result.
  if ((role === Role.PARENT || role === Role.STUDENT) && result.stage !== ResultStage.PUBLISHED) {
    return Object.freeze({ allowed: false, reason: LifecycleReject.NOT_PUBLISHED });
  }

  return Object.freeze({ allowed: true, reason: null, scope, stage: result.stage });
}

/**
 * Filter a list of results down to what this role may see, redacting the rest.
 * The input is never mutated, and every entry is reported so a QA layer can prove
 * a leak was prevented rather than silently filtered.
 *
 * @param {ReadonlyArray<object>} results
 */
export function selectVisibleResults(role, results, viewerScope = {}) {
  const list = Array.isArray(results) ? results : [];
  const visible = [];
  const withheld = [];

  for (const result of list) {
    if (canRoleViewResult(role, result, viewerScope).allowed) visible.push(result);
    else withheld.push(result);
  }

  return Object.freeze({
    visible: Object.freeze(visible),
    withheldCount: withheld.length,
    withheldIds: Object.freeze(
      withheld.map((result) => result?.resultId).filter((id) => typeof id === 'string'),
    ),
  });
}

/**
 * Drift guard: the stage vocabulary and the three-step flow must still match the
 * approved references.
 *
 * @param {Record<string, string>} referenceSources
 */
export function assertLifecycleMatchesReferences(referenceSources) {
  const mobile = referenceSources?.['mobile-app'];
  const desktop = referenceSources?.['school-desktop'];
  const problems = [];

  if (typeof mobile !== 'string' || mobile === '') {
    problems.push('no Mobile Preview reference supplied');
  } else {
    for (const stage of Object.values(ResultStage)) {
      const label = STAGE_LABELS[stage].mobile;
      if (!mobile.includes(`'${label}'`) && !mobile.includes(label)) {
        problems.push(`mobile stage label "${label}" is missing from the reference`);
      }
    }
    if (!mobile.includes('Awaiting admin review')) {
      problems.push('the "Awaiting admin review" copy changed');
    }
    if (!mobile.includes('Save draft for review') || !mobile.includes('Approve & publish')) {
      problems.push('the teacher/admin action copy changed');
    }
    if (!mobile.includes('Parents see approved only')) {
      problems.push('the reference no longer states that parents see approved results only');
    }
  }

  if (typeof desktop !== 'string' || desktop === '') {
    problems.push('no School Dashboard reference supplied');
  } else {
    for (const step of FLOW_STEPS) {
      const labels = STAGE_LABELS[step.stage];
      // The approved step renders as `<div class="…">1<br>Teacher draft</div>`,
      // so the number and the label are separated by a line break, not a space.
      const markup = `${step.index}<br>${labels.desktopText}`;
      if (!desktop.includes(markup)) {
        problems.push(`desktop flow step "${labels.desktopFlow}" is not rendered as "${markup}"`);
      }
    }
    if (!desktop.includes(AWAITING_REVIEW_LABEL)) {
      problems.push('the "Awaiting review" badge copy changed');
    }
    // Exactly three steps: each approved step carries exactly one <br>, so a
    // fourth step would add one. Counting <div> would be wrong — the wrapper and
    // the steps are both <div>.
    const flowBlock = desktop.match(/<div class="flow">[\s\S]*?<\/div><\/div>/)?.[0] ?? '';
    const breaks = (flowBlock.match(/<br>/g) ?? []).length;
    if (breaks !== FLOW_STEP_COUNT) {
      problems.push(`the approved flow renders ${breaks} steps, expected ${FLOW_STEP_COUNT}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`result lifecycle drifted from the references:\n  ${problems.join('\n  ')}`);
  }
  return true;
}