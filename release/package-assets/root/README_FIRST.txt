========================================================================
 ZEE EDUCATION  v0.1.0
 Hostinger / shared-hosting installer package
========================================================================

PRE-RELEASE BUILD. There is no Git tag behind this package. Read
CHANGELOG.md and the "honesty note" in documentation/10 before deploying
to real users.


THE 5-MINUTE START
------------------

1. UPLOAD
   Extract this package. Upload the CONTENTS of the  "application"  folder
   into your hosting  public_html.

2. DOCUMENT ROOT  (most common mistake - do this before anything else)
   Point your domain's document root at:

       public_html/public

   "public" is the folder INSIDE public_html. Not public_html itself.

3. PERMISSIONS
   Set these folders to 775 and make sure they EXIST (hosts often drop
   empty folders during upload):

       writable
       writable/cache
       writable/logs
       writable/session
       writable/uploads

4. CREATE THE DATABASE
   hPanel -> Databases -> create ONE database + user for the control plane.
   Write down the exact names hPanel shows you.

5. CREATE YOUR .env
   Copy  application/.env.example  to  application/.env
   Fill in:  CI_ENVIRONMENT, app.baseURL, database.default.*, encryption.key
   Then DELETE the .env.example file.
   Generate a 64-character encryption key.

6. RUN THE INSTALLER
   Open:   https://your-domain.example/install

   Three steps: server checks -> database + migrations -> create Super Admin.

   The installer closes itself when finished. /install then goes to the
   sign-in page.


FULL DOCUMENTATION
------------------

   documentation/index.html   <- open this first (works offline)

   01-requirements
   02-hostinger-installation   <- the full step-by-step
   03-first-run-setup
   04-super-admin-school-provisioning
   05-school-admin-onboarding
   06-backup-restore
   07-update-guide
   08-troubleshooting
   09-security-and-privacy
   10-license-and-support
   11-billing-api              <- provider only: recording licence invoices


VERIFY THE PACKAGE BEFORE UPLOADING
-----------------------------------

   php tools/verify-package.php

Run it inside the extracted folder. It confirms the package is complete and
that it contains no passwords, no .env, no SQL dumps and no leftover files.


TWO RULES YOU MUST NOT BREAK
-----------------------------

1. EVERY SCHOOL GETS ITS OWN DATABASE.
   The control plane holds only school, install and licence-billing records
   (plans, invoices, payments, invitations). It must never hold
   students, guardians, staff, attendance, results or fees.
   If you cannot create a second database in your hosting panel, ask your
   host to create them - then map them in .env with ZEE_SCHOOL_DB_MAP.
   See documentation/02 and documentation/04.

2. NEVER PUT THE DATABASE PASSWORD IN A BROWSER FORM.
   The installer only reads credentials from the server .env file.
   That is deliberate. Do not work around it.


NEVER SHARE
-----------

   .env, database passwords, the encryption key, and database dumps.
   Backups contain real personal data. Store them outside the web root.