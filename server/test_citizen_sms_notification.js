/**
 * CivicResolve Automated Test Suite: Citizen SMS Notification System (Phase 5)
 * 
 * Verifies:
 * 1. Indian Mobile Number Validation (+91, 10 digits starting with 6-9, invalid rejection)
 * 2. Complaint Registration SMS Trigger & Correct Message Content
 * 3. Complaint Resolution SMS Trigger & Correct Message Content
 * 4. Duplicate Resolution SMS Prevention (No duplicate SMS dispatched on re-saves)
 * 5. Notification Log Recording & Audit Integrity
 * 6. SMS Retry Handling for temporary failures
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Configure isolated test environment
process.env.NODE_ENV = 'test';
process.env.SMS_PROVIDER = 'mock';

const testDbPath = path.resolve(__dirname, `tmp_test_sms_${Date.now()}.db`);
process.env.SQLITE_DB_PATH = testDbPath;

// Copy genuine database to temporary isolated test db
const genuineDbPath = path.resolve(__dirname, 'civicresolve.db');
fs.copyFileSync(genuineDbPath, testDbPath);

const db = require('./db');
const {
  validateIndianMobile,
  sendComplaintRegistrationSms,
  sendComplaintResolutionSms,
  hasResolutionSmsBeenSent,
  retryNotificationLog
} = require('./notifications');

async function runSmsTestSuite() {
  console.log('\n======================================================');
  console.log('   CIVICRESOLVE CITIZEN SMS NOTIFICATION TEST SUITE   ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function pass(msg) {
    console.log(`  [PASS] ${msg}`);
    passed++;
  }

  function fail(msg, err) {
    console.error(`  [FAIL] ${msg}`);
    if (err) console.error(err);
    failed++;
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Indian Mobile Number Validation
    // -------------------------------------------------------------------------
    console.log('>>> [Suite 1] Indian Mobile Number Validation (TRAI Compliance)');
    
    assert.strictEqual(validateIndianMobile('9840123456'), '9840123456');
    assert.strictEqual(validateIndianMobile('+91-9840123456'), '9840123456');
    assert.strictEqual(validateIndianMobile('+919840123456'), '9840123456');
    assert.strictEqual(validateIndianMobile('09840123456'), '9840123456');
    assert.strictEqual(validateIndianMobile('7840123456'), '7840123456');
    assert.strictEqual(validateIndianMobile('6340123456'), '6340123456');
    pass('Test 1: Valid Indian 10-digit mobile numbers starting with 6-9 accepted');

    // Invalid numbers
    assert.strictEqual(validateIndianMobile('1234567890'), null); // Does not start with 6-9
    assert.strictEqual(validateIndianMobile('5840123456'), null); // Does not start with 6-9
    assert.strictEqual(validateIndianMobile('98401'), null);      // Incomplete
    assert.strictEqual(validateIndianMobile(''), null);           // Empty
    assert.strictEqual(validateIndianMobile(null), null);         // Null
    assert.strictEqual(validateIndianMobile('abcdefghij'), null); // Non-numeric
    pass('Test 2: Invalid, incomplete, or out-of-range numbers correctly rejected');

    // -------------------------------------------------------------------------
    // 2. Complaint Registration SMS Dispatch & Content
    // -------------------------------------------------------------------------
    console.log('\n>>> [Suite 2] Complaint Registration SMS Dispatch & Content');
    
    const testRef1 = `CR-TEST-REG-${Date.now()}`;
    const testPhone = '+91-9840199999';

    const regResult = await sendComplaintRegistrationSms(testRef1, testPhone);
    assert.strictEqual(regResult.success, true);
    assert.strictEqual(regResult.status, 'sent');
    assert.strictEqual(regResult.provider, 'mock');
    pass('Test 3: Registration SMS dispatched successfully to citizen contact');

    // Verify database record in notification_logs
    const regLog = await db.prepare(`
      SELECT * FROM notification_logs WHERE ref_id = ? AND channel = 'sms' AND event_type = 'complaint_registered'
    `).get(testRef1);

    assert(regLog, 'Registration SMS record must exist in notification_logs');
    assert.strictEqual(regLog.status, 'sent');
    assert.strictEqual(regLog.recipient, '9840199999');
    
    const expectedRegMsg = `Dear Citizen, your complaint has been successfully registered with CivicResolve. Your Complaint ID is ${testRef1}. You can use this ID to track your complaint status. Thank you.`;
    assert.strictEqual(regLog.body, expectedRegMsg);
    pass('Test 4: Database notification log records correct Registration message content & recipient');

    // Duplicate Registration SMS Prevention
    const dupRegResult = await sendComplaintRegistrationSms(testRef1, testPhone);
    assert.strictEqual(dupRegResult.success, false);
    assert.strictEqual(dupRegResult.status, 'duplicate_prevented');
    pass('Test 5: Duplicate registration SMS prevented for same complaint ID');

    // -------------------------------------------------------------------------
    // 3. Complaint Resolution SMS Dispatch & Content
    // -------------------------------------------------------------------------
    console.log('\n>>> [Suite 3] Complaint Resolution SMS Dispatch & Content');

    const testRef2 = `CR-TEST-RES-${Date.now()}`;
    const resResult = await sendComplaintResolutionSms(testRef2, testPhone);
    assert.strictEqual(resResult.success, true);
    assert.strictEqual(resResult.status, 'sent');
    pass('Test 6: Resolution SMS dispatched successfully on resolution trigger');

    // Verify database record
    const resLog = await db.prepare(`
      SELECT * FROM notification_logs WHERE ref_id = ? AND channel = 'sms' AND event_type = 'complaint_resolved'
    `).get(testRef2);

    assert(resLog, 'Resolution SMS record must exist in notification_logs');
    assert.strictEqual(resLog.status, 'sent');
    assert.strictEqual(resLog.recipient, '9840199999');

    const expectedResMsg = `Dear Citizen, your complaint ${testRef2} has been marked as resolved. Thank you for using CivicResolve. Please visit the portal to review your complaint.`;
    assert.strictEqual(resLog.body, expectedResMsg);
    pass('Test 7: Database notification log records correct Resolution message content & recipient');

    // -------------------------------------------------------------------------
    // 4. Duplicate Resolution SMS Prevention
    // -------------------------------------------------------------------------
    console.log('\n>>> [Suite 4] Duplicate Resolution SMS Prevention');

    const hasSent = await hasResolutionSmsBeenSent(testRef2);
    assert.strictEqual(hasSent, true);
    pass('Test 8: hasResolutionSmsBeenSent correctly identifies already delivered resolution SMS');

    const dupResResult = await sendComplaintResolutionSms(testRef2, testPhone);
    assert.strictEqual(dupResResult.success, false);
    assert.strictEqual(dupResResult.status, 'duplicate_prevented');
    pass('Test 9: Re-attempting resolution SMS safely intercepted (zero duplicate dispatch)');

    // -------------------------------------------------------------------------
    // 5. Controlled Failure & Administrator Retry
    // -------------------------------------------------------------------------
    console.log('\n>>> [Suite 5] Controlled Retry Handling for Administrative Auditing');

    // Manually create a failed SMS log
    const failedRef = `CR-TEST-FAIL-${Date.now()}`;
    const failedInsert = await db.prepare(`
      INSERT INTO notification_logs (ref_id, recipient, channel, event_type, status, subject, body, error_message, attempts, created_at)
      VALUES (?, '9840199999', 'sms', 'complaint_registered', 'failed', 'SMS Notification', ?, 'Gateway timeout', 1, CURRENT_TIMESTAMP)
    `).run(failedRef, expectedRegMsg);

    const failedLogId = failedInsert.lastInsertRowid;
    assert(failedLogId, 'Failed log must have valid ID');
    pass('Test 10: Simulated provider failure recorded with status="failed"');

    // Administrative retry
    const retryResult = await retryNotificationLog(failedLogId);
    assert.strictEqual(retryResult.success, true);
    pass('Test 11: retryNotificationLog successfully processes failed SMS');

    const retriedLog = await db.prepare('SELECT * FROM notification_logs WHERE id = ?').get(failedLogId);
    assert.strictEqual(retriedLog.status, 'sent');
    assert.strictEqual(retriedLog.attempts, 2);
    assert(retriedLog.sent_at, 'sent_at timestamp must be populated on successful retry');
    pass('Test 12: Notification log updated to status="sent" with attempts incremented to 2');

  } catch (err) {
    fail('Unexpected error in test suite', err);
  } finally {
    // Clean up test database
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      const wal = `${testDbPath}-wal`;
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      const shm = `${testDbPath}-shm`;
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch {}

    console.log('\n======================================================');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('======================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runSmsTestSuite();
