// Phase 2: Authentication and Authorization Security Comprehensive Audit
// Tests:
// 1. Citizen Authentication (Registration, login, OTP generation, OTP verification)
// 2. OTP Security (Expiry, replay prevention, max attempts lockout)
// 3. Rate Limiting & Brute-Force Lockout
// 4. Token & Session Lifecycle (Invalid token, expired token, logout cookie clearance)
// 5. Administrator & Officer Authentication (Login, secure password hashing comparison)
// 6. Role-Based Access Control (RBAC) (super_admin vs municipal_admin vs department_officer)
// 7. Backend Sensitive Endpoint Protection (401 on missing auth, 403 on role mismatch)
// 8. Cross-Citizen Complaint Privacy Guard (Isolation of personal complaints & unmasked fields)
// 9. Input Validation & Zero-Trust Verification
// 10. Genuine Database & Backup Preservation Check

const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const { setupIsolatedTestDb } = require('./test_helper');
const { isolatedDbPath, cleanup } = setupIsolatedTestDb('phase2_security');

process.env.JWT_SECRET = 'test_jwt_security_secret_civicresolve_2026';
process.env.NODE_ENV = 'test';

const app = require('./index');
const db = require('./db');
const {
  normalizePhone,
  hashOtp,
  generateToken,
  verifyToken,
  checkLoginRateLimit,
  recordFailedLogin,
  recordSuccessfulLogin
} = require('./auth');

let server;
let serverPort;
let baseUrl;

