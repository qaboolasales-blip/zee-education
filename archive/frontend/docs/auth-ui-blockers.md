# Auth UI Blockers — B-O-06

Every gap below is recorded as a **blocker for the UI owner**. None was filled
with a new UI element, because adding one would be a visible change to a
100% pixel-locked screen.

Each blocker states: what the approved UI lacks, the evidence, why I may not
invent it, and exactly what an owner decision would need to cover.

Evidence source: `agents/opencode/reference_ui/` — SHA-256 verified unchanged,
see `docs/reference-ui-audit.md` and `npm run test:ui-lock`.

## Contract status (updated 2026-10-18, second pass)

KiloCode published a real authentication contract. The endpoints and the
credential scheme now exist — but **no request field names, no JSON response
bodies, and no approved UI controls**. So the blockers below are now *UI*
blockers on top of *contracted* endpoints, not contract blockers:

| Capability | Endpoint | Contract | UI control |
|---|---|---|---|
| Login | `GET/POST /login` | published | **BLK-01** |
| Logout | `GET /logout` | published | **BLK-03** |
| Register | `GET/POST /register` | published | none in any reference |
| Forgot / reset | `GET/POST /forgot`, `/reset-password` | published | none in any reference |
| Refresh | — | **not contracted** | n/a |
| Role vocabulary | — | **published** (`role-permission-policy.md`, seeded into `auth_groups`) | **BLK-04** — the browser still cannot read the role |
| Server-side enforcement | — | **published** (`RoleFilter`, `RolePolicy`) | **BLK-02** — no 403 screen |
| Per-endpoint permission map | — | **not published** | n/a |

Full transcription and the exact unblock requirements are in
`frontend/core/auth/contracts/pending-auth-contract.js` and
`frontend/docs/auth-contract-review.md`.

---

## BLK-01 — No sign-in screen, and no expired-session screen

**Lacks:** any screen where a user authenticates, and any screen shown when a
session expires.

**Evidence.** The only sign-in affordance in any reference is a button that
renders a toast:

```html
<!-- Zee Education — Mobile App Preview.html -->
<button class="btn ghost" onclick="notice('School found - sign-in page khulega')">
  Continue to sign in
</button>
```

The copy even says the sign-in page *will* open — it does not exist. The School
Dashboard and Super Admin references contain no login surface whatsoever.

**Contract status — CHANGED 2026-10-18.** KiloCode added a "Batch B:
Authentication Endpoints" section to `backend/docs/api/openapi-v0.md` and
published `docs/auth-endpoints.md` + `docs/authentication-design.md`. The
endpoint now exists:

| Endpoint | Method | Auth | Success | Failure |
|---|---|---|---|---|
| `/login` | GET/POST | None (public) | 302 redirect to configured redirect | 200 with validation errors |
| `/logout` | GET | Required | 302 redirect to login | — |
| `/register` | GET/POST | None (configurable) | — | — |
| `/forgot` | GET/POST | None | — | — |
| `/reset-password` | GET/POST | None (token-based) | — | — |

The credential scheme is defined: **form-based login via CodeIgniter Shield
Session authenticator**; the server sets the session cookie as part of the 302
that `/login` returns on success. No bearer token, no `Authorization` header,
no client-side storage. `docs/authentication-design.md` confirms the library
(`codeigniter4/shield` ^1.2, MIT, Session authenticator) and lists "Implement
custom policies for the 5 role types" as a NEXT STEP, not as done work.

**What is STILL missing, and why.** The endpoint exists but the contract
publishes **no request field names** ("Authenticates with valid credentials"
never names the form fields) and **no JSON response body** — success is a
redirect, not a payload. So no field may be modelled. And there is still no
approved UI control: a credential form is a new screen with new controls, new
copy and new states. Its absence is also why `SessionState.UNAUTHENTICATED`
and `SessionState.SESSION_EXPIRED` both declare `screen: null` and fall back to
the existing `#toast` (`core/auth/session-state.js`).

**Owner decision needed.** Approve a sign-in screen (fields, labels, error
copy, busy state, forgot-credential path) and an expired-session presentation
(re-authenticate in place vs return to Connect).

---

## BLK-02 — No forbidden / not-authorised screen

**Lacks:** any approved presentation for a valid session with insufficient scope.

