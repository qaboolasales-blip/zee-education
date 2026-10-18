# Zee Education — Frontend Adapter Layer

Owned by **OpenCode** (UI-safe Frontend Integration Owner).

- **Batch A** — complete.
- **Batch B** (Identity, Roles & Session Security) — complete as far as the
  published contract permits. **No authentication integration exists**, because
  the published contract contains no authentication endpoint.
- **Batch C** (Super Admin School Registry & Dedicated Provisioning) — mapping
  and published-schema validation complete. **No school can be registered or
  provisioned from the frontend**, because no registry/provisioning/QR endpoint
  is published.
- **Batch D** (School Setup, Academic Structure & Assignment Boundaries) —
  settings adapter, theme-token enforcement and the element binding contract
  complete. **No school setting can be read or saved and no academic structure
  exists**, because there is no settings endpoint and no academic schema at all.
- **Batch E** (People: Students, Guardians, Staff & Enrollment) — the role
  privacy policy, redacting selectors, binding contract and mobile role landing
  are complete and enforced. **No person record exists or can be read**; the
  per-school people schema is missing and is blocked behind Batch C provisioning.
- **Batch F** (Attendance) — status model bound to the approved controls, submission
  state machine, role-safe summaries and binding contract complete. **Attendance
  cannot be recorded**, because no attendance table and no school database exist.
- **Batch G** (Timetable, Homework, Notices & Manual PDF Sharing) — **G-O-02 and
  G-O-05 complete and enforced**: navigation is provably immutable and an unofficial
  WhatsApp/SMS/automation integration cannot be added. G-O-01/G-O-03/G-O-04
  delivered as models and policies; nothing bound, because no curriculum schema
  exists.
- **Batch H** (Assessments, Marks, Review & Results) — **the publication gate is
  implemented and tested**: an unpublished result cannot reach a parent or student
  view even if the server sends one. Lifecycle, transitions and chart-safe values
  complete; nothing bound, because no assessment schema exists. **No grade is
  invented**, because no grading policy is published.
- **Batch I** (Fees, Invoices, Receipts, Discounts/Fines, Payment Boundary) —
  **I-O-05 complete and enforced**: there is provably no payment gateway, checkout,
  card or tokenisation surface anywhere in `core/`, and the locked copy that states
  the V1 exclusion is drift-guarded. Money formatting, the 18-binding fee contract,
  role-scoped ledger state and the manual-payment rules are delivered. **No payment
  can be recorded**, because no fee table, no endpoint and no school database exist.
  **Discounts and fines are not modelled at all**, because no reference contains any
  surface for them — see IB-01.
- **Batch J** (Reports, Exports & Print Templates) — **the export authorization matrix
  is transcribed from the reference's own tool lists**: `reports` belongs to Teacher and
  School Admin, `documents` to Parent, Student and School Admin — so a parent cannot
  create an export and a teacher cannot open documents. **No print designer exists** and
  a whole-tree scan enforces it; a result export inherits the Batch H publication gate.
- **Batch K** (Super Admin Commercial, License, Renewal & Support) — **the licence
  badge mapping is transcribed from the reference's own `stc`**, with one deliberate
  rule: an unrecognised state keeps the neutral `.n` badge and is never assumed
  `Active`. Support access is an explicit allowlist, school records are unreachable
  through it, and **a renewal reminder is prepared but never sent**.
- **Batch L** (Mobile/PWA Connection, Role Launch & Resilience) — the reference's
  `connectSchool()` is transcribed exactly (both inputs required, name derived from the
  domain, `in this demo`); a selection is in-memory and cleared on logout/switch, and
  **no storage write exists anywhere**. Role launch uses existing screens only, and the
  hidden mobile scrollbar is guarded. **No manifest, service worker or offline surface
  exists.**
- **Batch M** (Integration, Security, Performance & Recovery) — **the release security
  scan is delivered and runs over every module**: no development URL, no secret
  identifier in executable code, no debug call. No custom loading/error/empty surface
  can be created. M-O-01 and M-O-04 remain blocked.
- **Batch N** (Pilot Release, Monitoring & Handover) — **the production configuration
  validator is delivered**: a release must use a relative base path, a production
  environment and no debug flag. Role onboarding text is external documentation. The
  deployed comparison and pilot flows remain blocked.
- **Batch O onward** — not started.

This package contains **no user interface**. There is no HTML file, no CSS file,
no SVG, no font, no icon and no runtime page anywhere under `frontend/`. That is
deliberate: the approved reference designs are 100% pixel-locked, and no batch
may copy one into a runtime page.

---

## 0. Decision policy — I act, I don't ask

**Default is to act, not to ask.** I escalate to the owner only when a decision
is genuinely reserved to them: any change to the approved UI, security or auth
policy, data loss or export restrictions, tenant/database isolation deviations,
privacy or licensing obligations, paid services or hosting, irreversible
migrations, product scope, new locked copy, or promoting a rule outside
`frontend/**`.

Everything else — reading contracts, running checks, writing non-visual code,
tests and docs, recording blockers, transcribing published contracts, defaulting
to deny, correcting my own stale work — I decide and do, then report.

Full test, escalation format and the live escalation list:
[`docs/decision-policy.md`](docs/decision-policy.md).

> "Har task se mujhe pocho mat. Jahan meri zaroorat ho, wahan pocho."

---

## 1. The UI lock — non-negotiable

The three approved reference designs in
`zee_education_multi_agent_handoff/agents/opencode/reference_ui/` are the visual
authority:

