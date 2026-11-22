# CivicResolve — Database Backup, Recovery & Disaster Recovery Manual

CivicResolve supports backup and disaster recovery protocols for both **Supabase PostgreSQL (Production)** and **SQLite (Local Development & Pilots)**.

---

## 1. Production PostgreSQL Backup Strategy (Supabase)

### A. Managed Automated Backups & PITR
Supabase automatically manages production backup durability:
- **Daily Physical Backups:** Retained for 7 to 30 days depending on project tier.
- **Point-in-Time Recovery (PITR):** Continuous Write-Ahead Log (WAL) archiving allows restoring the cluster to any second within the retention window.
- **Accessing Managed Backups:** Navigate to Supabase Dashboard -> **Database** -> **Backups** -> **Restore**.

### B. Application-Level Logical Snapshot API
Super Administrators can trigger an on-demand logical JSON export of all core tables via `GET /api/admin/database/backup`:
```bash
curl -H "Authorization: Bearer <SuperAdminJWT>" \
     -o civicresolve-pg-backup.json \
     https://civicresolve-8nve.onrender.com/api/admin/database/backup
```
The resulting snapshot contains:
- Schema and version metadata.
- Row counts for `complaints`, `citizens`, `admins`, `announcements`, `audit_logs`, `notifications`.
- Full JSON serialized records for all tables.

### C. Standard PostgreSQL CLI Dump (`pg_dump`)
To produce an industry-standard SQL dump:
```bash
# Export full database schema and data
pg_dump "$DATABASE_URL" --format=custom --file=civicresolve_prod_dump.dump

# Or plain text SQL:
pg_dump "$DATABASE_URL" --no-owner --clean > civicresolve_prod_dump.sql
```

### D. PostgreSQL Disaster Recovery Procedure
To restore from a logical SQL dump to a fresh Supabase database:
```bash
# Step 1: Ensure target database connection string is set
export TARGET_DATABASE_URL="postgresql://postgres.xxx:yyy@host:5432/postgres"

# Step 2: Run schema migrations first
npm run migrate

# Step 3: Restore tables
psql "$TARGET_DATABASE_URL" < civicresolve_prod_dump.sql

# Step 4: Verify health
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.TARGET_DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query('SELECT count(*) FROM complaints').then(r => console.log('Restored complaints:', r.rows[0].count)).finally(() => pool.end());
"
```

---

## 2. Local Development & SQLite Backup Strategy

### A. Online Backup API Snapshot
- Utilizes the official SQLite Online Backup API (`db.backup()`) or atomic `VACUUM INTO` snapshots.
- A passive WAL checkpoint is executed immediately prior to backup generation to flush uncommitted frames.
- Generated snapshot files are validated via `PRAGMA integrity_check`.

### B. Manual Backup Execution
```bash
cd server
node -e "
const { createDatabaseBackup } = require('./backup_manager');
const db = require('./db');
createDatabaseBackup(db).then(r => console.log('Backup successful:', r));
"
```

### C. Retention & Rotation
- Backups are stored in `server/backups/`.
- Retains the **7 most recent snapshots** by default; older files are automatically pruned.

### D. SQLite Disaster Recovery Procedure
1. Stop the application service (`kill -SIGTERM <pid>`).
2. Verify candidate backup integrity:
   ```bash
   node -e "
   const Database = require('better-sqlite3');
   const db = new Database('/path/to/candidate.db', { readonly: true });
   console.log('Integrity:', db.pragma('integrity_check'));
   "
   ```
3. Copy the candidate backup into place:
   ```bash
   cp /path/to/candidate.db /var/data/civicresolve.db
   rm -f /var/data/civicresolve.db-wal /var/data/civicresolve.db-shm
   ```
4. Restart service and query `/health`.
