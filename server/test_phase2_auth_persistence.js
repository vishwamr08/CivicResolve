// Phase 2: Citizen Profile Persistence & Authentication Integrity Automated Tests
// Tests zero-trust OTP verification, session persistence, duplicate prevention,
// municipality/ward context, complaint auto-linking, and baseline data preservation.

const http = require('http');
const path = require('path');
const fs = require('fs');

// Ensure test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_civicresolve_2026';

const app = require('./index');
const db = require('./db');
const { normalizePhone } = require('./auth');

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

async function runTests() {
  console.log('\n======================================================');
  console.log('   CivicResolve Phase 2: Authentication & Persistence Tests');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Initial State & Baseline Preservation Check
    const initialComplaintsCount = db.prepare('SELECT COUNT(*) as count FROM complaints').get().count;
    const initialAdminsCount = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;
    assert(initialComplaintsCount === 27, `Baseline genuine complaints preserved (expected 27, found ${initialComplaintsCount})`);
    assert(initialAdminsCount === 5, `Baseline admin accounts preserved (expected 5, found ${initialAdminsCount})`);

    // Clean up any test records from prior runs
    const testPhone = '9840199999';
    const testEmail = 'phase2_test_citizen@civicresolve.tn.gov.in';
    db.prepare('DELETE FROM citizen_otps WHERE phone = ?').run(testPhone);
    db.prepare('DELETE FROM citizens WHERE phone = ? OR email = ?').run(testPhone, testEmail);

    // Seed an unassociated complaint with testPhone to test auto-linking
    const unassociatedRef = 'TEST-LINK-' + Date.now();
    db.prepare(`
      INSERT INTO complaints (ref_id, citizen_phone, citizen_name, citizen_email, title, description, category, department, district, location, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      unassociatedRef,
      testPhone,
      'Pre-existing Citizen',
      testEmail,
      'Water Supply Leakage on Main Road',
      'Test complaint filed by phone before registration',
      'Water Supply',
      'Tamil Nadu Water Supply and Drainage Board',
      'Chennai',
      'Anna Nagar, Chennai',
      'Submitted'
    );

    // TEST 1: Request OTP for new phone number -> returns isExistingUser: false
    const sendOtpRes = await makeRequest('POST', '/api/auth/citizen/send-otp', {}, { phone: testPhone });
    assert(sendOtpRes.status === 200 && sendOtpRes.data.isExistingUser === false, 'Test 1: Request OTP for new phone returns isExistingUser: false');

    // Retrieve generated OTP from database
    const otpRecord = db.prepare('SELECT otp_hash FROM citizen_otps WHERE phone = ? AND verified = 0 ORDER BY created_at DESC LIMIT 1').get(testPhone);
    assert(Boolean(otpRecord), 'Test 1b: OTP securely recorded in database');

    // In non-production, the server sends dummy/debug OTP or hashes. We know in test mode the OTP generated is a 6-digit number.
    // Let's verify OTP using the correct OTP code from the db record or matching hash.
    // In index.js: generateSecureOtp() returns a 6-digit string, and hashOtp(otp) stores it.
    // For test verification, let's find the matching 6-digit OTP code.
    const { hashOtp } = require('./auth');
    let knownOtp = null;
    for (let c = 100000; c <= 999999; c++) {
      if (hashOtp(String(c)) === otpRecord.otp_hash) {
        knownOtp = String(c);
        break;
      }
    }
    assert(Boolean(knownOtp), `Test 1c: Successfully recovered active OTP (${knownOtp}) for testing`);

    // TEST 2: Verify OTP for new citizen -> returns isNewUser: true and signed registrationToken
    const verifyNewRes = await makeRequest('POST', '/api/auth/citizen/verify-otp', {}, {
      phone: testPhone,
      otp: knownOtp
    });
    assert(
      verifyNewRes.status === 200 &&
      verifyNewRes.data.isNewUser === true &&
      typeof verifyNewRes.data.registrationToken === 'string',
      'Test 2: Verifying OTP for new citizen returns isNewUser: true and cryptographic registrationToken'
    );
    const validRegToken = verifyNewRes.data.registrationToken;

    // TEST 3: Zero-Trust Security - Calling register-with-otp without registrationToken or mismatched phone is rejected (403)
    const rejectNoTokenRes = await makeRequest('POST', '/api/auth/citizen/register-with-otp', {}, {
      phone: testPhone,
      name: 'Unverified Hacker',
      email: testEmail
    });
    assert(rejectNoTokenRes.status === 403, 'Test 3a: Zero-Trust rejects registration without valid registrationToken (HTTP 403)');

    const rejectTamperedRes = await makeRequest('POST', '/api/auth/citizen/register-with-otp', {}, {
      phone: '9999999999', // Mismatched phone
      name: 'Tampered Phone User',
      email: testEmail,
      registrationToken: validRegToken
    });
    assert(rejectTamperedRes.status === 403, 'Test 3b: Zero-Trust rejects mismatched phone number against signed token (HTTP 403)');

    // TEST 4: Successful Registration with valid registrationToken
    const registerRes = await makeRequest('POST', '/api/auth/citizen/register-with-otp', {}, {
      phone: testPhone,
      name: 'Senthil Kumar',
      email: testEmail,
      district: 'Chennai',
      municipality: 'Greater Chennai Corporation',
      ward: 'Ward 114',
      registrationToken: validRegToken
    });
    assert(
      (registerRes.status === 200 || registerRes.status === 201) &&
      registerRes.data.citizen &&
      registerRes.data.citizen.phone === testPhone &&
      registerRes.data.citizen.municipality === 'Greater Chennai Corporation' &&
      registerRes.data.citizen.ward === 'Ward 114' &&
      registerRes.data.citizen.mobile_verified === true &&
      typeof registerRes.data.token === 'string',
      'Test 4: Registration succeeds with token, populating municipality, ward, and mobile_verified = true'
    );
    const citizenToken = registerRes.data.token;
    const citizenId = registerRes.data.citizen.id;

    // TEST 5: Automatic Complaint Linking on Registration
    const linkedComplaint = db.prepare('SELECT citizen_id FROM complaints WHERE ref_id = ?').get(unassociatedRef);
    assert(
      linkedComplaint && linkedComplaint.citizen_id === citizenId,
      'Test 5: Pre-existing complaints with matching mobile are automatically linked to new citizen profile'
    );

    // TEST 6: Session Verification & Persistence across Browser Restarts
    // Calling GET /api/auth/citizen/me with Bearer token
    const meRes = await makeRequest('GET', '/api/auth/citizen/me', {
      'Authorization': `Bearer ${citizenToken}`
    });
    assert(
      meRes.status === 200 &&
      meRes.data.authenticated === true &&
      meRes.data.citizen.id === citizenId &&
      meRes.data.citizen.municipality === 'Greater Chennai Corporation' &&
      meRes.data.citizen.ward === 'Ward 114',
      'Test 6: GET /api/auth/citizen/me restores full citizen session with administrative jurisdiction'
    );

    // TEST 7: Returning Citizen Login (The 1-Step Re-login Flow)
    // When the citizen enters their phone number again in the future:
    const returnOtpRes = await makeRequest('POST', '/api/auth/citizen/send-otp', {}, { phone: testPhone });
    assert(
      returnOtpRes.status === 200 && returnOtpRes.data.isExistingUser === true,
      'Test 7a: Returning citizen send-otp recognizes existing registered citizen (isExistingUser: true)'
    );

    const returnOtpRecord = db.prepare('SELECT otp_hash FROM citizen_otps WHERE phone = ? AND verified = 0 ORDER BY created_at DESC LIMIT 1').get(testPhone);
    let returnOtpCode = null;
    for (let c = 100000; c <= 999999; c++) {
      if (hashOtp(String(c)) === returnOtpRecord.otp_hash) {
        returnOtpCode = String(c);
        break;
      }
    }

    const returnVerifyRes = await makeRequest('POST', '/api/auth/citizen/verify-otp', {}, {
      phone: testPhone,
      otp: returnOtpCode
    });
    assert(
      returnVerifyRes.status === 200 &&
      returnVerifyRes.data.isNewUser === false &&
      returnVerifyRes.data.citizen &&
      returnVerifyRes.data.citizen.id === citizenId &&
      returnVerifyRes.data.citizen.name === 'Senthil Kumar' &&
      returnVerifyRes.data.citizen.municipality === 'Greater Chennai Corporation',
      'Test 7b: Returning citizen verifies OTP and IMMEDIATELY receives existing profile without re-entering details'
    );

    // TEST 8: Database Uniqueness Constraint Prevention
    let duplicatePrevented = false;
    try {
      db.prepare(`
        INSERT INTO citizens (name, email, phone, password_hash, district, municipality, ward)
        VALUES ('Duplicate Person', 'different_email@test.com', ?, 'dummy_hash', 'Madurai', 'Madurai Corp', 'Ward 10')
      `).run(testPhone);
    } catch (dbErr) {
      if (dbErr.message.includes('UNIQUE') || dbErr.message.includes('unique')) {
        duplicatePrevented = true;
      }
    }
    assert(duplicatePrevented, 'Test 8: Database UNIQUE constraint (idx_citizens_phone_unique) blocks duplicate citizen phone numbers');

    // TEST 9: Citizen Profile Update with Municipality and Ward
    const updateProfileRes = await makeRequest('PUT', '/api/citizen/profile', {
      'Authorization': `Bearer ${citizenToken}`
    }, {
      name: 'Senthil Kumar Updated',
      phone: testPhone,
      district: 'Coimbatore',
      municipality: 'Coimbatore City Municipal Corporation',
      ward: 'Ward 25',
      email_notifications: 1,
      sms_notifications: 1
    });
    assert(
      updateProfileRes.status === 200 &&
      updateProfileRes.data.profile.district === 'Coimbatore' &&
      updateProfileRes.data.profile.municipality === 'Coimbatore City Municipal Corporation' &&
      updateProfileRes.data.profile.ward === 'Ward 25',
      'Test 9: PUT /api/citizen/profile persists updated municipality and ward'
    );

    // TEST 10: Citizen Logout Clears Session Cookie
    const logoutRes = await makeRequest('POST', '/api/auth/citizen/logout');
    const setCookieHeader = logoutRes.headers['set-cookie'];
    const cookieCleared = Array.isArray(setCookieHeader)
      ? setCookieHeader.some(c => c.includes('civic_citizen_token=;') || c.includes('Expires=Thu, 01 Jan 1970'))
      : (typeof setCookieHeader === 'string' && (setCookieHeader.includes('civic_citizen_token=;') || setCookieHeader.includes('Expires=Thu, 01 Jan 1970')));
    assert(
      logoutRes.status === 200 && cookieCleared,
      'Test 10: POST /api/auth/citizen/logout responds with 200 and expires the HttpOnly session cookie'
    );

    // TEST 11: Unauthorized Access Prevention
    const unauthorizedRes = await makeRequest('GET', '/api/citizen/my-complaints');
    assert(unauthorizedRes.status === 401, 'Test 11: Access to private citizen complaints without token returns HTTP 401');

    // TEST 12: Final Baseline Data Check
    // Clean up test complaint and test citizen
    db.prepare('DELETE FROM complaints WHERE ref_id = ?').run(unassociatedRef);
    db.prepare('DELETE FROM citizens WHERE phone = ?').run(testPhone);
    db.prepare('DELETE FROM citizen_otps WHERE phone = ?').run(testPhone);

    const finalComplaintsCount = db.prepare('SELECT COUNT(*) as count FROM complaints').get().count;
    const finalAdminsCount = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;
    assert(finalComplaintsCount === 27, `Final count: All 27 genuine complaints intact (found ${finalComplaintsCount})`);
    assert(finalAdminsCount === 5, `Final count: All 5 admin accounts intact (found ${finalAdminsCount})`);

  } catch (err) {
    console.error('Test run failed with error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n------------------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Start server on free random port and execute tests
server = app.listen(0, '127.0.0.1', () => {
  serverPort = server.address().port;
  baseUrl = `http://127.0.0.1:${serverPort}`;
  runTests();
});