| File | SHA-256 |
|------|---------|
| `Zee Education — Mobile App Preview.html` | `deec1fceb15cdf4af44d174a65ff27261b1ad87d7418087f3783fa8bbbb73d9f` |
| `Zee Education — School Dashboard.html` | `56d82bef4b1ef5ede1811fc12da0f643b1db0c328926b24de4f10f5d78a6948d` |
| `Zee Education — Super Admin.html` | `df876fbc699389c5e1128d99678ead93c3ac1e4340a4a805948e8d5ba606cb30` |

Rules that apply to everything in this package:

- **Never** edit, reformat, rename, move or minify a reference file.
- **Never** add a button, card, modal, row, column, chart, icon or spinner.
- **Never** change a CSS rule, colour, gradient, font, spacing, radius, DOM
  order, class, id, breakpoint or animation.
- **Never** copy a reference file into a runtime page.
- Binding later means writing a value into a text node or an attribute that
  **already exists** in the reference — nothing else.

Verify the lock before and after any change:

```bash
npm run test:ui-lock     # -> "UI LOCK OK — 3/3 reference files unchanged."
```

The verifier is read-only. If it ever fails, **revert the change that caused
it**; never "fix" the failure by editing a reference file or the manifest.

---

## 2. Adapter boundary

```text
approved reference UI (locked, read-only)
            │  existing text nodes / existing attributes only
            ▼
   ┌────────────────────────┐
   │  frontend/core/        │   ← this package, agent-owned
   │   ├─ api/              │     transport + normalization
   │   └─ format/           │     value → display string
   └────────────────────────┘
            │  relative, same-origin requests only
            ▼
  CodeIgniter 4 backend (KiloCode owns backend/**)
```

**Direction of dependency.** The adapter may read a response and return data.
It may never reach into the document, create a node, set a class or write a
style. Rendering code lives outside this package, and when it is written it must
reuse the hooks already inventoried in `docs/ui-binding-map.md`.

**Endpoints the adapter knows about: none.** It is endpoint-agnostic by design.
See §5.

### Rules the transport enforces (and the tests prove)

| Rule | Enforcement |
|------|-------------|
| Relative, same-origin URLs only | `assertRelativeBasePath`, `joinApiPath`, `buildApiUrl` reject absolute URLs, protocol-relative URLs, `..`, backslashes, embedded query strings and fragments. A final guard re-asserts that every produced URL starts with exactly one `/` |
| No `localhost`, preview or temporary host | Such a string cannot be configured; the only env key read is `ZEE_API_BASE_PATH`, and only its *relative path* form is accepted |
| No secrets in browser code | Config is allow-listed; a deep scan rejects any key matching `token/secret/password/api-key/private-key/credential/authorization/session-id/cookie`; forbidden headers (`Authorization`, `Cookie`, `X-Api-Key`, `X-CSRF-Token`, …) and token-shaped values are rejected; the client never stores a token and never reads a response body on failure |
| No cross-origin credential sending | `credentials` accepts only `'same-origin'` or `'omit'` |
| No leaking server text into UI copy | Error messages are a fixed allow-list; only an integer HTTP status varies. The raw cause is non-enumerable and excluded from `toJSON()` |
| No fabricated payloads | A JSON body is parsed only when the response actually declares a JSON media type. An HTML page returns `data: null` — never a coerced object |

---

## 3. Layout

