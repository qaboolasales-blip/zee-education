# Zee Education — Backend

Super Admin control plane built on CodeIgniter 4.

**Stack:** PHP 8.2+ · CodeIgniter 4 · MySQL/MariaDB

> **Brand note:** "Zee Education" is provisional. Trademark and domain clearance have not been completed.

## Architecture boundary

This repository owns `backend/` only. It is the **Super Admin control plane** — it holds school/install metadata, commercial records, support and provisioning state. It must **never** contain student, guardian, staff, attendance, results or fee data. Every school gets its own dedicated database (see `docs/control-plane-data-boundary.md`).

## Local development (Laragon)

### Prerequisites

- Laragon installed with PHP 8.2+ and MySQL/MariaDB
- `intl` PHP extension enabled (required by CodeIgniter 4)
- Composer available (Laragon provides `composer` in its menu)

### Setup

```bash
# 1. Enter the backend directory
cd backend

# 2. Copy the environment template and fill in your own values
cp .env.example .env

# 3. Edit .env — set database credentials, encryption key, baseURL
#    NEVER commit .env (it is git-ignored).

# 4. Generate a fresh encryption key
php spark key:generate

# 5. Create the control-plane database manually in phpMyAdmin or CLI:
#    - database.default.database  → zee_education_control
#    - database.tests.database    → zee_education_control_test
```

### Start the dev server

```bash
# Via Laragon menu: click the backend project → "Open Terminal"
# Or from the backend directory:
php spark serve
```

Server runs at `http://localhost:8080` (check `.env` for `app.baseURL`).

### Available endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Environment-safe health probe. Returns app name, status, version. No credentials or server details. |
| GET | `/setup` | Display-only installer placeholder. Writes nothing. |

### Run migrations (when MySQL is available)

```bash
cd backend
php spark migrate
```

### Run tests

```bash
cd backend
php spark test
# or directly:
php vendor/bin/phpunit -c phpunit.dist.xml
```

> **Note:** Tests require the `intl` PHP extension and a MySQL/MariaDB server for database-backed tests. The `tests` database group is used so the real control-plane database is never touched.

## Project structure

```
backend/
├── app/                    # Application code
│   ├── Config/             # Framework + Zee Education config
│   ├── Controllers/        # Health, Setup
│   ├── Database/           # Migrations, seeds
│   └── Views/              # Setup placeholder, error pages
├── public/                 # Web server document root
├── tests/                  # Feature + unit tests
├── writable/               # Logs, cache, session, uploads
├── docs/                   # Architecture, audits, API contracts
├── .env.example            # Placeholder environment template
├── composer.json           # Dependencies
├── phpunit.dist.xml        # Test configuration
└── spark                   # CodeIgniter CLI tool