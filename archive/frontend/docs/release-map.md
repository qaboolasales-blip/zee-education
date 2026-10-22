# Pilot release, monitoring & handover map — Batch N

Scope: the Batch N items that can be verified from this package, plus the handover documentation N-O-04 permits.

---

## 1. N-O-01 — production endpoints are relative

`core/release/production-config.js` validates a release configuration on top of the Batch A config module:

| Check | Rule |
| --- | --- |
| base path | relative only — rejects `http://…` and `//…` |
| environment | `NODE_ENV` / `ENV` / `APP_ENV` must not be a non-production value |
| debug | `debug: true` is refused |
| config keys | only `ALLOWED_CONFIG_KEYS` are accepted |
| credentials | only `same-origin` / `omit` |
| env base path | `ZEE_API_BASE_PATH` must also be relative |

`productionReadiness()` collects **every** reason and returns `{ ready, basePath, reasons }`; `assertProductionConfig()` throws with the same list.

The default production configuration is `{ basePath: '/api' }` with no environment override.

---

## 2. N-O-03 — the share boundary holds in a release build

A pilot environment does not relax V1 sharing. `assertReleaseShareBoundary()` re-runs the Batch G gate:

- only an approved trigger may initiate a share (`TRG-01`…);
- `userInitiated === true` is required;
- a named `destination` is refused (the code never chooses the channel);
- a PDF requires `mediaType: application/pdf` and a `documentRef`.

---

## 3. N-O-04 — role onboarding text

N-O-04 permits concise role onboarding/help text **only if it fits existing approved UI or external documentation**. Since adding help text to the locked screens would be a visual change, the handover text is external: `docs/role-onboarding.md`.

---

## 4. Contract dependency

| ID | Capability |
| --- | --- |
| `pilot-ui-comparison` | compare the deployed UI against all three references in real browsers |
| `pilot-pdf-sharing` | validate manual PDF sharing/download flows in the pilot environment |

Both BLOCKED — no deployment and no render endpoint. `assertNoInventedReleaseSchemas()` fails the suite if either gains a method, path, schema or `implemented: true`.

---

## 5. What was verified

`npm run check` — UI lock unchanged, all tests pass. Of these, 16 are the Batch N suite in `test/release.test.js`, covering the production configuration validator, the release share boundary and the fail-closed registry.

No HTML, CSS, image, font or runtime page was added to `frontend/`.
