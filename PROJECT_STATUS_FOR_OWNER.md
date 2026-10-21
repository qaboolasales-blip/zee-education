# PROJECT STATUS FOR OWNER

Updated: 2026-10-20

## 1. One-line truth

PROJECT STATUS: **BLOCKED** — the product works and its package verifies clean, but the
release gate has never been passed: no live smoke test of the current build, no
owner-approved role accounts for the role smoke tests, no Git tag, and one exposed
password is still unrotated.

## 2. What is genuinely complete and evidenced

- Backend PHPUnit: **161 tests, 653 assertions, 0 skipped, 0 failures**
  (`php vendor/bin/phpunit --no-coverage`; grew from 155/621 when the
  2026-10-20 security-hardening round added `SecurityHeadersRuntimeTest`).
- Frontend `npm run check` (UI lock + tests): **816 tests, 816 pass, 0 fail**. Five
  Batch-C-era gate snapshots had gone stale when the billing/connect work landed;
  they were updated to the current route surface (2026-10-20 round, recorded in
  `backend/FINAL_RELEASE_AND_PILOT_REPORT.md`).
- Composer audit clean; PSR-4 autoloader generation clean.
- Three approved UI HTML SHA-256 hashes match the lock exactly (`deec1fceb…` Mobile,
  `56d82bef…` School, `df876fbc…` Super Admin). No reference file was ever modified;
  the app uses separate tokenised runtime copies.
- Installer proven end to end from the shipped ZIP: preflight 14/14, correct migration
  order, Super Admin created, install locked, sign-in succeeded.
- One-school-one-database proven on a real Hostinger deployment: 0 school-local tables in
  the control plane, 0 control-plane tables in a school database, both directions denied
  at the privilege layer (`ERROR 1142`), backup/restore drill run on both databases.
- Cross-school isolation, provisioning state machine and idempotency proven — the
  latter now also at schema level: migration `2026-10-20_000016` puts a UNIQUE
  `idempotency_key` on `provisioning_jobs` (RB-4 closed 2026-10-20), with five
  behavioural tests (`ProvisioningIdempotencyTest`) covering DB rejection of
  duplicate keys, duplicate school-code refusal and the completed-school re-provision
  no-op.
- Package (build 8, 2026-10-20): `build-package.ps1` verifier **35 checks, 0 failures, 0
  warnings** on the build tree; clean extraction proven byte-identical to staging
  (matching recursive tree hash, 1,308 files); shipped `tools/verify-package.php`
  re-run inside the extracted ZIP: **35/35**.
  ZIP SHA-256 `b249281c81269432950c644669ba3635f56e05b287366dc1835840db784098ab`
  (4,107,190 bytes; supersedes builds 7/6/5 (`11fb712e…` / `d1f3df4f…` / `b0cd78a6…`,
  kept as `*.zip.bak-20261020-183756` / `-093116` / `-085852`); builds 6-8 were
  documentation-only corrections (licence-limitation wording, changelog/doc10
  clarifications, control-plane table count 14 → 21). Builds 4/3/2/1 kept as
  `*.zip.bak-20261020-083633` / `-052205` / `-025056` / `*.zip.bak-20261019-224837`).
  No `.env`, no private keys, no hosting account id, no pilot test data shipped.
- Licences, billing invoices/payments, QR school invites and the Super Admin billing API
  are built, documented (`backend/docs/api/billing-api.md`, also shipped to buyers as
  `documentation/11-billing-api.md`) and covered by tests.

## 3. What is built but not verified yet

- The current package has **not been deployed**. Build 5 was produced and verified
  locally; no live host was touched in this pass and neither production database was
  read or written (both local databases were migrated only). The smoke checklist is in
  `release/RELEASE_NOTES_v0.1.0.md` ("Before you sell this").
- The 6 new licence migrations have never run against a live database (nor has
  migration `2026-10-20_000016`, the provisioning idempotency guard — both are
  covered only by local test databases).
- Role smoke tests (Super Admin / School Admin / Teacher / Parent / Student) have never
  run — no owner-approved accounts exist.
- The QA matrices have not been executed row-by-row against live accounts:
  `quality/docs/tenant-isolation-test-matrix.md` T-1..T-24 (isolation is proven at the
  privilege layer and by automated tests, but the behavioural matrix has no execution
  record) and T-25..T-27 (licence expiry on a live school; unit-level evidence exists).
  `ops/release-gates.md` (re-evaluated 2026-10-20) tracks these — gates G6/G7/G8 are
  still NO-GO for exactly these reasons.