**Evidence.** No reference contains a 403 surface, copy or class. The only
transient channel is `#toast`, which auto-hides after 2400 ms with whatever
string the reference already passes to `notice()`.

**Why I did not fix it.** The published contract now defines the semantics —
`403 = "Forbidden — valid auth but insufficient scope"` — but that is a status
code, not a screen. A new screen or new persistent copy is a visual change.

**Owner decision needed.** Approve a forbidden presentation and its exact copy,
and decide whether a toast alone is acceptable for this case.

---

## BLK-03 — No logout control in any reference

**Lacks:** any way for a user to end a session.

**Evidence.** Grep for `logout|sign out|log out` across all three references
returns no match. The closest elements are inert:

| Element | Reference | Behaviour |
|---|---|---|
| `.av` avatar (`AK`, `ZA`) | School Dashboard, Super Admin | No menu, no click handler |
| `Connect another school` button | Mobile Preview | `notice('QR ya manual setup se school switch karein')` — a toast, not a logout |
| System Settings toggles | Super Admin | `this.classList.toggle('off')` — local demo state only |

**Contract status — CHANGED 2026-10-18.** The `/logout` endpoint is now
published (GET, auth required, 302 redirect to login) and the scheme is a
server-side Shield session cookie, so a client call is possible. The frontend
already drops its own session locally in `core/auth/session-state.js`; what is
still missing is (a) the idempotency and server-side revocation semantics, which
the contract states only as "Logout current session", and (b) any approved UI
control. A logout control is a new interactive element and would also need an
approved confirmation treatment, which does not exist.

**Owner decision needed.** Approve a logout entry point (avatar menu, Profile
screen row, or Settings row), its confirmation behaviour, and its copy.

---

## BLK-04 — Role cannot be discovered, and the role selector must never be bound

**Lacks:** a legitimate way for the client to learn the authenticated role.

**Evidence.** The Mobile App Preview states the constraint in its own locked
copy:

> "Role choose karein. Production mein server account se role identify karega —
> user khud admin role select karega nahi."
> *(Role choose karein. In production the server account identifies the role —
> the user will not choose an admin role themselves.)*

So `#roles` / `.role` is a **preview control**. It exists to demonstrate the four
role experiences inside the preview harness. There is no identity or "me"
endpoint in the published contract.

**Why I did not fix it.** Binding live data to `#roles`, or letting it drive
authorization, would be an authorization defect — it would let a browser
self-assign a role, which is exactly what the Batch B exit gate forbids
("Browser cannot self-assign a role/school").

**What I did instead.** `core/auth/role-guard.js` accepts the role **only as an
injected value** representing what the server resolved. It default-denies any
unknown role, and `test/role-guard.test.js` asserts that no unknown, lowercase,
or otherwise altered role string can be authorized on any surface.

**Owner decision needed.** KiloCode must publish an identity/session
introspection endpoint and the exact role vocabulary, so the guard can map server
roles to approved screens.

---

## BLK-05 — No password or OTP input affordance

**Lacks:** any field suitable for a secret entry.

**Evidence.** The references define `.in` and `select` for ordinary inputs
(`Amount`, `Reference`, `Domain`, `Code`) but there is **no** password input, no
`type="password"`, no OTP/verification-code input, no show/hide toggle, and no
`autocomplete` handling anywhere.

**Why I did not fix it.** A secret-entry field needs approved markup, an approved
show/hide control and approved error copy. `.qrart` also cannot serve as a
scannable code (see BLK-09).

**Owner decision needed.** Approve the credential-entry field treatment.

---

## BLK-06 — No rate-limit or lockout presentation

**Lacks:** an approved presentation for `429` and for account lockout.

**Evidence.** The published contract lists `429 — Too many requests`, but no
reference has a lockout, cooldown or throttling surface.

**Why I did not fix it.** New copy and a new visual state would be required.

**Owner decision needed.** Approve the throttling/lockout presentation, and
confirm whether lockout is even in V1 scope.

---

## BLK-07 — The School Dashboard has no role concept at all

**Lacks:** any per-role partitioning of the desktop school workspace.

**Evidence.** `Zee Education — School Dashboard.html` renders one sidebar and
one nav for everybody:

