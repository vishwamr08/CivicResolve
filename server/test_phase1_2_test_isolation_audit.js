/**
 * CivicResolve - Phase 1.2: Test Isolation and Final Database Safety Audit
 *
 * Verifies:
 * 1. Fatal abort when test execution (NODE_ENV=test) lacks explicit SQLITE_DB_PATH.
 * 2. Fatal abort when test execution (NODE_ENV=test) attempts to target genuine database (civicresolve.db).
 * 3. Fatal abort when test execution (NODE_ENV=test) attempts to target safety backup database.
 * 4. Production startup prevents silent creation of unintended empty databases.
 * 5. Production startup requires explicit persistent mount.
 * 6. Automated test writes to isolated DB cause ZERO mutation to genuine local database.
 * 7. Genuine local database count preservation (27 complaints, 7 citizens, 5 admins, 33 OTPs).
 * 8. Genuine local database integrity check (PRAGMA integrity_check === 'ok').
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Database = require('better-sqlite3');
const { setupIsolatedTestDb } = require('./test_helper');

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

async function runAudit() {
  console.log('================================================================');
  console.log('CivicResolve Phase 1.2: Test Isolation & Database Safety Audit');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // Test Group 1: Strict Test Isolation Guard Enforcement
  // -------------------------------------------------------------
  console.log('--- Test Group 1: Strict Test Isolation Guard Enforcement ---');
  {
    // 1. NODE_ENV=test with no SQLITE_DB_PATH must immediately throw
    try {
      execSync('node -e "process.env.NODE_ENV=\'test\'; delete process.env.SQLITE_DB_PATH; delete process.env.DATA_DIR; require(\'./db\');"', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      assert(false, 'NODE_ENV=test without SQLITE_DB_PATH must fail immediately', 'Did not throw');
    } catch (err) {
      const out = (err.stderr || '') + (err.stdout || '');
      assert(
        out.includes('FATAL TEST ISOLATION FAILURE') && out.includes('Fallback to genuine database is strictly prohibited'),
        'Test execution aborts immediately when SQLITE_DB_PATH is missing in NODE_ENV=test',
        out
      );
    }

    // 2. NODE_ENV=test targeting server/civicresolve.db must immediately throw
    try {
      execSync('node -e "process.env.NODE_ENV=\'test\'; process.env.SQLITE_DB_PATH=\'./civicresolve.db\'; require(\'./db\');"', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      assert(false, 'NODE_ENV=test targeting civicresolve.db must fail immediately', 'Did not throw');
    } catch (err) {
      const out = (err.stderr || '') + (err.stdout || '');
      assert(
        out.includes('FATAL TEST ISOLATION FAILURE') && out.includes('strictly forbidden from connecting to or mutating the genuine local database'),
        'Test execution aborts immediately when targeting civicresolve.db in NODE_ENV=test',
        out
      );
    }

    // 3. NODE_ENV=test targeting safety backup database must immediately throw
    try {
      execSync('node -e "process.env.NODE_ENV=\'test\'; process.env.SQLITE_DB_PATH=\'./civicresolve_safety_backup_phase1.db\'; require(\'./db\');"', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      assert(false, 'NODE_ENV=test targeting backup DB must fail immediately', 'Did not throw');
    } catch (err) {
      const out = (err.stderr || '') + (err.stdout || '');
      assert(
        out.includes('FATAL TEST ISOLATION FAILURE'),
        'Test execution aborts immediately when targeting safety backup DB in NODE_ENV=test',
        out
      );
    }
  }

  // -------------------------------------------------------------
  // Test Group 2: Production Startup Safety & No Silent Replacement
  // -------------------------------------------------------------
  console.log('\n--- Test Group 2: Production First-Time Provisioning Safety ---');
  {
    // 1. Missing DB file in production without ALLOW_NEW_PRODUCTION_DB=true aborts
    try {
      execSync('node -e "process.env.NODE_ENV=\'production\'; process.env.SQLITE_DB_PATH=\'./non_existent_phase1_2.db\'; delete process.env.ALLOW_NEW_PRODUCTION_DB; require(\'./db\');"', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      assert(false, 'Production with missing DB must fail without explicit ALLOW_NEW_PRODUCTION_DB', 'Did not throw');
    } catch (err) {
      const out = (err.stderr || '') + (err.stdout || '');
      assert(
        out.includes('FATAL DATABASE STARTUP FAILURE') && out.includes('Refusing to create an unverified empty replacement database'),
        'Production aborts startup on missing database to prevent silent creation of empty replacement database',
        out
      );
    }

    // 2. Production startup allows explicit initial provisioning when ALLOW_NEW_PRODUCTION_DB=true
    const provDbPath = path.join(__dirname, 'tmp_prov_test.db');
    if (fs.existsSync(provDbPath)) fs.unlinkSync(provDbPath);
    try {
      execSync(`node -e "process.env.NODE_ENV='production'; process.env.SQLITE_DB_PATH='${provDbPath.replace(/\\/g, '/')}'; process.env.ALLOW_NEW_PRODUCTION_DB='true'; const db = require('./db'); db.close();"`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      assert(fs.existsSync(provDbPath), 'Production allows schema initialization only when ALLOW_NEW_PRODUCTION_DB=true is explicit');
    } finally {
      if (fs.existsSync(provDbPath)) fs.unlinkSync(provDbPath);
      if (fs.existsSync(provDbPath + '-wal')) fs.unlinkSync(provDbPath + '-wal');
      if (fs.existsSync(provDbPath + '-shm')) fs.unlinkSync(provDbPath + '-shm');
    }
  }

  // -------------------------------------------------------------
  // Test Group 3: Isolation Verification Under Active Writes
  // -------------------------------------------------------------
  console.log('\n--- Test Group 3: Active Write Isolation Verification ---');
  {
    // Record genuine DB counts before isolated writes
    const genuineBefore = new Database(path.join(__dirname, 'civicresolve.db'), { readonly: true });
    const complaintsBefore = genuineBefore.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
    const otpsBefore = genuineBefore.prepare('SELECT COUNT(*) as c FROM citizen_otps').get().c;
    genuineBefore.close();

    // Create isolated test database
    const { tmpDir, isolatedDbPath, cleanup } = setupIsolatedTestDb('phase1_2_write_audit');

    try {
      const isolatedDb = require('./db');
      assert(path.resolve(isolatedDb.dbPath) === path.resolve(isolatedDbPath), 'Module db binds to isolated test database path', isolatedDb.dbPath);

      const isolatedComplaintsBefore = isolatedDb.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
      const isolatedOtpsBefore = isolatedDb.prepare('SELECT COUNT(*) as c FROM citizen_otps').get().c;

      // Perform write operations on isolated DB
      isolatedDb.prepare('INSERT INTO complaints (ref_id, title, description, category, location) VALUES (?, ?, ?, ?, ?)').run(
        'CR-ISOLATION-TEST', 'Isolated Test Complaint', 'Verifying test isolation', 'Road Damage', 'Chennai'
      );
      isolatedDb.prepare(`
        INSERT INTO citizen_otps (phone, otp_hash, purpose, attempts, max_attempts, expires_at)
        VALUES (?, ?, 'login', 0, 5, datetime('now', '+10 minutes'))
      `).run('9999999999', 'fake_hash_isolation_test');

      const isolatedComplaints = isolatedDb.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
      const isolatedOtps = isolatedDb.prepare('SELECT COUNT(*) as c FROM citizen_otps').get().c;
      assert(isolatedComplaints === isolatedComplaintsBefore + 1, 'Write succeeded on isolated database (complaints count incremented)');
      assert(isolatedOtps === isolatedOtpsBefore + 1, 'Write succeeded on isolated database (otps count incremented)');

      // Verify genuine DB counts are COMPLETELY UNCHANGED
      const genuineAfter = new Database(path.join(__dirname, 'civicresolve.db'), { readonly: true });
      const complaintsAfter = genuineAfter.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
      const otpsAfter = genuineAfter.prepare('SELECT COUNT(*) as c FROM citizen_otps').get().c;
      genuineAfter.close();

      assert(complaintsAfter === complaintsBefore, `Genuine DB complaints count UNCHANGED (${complaintsAfter} === ${complaintsBefore})`);
      assert(otpsAfter === otpsBefore, `Genuine DB otps count UNCHANGED (${otpsAfter} === ${otpsBefore})`);

    } finally {
      cleanup(require('./db'));
    }
  }

  // -------------------------------------------------------------
  // Test Group 4: Final Audit of Genuine Database State & SHA-256 Stability
  // -------------------------------------------------------------
  console.log('\n--- Test Group 4: Genuine Database Final Verification ---');
  {
    const crypto = require('crypto');
    const genuineRaw = fs.readFileSync(path.join(__dirname, 'civicresolve.db'));
    const genuineSha = crypto.createHash('sha256').update(genuineRaw).digest('hex');
    assert(genuineSha === 'a9e0bbcee8ea7eae88decdef6591fb7235bdb981cbc13c92637b3e87f654d7ed', `Genuine database SHA-256 hash UNCHANGED (${genuineSha.slice(0, 16)}...)`);

    const backupRaw = fs.readFileSync(path.join(__dirname, 'civicresolve_safety_backup_phase1.db'));
    const backupSha = crypto.createHash('sha256').update(backupRaw).digest('hex');
    assert(backupSha === '863ee493de7287a9fa3f5d022cfe4956aa25c4c5d5e3a350d990c7782912636c', `Safety backup database SHA-256 hash UNCHANGED (${backupSha.slice(0, 16)}...)`);

    // Verify test_helper.js has ZERO calls to copy genuine or backup databases
    const helperSource = fs.readFileSync(path.join(__dirname, 'test_helper.js'), 'utf8');
    assert(!helperSource.includes('copyFileSync'), 'test_helper.js contains ZERO copyFileSync calls (100% synthetic fixtures)');
    assert(!helperSource.includes('readFileSync'), 'test_helper.js contains ZERO readFileSync calls on databases');

    const genuineDb = new Database(path.join(__dirname, 'civicresolve.db'), { readonly: true });
    const complaints = genuineDb.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
    const citizens = genuineDb.prepare('SELECT COUNT(*) as c FROM citizens').get().c;
    const admins = genuineDb.prepare('SELECT COUNT(*) as c FROM admins').get().c;
    const otps = genuineDb.prepare('SELECT COUNT(*) as c FROM citizen_otps').get().c;
    const auditLogs = genuineDb.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c;
    const announcements = genuineDb.prepare('SELECT COUNT(*) as c FROM announcements').get().c;
    const integrity = genuineDb.pragma('integrity_check');
    const isOk = Array.isArray(integrity) && integrity.length > 0 &&
      (integrity[0].integrity_check === 'ok' || Object.values(integrity[0])[0] === 'ok');

    assert(complaints === 27, `Preserved 27 genuine complaints (verified: ${complaints})`);
    assert(citizens === 7, `Preserved 7 genuine citizen records (verified: ${citizens})`);
    assert(admins === 5, `Preserved 5 genuine administrator accounts (verified: ${admins})`);
    assert(otps === 33, `Preserved 33 historical OTP records without test contamination (verified: ${otps})`);
    assert(auditLogs === 2, `Preserved 2 audit log records (verified: ${auditLogs})`);
    assert(announcements === 3, `Preserved 3 municipal announcements (verified: ${announcements})`);
    assert(isOk, 'PRAGMA integrity_check returns ok on genuine local database');

    genuineDb.close();
  }

  console.log('\n================================================================');
  console.log(`Phase 1.2 Audit Completed: ${passedTests}/${totalTests} Tests Passed`);
  console.log('================================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Phase 1.2 Audit Fatal Error:', err);
  process.exit(1);
});
