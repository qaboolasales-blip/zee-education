/**
 * Assessment / results tests. Tasks: H-O-01 … H-O-05.
 * Synthetic marks only. No network. No rendering.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { Surface } from '../core/auth/index.js';
import { Role } from '../core/auth/role-guard.js';
import {
  AWAITING_REVIEW_LABEL,
  ASSESSMENT_BINDINGS,
  ASSESSMENT_INTEGRATION_AUTHORIZED,
  FLOW_STEP_COUNT,
  FLOW_STEPS,
  LifecycleReject,
  MarkReject,
  PENDING_ASSESSMENT_CONTRACTS,
  ResultStage,
  STAGE_LABELS,
  aggregateResult,
  assertAssessmentBindingsMatchReferences,
  assertLifecycleMatchesReferences,
  assertNoAssessmentElementCreation,
  assertNoInventedAssessmentSchemas,
  buildResultRows,
  canRoleViewResult,
  canTransition,
  describeAssessmentBlock,
  findPendingAssessmentContract,
  flowState,
  formatMarkPercent,
  formatMarkScore,
  gradeFor,
  isResultStage,
  pillFor,
  progressWidth,
  resultSetState,
  roleMayEnterStage,
  rolesForTransition,
  selectVisibleResults,
  transition,
  validateMark,
} from '../core/assessment/index.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REF_DIR = resolve(REPO_ROOT, 'zee_education_multi_agent_handoff', 'agents', 'opencode', 'reference_ui');

function readReference(fragment) {
  const matches = readdirSync(REF_DIR).filter((name) => name.includes(fragment));
  assert.equal(matches.length, 1, `exactly one reference containing "${fragment}"`);
  return readFileSync(resolve(REF_DIR, matches[0]), 'utf8');
}

const REFERENCES = Object.freeze({
  'school-desktop': readReference('School Dashboard'),
  'mobile-app': readReference('Mobile App Preview'),
  [Surface.PLATFORM]: readReference('Super Admin'),
});

const result = (stage, id = 'R-1') => ({ resultId: id, stage });

describe('H-O-01 — lifecycle matches the approved references', () => {
  it('passes the drift guard', () => {
    assert.equal(assertLifecycleMatchesReferences(REFERENCES), true);
  });

  it('has exactly three stages, matching the approved three-step flow', () => {
    assert.equal(FLOW_STEP_COUNT, 3);
    assert.equal(FLOW_STEPS.length, 3);
    assert.deepEqual([...FLOW_STEPS].map((s) => s.stage), ['draft', 'in-review', 'published']);
  });

  it('uses only the locked label strings', () => {
    assert.deepEqual([...FLOW_STEPS].map((s) => STAGE_LABELS[s.stage].desktopFlow), [
      '1 Teacher draft',
      '2 Admin review',
      '3 Publish',
    ]);
    assert.deepEqual([...FLOW_STEPS].map((s) => STAGE_LABELS[s.stage].mobile), [
      'Teacher draft',
      'Admin review',
      'Published result',
    ]);
    assert.equal(AWAITING_REVIEW_LABEL, 'Awaiting review');
  });

  it('rejects an unknown stage', () => {
    for (const value of ['Draft', 'Published', 'PUBLISHED', '', null, 42]) {
      assert.equal(isResultStage(value), false, String(value));
      assert.equal(canTransition(value, ResultStage.PUBLISHED, Role.SCHOOL_ADMIN).reason, LifecycleReject.UNKNOWN_STAGE);
    }
  });

  it('fails if the reference flow gains or loses a step', () => {
    const altered = REFERENCES['school-desktop'].replace(
      /<div class="flow">.*?<\/div><\/div>/s,
      '<div class="flow"><div>1 A</div><div>2 B</div><div>3 C</div><div>4 D</div></div></div>',
    );
    assert.throws(() => assertLifecycleMatchesReferences({ ...REFERENCES, 'school-desktop': altered }));
    assert.throws(() => assertLifecycleMatchesReferences({}));
  });

  it('fails if the reference stops stating that parents see approved results only', () => {
    const altered = REFERENCES['mobile-app'].replace('Parents see approved only', 'whatever');
    assert.throws(() => assertLifecycleMatchesReferences({ ...REFERENCES, 'mobile-app': altered }));
  });
});

describe('H-O-02 — transitions use the approved controls only', () => {
  it('lets the teacher submit a draft for review and edit their own draft', () => {
    // Authority is per ACTION, not per stage: the teacher performs
    // "Save draft for review", which moves the result INTO the review stage.
    assert.equal(canTransition(ResultStage.DRAFT, ResultStage.IN_REVIEW, Role.TEACHER).allowed, true);
    assert.equal(canTransition(ResultStage.DRAFT, ResultStage.DRAFT, Role.TEACHER).allowed, true);
    assert.equal(roleMayEnterStage(Role.TEACHER, ResultStage.DRAFT, ResultStage.DRAFT), true);
    assert.deepEqual([...rolesForTransition(ResultStage.DRAFT, ResultStage.IN_REVIEW)], ['Teacher']);
    assert.equal(roleMayEnterStage(Role.TEACHER, ResultStage.DRAFT), false, 'a target stage needs a source stage');
  });

  it('lets only School Admin review, publish and return for changes', () => {
    assert.equal(canTransition(ResultStage.IN_REVIEW, ResultStage.PUBLISHED, Role.SCHOOL_ADMIN).allowed, true);
    assert.equal(canTransition(ResultStage.IN_REVIEW, ResultStage.DRAFT, Role.SCHOOL_ADMIN).allowed, true);
    assert.equal(canTransition(ResultStage.DRAFT, ResultStage.DRAFT, Role.SCHOOL_ADMIN).reason, LifecycleReject.ROLE_NOT_PERMITTED);
  });

  it('never lets a teacher publish, and never lets a parent or student publish', () => {
    assert.equal(canTransition(ResultStage.IN_REVIEW, ResultStage.PUBLISHED, Role.TEACHER).reason, LifecycleReject.ROLE_NOT_PERMITTED);
    for (const role of [Role.PARENT, Role.STUDENT, Role.SUPER_ADMIN]) {
      assert.equal(roleMayEnterStage(role, ResultStage.PUBLISHED), false, role);
      assert.equal(canTransition(ResultStage.IN_REVIEW, ResultStage.PUBLISHED, role).reason, LifecycleReject.ROLE_NOT_PERMITTED, role);
    }
  });

  it('forbids skipping review and un-publishing', () => {
    assert.equal(canTransition(ResultStage.DRAFT, ResultStage.PUBLISHED, Role.SCHOOL_ADMIN).reason, LifecycleReject.NOT_A_TRANSITION);
    assert.equal(canTransition(ResultStage.PUBLISHED, ResultStage.DRAFT, Role.SCHOOL_ADMIN).reason, LifecycleReject.NOT_A_TRANSITION);
    assert.deepEqual([...canTransition(ResultStage.PUBLISHED, ResultStage.PUBLISHED, Role.SCHOOL_ADMIN) && Object.keys(canTransition(ResultStage.PUBLISHED, ResultStage.PUBLISHED, Role.SCHOOL_ADMIN))], ['allowed', 'reason']);
    assert.equal(canTransition(ResultStage.PUBLISHED, ResultStage.PUBLISHED, Role.SCHOOL_ADMIN).reason, LifecycleReject.NOT_A_TRANSITION);
  });

  it('allows returning a reviewed result to draft for changes', () => {
    assert.equal(canTransition(ResultStage.IN_REVIEW, ResultStage.DRAFT, Role.TEACHER).reason, LifecycleReject.ROLE_NOT_PERMITTED);
    assert.equal(canTransition(ResultStage.IN_REVIEW, ResultStage.DRAFT, Role.SCHOOL_ADMIN).allowed, true);
  });

  it('returns a frozen envelope and leaves the input untouched on refusal', () => {
    const refused = transition(ResultStage.DRAFT, ResultStage.PUBLISHED, Role.SCHOOL_ADMIN);
    assert.equal(Object.isFrozen(refused), true);
    assert.equal(refused.allowed, false);
    assert.equal(refused.stage, ResultStage.DRAFT, 'a refused transition must not change state');
  });

  it('describes the approved flow state without inventing a step', () => {
    const review = flowState(ResultStage.IN_REVIEW);
    assert.equal(review.valid, true);
    assert.equal(review.currentStep, 2);
    assert.equal(review.doneSteps, 1);
    assert.deepEqual([...review.steps].map((s) => s.className), ['d', 'nw', '']);
    assert.deepEqual([...flowState(ResultStage.PUBLISHED).steps].map((s) => s.className), ['d', 'd', 'nw']);
    assert.equal(flowState('nope').valid, false);
  });

  it('maps a stage to the approved pill only', () => {
    assert.deepEqual({ ...pillFor(ResultStage.DRAFT) }, { pill: 'g', label: 'Teacher draft', note: 'Done', known: true });
    assert.equal(pillFor(ResultStage.IN_REVIEW).pill, 'w');
    assert.equal(pillFor(ResultStage.PUBLISHED).pill, 'n');
    assert.equal(pillFor('nope').known, false);
  });
});

describe('H-O-03 — the publication gate (exit-gate rule)', () => {
  it('withholds an unpublished result from a parent even with linkage', () => {
    for (const stage of [ResultStage.DRAFT, ResultStage.IN_REVIEW]) {
      const decision = canRoleViewResult(Role.PARENT, result(stage), { linkedIds: ['S-1'] });
      assert.equal(decision.allowed, false, stage);
      assert.equal(decision.reason, LifecycleReject.NOT_PUBLISHED, stage);
    }
  });

  it('withholds an unpublished result from a student even with an own id', () => {
    const decision = canRoleViewResult(Role.STUDENT, result(ResultStage.IN_REVIEW), { ownId: 'S-1' });
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, LifecycleReject.NOT_PUBLISHED);
  });

  it('allows a published result to a parent and a student', () => {
    assert.equal(canRoleViewResult(Role.PARENT, result(ResultStage.PUBLISHED), { linkedIds: ['S-1'] }).allowed, true);
    assert.equal(canRoleViewResult(Role.STUDENT, result(ResultStage.PUBLISHED), { ownId: 'S-1' }).allowed, true);
  });

  it('still refuses a parent without server-resolved linkage', () => {
    const decision = canRoleViewResult(Role.PARENT, result(ResultStage.PUBLISHED), {});
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, LifecycleReject.SCOPE_UNRESOLVED);
  });

  it('lets the teacher see their own draft and review state', () => {
    assert.equal(canRoleViewResult(Role.TEACHER, result(ResultStage.DRAFT)).allowed, true);
    assert.equal(canRoleViewResult(Role.TEACHER, result(ResultStage.IN_REVIEW)).allowed, true);
  });

  it('denies Super Admin entirely, before any stage is considered', () => {
    for (const stage of [ResultStage.DRAFT, ResultStage.IN_REVIEW, ResultStage.PUBLISHED]) {
      assert.equal(canRoleViewResult(Role.SUPER_ADMIN, result(stage)).reason, LifecycleReject.ROLE_NOT_PERMITTED, stage);
    }
  });

  it('denies every unknown role', () => {
    for (const role of ['Admin', 'parent', '', null, 42]) {
      assert.equal(canRoleViewResult(role, result(ResultStage.PUBLISHED), { linkedIds: ['S-1'] }).allowed, false, String(role));
    }
  });

  it('treats a missing result or stage as no result', () => {
    assert.equal(canRoleViewResult(Role.PARENT, {}).reason, LifecycleReject.NO_RESULT);
    assert.equal(canRoleViewResult(Role.PARENT, null).reason, LifecycleReject.NO_RESULT);
  });

  it('filters a mixed list and reports what it withheld', () => {
    const list = [
      result(ResultStage.DRAFT, 'R-draft'),
      result(ResultStage.PUBLISHED, 'R-pub-1'),
      result(ResultStage.IN_REVIEW, 'R-review'),
      result(ResultStage.PUBLISHED, 'R-pub-2'),
    ];
    const outcome = selectVisibleResults(Role.PARENT, list, { linkedIds: ['S-1'] });
    assert.deepEqual([...outcome.visible].map((r) => r.resultId), ['R-pub-1', 'R-pub-2']);
    assert.equal(outcome.withheldCount, 2);
    assert.deepEqual([...outcome.withheldIds].sort(), ['R-draft', 'R-review']);
    assert.equal(Object.isFrozen(outcome), true);
  });

  it('leaves the input list untouched', () => {
    const list = [result(ResultStage.DRAFT), result(ResultStage.PUBLISHED)];
    const snapshot = JSON.stringify(list);
    selectVisibleResults(Role.STUDENT, list, { ownId: 'S-1' });
    assert.equal(JSON.stringify(list), snapshot);
  });

  it('withholds everything for a parent with no linkage at all', () => {
    const outcome = selectVisibleResults(Role.PARENT, [result(ResultStage.PUBLISHED)], {});
    assert.deepEqual([...outcome.visible], []);
    assert.equal(outcome.withheldCount, 1);
  });
});

describe('H-O-01/H-O-03 — mark validation and chart safety', () => {
  it('accepts the shapes the references display', () => {
    assert.equal(validateMark({ score: 18, max: 20 }).valid, true);
    assert.equal(validateMark({ score: 88, max: 100 }).value.percent, 88);
    assert.equal(validateMark({ score: '18', max: '20' }).valid, true);
  });

  it('rejects a score above its maximum, below zero, and junk', () => {
    assert.equal(validateMark({ score: 21, max: 20 }).reason, MarkReject.EXCEEDS_MAX);
    assert.equal(validateMark({ score: -1, max: 20 }).reason, MarkReject.NEGATIVE);
    assert.equal(validateMark({ score: 5, max: 0 }).reason, MarkReject.ZERO_MAX);
    for (const value of ['', 'abc', null, undefined, NaN, Infinity, {}]) {
      assert.equal(validateMark({ score: value, max: 20 }).reason, MarkReject.NOT_A_NUMBER, String(value));
    }
  });

  it('clamps the chart width to the bar geometry', () => {
    assert.equal(progressWidth({ score: 88, max: 100 }), 88);
    assert.equal(progressWidth({ score: 18, max: 20 }), 90);
    assert.equal(progressWidth({ score: 0, max: 20 }), 0);
    assert.equal(progressWidth({ score: 20, max: 20 }), 100);
    assert.equal(progressWidth({ score: 999, max: 20 }), null, 'an invalid mark yields no width');
    for (const width of [0, 45, 90, 100]) {
      assert.ok(width >= 0 && width <= 100, String(width));
    }
  });

  it('refuses to invent a grade band', () => {
    for (const mark of [{ score: 88, max: 100 }, { score: 18, max: 20 }]) {
      assert.deepEqual({ ...gradeFor(mark) }, { known: false, grade: null, reason: MarkReject.UNKNOWN_GRADE_BAND });
    }
  });

  it('formats the existing score and percent shapes', () => {
    assert.equal(formatMarkScore({ score: 18, max: 20 }), '18 / 20');
    assert.equal(formatMarkPercent({ score: 88, max: 100 }), '88.0%');
    assert.equal(formatMarkScore({ score: 21, max: 20 }), '—');
  });

  it('builds subject rows and nulls an invalid row rather than fabricating', () => {
    const rows = buildResultRows([
      { subjectLabel: 'Mathematics', score: 88, max: 100 },
      { subjectLabel: 'Science', score: 999, max: 100 },
    ]);
    assert.equal(rows[0].valid, true);
    assert.equal(rows[0].text, '88 / 100');
    assert.equal(rows[0].grade, null);
    assert.equal(rows[1].valid, false);
    assert.equal(rows[1].text, null);
    assert.equal(rows[1].width, null);
    assert.equal(Object.isFrozen(rows), true);
  });

  it('aggregates only validated rows', () => {
    const set = { stage: ResultStage.PUBLISHED, rows: [{ score: 80, max: 100 }, { score: 60, max: 100 }, { score: 5, max: 0 }] };
    const aggregate = aggregateResult(set, Role.SCHOOL_ADMIN);
    assert.equal(aggregate.permitted, true);
    assert.equal(aggregate.total, 2);
    assert.equal(aggregate.average, 70);
    assert.equal(aggregate.percentText, '70.0%');
  });
});

describe('H-O-04 — pending / unpublished / no-result (structure only)', () => {
  it('reports a draft as pending for a permitted role', () => {
    const state = resultSetState({ stage: ResultStage.DRAFT, rows: [{ score: 1, max: 10 }] }, Role.TEACHER);
    assert.equal(state.viewable, true);
    assert.equal(state.isPending, true);
    assert.equal(state.isEmpty, false);
  });

  it('reports an unpublished set as not viewable for a parent', () => {
    const state = resultSetState({ stage: ResultStage.IN_REVIEW, rows: [] }, Role.PARENT, { linkedIds: ['S-1'] });
    assert.equal(state.viewable, false);
    assert.equal(state.reason, LifecycleReject.NOT_PUBLISHED);
    assert.equal(state.rowCount, 0, 'a withheld set must expose no rows');
  });

  it('reports an empty published set as empty but viewable', () => {
    const state = resultSetState({ stage: ResultStage.PUBLISHED, rows: [] }, Role.PARENT, { linkedIds: ['S-1'] });
    assert.equal(state.viewable, true);
    assert.equal(state.isEmpty, true);
    assert.equal(state.isPending, false);
  });

  it('reports a missing set as no-result', () => {
    assert.equal(resultSetState(null, Role.PARENT, { linkedIds: ['S-1'] }).reason, 'no-result');
    assert.equal(resultSetState({ rows: [] }, Role.PARENT, { linkedIds: ['S-1'] }).reason, 'no-result');
  });

  it('withholds the aggregate for an unviewable set', () => {
    const aggregate = aggregateResult({ stage: ResultStage.DRAFT, rows: [{ score: 10, max: 10 }] }, Role.PARENT, { linkedIds: ['S-1'] });
    assert.equal(aggregate.permitted, false);
    assert.equal(aggregate.percentText, null, 'a withheld aggregate must not read as a value');
  });

  it('emits no display copy at all', () => {
    const state = resultSetState({ stage: ResultStage.PUBLISHED, rows: [] }, Role.PARENT, { linkedIds: ['S-1'] });
    for (const value of Object.values(state)) {
      if (typeof value === 'string') assert.equal(value.length > 0 && !/[A-Z]/.test(value), false);
    }
  });
});

describe('H-O-02/H-O-03 — binding contract', () => {
  it('passes the drift guard', () => {
    assert.equal(assertAssessmentBindingsMatchReferences(REFERENCES), true);
  });

  it('never authorises creating UI', () => {
    assert.equal(assertNoAssessmentElementCreation(), true);
    for (const binding of ASSESSMENT_BINDINGS) {
      assert.notEqual(binding.kind, 'creates-element');
    }
  });

  it('marks every element unpublished and blocks the three actions', () => {
    for (const binding of ASSESSMENT_BINDINGS) {
      assert.equal(binding.state, 'unpublished', binding.id);
      assert.equal(binding.field, null, binding.id);
    }
    assert.deepEqual(
      ASSESSMENT_BINDINGS.filter((b) => b.kind === 'blocked-no-approved-hook').map((b) => b.id),
      ['HAB-B05', 'HAB-B11'],
    );
  });

  it('records the chart as the existing .prog bar only', () => {
    assert.match(ASSESSMENT_BINDINGS.find((b) => b.id === 'HAB-B09').note, /No chart library/);
  });
});

describe('no invented assessment contract', () => {
  it('confirms nothing is authorized', () => {
    assert.equal(ASSESSMENT_INTEGRATION_AUTHORIZED, false);
    assert.equal(describeAssessmentBlock().schemaPublished, false);
    assert.equal(describeAssessmentBlock().endpointsPublished, false);
  });

  it('covers every Batch H capability', () => {
    assert.deepEqual(
      PENDING_ASSESSMENT_CONTRACTS.map((c) => c.id).sort(),
      ['assessment-read', 'grading-policy', 'mark-entry', 'published-result-read', 'result-export-protection', 'review-and-publish'],
    );
  });

  it('declares no endpoint or payload and fails closed otherwise', () => {
    assert.equal(assertNoInventedAssessmentSchemas(), true);
    const base = {
      id: 'review-and-publish',
      status: 'blocked-needs-provisioning-path',
      method: null,
      path: null,
      requestSchema: null,
      responseSchema: null,
      implemented: false,
    };
    assert.throws(() => assertNoInventedAssessmentSchemas([{ ...base, path: '/results/publish' }]));
    assert.throws(() => assertNoInventedAssessmentSchemas([{ ...base, method: 'POST' }]));
    assert.throws(() => assertNoInventedAssessmentSchemas([{ ...base, implemented: true }]));
    assert.doesNotThrow(() => assertNoInventedAssessmentSchemas([base]));
  });

  it('records that the server, not the client, is the real guarantee', () => {
    assert.match(
      findPendingAssessmentContract('published-result-read').blocker,
      /second line of defence/,
    );
  });
});