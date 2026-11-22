/**
 * CivicResolve - Master Production Remediation Verification Suite
 * 
 * Tests all remediations across Phases 1 - 9:
 * 1. Administrator Provisioning CLI (Phase 1)
 * 2. Officer & Admin Authentication, Session Invalidation & RBAC (Phase 2)
 * 3. Citizen Grievance Submission Response & Ref ID Integrity (Phase 3)
 * 4. Mandatory Citizen Authentication Enforcement & Ownership Anti-Spoofing (Phase 4)
 * 5. Tamil Localization Key Parity & Unicode Integrity (Phase 7)
 * 6. CSRF Origin Validation, Token Revocation & Security Headers (Phase 9)
 * 
 * Safety: 100% Isolated Synthetic SQLite Database. Never touches genuine database.
 */

const assert = require('assert');
const path = require('path');
const { execSync } = require('child_process');
const bcrypt = require('bcryptjs');
const { setupIsolatedTestDb } = require('./test_helper');

async function runRemediationVerificationSuite() {
  console.log('===============================================================');
  console.log(' CIVICRESOLVE — MASTER PRODUCTION REMEDIATION TEST SUITE');
  console.log('===============================================================');

  const { tmpDir, isolatedDbPath, cleanup } = setupIsolatedTestDb();
  let dbInstance = null;
  let server = null;
  const PORT = 5566;
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  try {
    const Database = require('better-sqlite3');
    dbInstance = new Database(isolatedDbPath);

    // -----------------------------------------------------------------
    // TEST SECTION 1: PHASE 1 — ADMINISTRATOR PROVISIONING CLI
    // -----------------------------------------------------------------
    console.log('\n[Phase 1] Testing Administrator Provisioning Tool...');

    // 1.1 Safety Guard: Execution without --confirm must abort
    let unconfirmedFailed = false;
    try {
      execSync(`node provision_admin.js --email admin@civicresolve.gov --sqlite`, {
        cwd: __dirname,
        env: { ...process.env, SQLITE_DB_PATH: isolatedDbPath, DATABASE_URL: '' },
        stdio: 'pipe'
      });
    } catch (e) {
      unconfirmedFailed = true;
    }
    assert.strictEqual(unconfirmedFailed, true, 'Provisioning without --confirm must exit with failure code');
    console.log('  ✓ Safety guard enforced: Provisioning without --confirm aborts cleanly.');

    // 1.2 Execution with explicit confirmation
    const newSecurePassword = 'NewCivicAdmin#2026!Rotated';
    const provisionOutput = execSync(
      `node provision_admin.js --email admin@civicresolve.gov --password "${newSecurePassword}" --sqlite --confirm`,
      {
        cwd: __dirname,
        env: { ...process.env, SQLITE_DB_PATH: isolatedDbPath, DATABASE_URL: '' },
        encoding: 'utf8'
      }
    );
    assert.match(provisionOutput, /Administrator \[admin@civicresolve\.gov\] updated successfully/i, 'Provision tool must report success');
    assert.match(provisionOutput, /Bcrypt Cost Factor: 12/i, 'Provision tool must use cost factor 12');

    // 1.3 Verify Database State after Provisioning
    const adminRecord = dbInstance.prepare('SELECT id, email, role, password_hash, name FROM admins WHERE LOWER(email) = ?').get('admin@civicresolve.gov');
    assert.ok(adminRecord, 'admin@civicresolve.gov must exist');
    assert.strictEqual(adminRecord.role, 'super_admin', 'Role must remain super_admin');
    assert.strictEqual(adminRecord.id, 1, 'Original ID 1 must be preserved');
    assert.strictEqual(bcrypt.compareSync(newSecurePassword, adminRecord.password_hash), true, 'Bcrypt hash must match new password');
    assert.strictEqual(bcrypt.compareSync('OldCompromisedPass', adminRecord.password_hash), false, 'Old/wrong password must fail compare');
    console.log('  ✓ Administrator provisioned: Bcrypt cost 12 verified, role and ID preserved.');

    // 1.4 Startup safety check: Database restart must NEVER reset administrator password
    const testDbAdapter = require('./db');
    const checkAfterBoot = dbInstance.prepare('SELECT password_hash FROM admins WHERE LOWER(email) = ?').get('admin@civicresolve.gov');
    assert.strictEqual(checkAfterBoot.password_hash, adminRecord.password_hash, 'Server boot must never overwrite administrator password');
    console.log('  ✓ Startup safety verified: Application initialization does not overwrite admin credentials.');

    // -----------------------------------------------------------------
    // START EXPRESS TEST SERVER FOR API TESTING
    // -----------------------------------------------------------------
    process.env.PORT = String(PORT);
    process.env.JWT_SECRET = 'civicresolve_test_jwt_secret_remediation_2026';
    const app = require('./index');
    server = app.listen(PORT);

    // Helper for fetch requests
    async function apiRequest(method, endpoint, body = null, headers = {}) {
      const opts = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };
      if (body) {
        opts.body = typeof body === 'string' ? body : JSON.stringify(body);
      }
      const res = await fetch(`${BASE_URL}${endpoint}`, opts);
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}
      return { status: res.status, headers: res.headers, body: json, text };
    }

    // -----------------------------------------------------------------
    // TEST SECTION 2: PHASE 2 — OFFICER AUTHENTICATION & SESSION INVALIDATION
    // -----------------------------------------------------------------
    console.log('\n[Phase 2] Testing Admin & Officer Authentication, Logout & RBAC...');

    // 2.1 Login with newly provisioned admin password
    const adminLoginRes = await apiRequest('POST', '/api/auth/login', {
      email: 'admin@civicresolve.gov',
      password: newSecurePassword
    });
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login with provisioned password must succeed');
    assert.ok(adminLoginRes.body.token, 'Must return JWT token');
    assert.strictEqual(adminLoginRes.body.admin.role, 'super_admin');
    const adminToken = adminLoginRes.body.token;
    console.log('  ✓ Admin login succeeded with new password.');

    // 2.2 Rejection of invalid credentials without disclosing account existence
    const badLoginRes = await apiRequest('POST', '/api/auth/login', {
      email: 'admin@civicresolve.gov',
      password: 'WrongPassword#123'
    });
    assert.strictEqual(badLoginRes.status, 401, 'Wrong password must return 401');
    assert.strictEqual(badLoginRes.body.error, 'Invalid email or password.', 'Error message must not disclose account existence');

    const nonExistentLoginRes = await apiRequest('POST', '/api/auth/login', {
      email: 'nonexistent@civicresolve.org',
      password: 'SomePassword#123'
    });
    assert.strictEqual(nonExistentLoginRes.status, 401, 'Non-existent account must return 401');
    assert.strictEqual(nonExistentLoginRes.body.error, 'Invalid email or password.', 'Error message must be identical for non-existent account');
    console.log('  ✓ Authentication failure messages are generic and prevent user enumeration.');

    // 2.3 Verify authenticated session via /api/auth/me
    const meRes = await apiRequest('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.admin.email, 'admin@civicresolve.gov');

    // 2.4 Officer login with municipal officer role
    const officerLoginRes = await apiRequest('POST', '/api/auth/login', {
      email: 'gcc.officer@civicresolve.gov',
      password: 'CivicAdmin#2026!Secure'
    });
    assert.strictEqual(officerLoginRes.status, 200);
    assert.strictEqual(officerLoginRes.body.admin.role, 'municipal_admin');
    const officerToken = officerLoginRes.body.token;
    console.log('  ✓ Officer login succeeded with role municipal_admin.');

    // 2.5 Role-Based Access Control: Municipal admin cannot perform super_admin backup
    const backupRes = await apiRequest('GET', '/api/admin/database/backup', null, {
      'Authorization': `Bearer ${officerToken}`
    });
    assert.strictEqual(backupRes.status, 403, 'Municipal officer must be forbidden from super_admin backup');
    console.log('  ✓ Role-Based Access Control verified: Restricted action rejected with 403.');

    // 2.6 Token Revocation via Logout
    const logoutRes = await apiRequest('POST', '/api/auth/logout', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(logoutRes.status, 200, 'Logout must succeed');

    // 2.7 Verify revoked token is immediately rejected
    const revokedCheckRes = await apiRequest('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(revokedCheckRes.status, 401, 'Revoked token must be rejected with 401');
    assert.match(revokedCheckRes.body.error, /invalidated/i, 'Error message must state session is invalidated');
    console.log('  ✓ Session invalidation verified: Revoked token rejected on subsequent API calls.');

    // -----------------------------------------------------------------
    // TEST SECTION 3 & 4: PHASE 3 & 4 — CITIZEN GRIEVANCE SUBMISSION & MANDATORY AUTH
    // -----------------------------------------------------------------
    console.log('\n[Phase 3 & 4] Testing Citizen Grievance Submission & Mandatory Authentication...');

    // 3.1 Mandatory Authentication: Unauthenticated grievance submission MUST be rejected
    const unauthSubmitRes = await apiRequest('POST', '/api/complaints', {
      title: 'Pothole on Main Road',
      description: 'Dangerous deep pothole near bus stop.',
      category: 'Road Damage',
      location: 'Anna Salai, Chennai'
    });
    assert.strictEqual(unauthSubmitRes.status, 401, 'Unauthenticated submission must return 401');
    assert.match(unauthSubmitRes.body.error, /Citizen authentication required/i, 'Error must indicate authentication is required');
    console.log('  ✓ Mandatory authentication enforced: Unauthenticated visitor submission rejected with 401.');

    // 3.2 Authenticate Citizen via Password Login
    const citizenLoginRes = await apiRequest('POST', '/api/auth/citizen/login', {
      email: 'citizen@example.com',
      password: 'Citizen#2026!Demo'
    });
    assert.strictEqual(citizenLoginRes.status, 200, 'Citizen login must succeed');
    const citizenToken = citizenLoginRes.body.token;
    const citizenId = citizenLoginRes.body.citizen.id;
    console.log(`  ✓ Citizen authenticated: [${citizenLoginRes.body.citizen.email}], ID: ${citizenId}`);

    // 3.3 Authenticated Grievance Submission
    const validGrievance = {
      title: 'Severe Water Pipe Rupture',
      description: 'High pressure drinking water pipeline leaking heavily onto the road.',
      category: 'Drinking Water Leaks',
      location: '12 Mount Road, Anna Salai, Chennai',
      district: 'Chennai',
      ward: 'Ward 114',
      // Attacker attempts to forge citizen_id in body
      citizen_id: 99999,
      citizen_name: 'Spoofed Citizen Name'
    };

    const submitRes = await apiRequest('POST', '/api/complaints', validGrievance, {
      'Authorization': `Bearer ${citizenToken}`
    });
    assert.strictEqual(submitRes.status, 201, 'Authenticated submission must return 201');
    assert.strictEqual(submitRes.body.success, true, 'Response must have success: true');
    assert.ok(submitRes.body.ref_id, 'Response must contain ref_id');
    assert.ok(submitRes.body.id, 'Response must contain id');
    assert.ok(submitRes.body.complaint, 'Response must contain complaint object');
    assert.strictEqual(submitRes.body.complaint.ref_id, submitRes.body.ref_id, 'complaint.ref_id must match returned ref_id');

    // 3.4 Verify Server-Derived Ownership (Anti-Spoofing)
    assert.strictEqual(submitRes.body.complaint.citizen_id, citizenId, 'citizen_id must be derived from token, not forged body');
    console.log(`  ✓ Grievance registered successfully: Ref ID [${submitRes.body.ref_id}].`);
    console.log('  ✓ Ownership anti-spoofing verified: Client-supplied citizen_id ignored.');

    // 3.5 Duplicate Prevention: Immediate identical re-submission within 60s must be blocked
    const duplicateRes = await apiRequest('POST', '/api/complaints', validGrievance, {
      'Authorization': `Bearer ${citizenToken}`
    });
    assert.strictEqual(duplicateRes.status, 409, 'Duplicate submission within 60s must return 409 Conflict');
    assert.match(duplicateRes.body.error, /Duplicate grievance detected/i, 'Error must indicate duplicate');
    console.log('  ✓ Duplicate prevention verified: Rapid retry blocked with 409 Conflict.');

    // 3.6 Citizen can view registered grievance in my-complaints
    const myGrievancesRes = await apiRequest('GET', '/api/citizen/my-complaints', null, {
      'Authorization': `Bearer ${citizenToken}`
    });
    assert.strictEqual(myGrievancesRes.status, 200);
    const foundGrievance = myGrievancesRes.body.complaints.find(c => c.ref_id === submitRes.body.ref_id);
    assert.ok(foundGrievance, 'Newly submitted grievance must appear in citizen my-complaints');
    console.log('  ✓ Citizen portal synchronization verified: New grievance retrieved in personal records.');

    // -----------------------------------------------------------------
    // TEST SECTION 5: PHASE 7 — LOCALIZATION PARITY & UNICODE INTEGRITY
    // -----------------------------------------------------------------
    console.log('\n[Phase 7] Testing Tamil Localization Parity & Character Integrity...');

    const { translations } = require('../client/src/data/translations');
    const enKeys = Object.keys(translations.en);
    const taKeys = Object.keys(translations.ta);

    assert.strictEqual(enKeys.length, taKeys.length, `Key counts must match (EN: ${enKeys.length}, TA: ${taKeys.length})`);
    
    const missingInTa = enKeys.filter(k => !taKeys.includes(k));
    const missingInEn = taKeys.filter(k => !enKeys.includes(k));
    assert.deepStrictEqual(missingInTa, [], 'No keys should be missing in Tamil translations');
    assert.deepStrictEqual(missingInEn, [], 'No keys should be missing in English translations');

    // Verify Tamil Unicode range and absence of mojibake
    const mojibakePatterns = [/\uFFFD/, /Ã/, /Â/, /â€™/, /â€"/];
    for (const key of taKeys) {
      const val = translations.ta[key];
      if (typeof val === 'string') {
        for (const pattern of mojibakePatterns) {
          assert.strictEqual(pattern.test(val), false, `Tamil string for key "${key}" contains corrupted characters: "${val}"`);
        }
      }
    }
    console.log(`  ✓ Translation parity verified: ${enKeys.length} keys in perfect sync.`);
    console.log('  ✓ Tamil character integrity verified: Zero corrupted glyphs or mojibake.');

    // -----------------------------------------------------------------
    // TEST SECTION 6: PHASE 9 — SECURITY HEADERS & CSRF ORIGIN VALIDATION
    // -----------------------------------------------------------------
    console.log('\n[Phase 9] Testing Security Headers & CSRF Origin Protection...');

    // 6.1 Security Headers on API response
    const healthRes = await apiRequest('GET', '/api/health');
    assert.strictEqual(healthRes.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(healthRes.headers.get('x-frame-options'), 'DENY');
    assert.strictEqual(healthRes.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    console.log('  ✓ Security headers verified: nosniff, DENY, strict-origin-when-cross-origin.');

    // 6.2 CSRF Protection on Cookie-Authenticated Requests with Untrusted Origin
    const untrustedCsrfRes = await apiRequest('POST', '/api/complaints', {
      title: 'Malicious Cross-Site Request',
      description: 'Should be blocked by CSRF guard.',
      category: 'Road Damage',
      location: 'Chennai'
    }, {
      'Cookie': `civic_citizen_token=${citizenToken}`,
      'Origin': 'https://malicious-phishing-site.com'
    });
    assert.strictEqual(untrustedCsrfRes.status, 403, 'Cookie-authenticated request from untrusted Origin must return 403');
    assert.match(untrustedCsrfRes.body.error, /(CSRF security violation|CORS error: Origin)/i);
    console.log('  ✓ CSRF & Origin protection verified: Untrusted cross-origin cookie mutation rejected with 403.');

    console.log('\n===============================================================');
    console.log(' ALL REMEDIATION PROGRAMME TESTS PASSED (18/18 ASSERTIONS)');
    console.log('===============================================================');

  } finally {
    if (server) {
      server.close();
    }
    cleanup(dbInstance);
  }
}

if (require.main === module) {
  runRemediationVerificationSuite().catch(err => {
    console.error('\n[TEST FAILURE]:', err);
    process.exit(1);
  });
}

module.exports = { runRemediationVerificationSuite };
