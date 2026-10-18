# Opencode Status

- **Status:** Batch Aâ€“H complete within what KiloCode has published. **Batch I delivered its highest-consequence logic in full â€” the V1 no-gateway guarantee is implemented and tested**, so no payment gateway, checkout, card or tokenisation surface can exist anywhere in `core/`. Money formatting, the 18-binding fee contract, role-scoped ledger states and the manual-payment refusals are delivered. Nothing is bound: no fee table, no endpoint, no school database. **Discounts and fines are not modelled at all** â€” `discount|fine|waiver` returns zero matches across all three references, so there is no approved surface (IB-01). Stopped at the batch boundary per `OPENCODE_ALL_BATCHES.md`.
- **Completed task IDs:**
  - Batch A: O-00.1â€“O-00.3, O-01.1â€“O-01.4, O-02.1â€“O-02.4 (all 11)
  - Batch B: B-O-01, B-O-04, B-O-05, B-O-06 | **B-O-02, B-O-03 BLOCKED** â€” no auth endpoint/scheme/payload
  - Batch C: C-O-01, C-O-02, C-O-05, C-O-06 | **C-O-03, C-O-04 BLOCKED** â€” no QR payload contract, no registry/provisioning endpoint
  - Batch D: D-O-01â€“D-O-05 | D-O-05 partial â€” duplicate + permission-denied untestable (no 409, no auth contract)
  - Batch E: E-O-01, E-O-02, E-O-03, E-O-05 | E-O-04 delivered for 6 of 7 cases; forbidden documented as blocked
  - Batch F: F-O-01 â€“ F-O-05 (all five delivered as pure logic)
  - Batch G: **G-O-02, G-O-05 COMPLETE and enforced**; G-O-01, G-O-03, G-O-04 as models and policies
  - Batch H: **H-O-01 â€“ H-O-05 all delivered** â€” publication gate enforced, no grade invented
  - Batch I: **I-O-01 â€“ I-O-05 all delivered** â€” I-O-05 (no gateway UI/checkout) **complete and enforced**; nothing bound, no fee schema
- **Batch J onward:** not started
- **Operating rule (owner, 2026-10-18):** *don't ask me for every task; ask only where you genuinely need me.* `frontend/docs/decision-policy.md`.
- **Rule scope (owner decision, 2026-10-18):** frontend only â€” no shared-governance file edited.
- **Next task:** see *Next safe microtask* at the end of this file

---

## Headline correction from the Batch A report

Batch A reported **"no backend API contract exists."** That was true when written
and is **no longer true**.

| | Batch A (2026-10-17) | Now (2026-10-18) |
|---|---|---|
| `backend/docs/` | did not exist | **exists** |
| `backend/docs/api/openapi-v0.md` | did not exist | **exists â€” 2932 bytes, v0.1.0, "DRAFT â€” Batch A baseline"** |
| Published endpoints | none | `GET /health`, `GET /setup` |
| Published auth endpoints | none | **none** |

I found this at the start of Batch B by re-checking rather than trusting my own
earlier report. The contract registry, the docs and the tests were all updated to
match reality. Nothing in `backend/**` was modified by me.

---

## Changed files

All writes are inside `frontend/**`, plus this status file. No reference/UI file,
`backend/**`, `quality/**`, `ops/**`, shared file or root config was touched.
No git commit: the workspace root is not a git repository
(`git rev-parse --is-inside-work-tree` â†’ `fatal: not a git repository`).

### Batch A (unchanged this run)

`frontend/package.json`, `frontend/README.md`, `core/api/{client,config,errors,index}.js`,
`core/format/{money,datetime,empty,index}.js`, `test/{config,errors,client,contracts,money,datetime,empty}.test.js`,
`docs/{reference-ui-audit,ui-binding-map,ui-lock-test-plan,backend-contract-dependency}.md`,
`tools/{reference-ui.lock.json,verify-reference-ui.mjs}`

### Batch B â€” new

| Path | Task | Purpose |
|---|---|---|
| `frontend/core/auth/screen-registry.js` | B-O-04 | Frozen allow-list of screens that already exist in the locked references, with provenance |
| `frontend/core/auth/role-guard.js` | B-O-04 | Default-deny role â†’ approved-screen selector; never widens the reference `TL` map |
| `frontend/core/auth/session-state.js` | B-O-05 | Storage-free session state model: anonymous / authenticated / expired / unauthenticated / forbidden / transport-error / unknown |
| `frontend/core/auth/index.js` | B-O-04/05 | Public surface |
| `frontend/core/auth/contracts/pending-auth-contract.js` | B-O-01, B-O-03 | Auth block record; 5 capabilities, every schema pinned `null`; transcribes the published policy and 401/403 semantics |
| `frontend/test/role-guard.test.js` | B-O-04 | Default deny, role scoping, Super Admin isolation, immutability |
| `frontend/test/session-state.test.js` | B-O-05 | no-session, expired, forbidden, logout, transport, default-deny; no-layout and no-storage guards |
| `frontend/test/auth-contract-gate.test.js` | B-O-01/02/03 | Contract-state assertions + source scan proving no storage, no token, no auth header, no auto-retry |
| `frontend/test/helpers/source-scan.js` | B-O-02 | Comment-stripping scanner so the compliance guard inspects code, not prose |
| `frontend/docs/auth-contract-review.md` | B-O-01 | Full contract read + hook-by-hook comparison |
| `frontend/docs/auth-ui-blockers.md` | B-O-06 | 9 blockers recorded instead of new UI |

### Batch C â€” new