```text
frontend/
├─ package.json                              no runtime dependencies
├─ README.md                                 this file
├─ core/
│  ├─ api/
│  │  ├─ client.js                           createApiClient — relative-path transport
│  │  ├─ config.js                           base-path + no-secret config enforcement
│  │  ├─ errors.js                           ApiError + response/error normalization
│  │  ├─ index.js                            public surface
│  │  └─ contracts/
│  │     └─ pending-contracts.js             /health + /setup registry, error table
│  ├─ auth/                                       (Batch B — no credential handling)
│  │  ├─ screen-registry.js                   allow-list of already-approved screens
│  │  ├─ role-guard.js                        default-deny role → screen selector
│  │  ├─ session-state.js                     storage-free session state model
│  │  ├─ index.js                             public surface
│  │  └─ contracts/
│  │     └─ pending-auth-contract.js          B-O-01/B-O-03 block record
│  ├─ provisioning/                             (Batch C — no provisioning calls)
│  │  ├─ control-plane-schema.js              transcription of the 4 published tables
│  │  ├─ selectors.js                         validators over published columns/enums
│  │  ├─ index.js                             public surface
│  │  └─ contracts/
│  │     └─ pending-provisioning-contract.js  C-O-03/C-O-04 block record
│  ├─ settings/                                (Batch D — no settings calls)
│  │  ├─ theme-tokens.js                      approved palette + token guard
│  │  ├─ school-settings.js                   settings adapter over published columns
│  │  ├─ element-bindings.js                  approved-element → field binding contract
│  │  ├─ index.js                             public surface
│  │  └─ contracts/
│  │     └─ pending-settings-contract.js      D-O-02/D-O-04 block record
│  ├─ people/                                   (Batch E — no people calls)
│  │  ├─ privacy-policy.js                      role x category x scope matrix
│  │  ├─ selectors.js                           redacting selectors, linkage guards
│  │  ├─ role-landing.js                        approved mobile landing tabs
│  │  ├─ element-bindings.js                    approved people elements → fields
│  │  ├─ index.js                               public surface
│  │  └─ contracts/
│  │     └─ pending-people-contract.js          E-O-03 block record
│  ├─ attendance/                               (Batch F — no attendance requests)
│  │  ├─ status-model.js                        Present/Absent/Leave bound to approved CSS
│  │  ├─ submission.js                          optimistic/duplicate/retry state machine
│  │  ├─ summary.js                             role-safe summaries, structure only
│  │  ├─ element-bindings.js                    approved attendance hooks
│  │  ├─ index.js                               public surface
│  │  └─ contracts/
│  │     └─ pending-attendance-contract.js      F-O-02/F-O-03 block record
│  ├─ curriculum/                              (Batch G — no curriculum requests)
│  │  ├─ subject-model.js                     4 approved subjects, accents, periods
│  │  ├─ timetable.js                          timetable / homework / notice behaviour
│  │  ├─ share-boundary.js                     manual V1 PDF share boundary (G-O-03/05)
│  │  ├─ element-bindings.js                  approved hooks + navigation policy
│  │  ├─ index.js                              public surface
│  │  └─ contracts/
│  │     └─ pending-curriculum-contract.js     G-O-01/G-O-03 block record
│  ├─ assessment/                              (Batch H — no assessment requests)
│  │  ├─ lifecycle.js                         3-stage lifecycle + publication gate
│  │  ├─ marks.js                             mark validation, chart width, grade refused
│  │  ├─ element-bindings.js                  approved marks/review/results hooks
│  │  ├─ index.js                             public surface
│  │  └─ contracts/
│  │     └─ pending-assessment-contract.js    H-O-01 block record
│  ├─ fees/                                    (Batch I — no fee requests)
│  │  ├─ money-contract.js                     PKR shapes, locked strings, modes
│  │  ├─ ledger.js                             invoice/status/ledger + manual payment
│  │  ├─ payment-boundary.js                   no-gateway guarantee (I-O-05)
│  │  ├─ element-bindings.js                   approved fee/receipt hooks
│  │  ├─ index.js                              public surface
│  │  └─ contracts/
│  │     └─ pending-fee-contract.js            I-O-01 block record
│  ├─ reports/                                 (Batch J — no export requests)
│  │  ├─ export-authorization.js                role/surface matrix, publication gate
│  │  ├─ export-outcome.js                      export/download failure -> #toast
│  │  ├─ print-templates.js                     built-ins + commercial rules, no designer
│  │  ├─ element-bindings.js                   approved export/print hooks
│  │  ├─ index.js                              public surface
│  │  └─ contracts/
│  │     └─ pending-report-contract.js         J-O-01 block record
│  ├─ commercial/                              (Batch K — no commercial requests)
│  │  ├─ license-state.js                     licence/database badge transcription
│  │  ├─ support-boundary.js                   support allowlist + unsent reminder
│  │  ├─ element-bindings.js                   approved commercial hooks
│  │  ├─ index.js                              public surface
│  │  └─ contracts/
│  │     └─ pending-commercial-contract.js     K-O-01 block record
│  ├─ connection/                              (Batch L — no connection requests)
│  │  ├─ connection.js                        school connect + storage guard
│  │  ├─ role-launch.js                       existing-screen role launch
│  │  ├─ element-bindings.js                  approved onboarding/scrollbar hooks
│  │  ├─ index.js                              public surface
│  │  └─ contracts/
│  │     └─ pending-connection-contract.js     L-O-01 block record
│  ├─ hardening/                               (Batch M — release hardening)
│  │  ├─ ui-state-audit.js                    no custom loading/error/empty surface
│  │  ├─ security-scan.js                     no dev URL / secret / debug artifact
│  │  ├─ index.js                              public surface
│  │  └─ contracts/
│  │     └─ pending-integration-contract.js    M-O-01/M-O-04 block record
│  ├─ release/                                 (Batch N — release validation)
│  │  ├─ production-config.js                 relative-endpoint release validator
│  │  ├─ index.js                              public surface
│  │  └─ contracts/
│  │     └─ pending-release-contract.js        N-O-02/N-O-03 block record
│  └─ format/
│     ├─ money.js                            PKR, grouped + compact, percent
│     ├─ datetime.js                         Asia/Karachi date/time/relative time
│     ├─ empty.js                            safe empty values, no undefined/NaN leakage
│     └─ index.js                            public surface
├─ docs/
│  ├─ decision-policy.md                     when I act vs when I ask the owner
│  ├─ reference-ui-audit.md                  O-00.1 hashes + structural inventory
│  ├─ ui-binding-map.md                      O-00.2 screen-by-screen data mapping
│  ├─ ui-lock-test-plan.md                   O-00.3 regression plan
│  ├─ backend-contract-dependency.md         Batch A contract-state record (superseded)
│  ├─ auth-contract-review.md                B-O-01 contract read + UI hook comparison
│  ├─ auth-ui-blockers.md                    B-O-06 blocker register
│  ├─ provisioning-ui-map.md                 C-O-01/C-O-02 UI → published schema map
│  ├─ provisioning-ui-blockers.md            C-O-06 blocker register
│  ├─ school-settings-academic-map.md        D-O-01/D-O-02 settings → published columns
│  ├─ school-settings-blockers.md           D-O-06 blocker register
│  ├─ people-ui-map.md                       E-O-01/E-O-02 people elements + privacy policy
│  ├─ people-blockers.md                     E-O-06 blocker register
│  ├─ attendance-map.md                      F-O-01/F-O-02 approved attendance hooks
│  ├─ attendance-blockers.md                 F-O-06 blocker register
│  ├─ curriculum-map.md                      G-O-01/G-O-02 curriculum hooks + share policy
│  ├─ curriculum-blockers.md                 G-O-06 blocker register
│  ├─ assessment-map.md                      H-O-01/H-O-02 marks/review/results hooks
│  ├─ assessment-blockers.md                 H-O-06 blocker register
│  ├─ fees-map.md                            I-O-01..03 fee/receipt elements + money rules
│  ├─ fees-blockers.md                       IB-01..IB-09 blocker register
│  ├─ reports-map.md                         J-O-01..04 export/print mapping
│  ├─ reports-blockers.md                    JB-01..JB-06 blocker register
│  ├─ commercial-map.md                      K-O-01..04 commercial/license/support map
│  ├─ commercial-blockers.md                 KB-01..KB-05 blocker register
│  ├─ connection-map.md                      L-O-01..05 onboarding/role/scrollbar map
│  ├─ connection-blockers.md                 LB-01..LB-04 blocker register
│  ├─ hardening-map.md                       M-O-02/M-O-03 release hardening map
│  ├─ hardening-blockers.md                  MB-01..MB-03 blocker register
│  ├─ release-map.md                         N-O-01..04 release validation map
│  ├─ release-blockers.md                    NB-01..NB-03 blocker register
│  └─ role-onboarding.md                     N-O-04 external role help text
├─ test/                                     unit tests
└─ tools/
   ├─ reference-ui.lock.json                 approved hash manifest
   └─ verify-reference-ui.mjs                read-only lock verifier
```

