# School Local Settings Schema (D-K-01)

## Fields
- school_identity: name, code, tagline
- contact: email, phone, address (full)
- address: street, city, state, postal_code, country
- logo_path: relative safe path (no public arbitrary upload)
- base_theme_selection: light/dark/custom
- locale: language code (en, etc.)
- timezone: IANA timezone (Asia/Karachi)
- academic_year_start, academic_year_end

## Schema (school_settings table - extended concept)
Stored in school-local database as key-value or structured. Core fields:
```sql
school_settings(
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(191) UNIQUE NOT NULL,
  setting_value TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
)
```

Server-side validation on all updates. Role-restricted access (School Admin/Super Admin). Audit significant changes.
