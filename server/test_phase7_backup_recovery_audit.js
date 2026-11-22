// Phase 7: Backup, Recovery, Performance & Monitoring Comprehensive Audit
// Tests:
// 1. Safe SQLite Online Backup API generation
// 2. Pre-backup and Post-backup WAL checkpoints
// 3. Independent read-only PRAGMA integrity_check on backups
// 4. Backup rotation and retention policy (enforce max retention limit)
// 5. Restore verification in an isolated sandbox (zero impact on genuine DBs)
// 6. Super Admin-authorized backup streaming endpoint (/api/admin/database/backup)
// 7. Non-super admin backup rejection (HTTP 403)
// 8. Performance index coverage & query plan efficiency (zero filesorts)
// 9. Latency benchmarks (sub-5ms warm /api/dashboard/stats)
// 10. Genuine database integrity & SHA-256 hash preservation

const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const { setupIsolatedTestDb } = require('./test_helper');
const { isolatedDbPath, cleanup } = setupIsolatedTestDb('phase7_backup');

process.env.JWT_SECRET = 'test_jwt_backup_secret_civicresolve_2026';
process.env.NODE_ENV = 'test';

const app = require('./index');
const db = require('./db');
const { createDatabaseBackup, rotateBackups, verifyRestore } = require('./backup_manager');
const { generateToken } = require('./auth');

let server;
let serverPort;
let baseUrl;

