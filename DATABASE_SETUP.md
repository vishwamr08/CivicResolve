# CivicResolve — Database Setup & Schema Reference

> **Notice:** CivicResolve uses an embedded, high-performance SQLite engine configured with Write-Ahead Logging (WAL) and strict durability pragmas.

---

## 1. Schema Overview

The database contains 8 core relational tables:

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
+--------------------------------------------------------------------------+
```

---

## 2. Table Schemas & Indexes

### `complaints`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `ref_id` TEXT UNIQUE NOT NULL (Format: `CR-TN-YYYY-XXXXXX`)
- `title` TEXT NOT NULL
- `description` TEXT NOT NULL
- `category` TEXT NOT NULL
- `location` TEXT NOT NULL
- `latitude` REAL, `longitude` REAL
- `is_gps_verified` INTEGER DEFAULT 0
- `location_accuracy` REAL, `detection_method` TEXT
- `district` TEXT, `local_body` TEXT, `ward` TEXT, `zone` TEXT
- `status` TEXT DEFAULT 'Submitted'
- `priority` TEXT DEFAULT 'Medium'
- `department` TEXT
- `assigned_officer` TEXT
- `sla_hours` INTEGER DEFAULT 24
- `sla_deadline` DATETIME
- `status_history` TEXT (JSON Array)
- `citizen_id` INTEGER, `citizen_name` TEXT, `citizen_phone` TEXT, `citizen_email` TEXT
- `ai_summary` TEXT, `ai_category` TEXT, `ai_priority` TEXT, `ai_department` TEXT
- `ai_confidence` REAL, `ai_reason` TEXT, `ai_safety_risk` TEXT, `ai_recommended_action` TEXT
- `resolution_remarks` TEXT, `resolution_evidence_url` TEXT, `internal_notes` TEXT
- `citizen_rating` INTEGER, `citizen_feedback` TEXT, `is_appealed` INTEGER DEFAULT 0
- `duplicate_of_ref_id` TEXT
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP

**Indexes:**
- `idx_complaints_ref_id` on `(ref_id)`
- `idx_complaints_status` on `(status)`
- `idx_complaints_created_at` on `(created_at DESC, id DESC)`
- `idx_complaints_category` on `(category)`
- `idx_complaints_citizen_id` on `(citizen_id)`
- `idx_complaints_citizen_phone` on `(citizen_phone)`
- `idx_complaints_district` on `(district)`

---

## 3. SQLite Pragmas & Concurrency Tuning

Every connection initializes with:
```sql
PRAGMA journal_mode = WAL;          -- Allows non-blocking concurrent readers & writers
PRAGMA synchronous = NORMAL;        -- Safe fsync on checkpoint (FULL in test durability)
PRAGMA foreign_keys = ON;          -- Referential integrity
PRAGMA busy_timeout = 5000;        -- 5s lock contention queue before busy error
PRAGMA cache_size = -64000;        -- 64 MB memory cache for frequent queries
```

---

## 4. Protected Database Files

- `server/civicresolve.db`: Authoritative genuine local database.
- `server/civicresolve_safety_backup_phase1.db`: Cryptographically verified Phase 1 safety backup.

These files are protected by automated guards in `server/db.js` and `server/test_helper.js`. Automated test runs (`NODE_ENV=test`) are strictly forbidden from connecting to or mutating either genuine database file.