```js
const N=[['Overview','⌂'],['Students','♙'],['Attendance','✓'],['Academics','▤'],
         ['Fees & Accounts','₨'],['Staff & HR','♟'],['Timetable','◷'],
         ['Reports & Print','▣'],['Settings','⚙']];
```

The mobile reference *does* encode roles (`TL` map). The desktop one does not.
Whether students or parents may use the desktop workspace at all is a product
decision, not an integration decision.

**What I did instead.** Least privilege: `School Admin` gets all nine screens,
`Teacher` gets the five modules a teacher can actually use, and `Parent`,
`Student` and `Super Admin` get **none** on this surface. `Super Admin` is denied
because PROJECT_MEMORY states it "does not browse learner data by default".

**Owner decision needed.** Confirm the desktop role matrix, or confirm that the
desktop workspace is school-admin-only and the mobile app is the sole
role-based surface.

---

## BLK-08 — Role-based entry points cannot hide existing navigation

**Lacks:** a way to remove or hide nav entries per role without changing layout.

**Evidence.** Two locked layout facts:

| Surface | Locked CSS | Consequence |
|---|---|---|
| Mobile bottom nav | `.nav{…grid-template-columns:repeat(5,1fr)…}` and `NAV[]` always renders exactly 5 tabs | Removing a tab collapses/relabels the grid — a visual change |
| Sidebar (both desktop refs) | `.nav{display:grid;gap:3px}` with a pinned `.foot{margin-top:auto}` | Removing a row moves the footer — a visual change |

**Consequence for my work.** The role guard returns an allow-list that a caller
may use to *validate a navigation request*, but it must never be used to delete
or hide an existing element. `core/auth/screen-registry.js` records this as
`NAV_ENTRIES_MAY_NOT_BE_HIDDEN = true` and `FIXED_TAB_COUNT = 5`.

Role-based entry points must go on the **Tasks** screen, whose `.tools` grid
(`grid-template-columns:1fr 1fr`) is variable length by design. That is why
`allowedMobileFeatures()` exists as a separate entry point from
`allowedScreens()`.

**Owner decision needed.** Confirm that role-based entry points belong on the
Tasks/tools grid, and that all five bottom-nav tabs stay visible for every role.

---

## BLK-09 — The QR art is decorative, not scannable

**Lacks:** a real, scannable QR code surface.

**Evidence.** `.qrart` renders 81 hard-coded `<i>` cells from a fixed index
list. It is a static illustration, not generated from any payload. The reference
itself says:

> "Camera scan ke liye real app/PWA permission chahiye"
> *(Real app/PWA permission is required for a camera scan.)*
>
> "Production QR short-lived/revocable hota hai, permanent secret nahin."
> *(A production QR is short-lived/revocable, not a permanent secret.)*

**Why I did not fix it.** Real QR scanning needs camera permission, which is a
PWA/app scope decision that is **not approved** (packet O-10.4, batch L-O-04). It
also needs a server-generated, signed, expiring payload — none is contracted.

**Owner decision needed.** Approve the offline/PWA and camera scope, and KiloCode
must publish the QR payload contract (fields, signature, expiry, revocation)
before any parser is written.

---

## Summary

| ID | Blocker | Type | Owner |
|---|---|---|---|
| BLK-01 | No sign-in / expired-session screen (endpoint now published) | UI | UI owner |
| BLK-02 | No forbidden-role screen | UI | UI owner |
| BLK-03 | No logout control (endpoint now published) | UI | UI owner |
| BLK-04 | No identity endpoint; role selector is preview-only | Contract + UI | KiloCode + UI owner |
| BLK-05 | No password/OTP entry affordance | UI | UI owner |
| BLK-06 | No rate-limit/lockout presentation | UI | UI owner |
| BLK-07 | Desktop workspace has no role partitioning | Product | Owner |
| BLK-08 | Nav entries and the 5-tab bar may not be hidden | Layout constraint | UI owner (confirm Tasks grid) |
| BLK-09 | QR art is decorative; scanning needs unapproved PWA scope | UI + contract | Owner + KiloCode |

**Net effect.** Zero UI elements were added. Every state the frontend can
observe today resolves to either an already-approved screen (`Connect`), an
already-approved channel (`#toast`), or a recorded blocker. The endpoints now
exist in the contract, but the frontend still refuses to model request fields
or response bodies that the contract does not publish, and still refuses to
bind any of them to a control that the references do not provide.