| Path | Task | Purpose |
|---|---|---|
| `frontend/core/provisioning/control-plane-schema.js` | C-O-01 | Frozen transcription of KiloCode's 4 published tables: columns, types, nullability, defaults, enums, FKs â€” with `assertSchemaMatchesMigrations()` drift guard |
| `frontend/core/provisioning/selectors.js` | C-O-05 | Validators/selectors over published values only: school domain, all 4 enums, `is_primary`, `attempts`, client-payload allow-list, job classification, error normalization |
| `frontend/core/provisioning/index.js` | C-O-01/05 | Public surface |
| `frontend/core/provisioning/contracts/pending-provisioning-contract.js` | C-O-03, C-O-04 | Block record for 5 capabilities, every schema pinned `null` |
| `frontend/test/provisioning-schema.test.js` | C-O-01 | Asserts the transcription against KiloCode's migration files on every run |
| `frontend/test/provisioning-selectors.test.js` | C-O-05 | Synthetic payloads: malformed domains, unknown enums, forbidden fields, failed jobs, published vs unpublished statuses |
| `frontend/test/provisioning-gate.test.js` | C-O-03/04 | Fails if a QR decoder, signature verification, crypto usage or provisioning call appears |
| `frontend/docs/provisioning-ui-map.md` | C-O-01, C-O-02 | 14 Super Admin elements + 10 school-connection elements mapped to published fields |
| `frontend/docs/provisioning-ui-blockers.md` | C-O-06 | 9 blockers recorded instead of new UI |

### Batch D â€” new

| Path | Task | Purpose |
|---|---|---|
| `frontend/core/settings/theme-tokens.js` | D-O-03 | The only 8 approved swatches per surface + the only 2 themable tokens; `assertThemesMatchReferences()` re-reads all three references |
| `frontend/core/settings/school-settings.js` | D-O-04 | Settings adapter over published columns: defaults, writable-field allow-list, timezone/currency/locale/name validation, availability classification |
| `frontend/core/settings/element-bindings.js` | D-O-02 | Binding contract: 15 approved elements â†’ exact hook kind and field; `assertNoElementCreation()` + `assertBindingsMatchReference()` |
| `frontend/core/settings/index.js` | D-O-02/03/04 | Public surface |
| `frontend/core/settings/contracts/pending-settings-contract.js` | D-O-02/04/05 | 6 capabilities blocked, every schema `null`; 12 missing academic entities enumerated |
| `frontend/test/theme-tokens.test.js` | D-O-03 | Palette fidelity + drift guard over all three references |
| `frontend/test/school-settings.test.js` | D-O-01/02/04/05 | Validation, defaults, availability, binding contract, no-invented-contract |
| `frontend/docs/school-settings-academic-map.md` | D-O-01, D-O-02 | 15 settings/academic elements mapped to published columns |
| `frontend/docs/school-settings-blockers.md` | D-O-06 | 8 blockers recorded instead of new UI |

### Batch E â€” new

| Path | Task | Purpose |
|---|---|---|
| `frontend/core/people/privacy-policy.js` | E-O-02 | Role Ã— category Ã— scope matrix from PROJECT_MEMORY + the approved `TL` tool lists. Super Admin gets nothing; default deny |
| `frontend/core/people/selectors.js` | E-O-02 | Redacting selectors, parent-linkage and own-record guards, structured (copy-free) count/status/media descriptors |
| `frontend/core/people/role-landing.js` | E-O-05 | Landing tab resolution restricted to the 5 approved tabs + pre-auth `Connect`, with `assertLandingsAreApproved()` |
| `frontend/core/people/element-bindings.js` | E-O-03 | 17 approved people elements â†’ hook kind and field; element-creation and reference-drift guards |
| `frontend/core/people/contracts/pending-people-contract.js` | E-O-03 | 6 capabilities blocked, every schema `null`; 7 missing entities enumerated |
| `frontend/core/people/index.js` | E-O-02/03/05 | Public surface |
| `frontend/test/people-privacy.test.js` | E-O-01â€“E-O-05 | Privacy matrix, redaction, zero/one/many, inactive, missing photo/contact, forbidden, landing, bindings, no-invented-contract |
| `frontend/docs/people-ui-map.md` | E-O-01, E-O-02 | 17 elements mapped + the privacy policy explained |
| `frontend/docs/people-blockers.md` | E-O-06 | 9 blockers recorded instead of new UI |

### Batch F â€” new

| Path | Task | Purpose |
|---|---|---|
| `frontend/core/attendance/status-model.js` | F-O-01 | Present/Absent/Leave bound to the exact approved letters and `.on.P/.A/.L` selectors; surface-aware; reference-drift-guarded |
| `frontend/core/attendance/submission.js` | F-O-03 | Pure state machine: reversible optimistic marks, deterministic idempotency keys, duplicate refusal, correction allowance, offline vs rejected, unpublished-code refusal |
| `frontend/core/attendance/summary.js` | F-O-04 | Role-safe summaries driven by the Batch E privacy matrix; structure only, no copy |
| `frontend/core/attendance/element-bindings.js` | F-O-02 | 13 approved attendance elements â†’ hook kind and field; element-creation and reference-drift guards |
| `frontend/core/attendance/contracts/pending-attendance-contract.js` | F-O-02/03 | 5 capabilities blocked, every schema `null`; 3 missing entities |
| `frontend/core/attendance/index.js` | F-O-01â€¦F-O-05 | Public surface |
| `frontend/test/attendance.test.js` | F-O-01â€¦F-O-05 | Status drift, binding drift, optimistic rollback, empty roster, no assignment, duplicates, offline, unpublished codes, role-safe summaries |
| `frontend/docs/attendance-map.md` | F-O-01â€¦F-O-05 | Attendance mapping + behaviour rationale |
| `frontend/docs/attendance-blockers.md` | F-O-06 | 8 blockers recorded instead of new UI |

### Batch G â€” new

