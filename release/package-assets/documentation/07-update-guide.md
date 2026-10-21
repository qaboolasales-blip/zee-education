# 07 — Updating to a new version

There is **no one-click updater** in this version, and this guide will not pretend
otherwise. Updating is a deliberate, careful operation.

---

## Before you start

- [ ] You have a **test copy** of the site, or at least a full backup of every database.
- [ ] You have backups of **all** databases: control plane **and** every school.
- [ ] You have a backup of your `.env`.
- [ ] You have your current version noted.

> **Never update a production system first.** Copy it, update the copy, and confirm.

---

## The update procedure

### 1. Put the site into maintenance mode (recommended)

Renaming the front controller breaks the site for a few seconds and prevents half-broken
states:

```bash
mv public/index.php public/index.maintenance.php
```

Your host may also have a maintenance switch in hPanel — prefer that if it exists.

### 2. Back up everything

```bash
mysqldump -u DB_USER -p DB_NAME > ~/zee_backups/control_pre_update_$(date +%Y%m%d).sql
mysqldump -u SCHOOL_USER -p SCHOOL_DB > ~/zee_backups/school_pre_update_$(date +%Y%m%d).sql
cp .env ~/env_pre_update_$(date +%Y%m%d).bak
```

### 3. Replace the application files

Upload the new version's `application` contents over the old ones, **overwriting**.

Do **not** delete:

- `.env`
- `writable/`
- `writable/install.lock` (this keeps the installer closed)
- any school database

Do **not** upload:

- `tests/`
- `.env` from the new package (keep your own)

### 4. Run the migrations

Use the terminal in your hosting panel:

```bash
cd ~/domains/YOUR-DOMAIN
php spark migrate -n "CodeIgniter\Shield"
php spark migrate -n "CodeIgniter\Settings"
php spark migrate -n "App"
```

Run them **one at a time, in that order**. Do **not** use `php spark migrate --all`.

> **Why not `--all`?** It searches every registered migration namespace, including the
> school-local one. That would try to create student and attendance tables inside your
> **control-plane database**, which must never hold school data.

Check what happened:

```bash
php spark migrate:status
```

### 5. School databases

School data is not touched by a control-plane update. If a new version adds school tables,
provision or migrate each school database separately using your own mapping.

### 6. Turn off maintenance mode

```bash
mv public/index.maintenance.php public/index.php
```

### 7. Verify

- [ ] `https://your-domain/health` returns `"status":"ok"`.
- [ ] You can sign in as Super Admin.
- [ ] You can sign in to at least one school.
- [ ] Students, attendance, results and fees look right.
- [ ] A school still cannot see another school's data.

---

## Rolling back

If anything is wrong:

1. Put the site into maintenance mode again.
2. Put back the previous version's files.
3. Restore the databases from your pre-update dump.
4. Restore `.env` if you changed it.
5. Turn off maintenance mode.

Rolling back the database dump also rolls back any data entered since the backup. Take a
second backup before you roll back if you want to preserve recent work.

---

## Version notes

Check `CHANGELOG.md` in the package root for what changed in each version.

---

**Roman Urdu quick note:** Update karne se pehle **har database ka backup** zaroor lein.
Phir `--all` na chalayein — teeno commands ek-ek karke chalayein. Agar kuch gadbad ho,
purani files aur purana database dump wapas la dein.