Zero dependencies. Node.js `>= 20.11` (developed and verified on v24.17.0).
ESM only.

---

## 4. Commands

Run from `frontend/`:

| Command | What it does |
|---------|--------------|
| `npm run test:ui-lock` | Recompute the three reference SHA-256 hashes and compare with the approved manifest. Exit 0 = locked, exit 1 = violation |
| `npm test` | Run the whole unit suite (`node --test`) |
| `npm run check` | Both of the above, in order — run this before reporting any change |

Latest verified result (2026-10-18, Node v24.17.0):

```text
UI LOCK OK — 3/3 reference files unchanged.      exit 0
tests 675 / pass 675 / fail 0 / skipped 0
suites 154
```

No lint or typecheck configuration exists for this package, and none is claimed.
The JSDoc types on exported functions are documentation, not a typecheck gate.

### Drift guards (re-read KiloCode's files or the references on every run)

| Guard | Protects |
|---|---|
| `assertSchemaMatchesMigrations()` | The control-plane transcription vs KiloCode's migration files |
| `assertHealthSchemaMatchesContract()` | The `/health` model vs the published OpenAPI text |
| `assertThemesMatchReferences()` | The theme registry vs all three references |
| `assertBindingsMatchReference()` | The settings binding contract vs the locked School Dashboard |
| `assertPeopleBindingsMatchReferences()` | The people binding contract vs all three references |
| `assertAttendanceBindingsMatchReferences()` | The attendance binding contract vs both references |
| `assertStatusModelMatchesReferences()` | The Present/Absent/Leave model vs the approved letters, `.on.X` selectors and mobile pills |
| `assertSubjectModelMatchesReferences()` | The four subject accents/labels and locked periods vs the reference |
| `assertCurriculumBindingsMatchReferences()` | The curriculum hooks and every approved navigation entry vs the references |
| `assertNoUnofficialAutomation()` | No WhatsApp/messaging/automation surface and no outbound absolute URL anywhere in `core/` |
| `assertLifecycleMatchesReferences()` | The 3-stage result lifecycle, flow step count and locked labels vs both references |
| `assertLandingsAreApproved()` | Mobile role landings vs the approved tab set |
| `assertNoInventedAuthSchemas()` | No invented auth endpoint or payload |
| `assertNoInventedProvisioningSchemas()` | No invented provisioning endpoint or payload |
| `assertNoInventedAcademicSchemas()` | No invented settings/academic endpoint or payload |
| `assertNoInventedPeopleSchemas()` | No invented people endpoint or payload |
| `assertNoInventedAttendanceSchemas()` | No invented attendance endpoint or payload |
| `assertNoInventedCurriculumSchemas()` | No invented curriculum endpoint or payload |
| `assertAssessmentBindingsMatchReferences()` | The assessment hooks vs both references |
| `assertNoInventedAssessmentSchemas()` | No invented assessment endpoint or payload |
| `assertFeeContractMatchesReferences()` | The four payment modes, locked money strings and the V1 no-gateway copy vs the School Dashboard |
| `assertFeeBindingsMatchReferences()` | The 18 fee/receipt hooks and their screens vs the references |
| `assertNoGatewayCopyInReferences()` | The locked "online payment is out of V1" copy still exists in both references |
| `assertNoPaymentGateway()` | No gateway, card, token or checkout surface anywhere in `core/` |
| `assertNoNetworkCalls()` | No `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`, no `node:http(s)` import, no absolute URL — **no exemption, including the guard modules themselves** |
| `assertNoInventedFeeSchemas()` | No invented fee, invoice, receipt, discount or fine endpoint or payload |
| `assertNoFeeElementCreation()` | No fee descriptor may name a DOM-creating operation |
| `assertReportRolesMatchReferences()` | The `reports`/`documents` surface matrix vs the reference tool lists |
| `assertExportOutcomesMatchReferences()` | The locked export-preview copy still exists |
| `assertNoPrintDesigner()` | No template markup builder, print stylesheet or print window anywhere in `core/` |
| `assertNoInventedReportSchemas()` | No invented export, render or commercial endpoint or payload |
| `assertLicenseStatesMatchReferences()` | The `stc` badge mapping and badge classes vs the Super Admin reference |
| `assertSupportIsolation()` | Support may not reach school records; approved logs need an audited reason |
| `assertNoInventedCommercialSchemas()` | No invented commercial, licence or support endpoint or payload |
| `assertConnectionFlowMatchesReferences()` | The connectSchool copy, inputs and role buttons vs the Mobile Preview |
| `assertNoUnapprovedStorage()` | No `localStorage`/`sessionStorage`/`IndexedDB` write anywhere in `core/` |
| `assertRoleLaunchMatchesReferences()` | Every role lands on the existing `Home` screen |
| `assertNoInventedConnectionSchemas()` | No invented connect or persistence endpoint or payload |
| `assertNoCustomStateSurface()` | No spinner, skeleton, banner or modal may be created |
| `assertNoDevelopmentUrls()` | No absolute/dev URL in any string literal |
| `assertNoSecretIdentifiers()` | No credential identifier in executable code |
| `assertNoDebugArtifacts()` | No `console.*`, `debugger`, `var_dump` or `print_r` call |
| `assertNoInventedIntegrationSchemas()` | No invented integration or recovery contract |
| `assertProductionConfig()` | A release must use a relative base path, a production env and no debug flag |
| `assertReleaseShareBoundary()` | A release build still refuses a code-chosen share destination |
| `assertNoInventedReleaseSchemas()` | No invented pilot or deploy contract |