| Path | Task | Purpose |
|---|---|---|
| `frontend/core/curriculum/subject-model.js` | G-O-01 | The 4 approved subjects with exact accents/labels and locked periods/weekdays; emits only `{--c}`; reference-drift-guarded |
| `frontend/core/curriculum/timetable.js` | G-O-01, G-O-04 | Fixed 5-weekday grid, dedup, blank cells, "no timetable" state; homework and notice classification; audience rules requiring server-resolved scope |
| `frontend/core/curriculum/share-boundary.js` | G-O-03, G-O-05 | Manual V1 share boundary: 4 approved triggers, user-initiation mandatory, **any** destination refused, PDF only, empty-document detection; `assertNoUnofficialAutomation()` |
| `frontend/core/curriculum/element-bindings.js` | G-O-01, G-O-02 | 12 approved curriculum hooks + `APPROVED_NAVIGATION` and a navigation policy that refuses every change |
| `frontend/core/curriculum/contracts/pending-curriculum-contract.js` | G-O-01, G-O-03 | 5 capabilities blocked, every schema `null`; 4 missing entities |
| `frontend/core/curriculum/index.js` | G-O-01â€¦G-O-05 | Public surface |
| `frontend/test/curriculum.test.js` | G-O-01â€¦G-O-05 | Subject drift, timetable states, homework/notice classification, audience scoping, share boundary, PDF outcomes, whole-tree automation scan, navigation immutability |
| `frontend/docs/curriculum-map.md` | G-O-01â€¦G-O-05 | Curriculum mapping + boundary rationale |
| `frontend/docs/curriculum-blockers.md` | G-O-06 | 8 blockers recorded instead of new UI |

### Batch H â€” new

| Path | Task | Purpose |
|---|---|---|
| `frontend/core/assessment/lifecycle.js` | H-O-01, H-O-02, H-O-04 | 3-stage lifecycle transcribed from the locked UI, `.flow`/`.pill` mapping, per-action transition authority, and `canRoleViewResult()` â€” **the publication gate** |
| `frontend/core/assessment/marks.js` | H-O-01, H-O-03, H-O-04 | Arithmetic-only mark validation, `.prog i` width clamped 0â€“100, `gradeFor()` that refuses to invent a band, pending/unpublished/empty states |
| `frontend/core/assessment/element-bindings.js` | H-O-01, H-O-02, H-O-03 | 11 approved marks/review/results hooks; element-creation and reference-drift guards |
| `frontend/core/assessment/contracts/pending-assessment-contract.js` | H-O-01 | 6 capabilities blocked, every schema `null`; 5 missing entities incl. `grading_policy` |
| `frontend/core/assessment/index.js` | H-O-01â€¦H-O-05 | Public surface |
| `frontend/test/assessment.test.js` | H-O-01â€¦H-O-05 | Lifecycle drift, transitions, publication gate, scope gate, mark validation, chart clamping, pending/empty states |
| `frontend/docs/assessment-map.md` | H-O-01â€¦H-O-05 | Lifecycle + publication gate rationale |
| `frontend/docs/assessment-blockers.md` | H-O-06 | 8 blockers recorded instead of new UI |

### Batch I â€” new

| Path | Task | Purpose |
|---|---|---|
| `frontend/core/fees/money-contract.js` | I-O-02 | PKR shapes delegating to Batch A formatters, the locked strings, 4 displayable vs 2 writable modes, manual-payment validation requiring a reference for **every** mode |
| `frontend/core/fees/ledger.js` | I-O-01, I-O-04 | Invoice normalisation, the two locked badges, role-scoped summary (`null` not `0` when denied), `no-fee`/`partial`/`overdue`/`settled` states, and `recordManualPayment()` â€” the only path to `Paid` |
| `frontend/core/fees/payment-boundary.js` | I-O-05 | **The no-gateway guarantee.** `assertNoPaymentGateway()` (gateway/card/token/checkout names), `assertNoNetworkCalls()` (transport primitives + absolute URL, **no exemption**), `stripCommentsAndLiterals()`, and a guard on the locked "online payment is out of V1" copy |
| `frontend/core/fees/element-bindings.js` | I-O-01, I-O-03 | 18 approved fee/receipt hooks (`IFB-01`â€¦`IFB-18`), all `state: 'unpublished'`, `field: null`; element-creation and reference-drift guards |
| `frontend/core/fees/contracts/pending-fee-contract.js` | I-O-01 | 5 capabilities blocked, every schema `null`; 5 missing entities incl. `fee_discounts`/`fee_fines` |
| `frontend/core/fees/index.js` | I-O-01â€¦I-O-05 | Public surface |
| `frontend/test/fees.test.js` | I-O-01â€¦I-O-05 | 56 tests: locked strings, casing divergence, invoice normalisation, role scope, summary arithmetic, partial/overdue/no-fee, every payment refusal, whole-tree gateway + network scans, binding contract, fail-closed registry |
| `frontend/docs/fees-map.md` | I-O-01â€¦I-O-05 | Fee/receipt elements, money rules, ledger states, refusals, no-gateway enforcement |
| `frontend/docs/fees-blockers.md` | I-O-06 | 9 blockers recorded instead of new UI |

### Batch B â€” corrected from Batch A

| Path | Change |
|---|---|
| `core/api/contracts/pending-contracts.js` | `/health` now **published and modelled** from the contract; `/setup` confirmed non-JSON; error-status table and future conventions transcribed; `assertHealthSchemaMatchesContract()` added |
| `test/contracts.test.js` | Rewritten: asserts the transcription against the contract document so it cannot drift |
| `frontend/README.md` | Batch B section, contract state, two traps (contract Base URL must not enter browser code; `#roles` must never be bound) |

---

## Commands run and exact results

Environment: Windows / PowerShell 5.1, Node `v24.17.0`, npm `12.0.2`, PHP 8.3.33.
Working directory: `frontend/`.

