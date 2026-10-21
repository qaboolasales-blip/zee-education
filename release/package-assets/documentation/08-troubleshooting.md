# 08 â€” Troubleshooting

Start with the **health endpoint**. Open:

```
https://your-domain/health
```

A healthy site returns (the `time` value will differ):

```json
{"status":"ok","app":"Zee Education","plane":"control-plane","environment":"production","version":"0.1.0","milestone":"M1.2","database":"connected","time":"2026-10-19T23:50:00+05:00","timezone":"Asia/Karachi","currency":"PKR"}
```

If `status` is `degraded` or `database` is `unreachable` or `not_configured`, the problem
is the database connection. Start there.

---

## The installer still shows after installation

Expected behaviour is that `/install` redirects to the sign-in page. If the installer is
still visible, `writable/install.lock` is missing.

Check that `writable/install.lock` exists. If it does and `/install` still shows, your
`writable` folder is not writable, or document root points somewhere unexpected.

Do not delete the lock file on a live site.

---

## `Table '...auth_users' doesn't exist` or similar after login

This means migrations did not finish. Run them in order:

```bash
php spark migrate -n "CodeIgniter\Shield"
php spark migrate -n "CodeIgniter\Settings"
php spark migrate -n "App"
```

Then check:

```bash
php spark migrate:status
```

You should see Shield `create_auth_tables` listed as applied.

> This exact problem happened during development and was caused by running
> `php spark migrate --all`, which skipped the Shield namespace ordering. Always use the
> three explicit commands.

---

## `Access denied for user ... (using password: YES)`

The `.env` credentials do not match the database.

Check in hPanel â†’ Databases:
- the exact database name (with your account prefix)
- the exact username
- the password you set

Make sure `.env` has **no quotes** around the values and no trailing spaces:

```ini
database.default.database = YOURHOST_zee_control
database.default.username = YOURHOST_zee_control
database.default.password = YourPasswordHere
```

Also check that the MySQL user is actually **assigned** to that database in hPanel.

---

## `Unknown database '...'`

The database was not created, or the name is wrong. Create it in hPanel and use the full
name hPanel displays.

---

## The `intl` extension is missing

hPanel â†’ **Advanced** â†’ **PHP** â†’ select version 8.2 or 8.3 â†’ enable `intl`.

The installer will keep showing FAIL until you do.

---

## `Unable to connect to the database` right after editing `.env`

Your edit probably broke the file format.

Common mistakes:

| Mistake | Why it breaks |
|---|---|
| `database.default.password = my"pass` | An unescaped quote breaks the parser |
| `encryption.key = CHANGE_ME...` | Placeholder left in place |
| Lines missing ` = ` | Values are ignored |
| `session.savePath = WRITEPATH . 'session'` | The dotenv parser cannot evaluate expressions â€” delete this line |

Copy `.env.example` again and re-enter values carefully.

---

## Writable folder errors

Create these if they are missing and set them to `775`:

```
writable/cache
writable/logs
writable/session
writable/uploads
```

They are often lost when uploading through a file manager because they are empty.

---

## 500 Internal Server Error

1. Read the log: `writable/logs/log-YYYY-MM-DD.log`.
2. Look at the last `ERROR` or `CRITICAL` line.
3. Common causes: `.env` broken, permissions, migration not run, wrong PHP version.

Logs may show a stack trace while `CI_ENVIRONMENT = development`. In production you get a
plain error page instead â€” that is intentional.

---

## White screen, nothing at all

1. Is `CI_ENVIRONMENT` valid? Only `production`, `development` or `testing`.
2. Is `encryption.key` present and 64 characters?
3. Is the document root the `public` folder?

---

## `Dedicated school database is not reachable`

Provisioning refused to continue. In hPanel confirm:

- the school database exists
- a MySQL user is **assigned to it**
- the name matches `ZEE_SCHOOL_DB_MAP` **exactly** (case matters on some servers)
- the `schooldb.default.*` values in `.env` are correct

Provisioning is safe to retry.

---

## You cannot create a database from PHP

Expected on shared hosting. The application deliberately does not need that permission â€”
databases are created in hPanel and mapped through `.env`. See guide 02.

---

## Login fails although the account exists

1. Reset `CI_ENVIRONMENT = development` **temporarily** and reload the login page â€” Shield
   shows the precise reason.
2. Check the user is `active` in `auth_identities` / `users`.
3. Check the account has a group (`superadmin` or a school role).
4. Set `CI_ENVIRONMENT = production` again afterwards.

---

## The site is slow

- Confirm the correct PHP version is selected.
- Raise `memory_limit` to 256M.
- Check `writable/cache` is writable.
- A very large school database benefits from proper indexing; ask your provider.

---

## Still stuck

Collect these and send them to your provider:

- the output of `https://your-domain/health`
- the last 30 lines of `writable/logs/log-*.log`
- your hosting plan name
- the exact step where it fails

**Never send passwords.** Redact them yourself first.