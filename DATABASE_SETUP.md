# CivicResolve — Database Setup & Architecture Reference

CivicResolve implements a **Dual Database Architecture**:
1. **Production (Supabase PostgreSQL / Render):** Connects to a managed PostgreSQL cluster (AWS ap-northeast-1) via the `pg` connection pool when `DATABASE_URL` is configured.
2. **Local Development & Synthetic Testing (SQLite):** Uses an embedded SQLite engine configured with Write-Ahead Logging (WAL) and strict durability pragmas when `DATABASE_URL` is absent or `USE_SQLITE=true`.

---

## 1. Architecture Overview & Engine Selection

The database layer automatically resolves the authoritative engine via `server/db.js` and `server/db_adapter.js`:

```
+---------------------------------------------------------------------------------------+
| Environment           | Trigger / Configuration           | Active Database Engine    |
+---------------------------------------------------------------------------------------+
| Production            | NODE_ENV=production, DATABASE_URL | Supabase PostgreSQL 17.x  |
| Production (Missing)  | NODE_ENV=production, no URL       | FAILS CLOSED (Fatal Error)|
| Local Development     | DATABASE_URL present              | Supabase PostgreSQL       |
| Local Development     | DATABASE_URL absent / USE_SQLITE  | SQLite (civicresolve.db)  |
| Automated Regression  | NODE_ENV=test (default)           | Synthetic Isolated SQLite |
| Automated PG Tests    | TEST_DB_ENGINE=postgres           | Disposable PG Schema      |
+---------------------------------------------------------------------------------------+
```

> **Safety Rule:** In production (`NODE_ENV=production`), silent fallback to ephemeral SQLite storage is strictly prohibited to prevent data loss.

---

## 2. PostgreSQL Migrations (`server/migrations/`)

Database schema evolution is strictly version-controlled through idempotent SQL migration files:

- `server/migrations/001_initial_schema.sql`: Core tables (`admins`, `citizens`, `complaints`, `citizen_otps`, `audit_logs`, `announcements`, `notifications`, `notification_logs`, `revoked_tokens`).
- `server/migrations/002_indexes_and_constraints.sql`: Foreign keys (`fk_complaints_citizen`), unique constraints, and performance indexes.
- `server/migrations/003_seed_master_admin_and_announcements.sql`: Idempotent seeding of standard master administrator and municipal announcements. (Note: Admin password uses a locked placeholder; use `provision_admin.js` to set credentials).
- `server/migrate.js`: Programmatic and CLI migration runner (`npm run migrate`). Tracks migrations in `schema_migrations`.

To run migrations manually:
```bash
npm run migrate
```

---

## 3. Administrator Account Provisioning (`server/provision_admin.js`)

To ensure security in production and prevent plaintext or compromised credentials from persisting in version-controlled migration files or automated startup scripts, CivicResolve provides an authoritative CLI tool:

```bash
# Provision or rotate administrator password on Supabase PostgreSQL (requires explicit confirmation)
node provision_admin.js --confirm

# Or specify a designated email and password
node provision_admin.js --email admin@civicresolve.gov --password "YourCustomSecret#2026!" --confirm

# For local development SQLite database:
node provision_admin.js --sqlite --confirm
```

**Security Properties:**
- Uses `bcrypt` with cost factor 12 (~250ms key derivation).
- Automatically updates `admin@civicresolve.gov` (ID: 1) without modifying the account ID, assigned municipal jurisdiction, or `super_admin` role.
- If `--password` is omitted, generates a 24-character cryptographically random password (`crypto.randomBytes`) and prints it once to stdout.
- Fails closed without modifying data unless `--confirm` is explicitly passed.
- Plaintext passwords are never hardcoded in SQL migrations or automatically overwritten during server boot.

---

## 4. Core Relational Tables

```
+--------------------------------------------------------------------------+
| Table                 | Purpose                                          |
+--------------------------------------------------------------------------+
| complaints            | Core civic grievances, location, AI triage & SLA |
| citizens              | Registered citizen profiles & contact channels   |
| admins                | Administrative users, roles & departmental scope |
| citizen_otps          | Ephemeral OTP verification codes & replay state  |
| audit_logs            | Immutable governance and status transition trail |
| announcements         | Official bilingual municipal gazettes / alerts   |
| notifications         | In-app notification messages for citizens/admins |
| notification_logs     | Outbound delivery logs (SMS / Email dispatch)    |
| revoked_tokens        | Token invalidation table for explicit logouts    |
| schema_migrations     | PostgreSQL migration version tracking ledger     |
+--------------------------------------------------------------------------+
```