| Command | Result |
|---|---|
| `npm run test:ui-lock` | `UI LOCK OK â€” 3/3 reference files unchanged.` â€” **exit 0** |
| `npm test` | **tests 675, suites 154, pass 675, fail 0, skipped 0, todo 0** â€” **exit 0** |
| `npm run check` | both gates green, **exit 0** |
| `backend/docs/api/openapi-v0.md` mtime | unchanged since Batch B â€” still only `/health` + `/setup` |
| `backend/app/Config/Routes.php` route paths | exactly `health`, `setup`, `/` |
| `backend/app/Models` | `.gitkeep` only |
| `backend/app/Database/Migrations` | still 4 tables â€” **no fee, invoice or receipt table added** |
| `discount\|fine\|waiver` across all three references | **0 matches** â€” no approved discounts/fines surface exists (IB-01) |
| Visual assets in `frontend/` | **0** |

### Real bugs found and fixed by the tests

**Batch A â€” 22 defects.** Notably: `ApiError.kind` always collapsing to `network`;
a missing `http` safe-message entry; `buildApiUrl('')` throwing on the normalized
empty base path; `resolveFetchImpl` not failing closed; `formatPkrCompact`
rendering `PKR 296.0k`; `formatPercent` rendering `93.0%` where the locked copy
shows `92%`.

**Batch B â€” 13 defects.** Notably: a **malformed session value mapped to
`anonymous`**, which would have let a programming error reach the pre-auth screen;
a **role-less session counting as `AUTHENTICATED`**; the compliance scan matching
its own prose; and the scan being self-defeating because the guard files must name
the credentials they forbid.

**Batch D â€” 7 defects.** Two were guards that were wrong about the references, and the tests caught them:
1. **The theme guard assumed `--side` exists in all three references.** It does not â€” the Mobile App Preview has no sidebar, so no `--side` token. The guard now rejects theming of protected tokens *where declared* instead of requiring them to exist.
2. **The theme guard assumed `function setTheme(a, b)` in all three.** The mobile preview themes from `data-a`/`data-b` on its own buttons. Replaced with a stronger, mechanism-agnostic rule: every `setProperty('â€¦')` call in any reference must target exactly `--brand` or `--brand2`.
3. `settingText(42)` rendered `'42'`. All settings columns are VARCHAR, so a non-string is now the empty marker â€” same class of bug as Batch C's `schoolNameFor`, now a rule across both modules.
4. A PowerShell round-trip **corrupted the em dash** in a reference filename into mojibake, breaking the file. Repaired, and tests now resolve references by an ASCII fragment so it cannot recur.
5. DB-11's `cssHook` was a human phrase, not a real selector, so the binding drift guard failed on it. Fixed to a real selector.
6â€“7. Two wrong test expectations of mine: `zh-Hant-TW` is 10 chars but `schools.locale` is VARCHAR(8), and `en-PAK` is format-valid. The code was right; the tests were corrected and the format-only rationale documented.

**Batch E â€” 7 defects.** Four were wrong assumptions about the references, again caught by the tests:
1. **Assumed the Super Admin reference contains no learner words.** It does â€” `Student/staff records` and `Attendance, marks, results` appear as *plan-catalogue feature descriptions*. Rewrote the assertion to check for learner **records** (no `ST-2026-`, `EMP-2026`, guardian/student names, `class="act"`) and to assert its one `.pe` cell is a **school** via `schoolsRows()`.
2. **Assumed `.pe` does not exist in the platform reference.** It does â€” for school identity, not people. Now asserted positively.
3. **Assumed the platform has no `<table>`.** It has the school installations table, whose columns are commercial. Replaced with a check on its actual column list.
4. **`.act` used as a substring guard matched unrelated text.** Replaced with the specific `class="act"`.
5. A test asserted Parent's fee records were redacted â€” Parent legitimately has `linked-children` fee scope. The test was wrong; corrected, and the `Teacher` case added to prove fee redaction.
6. `assert.equal(a,b) || c` threw instead of testing a type union (`assert.equal` raises on mismatch rather than returning false). Replaced with `assert.ok`.
7. `PB-08`'s cssHook `.tool select` does not exist in the School Dashboard (that rule is Super Admin's; the dashboard styles the select via `select,.in` and an inline width). Fixed to `.tool{`.
8. One **genuine security property** surfaced while fixing the above: an unrecognised key in a payload was being passed through untouched. Now every non-category key is redacted, with a test asserting `salary`/`cnic`/`bank_account` cannot leak even for School Admin.

**Batch F â€” 5 defects. Two were genuine logic bugs in my own code, caught before delivery:**
1. **`settleSubmit()` treated a `200` success as an unpublished status code.** The published error table lists only failure codes, so the "is this a published code?" guard ran *before* the success check and turned every success into `failed-transport`. Success is now checked first.
2. **The duplicate guard blocked genuine corrections.** It refused if *any* mark key had been sent, so fixing one student after a submit was impossible. Now a duplicate means *every* key has already been sent â€” a no-op resubmission â€” while a real correction is permitted (FAT-05).
3. `canSubmit()` allowed a partially marked register. Now refused as `incomplete`: with no submit contract, a naive server would record unmarked students as **absent**, and silent wrong attendance is the worst possible default (FAT-04).
4. A partially-marked test expected `incomplete` while the code returned `allowed` â€” code was wrong, not the test.
5. A `for (const register of [â€¦])` shadowed an outer `let register`, causing a TDZ `ReferenceError`. Renamed.