- CSRF verification is now active **globally** (build 5, 2026-10-20): the school write
  API, `/admin/schools*` POSTs and Shield's own sign-in/2FA/magic-link forms all refuse
  token-less mutations with `403`; `/api/admin/billing/*` keeps its dedicated
  `api_csrf` filter so its documented JSON `{error: csrf_required}` contract is
  unchanged. A prior concern that "turning verification on blindly would break clients
  that do not send tokens" was resolved by the client audit
  (`quality/docs/csrf-client-audit.md`): every live HTML form already carries
  `csrf_field()`, and the portal/PWA shells contain zero mutating client code — so
  nothing broke, and the suite is green at 164/671 with the filter on. Remaining CSRF
  hardening (recorded limitations, not gaps): `tokenRandomize=false` and no CSP
  (needs per-view nonces).
- The CI workflow now exists (`.github/workflows/ci.yml`: PHP 8.3 + the required
  extensions, MySQL 8.0 service, Node 24) and its exact backend recipe was validated
  locally from **empty** databases on 2026-10-20 (control/test migrations + plan seed +
  separate school schema + suite `OK (155 tests, 621 assertions)` — the suite has since
  grown to **164/671** with the security-header and connect-API tests, and was
  re-validated from fresh empty harness DBs in the build-5 CSRF round, green on the same
  recipe). It has never run on
  a remote runner — the repository has no git remote — so gates G1/G2 stay NO-GO until
  the owner pushes and the first run logs green.

## 4. What is not complete / blocked

1. **No live smoke test of the current build** — this is the main remaining gate.
2. **No role smoke tests** — attendance, results, manual fees, report/PDF export and
   role-restricted access are unverified end to end.
3. **No Git tag.** The working tree has ~171 uncommitted entries, so nothing is
   reproducible from a tag and `package-manifest.json` records `"git_tag": null`.
4. **The SSH password exposed earlier in chat has still not been rotated by the owner.**
   That credential is live.
5. No independent third-party Hostinger buyer-account test.
6. CSRF gap (was: billing-only verification) — **closed 2026-10-20, build 5**; see
   section 3. Only recorded hardening limitations remain (`tokenRandomize`, CSP nonces).

(Closed since the previous revision: RB-4, the `provisioning_jobs` idempotency
guard — see section 2 and `quality/docs/defect-release-blocker-report.md`; RB-7,
the CSRF/secure-headers/CORS/session-fixation bundle — fully closed in the
2026-10-20 rounds, residual hardening tracked as SC-2/SC-6.)

## 5. UI status

- All three approved reference HTML SHA-256 hashes match `REFERENCE_UI_LOCK.md`.
- No reference UI file was created, modified, moved or shipped.

## 6. Tracker summary

- `UNIVERSAL_FULL_PROJECT_TRACKER.md` does not exist in this repository; task counts are
  not verifiable from a tracker, so no completion percentage is claimed.

## 7. Next 6 exact actions

1. Commit the working tree and create a Git tag — repo owner — proof: `git status` clean
   and `git tag -l` shows the tag; rebuild so the manifest is not `null`.
2. Rotate the exposed SSH password — repo owner — proof: old password rejected.
3. Deploy the rebuilt ZIP to a **staging** database (not production) — ops — proof: the
   three migration namespaces report "Migrations complete", all 6 licence tables exist
   and `provisioning_jobs.idempotency_key` is present with its unique index.
4. Re-run the isolation check after those migrations: 0 school-local tables in the
   control plane, 0 control-plane tables in the school database — ops — proof: table list.
5. Run the smoke checklist from `release/RELEASE_NOTES_v0.1.0.md` including invoice
   issue/pay/void, a missing-CSRF-token `403`, and a fresh PWA install of `/m` — QA —
   proof: endpoint responses recorded.
6. Create the five role accounts and run the role smoke tests — QA — proof: test log;
   only then may `FINAL_RELEASE_STATUS` move to `GO`.

## 8. Final release decision

**BLOCKED.** Everything that can be verified without a live environment has been verified
and is recorded in `backend/FINAL_RELEASE_AND_PILOT_REPORT.md` and
`release/PACKAGE_BUILD_REPORT.md`. Nothing in this document claims a completed release,
a tagged release, marketplace approval or a finished pilot.
