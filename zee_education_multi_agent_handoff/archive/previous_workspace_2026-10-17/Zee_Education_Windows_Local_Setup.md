# Zee Education — Windows Local Development Setup

## Final technical choice

- Backend: **CodeIgniter 4**
- Database: **MySQL / MariaDB**
- Mobile first: responsive web + **PWA**; native app later if required
- Minimum PHP: **PHP 8.2**

## Recommended Windows setup: Laragon Full

Laragon is recommended because it provides Apache/Nginx, PHP and MySQL in one lightweight local environment.

Install these:

1. **Laragon Full** — select PHP 8.2 or newer.
2. **Composer 2** — install after PHP is available.
3. **Git**.
4. **Node.js LTS** — needed later for the React/Material UI/PWA build.
5. VS Code — recommended editor.

## PHP extensions to enable

In Laragon PHP configuration, make sure these are enabled:

- `intl`
- `mbstring`
- `openssl`
- `pdo_mysql`
- `fileinfo`
- `curl`
- `zip`

Restart Laragon after enabling extensions.

## Verify installation

Open PowerShell and run:

```powershell
php -v
composer --version
mysql --version
git --version
node -v
npm -v
```

All commands should show version numbers. PHP must be 8.2+.

## VS Code + OpenCode workflow

1. Open VS Code.
2. Create/open this folder:

```text
C:\laragon\www\zee-education
```

3. Copy `UNIVERSAL_RULES.md` into this project folder root before starting OpenCode.
4. Install/open your **OpenCode** agent in VS Code and allow it to use the integrated terminal only inside this project folder.
5. Open `Zee_Education_OpenCode_First_Prompt.md` and paste its complete prompt into OpenCode.
6. OpenCode will initialize CodeIgniter with Composer and create only the first safe foundation milestone.

If you prefer to verify CodeIgniter manually before using OpenCode, run this in **Laragon Terminal**:

```powershell
cd C:\laragon\www
composer create-project codeigniter4/appstarter zee-education
cd zee-education
copy env .env
php spark serve
```

Then open:

```text
http://localhost:8080
```

## Create development database

Open Laragon → Database / phpMyAdmin and create:

```text
zee_education_control
```

This first database is only the **Super Admin control-plane** database. Every school will later receive its own separate installation and database, for example:

```text
zee_horizon_public_school
zee_bright_future_academy
```

## `.env` initial database values

In the new project’s `.env`, set:

```ini
CI_ENVIRONMENT = development

database.default.hostname = localhost
database.default.database = zee_education_control
database.default.username = root
database.default.password =
database.default.DBDriver = MySQLi
database.default.port = 3306
```

Laragon default `root` password is commonly blank. If you set a password, use your own password here and never share it in chat.

## Do not do these yet

- Do not put real school/student data in the local database.
- Do not build online payment, SMS or automatic WhatsApp now.
- Do not merge all school records into one shared student database.
- Do not share `.env` or database passwords.

## First development milestone after setup

1. CodeIgniter base project runs locally.
2. Installer wizard shell.
3. School settings and separate database connection checker.
4. Super Admin login, School Admin login and role foundation.
5. Audit-log and migration foundation.

After completing the verification commands, send only the version outputs or write **“Windows setup complete”**. Then we will begin the CodeIgniter foundation code.
