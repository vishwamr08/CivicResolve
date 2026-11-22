# CivicResolve — Database Backup, Recovery & Disaster Recovery Manual

> **Notice:** CivicResolve utilizes an embedded SQLite database configured with Write-Ahead Logging (`PRAGMA journal_mode = WAL`). Backups must be performed using non-blocking online snapshot mechanisms to prevent database locks or torn pages.

---

## 1. Backup Architecture & Policies

### Snapshot Mechanism
- Backups utilize the official SQLite Online Backup API (`db.backup()`) or atomic `VACUUM INTO` snapshots.
- A passive WAL checkpoint is executed immediately prior to backup generation to minimize uncommitted WAL frames.
- Generated backup files are independently checked via `PRAGMA integrity_check` before being accepted.

### Retention Policy
- Automated rotation retains the **7 most recent snapshots** by default.
- Backups are stored in `server/backups/` with filenames formatted as:
  `civicresolve-backup-YYYY-MM-DDTHH-mm-ss-sssZ.db`
- Super Administrators can download verified snapshots directly via `GET /api/admin/database/backup`.

---

## 2. Standard Backup Generation

### Manual CLI Backup
Run the backup manager script directly:
```bash
cd server
node -e "const { createDatabaseBackup } = require('./backup_manager'); const db = require('./db'); createDatabaseBackup(db).then(r => console.log('Backup successful:', r));"
```

### Automated Cron Schedule (Linux / Render)
To schedule daily backups at 02:00 AM UTC:
```bash
0 2 * * * cd /app/server && node -e "const { createDatabaseBackup } = require('./backup_manager'); const db = require('./db'); createDatabaseBackup(db);" >> /var/log/civicresolve_backup.log 2>&1
```

---

## 3. Disaster Recovery & Restoration Procedure

If production data corruption or disk replacement occurs, follow this zero-data-loss recovery protocol:

### Step 1: Stop Application Service
```bash
# Gracefully terminate the Node process to flush any pending WAL frames
kill -SIGTERM <node_pid>
```

### Step 2: Preserve Existing Files (Safety Dump)
```bash
mkdir -p /var/data/recovery_stash
cp /var/data/civicresolve.db* /var/data/recovery_stash/ 2>/dev/null || true
```

### Step 3: Validate Candidate Backup Integrity
Before applying any backup, verify its integrity using an independent read-only handle:
```bash
node -e "
const Database = require('better-sqlite3');
const db = new Database('/path/to/candidate-backup.db', { readonly: true });
const check = db.pragma('integrity_check');
console.log('Integrity result:', check);
if (check[0].integrity_check !== 'ok') process.exit(1);
"
```

### Step 4: Restore Candidate Backup
```bash
cp /path/to/candidate-backup.db /var/data/civicresolve.db
# Remove stale WAL and SHM files
rm -f /var/data/civicresolve.db-wal /var/data/civicresolve.db-shm
```

### Step 5: Start Service & Verify
```bash
export NODE_ENV=production
export DATA_DIR=/var/data
node index.js
```
Query `/api/health` to confirm the database reports `"connected"` and query `/api/dashboard/stats` to verify record counts.
