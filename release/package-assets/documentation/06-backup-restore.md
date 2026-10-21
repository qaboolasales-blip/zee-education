# 06 — Backup and restore

If you take one thing from this manual, take this one. A backup you have never restored is
not a backup.

---

## What must be backed up

| Database | What it holds | Why |
|---|---|---|
| **Control plane** | School records, installations, commercial records | Losing it loses your whole business record |
| **Each school database** | Students, guardians, staff, attendance, results, fees | These are the school's real data |

Because each school has its **own database**, a school can also be backed up and restored on
its own — without touching other schools or the control plane.

---

## Never store backups where the web can reach them

Put backups **outside** the document root.

Bad (web-reachable, dangerous):

```
public_html/backup.sql
public_html/writable/backups/
```

Good:

```
~/zee_backups/
~/backups/zee/
```

On Hostinger, anything inside `~/domains/<your-domain>/public_html` **or inside the
document root you pointed it at** is public. Keep backups in your home directory.

---

## Making a backup manually

If your host gives you phpMyAdmin, use **Export** for each database and save the `.sql` file
to your computer. That is the single most important thing you can do.

If you have SSH or Terminal:

```bash
# control plane
mysqldump -u DB_USER -p DB_NAME > ~/zee_backups/control_$(date +%Y%m%d-%H%M%S).sql

# one school
mysqldump -u SCHOOL_DB_USER -p SCHOOL_DB_NAME > ~/zee_backups/school_alpha_$(date +%Y%m%d-%H%M%S).sql
```

Never type the password into the command where other people can see your history — the
`-p` prompt asks for it.

Back up these files too:

- `.env` (store it securely, never in a shared folder)
- school logo / uploaded branding files

---

## Scheduling automatic backups

1. hPanel → **Advanced** → **Cron Jobs**.
2. Add a job, for example twice a day:

   ```bash
   0 2,14 * * * /usr/bin/mysqldump -u DB_USER -pPASSWORD DB_NAME > /home/YOURUSER/zee_backups/control_auto_$(date +\%Y\%m\%d).sql
   ```

   Your host will show you the correct PHP/binary paths and the cron format it expects.

3. Add one line per database.
4. **Check the files actually appear.** A cron job that silently fails is worse than none.

Keep about 7–30 days of backups, depending on your data volume.

---

## Restoring

### Restoring one school database

1. Take a **fresh backup of everything first**.
2. Confirm the target is the correct school database. Double-check the name.
3. Drop the current tables in that school database (or ask your host to recreate the
   database with the same name).
4. Upload and run the `.sql` file.
5. Sign in and confirm the data is there.

### Restoring the control plane

Same process, against the control-plane database. Expect all school records and commercial
records to come back.

> **Important:** restoring the control plane does **not** restore individual school
> databases. Each one is separate, and each must be restored separately.

---

## Verify your restore works

After any restore, check:

- [ ] Can you sign in as Super Admin?
- [ ] Do all schools appear with the correct names?
- [ ] Can you sign in to one school and see students?
- [ ] Does a fee invoice show the right amounts?
- [ ] Does the school see only its own data?

Write the date of your last successful restore test somewhere you will remember.

---

## Data ownership and licence expiry

Licence expiry must **never** delete, hide, or block a school's data, and must never block
their export. If a licence lapses, you may lose support — not their data.

---

**Roman Urdu quick note:** Control plane **aur** har school ka database alag backup karein.
Backup ko `public_html` ke bahar rakhein — wahan se internet par dekh sakte hain. Har
school ki alag database hai, is liye aap ek school ko akele restore kar sakte hain.