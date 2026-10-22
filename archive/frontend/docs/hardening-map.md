# Integration, security & performance hardening map — Batch M

Scope: the Batch M items that can be *proven* from this package alone. M-O-01 (merged real APIs) and M-O-04 (Cline's UI regression harness) cannot be performed here and are blocked.

---

## 1. M-O-02 — loading/error/empty states use existing approved UI only

The references have no spinner, skeleton, shimmer, error banner, modal, snackbar or drawer backdrop. Their only feedback affordances are:

| Surface | Hook | How it is produced |
| --- | --- | --- |
| toast | `#toast` | `notice(...)` — every preview/error in the references |
| card | `.card{` | existing tiles, cards and badges already carry errors and empty values |

`assertNoCustomStateSurface()` scans `core/**` and fails on any DOM creation (`createElement`, `innerHTML =`, `appendChild`, `insertAdjacentHTML`) or any forbidden surface name outside the declaration module.

`assertStateSurfacesMatchReferences()` re-reads all three references and fails if one *gains* a spinner/skeleton/banner/modal — so a future reference revision that adds one is detected, not silently absorbed.

The empty value itself reuses Batch A's `—` marker (`core/format/empty.js`), so "no data" never renders as an empty cell.

---

## 2. M-O-03 — no development URLs, credentials or debug data

This is the one Batch M deliverable that is a *proof*, not an assertion. `core/hardening/security-scan.js` runs three independent scans over every module in `core/**`:

| Scan | View of the code | Catches |
| --- | --- | --- |
| `assertNoDevelopmentUrls()` | string literals only | absolute URLs, `localhost`, loopback, `.local`/`.test`/`.internal`, dev ports, tunnel hosts |
| `assertNoSecretIdentifiers()` | executable tokens only | `password`, `secret`, `api_key`, `access_token`, `refresh_token`, `private_key`, `client_secret`, `session_secret`, `passphrase` |
| `assertNoDebugArtifacts()` | executable tokens only | `console.*`, `debugger`, `var_dump`, `print_r`, `var_export` |

Each view is chosen so the guard cannot defeat itself:

- **URLs** are read from string *literals*, so the guard's own regex — which names `localhost` inside a pattern — is never examined as a value. A literal must also contain `:` to be considered, so a bare word like `localhost` (often prose or a label) is not flagged.
- **Secrets** are matched as *identifiers*, so they survive literal stripping while the pattern list that names them does not. A string value containing the word is not a secret.
- **Debug calls** are matched as calls, which a guard cannot contain without being the bug.

`auditReleaseSource()` runs all three and returns one verdict.

### Two findings from the first run, both instructive

1. **The URL scan flagged its own label.** `DEVELOPMENT_URL_PATTERNS` included `{ label: 'localhost', pattern: /localhost/i }`, and `label` is a string literal — so the scan read its own label as a URL. Fixed by requiring a host/port separator before considering a literal.
2. **The secret scan flagged the standard `fetch()` option.** `credentials: 'omit'` in `core/api/client.js` and `core/api/config.js` is the standard fetch option, not a secret. `credential`/`credentials` were removed from the list — proof the identifier list must stay specific.

---

## 3. Contract dependency

M-O-01 and M-O-04 remain BLOCKED:

| ID | Capability |
| --- | --- |
| `integration-smoke` | run every role flow end to end against the merged real APIs |
| `backup-restore` | prove backup and restore for a school database |
| `ui-regression-matrix` | compare the built UI against all three references at three widths |

`assertNoInventedIntegrationSchemas()` fails the suite if any gains a method, path, schema or `implemented: true`.

---

## 4. What was verified

`npm run check` — UI lock unchanged, all tests pass. Of these, 20 are the Batch M suite in `test/hardening.test.js`, covering the state-surface audit, the three release scans (each with a positive whole-tree pass and negative cases), and the fail-closed registry.

No HTML, CSS, image, font or runtime page was added to `frontend/`.