**Batch G â€” 3 defects. One was a repeat of a pattern I had already fixed in Batch B, which is worth noting:**
1. **The G-O-05 guard flagged its own denylist.** `share-boundary.js` must name WhatsApp, Twilio and Vonage in order to forbid them, and it embeds the regex patterns themselves. This is the *same* self-defeating-guard problem I hit in Batch B with credential denylists, so the lesson did not carry over. Fixed with a documented suffix-matched exemption for the two declaration modules â€” and critically, the **absolute-URL ban still applies to those files**, unlike Batch B where the storage ban also stayed absolute.
2. The exemption initially used an exact path (`core\\curriculum\\â€¦`) while the test passed `frontend\\core\\curriculum\\â€¦`, so it never matched. Now suffix-matched, so no path form can defeat it.
3. **My test premise was wrong about timezones.** I asserted homework must classify differently under Asia/Karachi than UTC. But a delta between two *instants* is timezone-independent by construction, so no such bug is possible. Corrected the test to pin the exact minute delta and to assert the Asia/Karachi midnight-boundary case properly, and removed the misleading claim from the report.
4. A navigation test asserted the "fixed by UI lock" reason for entries that were never approved for that surface (`Timetable` on mobile). Split into two tests: approved entries always refuse with the lock reason; foreign entries refuse as not-approved.

**Batch H â€” 5 defects. The first was a genuine design error with a real-world consequence:**
1. **I modelled transition authority as stage ownership.** Because `Save draft for review` moves a result *into* the review stage, and I had assigned the review stage to School Admin, **a teacher could not submit their own draft for review at all** â€” the primary teacher workflow was impossible. Replaced with per-`(from, to)` transition authority: the teacher may `draft â†’ in-review`, only School Admin may `in-review â†’ published` or `in-review â†’ draft`, and a teacher may still edit `draft â†’ draft`.
2. The lifecycle drift guard looked for `"1 Teacher draft"` when the reference actually renders `<div class="d">1<br>Teacher draft</div>` â€” number and label are separated by a `<br>`. Fixed to check the real markup.
3. Step-counting used `<div>` occurrences, which over-counted because the flow wrapper is also a `<div>` (reported 4 steps for a 3-step flow). Now counts `<br>`, one per step.
4. Desktop step 3 reads **"3 Publish"** while mobile reads **"Published result"** â€” two locked labels for one stage. Recorded both rather than unifying them, since unifying would change visible text.
5. Two test errors of mine: `'published'` was listed as an invalid stage (it is `ResultStage.PUBLISHED`), and `roleMayEnterStage` had a confusing default argument that made a bare call return the wrong answer â€” the signature now requires an explicit source stage.

**Batch I â€” 6 defects, two of them genuine accounting-integrity bugs:**
1. **A part payment silently settled the invoice.** `recordManualPayment()` marked any invoice `Paid` and painted it `.bd.g` for a payment of *any* amount up to the invoice total. Since only `Paid` and `Due` badges exist, a payment below the total would leave money genuinely outstanding while being recorded as settled and shown to the parent in green. Now refused as `PARTIAL_NOT_SETTLED` (IB-07). This is the most consequential defect found in Batch I.
2. **Cash was exempt from the receipt reference, with a comment that contradicted itself** â€” it claimed a cash receipt "can be identified by its own receipt number, which is the reference itself" and then permitted the reference to be absent. Every settled row in the reference carries a reference (`Bank Â· 294012`, `Cash Â· RC-141`); the lone `â€”` belongs to a **due** row with no payment yet. A reference is now required for **all** modes, and an over-long one is refused rather than truncated.
3. **The mode set conflated displayable with writable.** `Wallet` and `Cheque` could be written even though the locked `Mode` select has only `<option>Cash</option><option>Bank</option>`; writing one would require adding a third option, a visible change. Split into `PAYMENT_MODES` (4) and `WRITABLE_PAYMENT_MODES` (2).
4. **The gateway scan flagged its own denylist â€” for the *third* time** (Batch B credentials, Batch G WhatsApp, now Batch I payment). I had applied the same fix twice already and reached for the same exemption again. Fixed at the root instead: `stripCommentsAndLiterals()` removes comments, strings and regex literals, so `assertNoNetworkCalls()` inspects only executable tokens and needs **no exemption at all** â€” while still catching a module specifier or URL hidden inside a string, which the stripped view alone would miss.
5. `approvedCompactStrings(296000)` reported `matches: true` while returning a locked string that differs from the derived one â€” the flag tested *existence* in the map, not equality.
6. Two test errors of mine: `[...frozenObject]` is not iterable (should be `{...obj}`), and `badgeFor('Paid')` passed a display label where a status value is required.

---

## API dependencies / blockers

### B-O-02 and B-O-03 are BLOCKED â€” deliberately not implemented

The published contract states, for **future** endpoints only:

> Valid session or token Â· Server-side tenant resolution Â· Explicit CORS
> allowlist match (never wildcard)

and defines `401 = Unauthenticated`, `403 = Forbidden â€” valid auth but
insufficient scope`. It publishes **no** auth endpoint, **no** credential scheme,
**no** login/logout/refresh payload, **no** token lifecycle, and **no** role
vocabulary. Its own text defers these to later batches.

A policy requirement is not a contract. B-O-02 says "only after contract
review"; that review happened and it came back negative. So:

- **no** session storage strategy was written;
- **no** auth header, refresh flow or auth error mapping was written;
- `AUTH_INTEGRATION_AUTHORIZED === false`;
- all five capabilities (`login`, `logout`, `refresh`, `current-identity`,
  `role-permissions`) recorded blocked with every schema field `null`;
- enforced by tests that fail if a schema or implementation claim appears.

What *is* now contract-backed and delivered: the 401/403 semantics (used by the
session state model), the published error table, and the `/health` schema.

### Blockers for the owner / KiloCode

**KiloCode must publish** (per `docs/auth-contract-review.md` Â§6): credential
scheme; login contract; logout contract; refresh contract + token lifecycle;
identity/introspection endpoint with the exact role vocabulary; server-enforced
permission model with the 403 response contract.