---

## 5. Key Table Schemas

### `complaints`
- `id`: `SERIAL PRIMARY KEY` (PostgreSQL) / `INTEGER PRIMARY KEY AUTOINCREMENT` (SQLite)
- `ref_id`: `VARCHAR(50) UNIQUE NOT NULL` (Format: `CR-TN-YYYY-XXXXXX`)
- `title`: `VARCHAR(500) NOT NULL`
- `description`: `TEXT NOT NULL`
- `category`: `VARCHAR(100) NOT NULL`
- `location`: `VARCHAR(500) NOT NULL`
- `latitude`: `DOUBLE PRECISION`, `longitude`: `DOUBLE PRECISION`
- `is_gps_verified`: `INTEGER DEFAULT 0`
- `location_accuracy`: `REAL`, `detection_method`: `VARCHAR(50) DEFAULT 'manual'`
- `district`: `VARCHAR(100) DEFAULT 'Chennai'`, `local_body`: `VARCHAR(255)`, `ward`: `VARCHAR(100)`, `zone`: `VARCHAR(100)`
- `status`: `VARCHAR(50) DEFAULT 'Submitted'`
- `priority`: `VARCHAR(50) DEFAULT 'Medium'`
- `department`: `VARCHAR(255)`, `assigned_officer`: `VARCHAR(255)`
- `sla_hours`: `INTEGER DEFAULT 24`, `sla_deadline`: `TIMESTAMPTZ`
- `status_history`: `TEXT` (JSON array)
- `citizen_id`: `INTEGER REFERENCES citizens(id) ON DELETE SET NULL`
- `citizen_name`: `VARCHAR(255)`, `citizen_phone`: `VARCHAR(50)`, `citizen_email`: `VARCHAR(255)`
- `ai_summary`: `TEXT`, `ai_category`: `VARCHAR(100)`, `ai_priority`: `VARCHAR(50)`, `ai_department`: `VARCHAR(255)`
- `ai_confidence`: `REAL`, `ai_reason`: `TEXT`, `ai_safety_risk`: `TEXT`, `ai_recommended_action`: `TEXT`
- `resolution_remarks`: `TEXT`, `resolution_evidence_url`: `TEXT`, `internal_notes`: `TEXT`
- `citizen_rating`: `INTEGER`, `citizen_feedback`: `TEXT`, `is_appealed`: `INTEGER DEFAULT 0`
- `duplicate_of_ref_id`: `VARCHAR(50)`
- `created_at`: `TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`, `updated_at`: `TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`

### `revoked_tokens`
- `token_hash`: `VARCHAR(64) PRIMARY KEY` (SHA-256 hash of JWT session token)
- `user_id`: `INTEGER`
- `user_type`: `VARCHAR(20)` (`admin` or `citizen`)
- `expires_at`: `TIMESTAMPTZ NOT NULL`
- `revoked_at`: `TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`

---

## 6. Dual Database Abstraction Layer (`server/db_adapter.js`)

The backend interacts with database queries via a unified asynchronous abstraction layer:
- **Parameter Translation:** Automatically maps `?` positional parameters to PostgreSQL `$1, $2, ...` outside string literals.
- **Insert Parity:** For PostgreSQL `INSERT` statements without `RETURNING`, automatically injects `RETURNING id` and returns `{ lastInsertRowid, changes }` matching the `better-sqlite3` interface.
- **Transaction Safety:** Supports `db.transaction(async tx => { ... })`. For PostgreSQL, checks out a client from `pg.Pool`, executes `BEGIN`, commits on success, and executes `ROLLBACK` on error.
- **Dialect Parity:** Normalizes `CURRENT_TIMESTAMP`, `RIGHT(...)` phone substring matching, and safe PRAGMA stubs.

---

## 7. Protected Database Files

- `server/civicresolve.db`: Authoritative genuine local database (`a9e0bbcee8ea7eae88decdef6591fb7235bdb981cbc13c92637b3e87f654d7ed`).
- `server/civicresolve_safety_backup_phase1.db`: Cryptographically verified Phase 1 backup (`863ee493de7287a9fa3f5d022cfe4956aa25c4c5d5e3a350d990c7782912636c`).

Automated test runs are strictly isolated to synthetic in-memory or disposable databases.