### Adding a formatter

1. Add the pure function to `core/format/`.
2. Add synthetic-input tests to `test/`.
3. If it reproduces a string that already exists in the references, record the
   locked string in `docs/reference-ui-audit.md`.
4. If the reference does **not** contain a suitable string, raise it as an open
   item for the UI owner instead of inventing one.

---

## 5. Backend contract dependency

### 5.1 Contract state

`backend/docs/api/openapi-v0.md` **exists** — version `0.1.0`, status
`DRAFT — Batch A baseline`. It publishes exactly two endpoints, `GET /health`
and `GET /setup`, plus an error-status table and forward-looking conventions.
`docs/auth-contract-review.md` is the current contract-state record;
`docs/backend-contract-dependency.md` is the Batch A record and is superseded on
this point.

`GET /health` is modelled strictly from the published schema (allowed-key list
and both enums are asserted against the document itself, so the transcription
cannot drift). Binding it into a runtime page is **not** authorized: it is a
separate task and still needs Cline's UI-lock regression evidence.

`GET /setup` remains unmodelled, and the contract now *confirms* why: it is a
display-only **HTML** placeholder. A JSON setup model would contradict it.

### 5.2 Authentication — BLOCKED

The contract requires, for future endpoints only:

> Valid session or token · Server-side tenant resolution · Explicit CORS
> allowlist match (never wildcard)

and defines `401 = Unauthenticated`, `403 = Forbidden — valid auth but
insufficient scope`.

It publishes **no** authentication endpoint, **no** credential scheme, **no**
login/logout/refresh payload, **no** token lifecycle and **no** role vocabulary.
Its own text defers these to later batches.

Therefore `AUTH_INTEGRATION_AUTHORIZED === false`, and the five capabilities
`login`, `logout`, `refresh`, `current-identity` and `role-permissions` are all
recorded as blocked with every schema field pinned to `null`.

A policy requirement is not a contract. Building storage, headers or a refresh
flow from it would mean inventing the scheme.

### 5.3 What Batch B did deliver

| Delivered | Where |
|---|---|
| Frozen allow-list of screens that already exist in the locked references | `core/auth/screen-registry.js` |
| Default-deny role → screen selector, never widening the mobile `TL` map | `core/auth/role-guard.js` |
| Storage-free session state model for no-session / expired / forbidden / logout | `core/auth/session-state.js` |
| Machine-readable auth block record with an invariant guard | `core/auth/contracts/pending-auth-contract.js` |
| Full contract read and locked-hook comparison | `docs/auth-contract-review.md` |
| Blocker register instead of new UI | `docs/auth-ui-blockers.md` |
| Compliance guards proving no storage, no token, no auth header, no auto-retry | `test/auth-contract-gate.test.js` |

### 5.4 Unblock conditions

| Capability | Required from KiloCode |
|---|---|
| login | method, path, request/response fields, credential scheme, every failure status, rate-limit/lockout behaviour |
| logout | method, path, server-side revocation, idempotency |
| refresh | method, path, token lifecycle: storage, rotation, absolute vs idle expiry, revocation |
| current-identity | method, path, and the exact role vocabulary the server returns |
| role-permissions | server-enforced permission model and the 403 response contract |

Plus, before any of it may render: Cline approves the UI-lock harness, and the
owner resolves BLK-01…BLK-09 in `docs/auth-ui-blockers.md` — chiefly that **no
sign-in screen, logout control, forbidden screen or credential field exists** in
any approved reference.

### 5.6 Control-plane schema (Batch C)

KiloCode has implemented four control-plane tables: `schools`,
`school_domains`, `provisioning_jobs`, `platform_audit_events`
(`commercial_records` and `support_tickets` are documented but have no migration).

The frontend transcribes that schema in
`core/provisioning/control-plane-schema.js` and validates against it in
`core/provisioning/selectors.js`. `assertSchemaMatchesMigrations()` re-reads the
migration files on every test run, so the transcription cannot drift.