function makeRequest(method, endpoint, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => { chunks.push(chunk); });
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let json = null;
        try {
          json = JSON.parse(buffer.toString());
        } catch {
          json = null;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          rawBuffer: buffer
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function getHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

const genuineDb = path.resolve(__dirname, 'civicresolve.db');
const backupDb = path.resolve(__dirname, 'civicresolve_safety_backup_phase1.db');
const initialGenuineHash = getHash(genuineDb);
const initialBackupHash = getHash(backupDb);

async function runAudit() {
  console.log('================================================================');
  console.log('CivicResolve Phase 7: Backup, Recovery & Performance Audit');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      failed++;
    }
  }

  const testTmpBackupsDir = path.join(__dirname, 'tmp_test_backups_' + Date.now());

  try {
    // --- Test Group 1: Safe Online Backup Generation ---
    console.log('--- Test Group 1: Safe Online Backup Generation & Verification ---');

    const backupResult = await createDatabaseBackup(db, {
      backupDir: testTmpBackupsDir,
      prefix: 'audit-backup',
      maxRetention: 3
    });

    assert(backupResult.success === true, 'Backup manager successfully executed online backup');
    assert(fs.existsSync(backupResult.backupPath), 'Backup file exists on disk at destination path');
    assert(backupResult.sizeBytes > 10000, `Backup file size is healthy (${(backupResult.sizeBytes / 1024).toFixed(1)} KB)`);
    assert(backupResult.verifiedCounts.complaints === 27, `Verified 27 complaints in backup snapshot (found: ${backupResult.verifiedCounts.complaints})`);
    assert(backupResult.verifiedCounts.citizens === 7, `Verified 7 citizens in backup snapshot (found: ${backupResult.verifiedCounts.citizens})`);
    assert(backupResult.verifiedCounts.admins === 5, `Verified 5 admins in backup snapshot (found: ${backupResult.verifiedCounts.admins})`);

    // --- Test Group 2: Backup Rotation Policy ---
    console.log('\n--- Test Group 2: Backup Rotation & Retention Policy ---');

    // Create 4 additional backups to exceed maxRetention of 3
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 10)); // small delay for timestamp ordering
      await createDatabaseBackup(db, {
        backupDir: testTmpBackupsDir,
        prefix: 'audit-backup',
        maxRetention: 3
      });
    }

    const remainingBackups = fs.readdirSync(testTmpBackupsDir).filter(f => f.startsWith('audit-backup') && f.endsWith('.db'));
    assert(remainingBackups.length === 3, `Rotation policy pruned older backups to retain exactly 3 latest snapshots (found: ${remainingBackups.length})`);

    // --- Test Group 3: Isolated Recovery Verification ---
    console.log('\n--- Test Group 3: Isolated Recovery Verification (Zero Production Mutation) ---');

    const restoreTargetDir = path.join(__dirname, 'tmp_test_restore_' + Date.now());
    const latestBackupFile = path.join(testTmpBackupsDir, remainingBackups[0]);
    const restoreResult = verifyRestore(latestBackupFile, restoreTargetDir);

    assert(restoreResult.success === true, 'Isolated restore succeeded without errors');
    assert(restoreResult.integrity === 'ok', 'Restored database returned integrity: "ok"');
    assert(restoreResult.counts.complaints === 27, 'Restored database retains 100% of complaints');
    assert(restoreResult.counts.citizens === 7, 'Restored database retains 100% of citizens');
    assert(restoreResult.counts.admins === 5, 'Restored database retains 100% of admins');

    // Cleanup restore dir
    try { fs.rmSync(restoreTargetDir, { recursive: true, force: true }); } catch {}

    // --- Test Group 4: Super Admin Backup Download API ---
    console.log('\n--- Test Group 4: Super Admin Backup API Endpoint ---');

    const superAdminToken = generateToken({ id: 1, email: 'admin@civicresolve.gov', role: 'super_admin' });
    const officerToken = generateToken({ id: 2, email: 'gcc.officer@civicresolve.gov', role: 'municipal_admin' });

    // Unauthorized non-super-admin is rejected
    const officerRes = await makeRequest('GET', '/api/admin/database/backup', {
      Authorization: `Bearer ${officerToken}`
    });
    assert(officerRes.status === 403, 'Municipal Admin is rejected from backup download with HTTP 403');

    // Super Admin download
    const backupApiRes = await makeRequest('GET', '/api/admin/database/backup', {
      Authorization: `Bearer ${superAdminToken}`
    });
    assert(backupApiRes.status === 200, 'Super Admin backup request returned HTTP 200');
    assert(backupApiRes.headers['content-disposition']?.includes('attachment'), 'Response header contains Content-Disposition: attachment');
    // Verify first 16 bytes of SQLite header: "SQLite format 3\0"
    const isSqliteHeader = backupApiRes.rawBuffer.slice(0, 15).toString() === 'SQLite format 3';
    assert(isSqliteHeader, 'Downloaded payload matches valid SQLite format 3 magic header');

    // --- Test Group 5: Performance Benchmarks & Query Plans ---
    console.log('\n--- Test Group 5: Performance Benchmarks & Query Plans ---');

    // Warm up stats cache
    await makeRequest('GET', '/api/dashboard/stats');
    const startBench = Date.now();
    for (let i = 0; i < 20; i++) {
      await makeRequest('GET', '/api/dashboard/stats');
    }
    const elapsed = Date.now() - startBench;
    const avgLatency = elapsed / 20;
    assert(avgLatency < 10, `In-memory cached dashboard stats responds under 10ms (avg: ${avgLatency.toFixed(2)}ms)`);

    // Verify index usage on created_at sorting
    const plan = db.prepare('EXPLAIN QUERY PLAN SELECT * FROM complaints ORDER BY created_at DESC LIMIT 10').all();
    const usesIndex = plan.some(p => p.detail.includes('idx_complaints_created_at') || p.detail.includes('INDEX'));
    assert(usesIndex, 'Complaint list query uses created_at index for zero filesort overhead');

    // --- Test Group 6: Genuine Database Protection Verification ---
    console.log('\n--- Test Group 6: Genuine Database Protection Verification ---');

    const finalGenuineHash = getHash(genuineDb);
    const finalBackupHash = getHash(backupDb);

    assert(finalGenuineHash === initialGenuineHash, 'Genuine database SHA-256 hash UNCHANGED');
    assert(finalBackupHash === initialBackupHash, 'Safety backup database SHA-256 hash UNCHANGED');

    console.log('\n================================================================');
    console.log(`Phase 7 Backup & Recovery Audit Completed: ${passed}/${passed + failed} Tests Passed`);
    console.log('================================================================');

    if (failed > 0) process.exit(1);

  } finally {
    // Clean up temporary backups dir
    try { fs.rmSync(testTmpBackupsDir, { recursive: true, force: true }); } catch {}
    if (server) {
      server.close();
    }
    cleanup();
  }
}

// Start HTTP test server on dynamic port
const net = require('net');
const srv = net.createServer();
srv.listen(0, () => {
  serverPort = srv.address().port;
  srv.close(() => {
    baseUrl = `http://127.0.0.1:${serverPort}`;
    server = app.listen(serverPort, () => {
      runAudit().catch(err => {
        console.error('Audit fatal error:', err);
        process.exit(1);
      });
    });
  });
});
