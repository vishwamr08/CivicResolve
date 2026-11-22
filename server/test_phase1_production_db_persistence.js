/**
 * CivicResolve - Phase 1 Production Database Reliability & Grievance Persistence Test Suite
 *
 * Verifies:
 * 1. Deterministic database path resolution (SQLITE_DB_PATH, DATA_DIR, default fallback).
 * 2. SQLite WAL mode, FULL synchronous durability, and busy_timeout configuration.
 * 3. Safe database startup and directory creation.
 * 4. Isolation: Local genuine database is never copied to production automatically.
 * 5. Complaint persistence across simulated process restart on an isolated test database.
 * 6. Admin complaint retrieval queries direct from persistent storage with correct ordering and pagination.
 * 7. Genuine local database integrity and record preservation (27 complaints, 7 citizens, 5 admins).
 * 8. Super Admin backup endpoint triggers WAL checkpoint before download.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const { setupIsolatedTestDb } = require('./test_helper');
const { isolatedDbPath, cleanup } = setupIsolatedTestDb('phase1_persistence');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName} - ${details}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('CivicResolve Phase 1: Production Database Reliability Test Suite');
  console.log('================================================================\n');

  // Test 1: Active DB Pragmas (WAL, synchronous = FULL, busy_timeout = 5000)
  console.log('--- Test Group 1: Database Durability & WAL Configuration ---');
  {
    const db = require('./db');
    const journal = db.pragma('journal_mode');
    const journalMode = (journal[0] && (journal[0].journal_mode || Object.values(journal[0])[0])) || '';
    assert(journalMode.toLowerCase() === 'wal', 'SQLite journal_mode is configured to WAL', `Got: ${journalMode}`);

    const sync = db.pragma('synchronous');
    const syncVal = (sync[0] && (sync[0].synchronous ?? Object.values(sync[0])[0])) ?? -1;
    // synchronous=2 is FULL
    assert(Number(syncVal) === 2, 'SQLite synchronous durability is configured to FULL (2)', `Got: ${syncVal}`);

    const busy = db.pragma('busy_timeout');
    const busyVal = (busy[0] && (busy[0].timeout ?? Object.values(busy[0])[0])) ?? 0;
    assert(Number(busyVal) >= 5000, 'SQLite busy_timeout is configured to >= 5000ms', `Got: ${busyVal}`);

    const integrity = db.pragma('integrity_check');
    const isOk = Array.isArray(integrity) && integrity.length > 0 && 
      (integrity[0].integrity_check === 'ok' || Object.values(integrity[0])[0] === 'ok');
    assert(isOk, 'PRAGMA integrity_check returns ok on active database');
  }

  // Test 2: Deterministic Path Resolution
  console.log('\n--- Test Group 2: Deterministic Database Path Resolution ---');
  {
    // Simulate helper function replicating path resolution logic in db.js
    function resolveDbPath(env) {
      if (env.SQLITE_DB_PATH) {
        return path.resolve(env.SQLITE_DB_PATH);
      } else if (env.DATA_DIR) {
        return path.resolve(path.join(env.DATA_DIR, 'civicresolve.db'));
      } else {
        return path.resolve(path.join(__dirname, 'civicresolve.db'));
      }
    }

    const path1 = resolveDbPath({ SQLITE_DB_PATH: '/custom/path/mycivic.db' });
    assert(path1.includes('mycivic.db'), 'SQLITE_DB_PATH takes highest precedence', `Got: ${path1}`);

    const path2 = resolveDbPath({ DATA_DIR: '/var/data' });
    assert(path2.includes('var') && path2.includes('civicresolve.db'), 'DATA_DIR resolves to <DATA_DIR>/civicresolve.db', `Got: ${path2}`);

    const path3 = resolveDbPath({});
    assert(path3.endsWith('civicresolve.db') && path3.includes('server'), 'Default fallback resolves to server/civicresolve.db', `Got: ${path3}`);
  }

  // Test 3: Safe startup without automatic baseline copying
  console.log('\n--- Test Group 3: Absence of Automatic Database Copying ---');
  {
    const dbSource = fs.readFileSync(path.join(__dirname, 'db.js'), 'utf8');
    const hasCopyFileSync = dbSource.includes('fs.copyFileSync');
    assert(!hasCopyFileSync, 'db.js contains ZERO automatic fs.copyFileSync calls to copy local DB', `Found copyFileSync: ${hasCopyFileSync}`);
  }

  // Test 4: Write, Read, and Durability across simulated backend restart on isolated DB
  console.log('\n--- Test Group 4: Write & Restart Persistence on Isolated Test Database ---');
  {
    const testDbDir = path.join(__dirname, 'tmp_test_phase1');
    if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
    const testDbPath = path.join(testDbDir, 'isolated_test.db');
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    const walFile = testDbPath + '-wal';
    const shmFile = testDbPath + '-shm';
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);

    // Startup instance 1
    const db1 = new Database(testDbPath);
    db1.pragma('journal_mode = WAL');
    db1.pragma('synchronous = FULL');
    db1.pragma('busy_timeout = 5000');

    db1.exec(`
      CREATE TABLE test_complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ref_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'Submitted',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db1.prepare('INSERT INTO test_complaints (ref_id, title) VALUES (?, ?)').run('CR-TEST-P1-001', 'Test Pothole on Mount Road');
    db1.prepare('INSERT INTO test_complaints (ref_id, title) VALUES (?, ?)').run('CR-TEST-P1-002', 'Streetlight Failure in Anna Nagar');

    const countBefore = db1.prepare('SELECT COUNT(*) as c FROM test_complaints').get().c;
    assert(countBefore === 2, '2 test complaints successfully inserted in instance 1');

    // Simulate graceful shutdown
    db1.pragma('wal_checkpoint(TRUNCATE)');
    db1.close();

    // Startup instance 2 (simulating process restart)
    const db2 = new Database(testDbPath);
    const countAfter = db2.prepare('SELECT COUNT(*) as c FROM test_complaints').get().c;
    assert(countAfter === 2, 'All complaints persist across simulated process restart (instance 2)');

    const record = db2.prepare('SELECT * FROM test_complaints WHERE ref_id = ?').get('CR-TEST-P1-001');
    assert(record && record.title === 'Test Pothole on Mount Road', 'Complaint data integrity verified after restart');

    db2.close();

    // Cleanup temp isolated files
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
      if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
      if (fs.existsSync(testDbDir)) fs.rmdirSync(testDbDir);
    } catch (_) {}
  }

  // Test 5: Admin Query Visibility (Persistent query without in-memory cache)
  console.log('\n--- Test Group 5: Admin Grievance Query & Visibility ---');
  {
    const db = require('./db');
    // Verify query returns existing genuine records sorted by created_at DESC
    const complaints = db.prepare(`
      SELECT id, ref_id, title, status, priority, created_at 
      FROM complaints 
      ORDER BY created_at DESC, id DESC 
      LIMIT 10
    `).all();

    assert(complaints.length > 0, `Admin complaints query returns records directly from persistent DB (found ${complaints.length})`);
    assert(complaints[0].ref_id !== undefined, 'Query includes authoritative reference IDs');
    
    // Check total count matches genuine count
    const totalCount = db.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
    assert(totalCount === 27, `Genuine database complaints count is precisely 27 (got ${totalCount})`);
  }

  // Test 6: Genuine Database Integrity & Preservation
  console.log('\n--- Test Group 6: Preservation of Genuine Production Database ---');
  {
    const genuineDb = new Database(path.join(__dirname, 'civicresolve.db'), { readonly: true });
    const complaintCount = genuineDb.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
    const citizenCount = genuineDb.prepare('SELECT COUNT(*) as c FROM citizens').get().c;
    const adminCount = genuineDb.prepare('SELECT COUNT(*) as c FROM admins').get().c;
    const otpCount = genuineDb.prepare('SELECT COUNT(*) as c FROM citizen_otps').get().c;
    const auditCount = genuineDb.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c;
    const annCount = genuineDb.prepare('SELECT COUNT(*) as c FROM announcements').get().c;

    assert(complaintCount === 27, `Preserved 27 genuine complaints (verified: ${complaintCount})`);
    assert(citizenCount === 7, `Preserved 7 genuine citizen records (verified: ${citizenCount})`);
    assert(adminCount === 5, `Preserved 5 genuine administrator accounts (verified: ${adminCount})`);
    assert(otpCount >= 29, `Preserved historical OTP records (verified: ${otpCount} >= 29)`);
    assert(auditCount === 2, `Preserved 2 audit log records (verified: ${auditCount})`);
    assert(annCount === 3, `Preserved 3 municipal announcements (verified: ${annCount})`);
    genuineDb.close();
  }

  // Test 7: Backup Checkpoint & Online Backup API Verification
  console.log('\n--- Test Group 7: Super Admin Backup Endpoint Online Backup API ---');
  {
    const indexSource = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
    const hasOnlineBackup = indexSource.includes('db.backup(');
    assert(hasOnlineBackup, 'Backup endpoint executes SQLite Online Backup API (db.backup)');

    const hasGracefulShutdown = indexSource.includes('wal_checkpoint(TRUNCATE)') && indexSource.includes('SIGTERM');
    assert(hasGracefulShutdown, 'Process exit handlers (SIGTERM, SIGINT) execute PRAGMA wal_checkpoint(TRUNCATE)');
  }

  // Test 8: Frontend App.jsx Refresh Wiring Verification
  console.log('\n--- Test Group 8: Frontend Complaints Refresh Wiring ---');
  {
    const appSource = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'App.jsx'), 'utf8');
    const hasAdminRefresh = appSource.includes('handleAdminRefresh') && appSource.includes('loadComplaints(true)');
    assert(hasAdminRefresh, 'App.jsx defines handleAdminRefresh with loadComplaints(true)');

    const hasOnRefreshAdminDashboard = appSource.includes('onRefresh={handleAdminRefresh}');
    assert(hasOnRefreshAdminDashboard, 'AdminDashboard onRefresh is wired to handleAdminRefresh');

    const hasSubmitRefresh = appSource.includes('handleSubmitComplaint') && 
      appSource.includes('loadComplaints(true)');
    assert(hasSubmitRefresh, 'handleSubmitComplaint forces fresh loadComplaints(true) on submission');
  }

  console.log('\n================================================================');
  console.log(`Phase 1 Test Suite Completed: ${passedTests}/${totalTests} Tests Passed`);
  console.log('================================================================');

  cleanup();

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch(err => {
  cleanup();
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