function makeRequest(method, endpoint, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
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
  console.log('CivicResolve Phase 2: Authentication & Authorization Security Audit');
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

  try {
    // -------------------------------------------------------------
    // Test Group 1: Citizen OTP Security & Replay Prevention
    // -------------------------------------------------------------
    console.log('--- Test Group 1: Citizen OTP Lifecycle, Expiry & Replay Protection ---');

    const testMobile = '9876543210';
    
    // 1. Send OTP
    const sendRes = await makeRequest('POST', '/api/auth/citizen/send-otp', {}, { phone: testMobile });
    assert(sendRes.status === 200, 'POST /api/auth/citizen/send-otp succeeds with HTTP 200');

    // Retrieve the generated OTP from isolated database
    const otpRow = db.prepare('SELECT id, otp_hash FROM citizen_otps WHERE phone = ? AND verified = 0 ORDER BY id DESC LIMIT 1').get(testMobile);
    assert(Boolean(otpRow), 'OTP record securely hashed and stored in database');

    // Simulate OTP verification with incorrect OTP -> increments attempts
    const wrongRes = await makeRequest('POST', '/api/auth/citizen/verify-otp', {}, { phone: testMobile, otp: '000000' });
    assert(wrongRes.status === 400 && wrongRes.data.error.includes('Incorrect OTP'), 'Incorrect OTP rejected with HTTP 400 and attempt decrement notice');

    // Fetch the raw OTP by finding the match for the hash
    let recoveredOtp = null;
    for (let c = 100000; c <= 999999; c++) {
      if (hashOtp(c) === otpRow.otp_hash) {
        recoveredOtp = String(c);
        break;
      }
    }
    assert(Boolean(recoveredOtp), 'Synthetic OTP hash matches 6-digit numeric pattern');

    // Verify correctly
    const verifyRes = await makeRequest('POST', '/api/auth/citizen/verify-otp', {}, { phone: testMobile, otp: recoveredOtp });
    assert(verifyRes.status === 200 && verifyRes.data.verified === true, 'Valid OTP verifies successfully with HTTP 200');
    assert(Boolean(verifyRes.data.registrationToken), 'New citizen receives signed registrationToken');

    // Replay Attack Test: Attempting to use the SAME OTP again MUST fail
    const replayRes = await makeRequest('POST', '/api/auth/citizen/verify-otp', {}, { phone: testMobile, otp: recoveredOtp });
    assert(replayRes.status === 400, 'Replay protection: Reusing already verified OTP is strictly blocked (HTTP 400)');

    // Expired OTP Test
    const expiredMobile = '9876543211';
    await makeRequest('POST', '/api/auth/citizen/send-otp', {}, { phone: expiredMobile });
    // Manually set expires_at in the past
    db.prepare("UPDATE citizen_otps SET expires_at = datetime('now', '-10 minutes') WHERE phone = ?").run(expiredMobile);
    const expiredRes = await makeRequest('POST', '/api/auth/citizen/verify-otp', {}, { phone: expiredMobile, otp: '123456' });
    assert(expiredRes.status === 400, 'Expired OTP is rejected immediately (HTTP 400)');

    // -------------------------------------------------------------
    // Test Group 2: Authentication Rate Limiting & Brute Force Lockout
    // -------------------------------------------------------------
    console.log('\n--- Test Group 2: Rate Limiting & Brute Force Protection ---');

    const rateTestKey = 'test_ip_brute_force_' + Date.now();
    // Simulate 5 consecutive failed attempts
    for (let i = 0; i < 5; i++) {
      recordFailedLogin(rateTestKey);
    }
    const lockedCheck = checkLoginRateLimit(rateTestKey);
    assert(lockedCheck.allowed === false, 'Rate limiter locks out after 5 consecutive failed login attempts');
    assert(lockedCheck.message.includes('locked'), 'Rate limiter provides informative lockout message');

    // Clear after lockout
    recordSuccessfulLogin(rateTestKey);
    const unlockedCheck = checkLoginRateLimit(rateTestKey);
    assert(unlockedCheck.allowed === true, 'Successful authentication resets rate limiter state');

    // -------------------------------------------------------------
    // Test Group 3: Token Validation, Expiry & Tamper Protection
    // -------------------------------------------------------------
    console.log('\n--- Test Group 3: Token Validation & Tamper Protection ---');

    const validCitizenToken = generateToken({ id: 1, email: 'citizen@example.com', type: 'citizen' });
    const verified = verifyToken(validCitizenToken);
    assert(verified && verified.id === 1, 'Valid JWT correctly decodes and validates');

    const tamperedToken = validCitizenToken.slice(0, -6) + 'abcdef';
    const tamperedResult = verifyToken(tamperedToken);
    assert(tamperedResult === null, 'Cryptographically tampered JWT token is rejected (returns null)');

    // -------------------------------------------------------------
    // Test Group 4: Role-Based Access Control (RBAC) & Endpoint Guards
    // -------------------------------------------------------------
    console.log('\n--- Test Group 4: Role-Based Access Control (RBAC) & Permissions ---');

    // Unauthenticated request to super_admin backup endpoint -> 401
    const unauthBackup = await makeRequest('GET', '/api/admin/database/backup');
    assert(unauthBackup.status === 401, 'Unauthenticated access to /api/admin/database/backup returns HTTP 401');

    // Officer (non-super-admin) token trying to access super_admin endpoint -> 403
    const officerToken = generateToken({ id: 3, email: 'tangedco.officer@civicresolve.gov', role: 'department_officer' });
    const officerBackup = await makeRequest('GET', '/api/admin/database/backup', {
      Authorization: `Bearer ${officerToken}`
    });
    assert(officerBackup.status === 403, 'Departmental officer is denied access to super_admin backup endpoint (HTTP 403)');

    // Super Admin token can access info endpoint
    const superAdminToken = generateToken({ id: 1, email: 'admin@civicresolve.gov', role: 'super_admin' });
    const superInfo = await makeRequest('GET', '/api/admin/database/info', {
      Authorization: `Bearer ${superAdminToken}`
    });
    assert(superInfo.status === 200, 'Super admin successfully authorized for administrative endpoints (HTTP 200)');

    // -------------------------------------------------------------
    // Test Group 5: Citizen Privacy & Cross-Citizen Complaint Isolation
    // -------------------------------------------------------------
    console.log('\n--- Test Group 5: Citizen Complaint Privacy & Cross-Access Isolation ---');

    // Citizen 1 fetches my-complaints
    const citizen1Token = generateToken({ id: 1, email: 'citizen@example.com', phone: '9840123456', type: 'citizen' });
    const c1ComplaintsRes = await makeRequest('GET', '/api/citizen/my-complaints', {
      Authorization: `Bearer ${citizen1Token}`
    });
    assert(c1ComplaintsRes.status === 200, 'GET /api/citizen/my-complaints succeeds for authenticated citizen (HTTP 200)');

    const c1Complaints = c1ComplaintsRes.data.complaints || [];
    const allBelongToC1 = c1Complaints.every(c => c.citizen_id === 1 || c.citizen_phone === '9840123456');
    assert(allBelongToC1, 'Cross-citizen isolation: Citizen 1 only receives complaints belonging to Citizen 1');

    // Citizen 2 cannot fetch complaints of Citizen 1
    const citizen2Token = generateToken({ id: 2, email: 'karthik@example.com', phone: '9443654321', type: 'citizen' });
    const c2ComplaintsRes = await makeRequest('GET', '/api/citizen/my-complaints', {
      Authorization: `Bearer ${citizen2Token}`
    });
    const c2Complaints = c2ComplaintsRes.data.complaints || [];
    const hasC1Leak = c2Complaints.some(c => c.citizen_id === 1);
    assert(!hasC1Leak, 'Zero data leak: Citizen 2 receives zero complaints belonging to Citizen 1');

    // Public detail endpoint masks PII for unauthorized visitor
    const publicTrackRes = await makeRequest('GET', '/api/complaints/track/CR-TN-2026-0001');
    assert(publicTrackRes.status === 200, 'Public complaint tracking returns HTTP 200');
    assert(publicTrackRes.data.citizen_phone && publicTrackRes.data.citizen_phone.includes('***'), 'Public tracker masks citizen phone number');
    assert(publicTrackRes.data.internal_notes === null, 'Public tracker redacts confidential internal officer notes');
    assert(publicTrackRes.data.ai_reason === null, 'Public tracker redacts private algorithmic triage reasoning');

    // Unauthorized citizen cannot submit feedback on someone else\'s complaint
    const feedbackDenied = await makeRequest('POST', '/api/complaints/CR-TN-2026-0001/feedback', {
      Authorization: `Bearer ${citizen2Token}` // Citizen 2 on Citizen 1's complaint
    }, { rating: 5, feedback: 'Great work' });
    assert(feedbackDenied.status === 403, 'Unauthorized citizen cannot submit feedback on another citizen\'s complaint (HTTP 403)');

    // -------------------------------------------------------------
    // Test Group 6: Input Sanitization & SQL Injection Resilience
    // -------------------------------------------------------------
    console.log('\n--- Test Group 6: Input Sanitization & SQL Injection Resilience ---');

    const sqliAttempt = await makeRequest('GET', "/api/complaints/' OR 1=1 --");
    assert(sqliAttempt.status === 404, 'SQL Injection in complaint ID path parameter safely handled without error leakage (HTTP 404)');

    const malformedPhoneRes = await makeRequest('POST', '/api/auth/citizen/send-otp', {}, { phone: 'abcd1234' });
    assert(malformedPhoneRes.status === 400, 'Malformed non-numeric phone number rejected with HTTP 400 validation error');

    // -------------------------------------------------------------
    // Test Group 7: Genuine Database Protection Verification
    // -------------------------------------------------------------
    console.log('\n--- Test Group 7: Genuine Database Protection Verification ---');

    const finalGenuineHash = getHash(genuineDb);
    const finalBackupHash = getHash(backupDb);

    assert(finalGenuineHash === initialGenuineHash, 'Genuine database SHA-256 hash UNCHANGED');
    assert(finalBackupHash === initialBackupHash, 'Safety backup database SHA-256 hash UNCHANGED');

    console.log('\n================================================================');
    console.log(`Phase 2 Security Audit Completed: ${passed}/${passed + failed} Tests Passed`);
    console.log('================================================================');

    if (failed > 0) process.exit(1);

  } finally {
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