But **no registry, provisioning or QR endpoint is published**
(`Routes.php` is still only `/health`, `/setup`, `/`; `Models/` is still empty),
so nothing is bindable. `PROVISIONING_INTEGRATION_AUTHORIZED === false`.

Two findings worth stating plainly:

- **The school connection code has no published field.** `HZ-9246` appears in
  three places in the approved UI; no table stores it (only `schools.plan_code`,
  a commercial plan reference).
- **The Super Admin status values are not the published enum.** The UI shows
  `Active`, `Provisioning`, `Renewal due`; the column allows
  `pending|active|suspended|decommissioned`. The frontend rejects the two
  unmatched values rather than guessing. See CPB-01.

Detail: `docs/provisioning-ui-map.md` and `docs/provisioning-ui-blockers.md`.

### 5.7 School settings & theme tokens (Batch D)

Only three published columns have a real home on the approved `Settings` screen —
`schools.timezone` (VARCHAR(64) DEFAULT `Asia/Karachi`), `schools.currency`
(VARCHAR(8) DEFAULT `PKR`), `schools.locale` (VARCHAR(8) DEFAULT `en`) — plus
`school_domains.domain` for the domain input. Everything academic has **no**
schema at all: no class, section, subject, academic session, timetable, homework,
assessment, marks, staff or teacher-assignment table.

There is also no settings endpoint, so nothing can be read or saved.

Two enforcement points are worth knowing about:

- **`core/settings/theme-tokens.js`** carries exactly the 8 approved swatches per
  surface and the two themable tokens `--brand` / `--brand2`. It cannot add a
  colour or a token. `assertThemesMatchReferences()` re-reads all three
  references and fails if any `setProperty(…)` call targets a third property.
  Note the locked difference it preserves: Super Admin's 7th swatch is its own
  brand pair, and the mobile preview themes via dataset rather than `setTheme()`.
- **`core/settings/element-bindings.js`** is the binding contract: every approved
  element, the exact attribute a future write would target, and whether the field
  exists. `assertNoElementCreation()` throws if a descriptor ever gains an
  element-creating capability, and `assertBindingsMatchReference()` fails if a CSS
  hook a binding depends on disappears from the reference.

Detail: `docs/school-settings-academic-map.md` and
`docs/school-settings-blockers.md`.

### 5.8 People privacy policy (Batch E)

No student, guardian or staff record exists, and none can be read. What exists is
the part that does **not** depend on a schema — and for a school system it is the
part that matters most.