**Environment blocker (KiloCode's, independently confirmed by me):** PHP `intl`
is missing, which blocks all CodeIgniter runtime and all 22 backend tests; MySQL
is not running; no global Composer. No frontendâ†”backend integration test can run
until this is fixed.

**UI owner must decide** â€” `docs/auth-ui-blockers.md`:

| ID | Blocker |
|---|---|
| BLK-01 | **No sign-in screen and no expired-session screen.** `Continue to sign in` only renders a toast |
| BLK-02 | No forbidden / not-authorised screen or copy |
| BLK-03 | **No logout control in any reference** (grep-confirmed zero matches) |
| BLK-04 | Role cannot be discovered; `#roles` is preview-only per the reference's own copy and must never be bound |
| BLK-05 | No password/OTP input affordance anywhere |
| BLK-06 | No rate-limit/lockout presentation (`429` is published) |
| BLK-07 | The School Dashboard has no role concept; desktop role matrix is a product decision |
| BLK-08 | Nav entries and the fixed 5-column mobile tab bar may not be hidden without a layout change |
| BLK-09 | `.qrart` is decorative, not scannable; real QR needs unapproved PWA/camera scope |

**Batch C blockers** â€” `docs/provisioning-ui-blockers.md`:

| ID | Blocker |
|---|---|
| CPB-01 | **Super Admin status values are not the published enum.** UI shows `Active`, `Provisioning`, `Renewal due`; column allows `pending\|active\|suspended\|decommissioned`. KiloCode + owner |
| CPB-02 | **The school connection code has no published field.** `HZ-9246` appears in 3 approved UI places; no table stores it |
| CPB-03 | Renewal/licensing data not implemented (`commercial_records` has no migration) â€” Batch K |
| CPB-04 | Plan labels are *proposed* only; no plan table or enumeration |
| CPB-05 | The 5-stage install lifecycle has no representation (2 enums, 4 values) |
| CPB-06 | No list filter/sort/pagination contract |
| CPB-07 | No school-detail target screen for the `Manage` link |
| CPB-08 | No per-school health log; `/health` is platform-wide only |
| CPB-09 | **No 409 Conflict / idempotency semantics** â€” a direct Batch C exit-gate gap |

**Batch D blockers** â€” `docs/school-settings-blockers.md`:

| ID | Blocker |
|---|---|
| DSB-01 | School branding/address/contact are *documented* in the data-boundary file but **not implemented** â€” a doc-vs-schema mismatch |
| DSB-02 | Timezone select has exactly one `<option>`; the `VARCHAR(64)` column suggests more were planned |
| DSB-03 | No published locale vocabulary; only the `VARCHAR(8)` format is checkable |
| DSB-04 | **No academic structure at all** â€” 12 missing entities (classes, sections, subjects, sessions, timetable, homework, assessments, marks, staff, teacher assignments) |
| DSB-05 | No 409 / idempotency semantics for duplicates (same root cause as CPB-09) |
| DSB-06 | No logo column, no upload contract, and **no logo element in any approved reference** |
| DSB-07 | Permission-denied untestable without an auth contract |
| DSB-08 | No settings read/write endpoint at all |

**Batch E blockers** â€” `docs/people-blockers.md`:

| ID | Blocker |
|---|---|
| PEB-01 | **No student/staff detail screen exists** â€” the row `View` action only raises a toast. A detail view would be a new screen |
| PEB-02 | **No photo element and no student/guardian contact surface in any reference.** The `.pe i` cell is a text initial, and no reference contains an `<img>` â€” asserted by test |
| PEB-03 | No approved copy for empty / inactive / no-search-results people states |
| PEB-04 | `All classes` select cannot be populated without a visible change |
| PEB-05 | No approved add-student / add-staff form layout |
| PEB-06 | **Guardian linkage missing â€” the critical privacy dependency.** No `student_guardians` table; the client must never receive the full child list |
| PEB-07 | No enrollment status vocabulary (only `Active` appears in the reference) |
| PEB-08 | Admissions and payroll V1 scope unconfirmed |
| PEB-09 | Batch E is blocked **behind Batch C** â€” people data needs a dedicated school database |

**Batch F blockers** â€” `docs/attendance-blockers.md`:

| ID | Blocker |
|---|---|
| FAT-02 | **The mobile attendance screen cannot record Leave.** It renders Present/Absent only and its staff toggle is binary. Adding a third pill would be a visible change â€” owner decision |
| FAT-01 | No server-side duplicate/idempotency guarantee and **no 409** â€” same root cause as CPB-09 / DSB-05 |
| FAT-03 | No approved copy for attendance empty / incomplete / refused / retry states |
| FAT-04 | Partial submission refused by default; the server's treatment of unmarked students is unknown |
| FAT-05 | Correction protocol (full register vs delta) is a server decision |
| FAT-06 | No attendance audit trail â€” and `platform_audit_events` is control-plane only, so it cannot be reused |
| FAT-07 | Class / section / date have no address (DSB-04) |
| FAT-08 | Teacher assignment scope unenforceable without an assignment table |

**Batch G blockers** â€” `docs/curriculum-blockers.md`:

| ID | Blocker |
|---|---|
| GCB-01 | **A share destination must never be named in code** â€” V1 boundary confirmation needed on the intended UX |
| GCB-02 | Only four subject accents exist; real schools need more |
| GCB-03 | No approved copy for empty timetable / homework / notices |
| GCB-04 | PDF failure has one transient channel, no retry affordance |
| GCB-05 | No composer layouts for homework, notices or timetable entry |
| GCB-06 | No render or export endpoint |
| GCB-07 | Notice expiry uncontracted â€” server cannot filter it either |
| GCB-08 | No timetable address, no room model, no teacher assignment |

**Batch H blockers** â€” `docs/assessment-blockers.md`:

| ID | Blocker |
|---|---|
| **HAB-01** | **No grading policy published â€” so no grade is computed.** A guessed band would decide whether a real child passed |
| HAB-02 | Locked wording differs between surfaces (`3 Publish` vs `Published result`); must not be unified |
| HAB-03 | No "return for changes" control, so a rejected result is stuck |
| HAB-04 | Chart width clamped 0â€“100 to protect the locked bar â€” **handled** |
| HAB-05 | No approved copy for pending / unpublished / no-result |
| HAB-06 | No busy/disabled state for mark entry; toast-only would be the only option |
| HAB-07 | No traceability contract for mark revisions or publication |
| HAB-08 | Export protection and who may export results are both undecided |

**Cline** must approve the UI-lock regression harness before any binding.

---

## UI-lock result

**INTACT â€” verified, not asserted.**

| Reference file | SHA-256 | Result |
|---|---|---|
| `Zee Education â€” Mobile App Preview.html` | `deec1fceb15cdf4af44d174a65ff27261b1ad87d7418087f3783fa8bbbb73d9f` | **MATCH** |
| `Zee Education â€” School Dashboard.html` | `56d82bef4b1ef5ede1811fc12da0f643b1db0c328926b24de4f10f5d78a6948d` | **MATCH** |
| `Zee Education â€” Super Admin.html` | `df876fbc699389c5e1128d99678ead93c3ac1e4340a4a805948e8d5ba606cb30` | **MATCH** |

- No reference file was opened for writing, moved, renamed or reformatted.
- No reference HTML was copied into `frontend/` or into any runtime page.
- `frontend/` still contains **0** HTML/CSS/SVG/image/font files (verified).
- Zero visual changes in Batch B. The role guard and session model are pure
  functions returning frozen data; they contain no rendering path at all.
- Two layout constraints discovered and respected rather than "solved":
  the fixed 5-column mobile nav and the sidebar grid mean role-based entry
  points cannot hide existing navigation (BLK-08).
- Re-verifiable any time: `npm run test:ui-lock` (exit 0 = locked, 1 = violation).

---

## Batch B exit gate

| Gate condition (`OPENCODE_ALL_BATCHES.md`) | Status |
|---|---|
| Every role has server-side policy tests | **NOT MET â€” KiloCode's.** No auth endpoint, role table or permission model exists. Frontend tests only |
| Browser cannot self-assign a role/school | **MET on the frontend.** The role is an injected server value only; `#roles` is never bound; unknown roles default-deny on every surface; asserted by tests |
| Login/logout/session-expiry behaviors are tested | **PARTIALLY MET.** State behaviours for no-session, expired, forbidden and logout are tested. The request behaviours cannot be tested â€” no endpoint is contracted |
| No UI change occurred | **MET.** 3/3 hashes unchanged; 0 visual assets added |

The gate cannot fully pass while KiloCode's half is unbuilt. I am reporting that
rather than claiming the gate.

---

## Batch C exit gate

| Gate condition (`OPENCODE_ALL_BATCHES.md`) | Status |
|---|---|
| A synthetic school can be provisioned into a separate local database safely | **NOT MET â€” KiloCode's.** No provisioning endpoint and no model layer (`Models/` is still `.gitkeep`). Also blocked by `intl_MISSING`, so no backend test can even run |
| A retry cannot silently create inconsistent duplicate data | **NOT MET â€” KiloCode's.** No idempotency-key strategy, no 409 Conflict semantics, no unique constraint on a school name. This is a server guarantee that cannot be established or tested from a browser â€” reporting it, not claiming it (CPB-09) |
| No school-local student table exists in the control-plane database | **MET and verified.** All 4 migrations audited: no student, guardian, staff, attendance, results or fee table. ADR-001 dedicated-database rule intact |

---

## Batch D exit gate

| Gate condition (`OPENCODE_ALL_BATCHES.md`) | Status |
|---|---|
| A school can configure its safe basics and academic structure in its own database | **NOT MET â€” KiloCode's.** No settings endpoint and no academic schema. The frontend adapter is ready for the 4 published columns, but nothing can be read or saved |
| Teacher assignment scope is enforceable server-side | **NOT MET â€” KiloCode's.** There is no staff record and no teacher-assignment table, so this cannot hold at all |
| Uploaded logo controls are tested | **NOT TESTABLE.** No branding column, no upload endpoint, and no logo element in any approved reference (DSB-06) |
| No UI change occurred | **MET.** 3/3 hashes unchanged; 0 visual assets; theme and binding contracts frozen and drift-guarded |

---

## Batch E exit gate

| Gate condition (`OPENCODE_ALL_BATCHES.md`) | Status |
|---|---|
| School can maintain students, guardians, staff and enrollment history | **NOT MET â€” KiloCode's.** No people table, no endpoint, and no school database. Blocked behind Batch C provisioning (PEB-09) |
| Privacy/role/isolation tests pass using synthetic data | **MET on the frontend, honestly scoped.** The roleÃ—categoryÃ—scope privacy matrix, redaction proving no denied value leaks, parent-linkage refusal without server scope, Super Admin granted nothing, and default-deny for unknown roles and unknown keys all pass. **Not** met end-to-end: there is no server to test against |

---

## Batch F exit gate

| Gate condition (`OPENCODE_ALL_BATCHES.md`) | Status |
|---|---|
| Attendance is correct, scoped, auditable and role-safe | **NOT MET â€” KiloCode's, and one item is the owner's.** Correctness under retry needs server idempotency (FAT-01); scoping needs teacher assignment (FAT-08); auditability needs an attendance audit trail (FAT-06, which cannot reuse the control-plane audit table). Role safety **is** implemented and tested client-side: Super Admin is withheld, a parent needs server-resolved linkage, and a withheld summary can never render as `0%` |
| No UI change occurred | **MET.** 3/3 hashes unchanged; 0 visual assets; status model and binding contract drift-guarded |

---

## Batch G exit gate

| Gate condition (`OPENCODE_ALL_BATCHES.md`) | Status |
|---|---|
| Timetable, homework and notices function per role | **NOT MET â€” KiloCode's.** No `timetable_slots`, `academic_weeks`, `homework` or `notices` table, no class/section to address them, and no school database. Per-role *rules* are implemented and tested (audience scoping requires server-resolved assignment) but there is nothing to function against |
| PDF sharing stays within the agreed manual V1 boundary | **MET â€” verified and continuously enforced.** `validateShareRequest()` refuses any destination including the literal `whatsapp`, requires `userInitiated === true`, allows PDF only from the 4 approved controls, and classifies a zero-byte document as unshareable. `assertNoUnofficialAutomation()` scans all of `core/` for WhatsApp/messaging/automation surfaces and any outbound absolute URL â€” currently **0 findings** |
| No UI change occurred | **MET.** 3/3 hashes unchanged; 0 visual assets; subject model and navigation drift-guarded |

---

## Batch H exit gate

| Gate condition (`OPENCODE_ALL_BATCHES.md`) | Status |
|---|---|
| Only reviewed/published results reach parent and student views | **MET on the client, honestly scoped.** `canRoleViewResult()` refuses any non-published result for Parent or Student, in addition to the privacy-matrix and server-resolved-scope gates; `selectVisibleResults()` reports what it withheld and why-count. **Not** verified end-to-end â€” there is no server, and the contract record states plainly that the server is the real guarantee and this is a second line of defence |
| Results are accurate, traceable and export-protected | **NOT MET.** Accuracy: no endpoint and **no grading policy** (HAB-01). Traceability: no `mark_revisions` or `result_publication` contract (HAB-07). Export protection: no endpoint and export permissions undecided (HAB-08, GCB-06) |
| No UI change occurred | **MET.** 3/3 hashes unchanged; 0 visual assets; lifecycle and binding contracts drift-guarded |

---

## Batch I exit gate

| Gate condition (`OPENCODE_ALL_BATCHES.md`) | Status |
|---|---|
| Fees, invoices and receipts follow the approved manual workflow | **NOT MET — KiloCode's.** No `fee_invoices`, `fee_payments`, `fee_audit`, `fee_discounts` or `fee_fines` table, no fee endpoint, and no school database (fee records are school-local per `control-plane-data-boundary.md`, so they wait on provisioning too). All 18 bindings are `state: 'unpublished'` with `field: null`; IFB-13 and IFB-14 are blocked. The *workflow rules* are implemented and tested — School Admin only, no overpayment, no re-payment, no part payment, a receipt reference required for every mode, `OVERPAYMENT`/`PARTIAL_NOT_SETTLED`/`ALREADY_PAID` refusals — but there is nothing to run them against |
| No online payment gateway or checkout in V1 | **MET — verified and continuously enforced.** `assertNoPaymentGateway()` finds **0** gateway, card, bank, token or checkout surfaces across `core/`. `assertNoNetworkCalls()` adds a no-exemption transport and absolute-URL ban, so it constrains even the guard modules that must name what they forbid. `assertNoGatewayCopyInReferences()` fails if the locked copy stating the exclusion ("Online gateway V1 mein nahin" / "Online payment V1 mein enabled nahin") is removed from either reference |
| No UI change occurred | **MET.** 3/3 hashes unchanged; 0 visual assets; money, binding and gateway-copy contracts drift-guarded |

---

## Honest status line

> **No payment can be recorded and no receipt can be issued, because nothing exists
> to record one with.** Batch I delivered the highest-consequence logic in the project
> so far: the V1 no-gateway guarantee, implemented as two whole-tree scans and a guard
> on the reference copy that states it, so an online payment surface cannot be added
> to the frontend at all.
>
> Two real bugs were caught, and the first is the kind that matters. `recordManualPayment()`
> marked an invoice `Paid` — and painted it green, the colour a parent reads as
> *settled* — for a payment of **any** amount up to the invoice total. Since the UI
> has only `Paid` and `Due` badges, a payment below the total would have recorded a
> debt that was still owed as fully settled. It is now refused outright. The second was
> exempting cash from the receipt reference on the strength of a comment that
> contradicted itself; every settled row in the reference carries one, so all four
> modes now require it.
>
> The restraint worth carrying forward is that **discounts and fines are not modelled
> at all.** `PROJECT_MEMORY` lists them as approved V1 scope, and inventing a fee
> column or a discount tile would have made the batch look complete. But
> `discount|fine|waiver` returns zero matches across all three locked references —
> there is no surface, and no contract. So it is recorded as a scope decision for the
> owner (IB-01) rather than quietly implemented.
>
> A process note I owe: the gateway scan flagged its own denylist, and that is the
> **third** time a guard has condemned the module that defines it (Batch B credentials,
> Batch G WhatsApp, Batch I payment). I had already solved this twice and reached for
> the same exemption a third time. It is now fixed at the root — the guard strips
> comments, strings and regex literals and inspects only executable tokens, so naming
> `fetch` is invisible to it while calling `fetch(...)` is not. A lesson recorded twice
> is a lesson not yet learned.

## Next safe microtask

**Batch J onward**, per `OPENCODE_ALL_BATCHES.md`, on the owner saying `continue`.

Batch I itself is complete within what KiloCode has published. What it still waits on:

1. **KiloCode** — implement the per-school fee, receipt, discount and fine schema and
   publish the read/write contracts, including the invoice status vocabulary. Fee
   records are school-local per `control-plane-data-boundary.md`, so this also waits on
   school provisioning, not only on a contract (IB-09).
2. **The owner** — three decisions only Batch I could not make for itself, none of which
   blocks the next batch:
   - **IB-01** — where, if anywhere, discounts and fines appear. Zero approved surface exists.
   - **IB-04** — whether `PKR 296K` or `PKR 12.5k` is canonical; the locked UI disagrees with itself.
   - **IB-07** — whether V1 accepts part payments at all, and how a part-paid invoice would look with only two badges.
3. **Cline** — UI-lock harness approval, plus owner review/merge of Batches B–I.

Carried forward: keep every drift and anti-fabrication guard green and re-run
`npm run check` before any change is reported.
