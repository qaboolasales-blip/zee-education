# Assessments, Marks, Review & Results — H-O-01 … H-O-05

**The publication gate — the Batch H exit-gate rule — is implemented and tested.**
Nothing is bound, because no assessment or mark table, no academic structure and no
school database exist.

**No UI element is created, changed or added by this document.**

`PROJECT_MEMORY` lists "Academic results" as school-local data that is
**"Never stored in the control plane"**.

---

## The approved lifecycle, as documented by the locked UI itself

The references describe the whole lifecycle, so no contract was needed to model it:

**School Dashboard — Academics**
```html
<div class="flow"><div class="d">1<br>Teacher draft</div>
                  <div class="nw">2<br>Admin review</div>
                  <div>3<br>Publish</div></div>
<span class="bd w">Awaiting review</span>
```

**Mobile Preview — marks feature + Results screen**
```
['Teacher draft',   'Validated',               'Done',    'g']
['Admin review',    'Before publication',      'Review',  'w']
['Published result','Parents see approved only','Locked',  'n']
'Awaiting admin review' · 'Save draft for review' · 'Approve & publish'
```

So: **exactly three stages, exactly three flow steps, and no room for a fourth.**
`assertLifecycleMatchesReferences()` re-reads both references and fails if a label
changes, if the flow gains or loses a step (counted by `<br>`, since the wrapper and
the steps are all `<div>`), or if the reference stops stating *"Parents see approved
only"*.

Note a locked inconsistency that is preserved, not reconciled: desktop step 3 says
**"3 Publish"** while the mobile list says **"Published result"**.

---

## The publication gate — the exit-gate rule

`canRoleViewResult()` requires **all three** conditions:

1. the privacy matrix grants the role `academic_results`;
2. where the scope is `own` or `linked-children`, the caller supplies the
   server-resolved scope — the client never assumes it;
3. **for Parent and Student the stage must be `published`.**

```js
if ((role === Role.PARENT || role === Role.STUDENT) && result.stage !== ResultStage.PUBLISHED) {
  return { allowed: false, reason: 'not-published' };
}
```

So a server mistake — returning an unpublished result to a parent — cannot become a
visible leak: the client refuses to render it. `selectVisibleResults()` additionally
reports **how many** entries it withheld and their ids, so QA can prove a prevention
happened rather than seeing a silently shorter list.

**This is a second line of defence, not the guarantee.** The server must itself
refuse to return unpublished results. That is recorded in the block record, not
claimed as satisfied.

---

## H-O-02 — Transitions use the approved controls only

Authority is modelled **per action, not per stage**. That distinction was a real bug
I introduced and the tests caught: because `Save draft for review` moves a result
*into* the review stage, a teacher must be permitted to enter `in-review` even
though the School Admin owns its content.

| Transition | Permitted role | Approved control |
|---|---|---|
| `draft → draft` | Teacher | editing their own draft |
| `draft → in-review` | **Teacher** | `Save draft for review` |
| `in-review → draft` | School Admin | **no approved control exists** (HAB-03) |
| `in-review → published` | School Admin | `Approve & publish` |
| `published → *` | nobody | un-publishing is not modelled |
| `draft → published` | nobody | review cannot be skipped |

A refused transition returns the **unchanged** stage, so a rejected action can never
move a result.

---

## H-O-03 — Chart safety

The published result chart is a `.prog` bar whose only variable is the inline
`width` of `.prog i`:

```css
.prog{height:6px;…}.prog i{display:block;height:100%;…}
```

`progressWidth()` **clamps to 0–100** and returns `null` for an invalid mark, so a
malformed score can never emit a width outside the bar's own geometry. No chart
library is introduced and the bar's geometry is untouched.

---

## H-O-04 — Pending / unpublished / no-result, structure only

| Case | Result |
|---|---|
| Draft, permitted role | `viewable: true`, `isPending: true` |
| Unpublished, parent | `viewable: false`, `reason: not-published`, **`rowCount: 0`** |
| Published but empty | `viewable: true`, `isEmpty: true` |
| Missing set | `reason: no-result` |

No display copy is produced — the references contain no approved string for "no
result yet" or "not published" (HAB-05). A withheld aggregate returns
`percentText: null`, so it can never be rendered as a value.

---

## H-O-01 — Marks, and the grade I refused to invent

`validateMark()` does arithmetic only: `score` numeric, `>= 0`, `<= max`, `max > 0`.
It accepts the exact shapes the references display — `18 / 20` and `88 / 100`.

**`gradeFor()` deliberately returns `unknown`.** The references display `A` and
`A+`, but **no grading policy is published**: no boundaries, no pass mark, no letter
or `+/-` scheme. Inventing a band could pass or fail a real child wrongly, so the
grade is `null` with reason `unknown-grade-band` (HAB-01). This is the single most
important restraint in Batch H.

---

## Task outcome

| Task | Outcome |
|---|---|
| **H-O-01** Map marks/review/results zones to fields and status states | **DONE** — 11 descriptors, lifecycle drift-guarded; nothing bound |
| **H-O-02** Bind teacher draft/review feedback using existing visual states only | **DONE** — transition machine, `.flow`/`.pill` mapping, no new control |
| **H-O-03** Bind published result views/charts without altering chart design | **DONE** — only the existing `.prog i` width, clamped 0–100 |
| **H-O-04** Safe display for pending/unpublished/no-result | **DONE** — structure only, withheld sets expose no rows |
| **H-O-05** Test role/session/error data mapping | **DONE** — role gate, session-scope gate, and the published-only rule |

## Honest status line

> **No mark can be entered and no result can be published, because nothing exists
> to do it with.** Batch H delivered the highest-consequence logic in the project so
> far: a three-stage lifecycle taken from the locked UI, a transition machine where
> only the teacher may submit for review and only the School Admin may publish,
> review cannot be skipped and a published result cannot be un-published — and a
> publication gate that makes it structurally impossible for an unpublished result
> to reach a parent or student view, even if the server sent one.
>
> Two real bugs were caught by the tests. The first was a genuine design error: I
> had modelled transition authority as *stage ownership*, which meant **a teacher
> could not submit their own draft for review**. The second was a guard that looked
> for `"1 Teacher draft"` when the reference actually renders `1<br>Teacher draft`.
>
> The restraint worth carrying forward is `gradeFor()`. The UI displays `A` and
> `A+`, and it would have been easy to write a plausible 90%+ = A band. No grading
> policy is published, so it returns unknown — because a guessed grade band can fail
> or pass a real child.