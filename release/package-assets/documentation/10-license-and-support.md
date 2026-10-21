# 10 — Licence and support

---

## Licensing

### There is no online activation

This version has **no licence server, no activation key entry and no phone-home call.**
Nothing you install will check in with anyone.

Licensing is handled **manually and directly** between you and your provider, which keeps
the product offline-friendly and avoids any third party holding your deployment data.

Your agreement, invoice and licence record are kept by your provider. Keep your own copy.
In this build the provider records those licence invoices, payments and renewals through
the product's internal billing API (see `11-billing-api.md`) — there is no billing screen
yet. The API records what the operator asserts; it does not process money and never
contacts anyone.

School licences themselves are issued and activated through that same control plane — a
school's licence state gates its access — so "no online activation" here means no external
licence server, no key to type in and no phone-home call, **not** an absence of licensing.

---

## Commercial structure

Prices are **negotiated per school**. There is deliberately no public, hard-coded price
anywhere in this product.

| Line item | Meaning |
|---|---|
| Setup / installation | One-time charge for installing and configuring the system for your school |
| First-year licence | The right to use the product for the first year |
| Renewal licence | A separate, later charge to continue use |
| Hosting / domain | Charged separately, and you may use any host |

Plan labels such as **Starter**, **Growth** and **Complete** are proposals only. What your
school actually gets is defined in your written agreement.

---

## What licence expiry does — and does not do

| Expiry **can** | Expiry **must never** |
|---|---|
| End support | Delete school data |
| End updates | Hide or disable the school |
| End new installations | Block the school's data export |

A lapsed licence must not destroy a school's records. If that ever happens, it is a
serious fault and you should escalate immediately.

---

## Templates and design

- **Built-in print templates** are included and free to use.
- **Custom design work** arranged through your provider is a **one-time** charge.
- **Reprints** of an already approved design are **not charged again**.

---

## Support boundaries

### Included

- Installation help
- Migration and database guidance
- Backup and restore assistance
- Defect fixes in later versions

### Not included

- Custom feature development
- Custom report design beyond the one-time arrangement above
- Recovering data you deleted without a backup
- Supporting third-party hosting issues outside the product's control
- Fixing problems caused by manual edits to source files

### How to get help

Contact your provider and send:

1. your domain name
2. your version (see `CHANGELOG.md`)
3. the output of `https://your-domain/health`
4. the last 30 lines of `writable/logs/log-*.log`
5. a plain description of the problem

**Never send passwords or `.env`.**

---

## Version 0.1.0 — important honesty note

This build is a **pre-release**, not a tagged release:

- there is **no Git tag** behind it
- the working tree was **not fully committed** when it was packaged

Treat it as an early build. Back up thoroughly, test on a copy, and expect to refine the
process with your provider. `release/PACKAGE_BUILD_REPORT.md` in the build workspace records
exactly what was and was not verified.

---

**Roman Urdu quick note:** Is version mein koi online activation nahi hai — sab kuch offline
chalta hai. Price har school ke liye alag negotiate hota hai. Setup ek baar ka charge hai,
licence renewal alag. Built-in templates free hain; custom design ek baar ka charge hai aur
dobara print karne par paisa nahi lagega.