`core/people/privacy-policy.js` is a role × category × scope matrix built purely
from published policy: the 10 data categories come from the data-boundary
document, and the role rules come from PROJECT_MEMORY ("parents only see linked
children; teachers only use assigned class/subject data; Super Admin does not
browse learner data by default") cross-checked against the approved per-role tool
lists (`TL`).

| Role | Scope | Denied |
|---|---|---|
| Super Admin | **nothing** | all 10 categories |
| School Admin | `school` — all 10 | — |
| Teacher | `assigned-class` | fees, guardians, staff, settings |
| Parent | `linked-children` | guardians, staff, settings, academic structure |
| Student | `own` | **fees**, guardians, staff, settings |
| unknown / anonymous | nothing (default deny) | all 10 |

`core/people/selectors.js` **redacts rather than filters**: a denied category is
replaced with an explicit `{ redacted: true }` tombstone, so a refusal is provable
without inventing a visible string, and a list's length never silently changes.
Any key that is **not** a known category is also withheld, so an uncontracted
field such as `salary` cannot leak.

`selectLinkedChildren()` returns an **empty list** unless the caller supplies
server-resolved `linkedIds` — the client never guesses which children belong to a
guardian. This module is explicitly **not** a security boundary; the server
resolves role, school and scope from the authenticated session.

Detail: `docs/people-ui-map.md` and `docs/people-blockers.md`.

### 5.9 Attendance (Batch F)

Attendance records are school-local data that is **never** stored in the control
plane, so no register can exist until the Batch C provisioning path creates a
dedicated school database. Nothing is bound.

What Batch F delivered is the pure logic, which is entirely mine to get right:

- **`core/attendance/status-model.js`** binds the three approved statuses to the
  exact approved controls — `const c=['P','A','L']` with `.on.P` green, `.on.A`
  red, `.on.L` amber — and emits the precise class string the reference emits.
  `assertStatusModelMatchesReferences()` fails if a letter or selector changes, and
  also **fails if the mobile screen ever grows a third pill**.
- **`core/attendance/submission.js`** is a pure state machine with reversible
  optimistic marks, deterministic non-secret idempotency keys
  (`class|section|date|student|status`), a no-op resubmission refused as
  duplicate while genuine corrections are permitted, offline distinguishable from
  rejected, and any status outside the six published codes — **including 409** —
  refused as uninterpretable rather than guessed.
- **`core/attendance/summary.js`** reuses the Batch E privacy matrix: a withheld
  summary returns `presentRatio: null`, so a role with no permission can never be
  rendered as `0%`. It emits no label, sentence or colour.

**FAT-02 is a real defect in the approved design, recorded rather than patched:**
the mobile attendance screen renders Present/Absent only and its staff toggle is
binary, so **a teacher cannot record Leave on mobile**. Adding the pill would be
a visible change, so it is an owner decision.

Detail: `docs/attendance-map.md` and `docs/attendance-blockers.md`.

### 5.10 Curriculum and the manual PDF share boundary (Batch G)

Timetable, homework and notices are school-local data that is **never** stored in
the control plane, so none of it exists yet. Two Batch G items are nevertheless
**complete and enforced today**, because they are constraints on this package
rather than on a backend:

**Navigation is provably immutable (G-O-02).**
`validateNavigationChange()` refuses *every* change, including an entry a surface
already has. Both approved layouts are fixed-shape — the mobile `.nav` is
`grid-template-columns:repeat(5,1fr)` and the desktop sidebar is a grid with a
pinned footer — so adding, removing or reordering an entry is a visual change.
`APPROVED_NAVIGATION` records the exact approved sets, drift-guarded against the
references.

**No unofficial WhatsApp automation is possible (G-O-05).**
`assertNoUnofficialAutomation()` scans executable code across all of `core/` and
fails on WhatsApp hosts or schemes, messaging providers, messaging API paths,
automation drivers, `mailto:`, and **any outbound absolute URL** — the last
applying to every file, including the ones that declare the rule.

**The manual share boundary (G-O-03).** The locked UI contains a button labelled
*Share result PDF on WhatsApp*, and V1 permits manual user-initiated WhatsApp PDF
sharing while excluding automated WhatsApp. The distinction the code enforces is
that **code never names the destination** — `validateShareRequest()` refuses *any*
`destination` value, including the literal string `whatsapp`, and requires
`userInitiated === true`. Only PDF may be shared, from one of the four approved
controls, with a document reference. A zero-byte "PDF" is classified as
`empty-document` and is never shareable.

Detail: `docs/curriculum-map.md` and `docs/curriculum-blockers.md`.

### 5.11 Results lifecycle and the publication gate (Batch H)

The locked UI documents the whole result lifecycle itself — a three-step `.flow`
(`1 Teacher draft` → `2 Admin review` → `3 Publish`) and three mobile pill rows
(`Teacher draft` / `Admin review` / `Published result`, the last noted
*"Parents see approved only"*). So no contract was needed to model it, and
`assertLifecycleMatchesReferences()` fails if a label changes, if the flow gains or
loses a step, or if that last sentence disappears.

**The publication gate is the Batch H exit-gate rule, enforced in code.**
`canRoleViewResult()` requires the privacy matrix to grant `academic_results`, any
`own`/`linked-children` scope to be server-resolved, and — for **Parent and Student
only** — the stage to be `published`. A server mistake therefore cannot become a
visible leak. `selectVisibleResults()` reports *how many* entries it withheld and
their ids, so a prevention is provable rather than a silently shorter list. This is
explicitly a **second line of defence**, not the guarantee; the server must itself
refuse to return unpublished results.

**Transitions are authorised per action, not per stage** — only the teacher may
submit for review, only School Admin may publish or return for changes, review cannot
be skipped, and a published result cannot be un-published. A refused transition
returns the unchanged stage.

**No grade is ever invented.** The UI shows `A` and `A+`, but no grading policy is
published, so `gradeFor()` returns `known: false` unconditionally. A guessed band
would decide whether a real child passed. Likewise `progressWidth()` clamps to
0–100 so a malformed mark cannot escape the fixed 6px-tick `.prog` bar.

Detail: `docs/assessment-map.md` and `docs/assessment-blockers.md`.

### 5.12 Fees, receipts and the no-gateway boundary (Batch I)

The locked UI already documents the fee feature completely, so no contract was needed
to model it — and two of its own lines state the V1 payment exclusion verbatim:
*"Online gateway V1 mein nahin."* and *"Online payment V1 mein enabled nahin"*.

**I-O-05 is complete and enforced.** `assertNoGatewayCopyInReferences()` fails if
either line is removed, so the exclusion cannot quietly disappear from the reference.
`assertNoPaymentGateway()` scans every module under `core/` for gateway names, card
and bank fields, payment tokens and checkout routes. `assertNoNetworkCalls()` is the
stricter backstop: it strips comments, string literals and regex literals, then
refuses `fetch(`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, an
`node:http(s)` import, or an absolute URL — with **no exemption, including the guard
modules themselves**. A denylist must name what it denies, so a plain text scan would
condemn the module that defines it; stripping literals fixes that at the root instead
of by exemption. `validateManualPaymentRequest()` refuses any payload carrying
`cardNumber`, `cvv`, `iban`, `checkoutToken`, `redirectUrl` or `gateway`, and
requires `manual: true`.

**Money formatting delegates; it never re-derives.** `formatFee()` yields
`PKR 12,500`, `formatFeeCompact()` yields `PKR 1.08M` and `PKR 12.5k`, a missing
reference reuses the existing `—` marker. The locked UI disagrees with itself on K
casing — `PKR 296K` on the dues tile versus `PKR 12.5k` on the Parent KPI — so
`approvedCompactStrings()` reports `{ locked: 'PKR 296K', derived: 'PKR 296k',
matches: false }` instead of reconciling a locked screen (IB-04).

**Four modes are displayable, two are writable.** `PAYMENT_MODES` matches the
`Cash · Bank · Wallet · Cheque` tile; `WRITABLE_PAYMENT_MODES` is only `Cash`/`Bank`,
because the locked `Mode` select has exactly two `<option>` nodes. A Wallet invoice
can be shown once it exists; nothing in V1 can create one (IB-03).

**Fee records follow the Batch E privacy matrix.** School Admin gets school scope,
Parent only with a server-resolved `linkedIds`, and Teacher, Student and Super Admin
get nothing — matching the mobile references, whose `TL.Teacher` and `TL.Student`
lists contain no `fees` entry at all. A denied role receives `collected: null`, never
`0`: zero means "collected nothing", null means "not yours to see".

**An unpaid invoice is `—`, not an empty cell.** Every settled row in the reference
carries a reference (`Bank · 294012`, `Cash · RC-141`); the lone `—` belongs to a
*due* row with no payment yet. So `recordManualPayment()` requires a receipt
reference for **all** modes, cash included, and refuses an over-long one rather than
truncating it.

**Part payments are refused, not handled.** Only `Paid` (`.bd.g`) and `Due` (`.bd.w`)
exist, so honouring a payment below the invoice amount would mark a still-owed debt
as settled and paint it green. `recordManualPayment()` returns `PARTIAL_NOT_SETTLED`
(IB-07). The honest answer to "can V1 take a part payment?" is no.

**Discounts and fines are not modelled at all.** `PROJECT_MEMORY` lists them as V1
scope, but `discount|fine|waiver` returns **zero matches** across all three
references — there is no surface to bind to. This needs an owner decision before a
contract (IB-01).

Detail: `docs/fees-map.md` and `docs/fees-blockers.md`.

### 5.5 Two traps to avoid

1. **Do not copy the contract's Base URL into browser code.** The contract says
   `app.baseURL`, "local development typically `http://localhost:8080/`". That is
   for server-side and external callers. Browser code must stay on relative
   same-origin paths, which `core/api/config.js` enforces structurally.
2. **Never bind the mobile `#roles` selector.** The reference states production
   identifies the role from the server account. The guard treats the role as an
   injected value only, so a browser cannot self-assign one.

---

## 6. What Batch A deliberately did *not* do

| Not done | Why |
|----------|-----|
| Copy a reference HTML file into a runtime page | Explicitly forbidden for Batch A |
| Add a loading spinner, skeleton, empty-state block or error banner | Every one would be a visual change. Recorded as `BLOCKED — no approved hook` / open items in `docs/ui-binding-map.md` |
| Model `/health` or `/setup` payloads | No contract published; inventing them is forbidden |
| Add an icon font, chart library, CSS framework or UI kit | All would change the locked visuals; the references already render icons as text glyphs and charts as inline SVG |
| Add a service worker, manifest or push code | PWA/offline/push scope is not approved for Batch A (packet O-10.4) |
| Wire an email, SMS, WhatsApp or payment provider | V1 excludes SMS, online payment gateway and automated WhatsApp. Manual user-initiated WhatsApp PDF sharing only |
| Reconcile `PKR 296K` vs `PKR 12.5k`, or add the `31L` lakh shorthand formatter | Both would change or contradict a locked string. Open item OI-3, owner decision |
| Add a quote builder, billing ledger, ticket composer or template editor UI | No approved layout exists for them. Open item OI-2 |
| Write into `backend/`, `quality/`, `ops/`, shared files or another agent's tree | Outside `frontend/**` ownership |

---

## 7. Read next

| Document | Purpose |
|----------|---------|
| `docs/reference-ui-audit.md` | Approved hashes, structural inventory of all three references, and the locked strings the formatters must reproduce |
| `docs/ui-binding-map.md` | Which existing UI area each future datum binds to, per role, with the required loading/error/empty treatment and the gaps I am not allowed to fill |
| `docs/ui-lock-test-plan.md` | Viewport matrix, colour-scheme passes, content-range rules, manual checklist and merge gate for pixel-identical verification |
| `docs/auth-contract-review.md` | B-O-01: the published contract read in full, compared hook-by-hook against the locked login-related UI |
| `docs/auth-ui-blockers.md` | B-O-06: the nine missing hooks recorded as blockers instead of new UI |
| `docs/provisioning-ui-map.md` | C-O-01/C-O-02: every Super Admin and school-connection UI element mapped to the published control-plane schema |
| `docs/provisioning-ui-blockers.md` | C-O-06: the nine provisioning gaps recorded instead of new UI |
| `docs/school-settings-academic-map.md` | D-O-01/D-O-02: the School Dashboard settings and academic elements mapped to published columns |
| `docs/school-settings-blockers.md` | D-O-06: the eight settings/academic gaps recorded instead of new UI |
| `docs/people-ui-map.md` | E-O-01/E-O-02: the 17 people elements mapped, plus the role privacy policy and selectors |
| `docs/people-blockers.md` | E-O-06: the nine people gaps recorded instead of new UI |
| `docs/attendance-map.md` | F-O-01…F-O-05: attendance controls, submission behaviour and role-safe summaries |
| `docs/attendance-blockers.md` | F-O-06: the eight attendance gaps recorded instead of new UI |
| `docs/curriculum-map.md` | G-O-01…G-O-05: subject/period model, timetable & notice behaviour, navigation and share boundaries |
| `docs/curriculum-blockers.md` | G-O-06: the eight curriculum/PDF gaps recorded instead of new UI |
| `docs/assessment-map.md` | H-O-01…H-O-05: result lifecycle, publication gate, mark and chart safety |
| `docs/assessment-blockers.md` | H-O-06: the eight assessment gaps recorded instead of new UI |
| `docs/fees-map.md` | I-O-01…I-O-05: fee/receipt elements, money rules, ledger states, manual-payment refusals and the no-gateway enforcement |
| `docs/fees-blockers.md` | IB-01IB-09: the nine fee gaps recorded instead of new UI |
| `docs/decision-policy.md` | When I act on my own and when I escalate to the owner |
| `docs/backend-contract-dependency.md` | Batch A contract-state record — superseded by `auth-contract-review.md` |