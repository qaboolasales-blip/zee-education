# 04 â€” Super Admin: creating and provisioning a school

This guide is for the **Platform Owner / Super Admin** only.

The Super Admin runs the control plane. It manages schools, installations and commercial
records. It **never** browses learner data.

---

## What you are actually creating

Creating a school in the control plane only creates a **record**. To make the school usable
you must also give it its **own database**, and the system applies the school schema to that
database.

One school, one database. Never a shared table.

---

## Step 1 â€” Create the database first (recommended on shared hosting)

Do this in hPanel **before** adding the school, so the provisioning step succeeds on the
first try.

1. hPanel â†’ **Databases** â†’ **Create a New MySQL Database and Database User**.
2. Use a clear name, for example:

   | Field | Value |
   |---|---|
   | MySQL database name | `school_alpha` |
   | MySQL username | `school_alpha` |
   | Password | strong unique password |

3. Create it.
4. Write down the **exact** final database name and user (with your account prefix).

---

## Step 2 â€” Tell the server which database belongs to which school

Open your server `.env` file and add a mapping line:

```ini
ZEE_SCHOOL_DB_MAP = alpha=YOURHOST_school_alpha
```

For several schools, separate them with commas:

```ini
ZEE_SCHOOL_DB_MAP = alpha=YOURHOST_school_alpha,beta=YOURHOST_school_beta
```

The part before `=` is the **school code** you will type in the next step.

You may also set the credentials for the school database:

```ini
schooldb.default.hostname = localhost
schooldb.default.database = YOURHOST_school_alpha
schooldb.default.username = YOURHOST_school_alpha
schooldb.default.password = THE-SCHOOL-PASSWORD
schooldb.default.port     = 3306
ZEE_SCHOOL_DB_PREFIX = YOURHOST_school_
```

> These values stay on the server. They are never typed into a browser form and are never
> shown back in any screen.

---

## Step 3 â€” Create the school in the Super Admin panel

1. Sign in as Super Admin.
2. Go to the schools section and add a new school.
3. Fill in:

   | Field | Notes |
   |---|---|
   | School name | The school's real display name. |
   | Status | Active. |
   | School code | Must match the code in `ZEE_SCHOOL_DB_MAP`, e.g. `alpha`. Lowercase letters and numbers only. |
   | Timezone | e.g. `Asia/Karachi` |
   | Currency | e.g. `PKR` |
   | Contact email / phone | School's contact details. |

4. Save. The school record now exists in the control plane.

---

## Step 4 â€” Provision the school database

Run provisioning for the new school. It will:

1. Check the dedicated database is reachable.
2. Apply the **school-only** migrations to it (classes, sections, subjects, students,
   guardians, staff, attendance, assessments, fees, notices, homework, timetables, reports).
3. Mark the school as `completed`.

If step 1 fails you will see a clear message such as:

```
Dedicated school database is not reachable: YOURHOST_school_alpha
```

That means the database does not exist, or the credentials in `schooldb.*` are wrong, or the
MySQL user has no rights on it. Fix that in hPanel and retry â€” provisioning is safe to
retry. It will not create duplicates or corrupt a partly provisioned school.

---

## Step 5 â€” Check the separation

You should be able to confirm that school data and platform data are in different
databases:

| Question | Expected answer |
|---|---|
| Which database holds the school record? | control plane |
| Which database holds classes/students/fees? | the school's own database |
| Does the control plane contain a `students` table? | **no** |
| Does the school database contain a `users` table? | **no** |

---

## Step 6 â€” Give the school its School Admin account

Create the School Admin account for that school. The account must be tied to that school
only. A School Admin must never be able to reach another school's data.

See guide 05 for what the School Admin does next.

---

## Removing a school

There is no destructive "delete school" button on purpose. Removing a school means its
database must be dealt with by you or your host, deliberately, with a backup taken first.
Licence expiry alone must never delete, hide or block a school's data.

---

**Roman Urdu quick note:** School banane ke liye pehle hPanel mein us school ka database
bana lein, phir `.env` mein `ZEE_SCHOOL_DB_MAP` se map karein, phir Super Admin panel mein
school record banayein aur provision karein. Har school ka data apne database mein hoga.