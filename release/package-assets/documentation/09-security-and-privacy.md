# 09 — Security and privacy

This document explains what the platform enforces, what you must do, and what it cannot do
for you.

---

## The core security model

### One school = one database

This is the most important guarantee in the product.

| Guarantee | Why |
|---|---|
| The control plane never holds student, guardian, staff, attendance, result or fee tables | Platform staff cannot casually read school data |
| A school database cannot be reached by the control-plane user | Verified: the database rejects it with a permission error |
| A school user cannot read the control plane | Verified: the database rejects it |
| A shared table scoped only by a tenant ID is **forbidden** | It would put every school's data in one blast radius |

Verified separation on a live deployment:

```
school-local tables inside control plane : 0
control-plane tables inside school db    : 0
control user writing into school db      : ERROR 1142 (denied)
school user writing into control db      : ERROR 1142 (denied)
```

This is enforced by database privileges, not just by application code.

---

## What the application does for you

- **Password hashing** through CodeIgniter Shield.
- **Login throttling** (auth-rates) against brute force.
- **Email identity sync** so password changes update every identity.
- **Cross-site request forgery** — a token is verified on **every
  state-changing request** (the framework's global `csrf` filter): the
  installer wizard, Shield's sign-in/2FA/magic-link forms and every API.
  A request that arrives without a valid token is refused with `403` before
  it reaches any controller. The Super Admin billing API additionally keeps
  its dedicated filter so API clients receive a machine-readable JSON
  `403 {error: csrf_required}` instead of an HTML error page. Session
  cookies are `SameSite=Lax` and `HttpOnly`, so browsers also refuse to
  attach them to cross-site requests — belt and braces.
- **Install lock** — the installer closes itself once installation completes.
- **Strong installer password rules** — 12+ characters, mixed case, a number.
- **No debug output in production** — errors go to logs, not to the browser.
- **A health endpoint that discloses nothing sensitive** — no host, no paths, no
  PHP or database version, no credentials. It returns only the product version,
  the environment name, the database reachability as a bare
  `connected` / `unreachable` / `not_configured` string, and timezone/currency
  settings.
- **CORS allow-list** — no `Access-Control-Allow-Origin: *` on authenticated
  endpoints. With `app.corsAllowedOrigins` empty, no CORS header is emitted at
  all; configured origins are echoed explicitly (including on `OPTIONS`
  preflights), and a wildcard value is rejected by the configuration itself.
- **Security headers on every response** — `X-Frame-Options: SAMEORIGIN`,
  `X-Content-Type-Options: nosniff`, `X-Download-Options: noopen`,
  `X-Permitted-Cross-Domain-Policies: none` and `Referrer-Policy: same-origin`.
  A `Content-Security-Policy` is **not** emitted in this build (the views rely
  on inline scripts; enabling it needs per-view nonces — planned).
- **Strict session cookie flags** in production — `HttpOnly` + `SameSite=Lax`
  always, and the `Secure` attribute whenever `cookie.secure = true` (the
  shipped `.env` template sets it; switch it off only for plain-HTTP local
  development).

---

## What you must do

### Secrets

- The `.env` file holds your database password and encryption key.
- **Never** email it, paste it in chat, or commit it to Git.
- It is excluded from the distributed package.
- Anyone who can read `.env` owns your data. Treat it like a bank password.

### File permissions

| Path | Permission |
|---|---|
| `.env` | **600** if your host allows it, otherwise 640 |
| `writable` | 775 |
| everything else | 644 files / 755 folders |

### Web root

The document root must be the `public` folder. Verify these URLs all return **404**:

```
/.env
/app/Config/Database.php
/vendor/autoload.php
/writable/logs/
```

If any downloads, stop and fix it.

### HTTPS

Turn on SSL and keep `app.baseURL` on `https://`. In production
`app.forceGlobalSecureRequests` is enabled.

---

## Access control

| Role | Can |
|---|---|
| Super Admin | Manage schools, installations, commercial records |
| School Admin | Manage only their own school |
| Teacher | Only assigned classes and subjects |
| Parent/Guardian | Only their own linked children |
| Student | Only their own information |

Rules:

- Never share accounts. Every login is recorded.
- Never trust a school ID supplied by the browser. The server resolves it.
- Least privilege by default.
- A Super Admin does not browse learner data by default.

---

## Privacy

- No real student data was used to build or test this product.
- No personal data belongs in `.env`, logs, tests or source control.
- Logs record errors, not credentials. Still review them before sharing with support.
- Backups contain real personal data. Store them as carefully as the live database, and
  delete them on a schedule.
- Data belongs to the school. Licence expiry must never delete, hide, block or prevent
  export of a school's data.

---

## Deliberately not implemented

These are excluded on purpose, and adding them yourself weakens security:

- No SMS gateway integration
- No online payment gateway
- No unofficial / QR WhatsApp Web automation
- No automated WhatsApp Business API
- No native app-store packaging

---

## Reporting a security problem

Contact your provider privately. Do not post database details, screenshots containing
real data, or credentials in public places.

---

**Roman Urdu quick note:** Har school ka apna database hota hai — is se ek school ka data
doosre school se poori tarah alag rehta hai. `.env` file ko kabhi kisi ko mat bhejein.
Document root `public` folder hona chahiye, warna `.env` internet par khul jayega.