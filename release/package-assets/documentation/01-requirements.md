# 01 — Requirements

Check every line **before** you start. The installer will also check most of these for you,
but fixing them afterwards means editing files again.

## Server software

| Requirement | Minimum | Notes |
|---|---|---|
| PHP | **8.2** | 8.2 or 8.3 recommended. PHP 8.1 and below will not work. |
| PHP extension `intl` | required | Used for locale and formatting. |
| PHP extension `mbstring` | required | Required by the framework. |
| PHP extension `mysqli` | required | Database driver. |
| PHP extension `json` | required | Always enabled in PHP 8. |
| PHP extension `openssl` | required | HTTPS and password hashing. |
| MySQL or MariaDB | 5.7 / 10.3+ | MySQL 8.x and MariaDB 10.6+ are fine. |
| Composer | **not required** | Dependencies are already included in the package. |

## Disk and limits

- About **120 MB** of space for the application.
- PHP `memory_limit` of **256M** or more.
- PHP `max_execution_time` of **120** seconds or more (the installer runs migrations).

## Do you need SSH or cron?

- **SSH:** not required. You can install entirely through the hosting file manager.
- **Cron:** not required for installation. It is only needed if you want automatic
  scheduled backups. See guide 06.

## One database per school

You need, at install time:

- **1 control-plane database** for the Super Admin platform.
- **1 additional database for each school.**

On cheap shared hosting you usually cannot create databases from PHP. That is fine — you,
or Hostinger support, create them in the hosting panel, and the application connects to the
correct one. This is fully explained in guide 02.

## Browser

Any current version of Chrome, Edge, Firefox or Safari.

---

**Roman Urdu quick note:** PHP 8.2+ aur `intl` zaroori hai. Composer ki zaroorat nahi —
sab libraries package mein already hain. Har school ka apna database hoga.