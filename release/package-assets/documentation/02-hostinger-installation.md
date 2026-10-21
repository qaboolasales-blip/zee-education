# 02 â€” Hostinger installation

Follow these steps in order. Do not skip ahead â€” later steps depend on earlier ones.

---

## Step 1 â€” Create the domain or subdomain

1. Open hPanel â†’ **Websites**.
2. Choose the domain you already own, or create a new **subdomain**
   (for example `school.yourdomain.com`).
3. Enable **SSL** for that domain. Do this now; the installer warns you if HTTPS is not
   configured.

**Safety check.** If your domain's document root currently points at another live site,
**stop**. On Hostinger the folder `~/domains/<your-domain>/public_html` may be a symlink to
a different application folder. Deleting it would destroy that other site. Check with your
host first.

---

## Step 2 â€” Create the control-plane database

1. hPanel â†’ **Databases** â†’ **Create a New MySQL Database and Database User**.
2. Fill in:

   | Field | Value |
   |---|---|
   | MySQL database name | `zee_control` |
   | MySQL username | `zee_control` |
   | Password | a strong password you choose |

   Hostinger prefixes both with your account ID, so you will end up with something like
   `YOURHOST_zee_control`. **Write down the final names exactly as hPanel shows them.**

3. Click **Create**.
4. Note the final **database name**, **username** and **password**. You need all three.

---

## Step 3 â€” Upload the files

1. Download and extract the package on your computer. You will get a folder like
   `Zee_Education_v0.1.0`.
2. hPanel â†’ **Files** â†’ **File Manager**.
3. Open `domains/<your-domain>/`.
4. Upload the **contents of the `application` folder** (not the folder itself) into
   `public_html`.

   Result should look like:

   ```
   public_html/
     app/
     public/
     vendor/
     writable/
     spark
     composer.json
     .env.example
     index.php   (inside public/, see next step)
   ```

5. Delete `public_html/default.php` if one exists â€” it is the Hostinger placeholder.

---

## Step 4 â€” Point the document root at `public/`

This step is critical. `app/`, `vendor/` and `.env` must never be reachable from the web.

1. hPanel â†’ **Websites** â†’ your domain â†’ **Domains** (or **Advanced**).
2. Find the document root setting.
3. Change it to:

   ```
   domains/<your-domain>/public_html/public
   ```

   Hostinger usually shows this as `public_html/public`.

> If your host does not allow changing the document root, ask Hostinger support to set it
> for you, or move the contents of `application/public/*` up into `public_html` **and**
> move the rest one level in. Ask support first â€” guessing here can break the install.

---

## Step 5 â€” Set permissions

In File Manager, right-click â†’ Properties:

| Folder | Permission |
|---|---|
| `writable` | **775** |
| `writable/cache` | 775 |
| `writable/logs` | 775 |
| `writable/session` | 775 |
| `writable/uploads` | 775 |
| `application` | 755 or 775 |
| everything else | 644 for files, 755 for folders |

Make sure `writable/cache`, `writable/logs`, `writable/session` and `writable/uploads`
**exist**. Some hosts do not create empty folders during upload.

---

## Step 6 â€” Create the real `.env` file

1. In File Manager, open the `application` folder.
2. Find `.env.example`.
3. Make a **copy** of it and name the copy `.env` (exact name, no `.txt` ending).
4. Open `.env` and fill in:

   ```ini
   CI_ENVIRONMENT = production

   app.baseURL = 'https://your-domain.example/'

   database.default.hostname = localhost
   database.default.database = YOURHOST_zee_control
   database.default.username = YOURHOST_zee_control
   database.default.password = YOUR-PASSWORD-HERE
   database.default.DBDriver  = MySQLi
   database.default.charset   = utf8mb4
   database.default.DBCollat  = utf8mb4_unicode_ci
   database.default.port      = 3306

   encryption.key = PASTE_A_64_CHARACTER_RANDOM_STRING_HERE
   ```

5. **Delete `.env.example`** after you have made the copy, so there is only one `.env`
   and no confusion.

> **Important:** the `.env` file is your most sensitive file. It is not shipped in this
> package and must never be emailed, pasted in chat, or committed to Git.

### Generating an encryption key

You can ask your host to run this, or generate one online in any "random string" tool.
It must be exactly 64 hexadecimal characters.

---

## Step 7 â€” Check it loads

Visit `https://your-domain.example/install`

You should see the installer with a list of server checks. If everything is green you can
continue to guide 03.

---

## If Hostinger will not let you create a second database per school

Some shared plans allow only a limited number of databases, or none from PHP at all.

**That is fine.** This is the supported way to run this product:

1. Create each school's database **in hPanel**, one at a time, one MySQL user each.
2. Add the mapping to your server `.env`:

   ```ini
   schooldb.default.hostname = localhost
   schooldb.default.database = YOURHOST_my_school
   schooldb.default.username = YOURHOST_my_school
   schooldb.default.password = THE-SCHOOL-PASSWORD
   schooldb.default.port     = 3306

   ZEE_SCHOOL_DB_PREFIX = YOURHOST_school_
   ZEE_SCHOOL_DB_MAP    = myschool=YOURHOST_my_school
   ```

   The `ZEE_SCHOOL_DB_MAP` entry maps a **school code** (you choose this when you create
   the school in the Super Admin panel) to that school's database name.

3. The Super Admin then provisions the school normally, and its school data goes into that
   database only.

**Each school still gets its own database.** Nothing is shared.

---

## Verify the web root is safe

Try opening these in your browser. Each should give **404 Not Found**:

```
https://your-domain.example/.env
https://your-domain.example/app/Config/Database.php
https://your-domain.example/vendor/autoload.php
```

If any of them downloads, your document root is wrong. Go back to step 4.