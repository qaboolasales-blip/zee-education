# 03 — First-run setup wizard

Once your files are uploaded, `.env` is filled in and the document root points at `public/`,
open your browser and run the installer.

Go to:

```
https://your-domain.example/install
```

The installer has three steps. It is a real installer: it actually tests your server, runs
real database migrations and creates a real account. Nothing is faked.

---

## Step 1 — Server requirements

The page lists every check with PASS, CHECK or FAIL.

| Result | Meaning |
|---|---|
| **PASS** | Good, nothing to do. |
| **CHECK** | A warning. Acceptable during a local test, fix it before going live (currently only used for a non-HTTPS base URL on localhost). |
| **FAIL** | Must be fixed. The red text under it tells you exactly how. |

Typical failures and fixes:

| Failing check | Fix |
|---|---|
| PHP 8.2 or newer | Ask your host to set PHP 8.2 or 8.3 for this domain. |
| extension `intl` | Enable it in hPanel → Advanced → PHP. |
| Writable folder | Create the folder, set it to 775. |
| Web root points at public/ | Change the document root (guide 02, step 4). |
| HTTPS base URL configured | Set `app.baseURL` in `.env` and enable SSL. |
| Control-plane database configured | Fill the `database.default.*` values in `.env`. |

When everything is green, click **Continue to database step**.

> **Note:** database values can **not** be typed into the installer. It deliberately only
> tests what is already in your server `.env`. This is a security decision: a browser form
> that accepts a database password is a liability.

---

## Step 2 — Control-plane database and migrations

The installer tests the connection. If it succeeds you will see a green message.

Click **Run database setup**. The installer runs migrations in this exact order:

```
1. CodeIgniter Shield     (authentication tables)
2. CodeIgniter Settings   (settings table)
3. Zee Education          (schools, domains, provisioning, audit, commercial,
                           licences, invites, user-school access)
```

You will end up with about 21 tables (the school database is separate and holds
about 22 school-local tables — see `database/README.md`). You do **not** run any
command yourself.

If a migration fails, the installer stops and shows a safe message. The technical details
go to `writable/logs/`. See guide 08.

---

## Step 3 — Create the Super Admin

Fill in:

| Field | Rule |
|---|---|
| Email | Must be a valid address. This is your sign-in name. |
| Username | Letters, numbers, dot, underscore, dash. 3–32 characters. |
| Password | At least **12 characters**, with an uppercase letter, a lowercase letter and a number. |

Click **Create Super Admin and finish**.

---

## Finished

You now see the completion page and are redirected towards sign-in.

The installer wrote a lock file to `writable/install.lock`. From now on:

- `/install` redirects to the sign-in page
- the installer cannot be run again
- deleting `writable/install.lock` would re-open it — **do not do that in production**

Verify: open `https://your-domain.example/install` again. You should land on the sign-in
page, not the installer.

---

## After installation

1. Sign in with your Super Admin account.
2. Create your first school — see guide 04.
3. Give that school its own database — see guide 02, last section, and guide 04.
4. Set up backups — see guide 06.

---

## If you need to run the installer again

Only if something failed and you have **no real data** yet.

1. Delete the control-plane database tables (or ask your host to drop and recreate the
   database).
2. Delete `writable/install.lock`.
3. Delete the contents of `writable/logs` and `writable/session`.
4. Reload `/install`.

If you already have real school data, **do not**. Restore from a backup instead.

---

**Roman Urdu quick note:** Installer 3 step hai — server check, database setup, aur Super
Admin banana. Iske baad `/install` band ho jata hai. Database ka password installer mein
nahi daalte — woh sirf `.env` se padha jata hai.