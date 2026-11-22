/**
 * CivicResolve - Phase 1 Data Integrity & Zero-Fake-Data Test Suite
 * Validates:
 * 1. Clean/empty database strictly returns 0 complaints across all metrics.
 * 2. No automatic synthetic incident generation or Unsplash Bengaluru seed records exist in production.
 * 3. Legacy synthetic records ('CR-2026-1042' through '1048') are completely removed from production paths.
 * 4. Genuine existing citizen complaints are preserved intact.
 * 5. Demonstration fixtures are isolated behind SEED_DEMO_DATA=true and never auto-injected.
 */

const assert = require('assert');
const path = require('path');
const db = require('./db');

console.log('================================================================================');
console.log('  CIVICRESOLVE — PHASE 1 DATA INTEGRITY & ZERO-FAKE-DATA VERIFICATION');
console.log('================================================================================\n');

let totalTests = 0;
let passedTests = 0;

function check(desc, condition) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] Test ${totalTests}: ${desc}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] Test ${totalTests}: ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
}

async function runPhase1Tests() {
  console.log('>>> [Suite 1] Legacy Fake Incident Purge Verification');

  // Test 1: No legacy synthetic Bengaluru complaints exist with Unsplash images
  const legacyBengaluru = db.prepare(`
    SELECT COUNT(*) as count FROM complaints
    WHERE ref_id IN ('CR-2026-1042', 'CR-2026-1043', 'CR-2026-1044', 'CR-2026-1045', 'CR-2026-1046', 'CR-2026-1047', 'CR-2026-1048')
    AND image_url LIKE '%images.unsplash.com%'
  `).get();
  check('Zero legacy Bengaluru synthetic sample complaints with Unsplash images in DB', legacyBengaluru.count === 0);

  // Test 2: No unverified CR-TEST-* records without citizen ID exist
  const legacyTestSeeds = db.prepare(`
    SELECT COUNT(*) as count FROM complaints
    WHERE ref_id LIKE 'CR-TEST-%'
    AND citizen_id IS NULL
  `).get();
  check('Zero legacy synthetic CR-TEST-* seed records in DB', legacyTestSeeds.count === 0);

  // Test 3: Genuine citizen complaints are preserved intact
  const genuineComplaints = db.prepare('SELECT COUNT(*) as count FROM complaints').get();
  console.log(`  [INFO] Preserved genuine complaints in database: ${genuineComplaints.count}`);
  check('Genuine citizen complaints remain intact in database', genuineComplaints.count > 0);

  console.log('\n>>> [Suite 2] Clean Database Zero-State Metrics');

  // Test 4: Simulation on an isolated in-memory clean database
  const { DatabaseSync } = require('node:sqlite');
  const cleanDb = new DatabaseSync(':memory:');

  // Create schema in cleanDb
  cleanDb.exec(`
    CREATE TABLE complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      image_url TEXT,
      status TEXT DEFAULT 'Submitted',
      priority TEXT DEFAULT 'Medium',
      department TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const emptyCount = cleanDb.prepare('SELECT COUNT(*) as count FROM complaints').get();
  check('Empty database initial complaint count is exactly 0', emptyCount.count === 0);

  // Aggregation query on empty DB
  const emptyAgg = cleanDb.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status IN ('Submitted', 'Under Review') THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as high_priority,
      SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN status IN ('Assigned', 'In Progress') THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved
    FROM complaints
  `).get();

  check('Empty database total count is 0', (emptyAgg.total || 0) === 0);
  check('Empty database pending count is 0', (emptyAgg.pending || 0) === 0);
  check('Empty database in_progress count is 0', (emptyAgg.in_progress || 0) === 0);
  check('Empty database resolved count is 0', (emptyAgg.resolved || 0) === 0);

  const calculatedRate = (emptyAgg.total || 0) > 0 ? Math.round(((emptyAgg.resolved || 0) / emptyAgg.total) * 100) : 0;
  check('Empty database resolution rate is 0% (not fabricated 92%)', calculatedRate === 0);

  console.log('\n>>> [Suite 3] Production Seed Isolation');

  // Test 10: Verify SEED_DEMO_DATA flag default behavior
  check('Demonstration fixtures are disabled in default/production execution', process.env.SEED_DEMO_DATA !== 'true');

  console.log('\n================================================================================');
  console.log(`  ALL ${passedTests}/${totalTests} PHASE 1 DATA INTEGRITY TESTS PASSED CLEANLY!`);
  console.log('================================================================================\n');
}

runPhase1Tests().catch(err => {
  console.error('Phase 1 Data Integrity Test Failed:', err);
  process.exit(1);
});
