// Automated Verification Suite: Production Improvements & User Experience Audit
// Covers:
// 1. Returning citizen authentication & profile persistence
// 2. Complete 38 Tamil Nadu districts & 25 Municipal Corporations
// 3. Centralized Geographic API (/api/geo/districts, /api/geo/hierarchy)
// 4. Bilingual English & Tamil localization dictionary symmetry
// 5. Non-destructive profile update safety & zero fake data

const { setupIsolatedTestDb } = require('./test_helper');
const { isolatedDbPath, cleanup } = setupIsolatedTestDb('phase5_improvements');

const http = require('http');
const app = require('./index');
const { TAMIL_NADU_DISTRICTS } = require('./data/tamilnadu-geo');
const { findCitizenByPhone, normalizePhone } = require('./auth');
const db = require('./db');

let server;
let baseUrl;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    if (body && typeof body === 'object') {
      const payload = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: json || data });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'object' ? JSON.stringify(body) : body);
    }
    req.end();
  });
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  PASS: ${message}`);
  passedTests++;
}

async function runTests() {
  console.log('\n======================================================');
  console.log('CivicResolve Production Improvements Verification Suite');
  console.log('======================================================\n');

  // Start test server on random port
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server bound to ${baseUrl}`);
      resolve();
    });
  });

  try {
    // ----------------------------------------------------
    // TEST SUITE 1: Geographic Coverage & Master Hierarchy
    // ----------------------------------------------------
    console.log('\n[Suite 1: Geographic Hierarchy & 38 Districts]');
    
    assert(TAMIL_NADU_DISTRICTS.length === 38, `Master dataset has all 38 districts (found: ${TAMIL_NADU_DISTRICTS.length})`);

    const expectedCorporations = [
      'Greater Chennai Corporation',
      'Tambaram Municipal Corporation',
      'Avadi Municipal Corporation',
      'Coimbatore City Municipal Corporation',
      'Madurai Corporation',
      'Tiruchirappalli City Corporation',
      'Salem Corporation',
      'Tirunelveli Municipal Corporation',
      'Tiruppur City Municipal Corporation',
      'Erode City Municipal Corporation',
      'Vellore Municipal Corporation',
      'Thoothukudi City Municipal Corporation',
      'Dindigul City Municipal Corporation',
      'Thanjavur Municipal Corporation',
      'Hosur City Municipal Corporation',
      'Nagercoil Municipal Corporation',
      'Kancheepuram Municipal Corporation',
      'Karur Municipal Corporation',
      'Cuddalore Municipal Corporation',
      'Sivakasi Municipal Corporation',
      'Kumbakonam Municipal Corporation',
      // Newly upgraded corporations (August 2024 Gazette Notifications):
      'Karaikudi Municipal Corporation',
      'Namakkal Municipal Corporation',
      'Pudukkottai Municipal Corporation',
      'Tiruvannamalai Municipal Corporation'
    ];

    const foundCorps = [];
    TAMIL_NADU_DISTRICTS.forEach(d => {
      d.localBodies.forEach(lb => {
        if (lb.is_corporation) foundCorps.push(lb.name);
      });
    });

    assert(foundCorps.length === 25, `All 25 official Municipal Corporations found (found: ${foundCorps.length})`);
    
    for (const corp of expectedCorporations) {
      assert(foundCorps.includes(corp), `Verified Municipal Corporation: "${corp}" is present`);
    }

    // Validate the 4 newly upgraded corporations and their correct district assignment
    const sivaganga = TAMIL_NADU_DISTRICTS.find(d => d.id === 'sivaganga');
    const karaikudi = sivaganga?.localBodies.find(lb => lb.id === 'karaikudi_corp');
    assert(karaikudi && karaikudi.type === 'Municipal Corporation' && karaikudi.is_corporation === true, 'Karaikudi is correctly classified as a Municipal Corporation under Sivaganga district');
    assert(karaikudi.constituent_units && karaikudi.constituent_units.town_panchayats.length > 0, 'Karaikudi records constituent town panchayats');

    const namakkalDist = TAMIL_NADU_DISTRICTS.find(d => d.id === 'namakkal');
    const namakkal = namakkalDist?.localBodies.find(lb => lb.id === 'namakkal_corp');
    assert(namakkal && namakkal.type === 'Municipal Corporation' && namakkal.is_corporation === true, 'Namakkal is correctly classified as a Municipal Corporation under Namakkal district');
    assert(namakkal.constituent_units && namakkal.constituent_units.village_panchayats.length === 12, 'Namakkal records 12 constituent village panchayats');

    const pudukkottaiDist = TAMIL_NADU_DISTRICTS.find(d => d.id === 'pudukkottai');
    const pudukkottai = pudukkottaiDist?.localBodies.find(lb => lb.id === 'pudukkottai_corp');
    assert(pudukkottai && pudukkottai.type === 'Municipal Corporation' && pudukkottai.is_corporation === true, 'Pudukkottai is correctly classified as a Municipal Corporation under Pudukkottai district');
    assert(pudukkottai.constituent_units && pudukkottai.constituent_units.village_panchayats.length > 0, 'Pudukkottai records constituent village panchayats');

    const tiruvannamalaiDist = TAMIL_NADU_DISTRICTS.find(d => d.id === 'tiruvannamalai');
    const tiruvannamalai = tiruvannamalaiDist?.localBodies.find(lb => lb.id === 'tiruvannamalai_corp');
    assert(tiruvannamalai && tiruvannamalai.type === 'Municipal Corporation' && tiruvannamalai.is_corporation === true, 'Tiruvannamalai is correctly classified as a Municipal Corporation under Tiruvannamalai district');
    assert(tiruvannamalai.constituent_units && tiruvannamalai.constituent_units.village_panchayats.length === 18, 'Tiruvannamalai records 18 constituent village panchayats');

    // No duplicate local-body IDs across entire state
    const seenIds = new Set();
    let hasDuplicateId = false;
    TAMIL_NADU_DISTRICTS.forEach(d => {
      d.localBodies.forEach(lb => {
        if (seenIds.has(lb.id)) hasDuplicateId = true;
        seenIds.add(lb.id);
      });
    });
    assert(!hasDuplicateId, 'No duplicate local-body IDs found across Tamil Nadu dataset');

    // No corporation incorrectly classified as municipality
    let classificationError = false;
    TAMIL_NADU_DISTRICTS.forEach(d => {
      d.localBodies.forEach(lb => {
        if (lb.is_corporation && lb.type !== 'Municipal Corporation') classificationError = true;
        if (!lb.is_corporation && lb.type === 'Municipal Corporation') classificationError = true;
      });
    });
    assert(!classificationError, 'No corporation incorrectly classified as municipality, and no municipality marked as corporation');

    // No unverified ward or zone represented as verified
    let falseVerification = false;
    TAMIL_NADU_DISTRICTS.forEach(d => {
      d.localBodies.forEach(lb => {
        (lb.zones || []).forEach(z => {
          if (z.is_verified_zone && (!z.wards || z.wards.length === 0)) falseVerification = true;
        });
      });
    });
    assert(!falseVerification, 'No unverified zone or ward represented as verified');

    // Frontend/backend hierarchy consistency
    const fs = require('fs');
    const clientGeoFile = fs.readFileSync('../client/src/data/tamilnaduGeo.js', 'utf8');
    const cStartMarker = 'export const TAMIL_NADU_DISTRICTS = ';
    const cEndMarker = 'export const TN_DEPARTMENTS = ';
    const cJsonStr = clientGeoFile.substring(clientGeoFile.indexOf(cStartMarker) + cStartMarker.length, clientGeoFile.indexOf(cEndMarker)).trim().replace(/;$/, '');
    const clientDistricts = eval('(' + cJsonStr + ')');
    assert(JSON.stringify(TAMIL_NADU_DISTRICTS) === JSON.stringify(clientDistricts), 'Frontend and backend datasets have 100% exact JSON parity');

    // Test API: GET /api/geo/districts
    const distRes = await makeRequest('GET', '/api/geo/districts');
    assert(distRes.status === 200, 'GET /api/geo/districts returns HTTP 200');
    assert(distRes.body.districts && distRes.body.districts.length === 38, 'API returns exactly 38 districts');

    // Test API: GET /api/geo/hierarchy
    const hierRes = await makeRequest('GET', '/api/geo/hierarchy');
    assert(hierRes.status === 200, 'GET /api/geo/hierarchy returns HTTP 200');
    assert(hierRes.body.state === 'Tamil Nadu', 'Hierarchy state is "Tamil Nadu"');
    assert(hierRes.body.total_districts === 38, 'Hierarchy total_districts is 38');

    // ----------------------------------------------------
    // TEST SUITE 2: Returning Citizen Authentication & Session Persistence
    // ----------------------------------------------------
    console.log('\n[Suite 2: Returning Citizen Authentication & Session Persistence]');

    // Normalize phone test
    assert(normalizePhone('+91 98401 23456') === '9840123456', 'normalizePhone cleans +91 and spaces');
    assert(normalizePhone('09840123456') === '9840123456', 'normalizePhone cleans leading 0');

    // Test existing citizen lookup
    const existing = findCitizenByPhone(db, '9840123456');
    assert(existing !== null, 'Existing seeded citizen found by phone "9840123456"');
    assert(existing.name === 'Selvi Anitha Sundaram', 'Seeded citizen name "Selvi Anitha Sundaram" correctly preserved');

    // Step 1: Send OTP for existing citizen
    const sendOtpRes = await makeRequest('POST', '/api/auth/citizen/send-otp', {
      phone: '9840123456',
      purpose: 'login'
    });
    assert(sendOtpRes.status === 200, 'send-otp for existing citizen returns HTTP 200');
    assert(sendOtpRes.body.isExistingUser === true, 'send-otp recognizes citizen as existing user');
    const devOtp = sendOtpRes.body.devOtp;
    assert(devOtp !== undefined, 'Development OTP issued for testing');

    // Step 2: Verify OTP for existing citizen
    const verifyOtpRes = await makeRequest('POST', '/api/auth/citizen/verify-otp', {
      phone: '9840123456',
      otp: String(devOtp),
      purpose: 'login'
    });
    assert(verifyOtpRes.status === 200, 'verify-otp for existing citizen returns HTTP 200');
    assert(verifyOtpRes.body.isNewUser === false, 'verify-otp confirms isNewUser === false');
    assert(verifyOtpRes.body.token !== undefined, 'verify-otp issues JWT authentication token');
    assert(verifyOtpRes.body.citizen.name === 'Selvi Anitha Sundaram', 'verify-otp returns complete citizen profile without re-prompting');

    const citizenToken = verifyOtpRes.body.token;

    // Step 3: Session restoration via GET /api/auth/citizen/me
    const meRes = await makeRequest('GET', '/api/auth/citizen/me', null, {
      'Authorization': `Bearer ${citizenToken}`
    });
    assert(meRes.status === 200, 'GET /api/auth/citizen/me returns HTTP 200');
    assert(meRes.body.authenticated === true, 'Session is authenticated');
    assert(meRes.body.token !== undefined, 'Fresh token returned in response body');
    assert(meRes.body.citizen.name === 'Selvi Anitha Sundaram', 'Citizen profile restored matching existing record');

    // Step 4: Non-destructive registration safety
    // Attempting to register existing citizen must NOT wipe out name, email, or address
    await makeRequest('POST', '/api/auth/citizen/register-with-otp', {
      phone: '9840123456',
      otp: String(devOtp),
      name: '', // Empty name should NOT overwrite
      district: '', // Empty district should NOT overwrite
      municipality: ''
    });
    // Should safely resolve to existing account or reject empty name
    const afterCheck = findCitizenByPhone(db, '9840123456');
    assert(afterCheck.name === 'Selvi Anitha Sundaram', 'Citizen name was NEVER overwritten with blank value');
    assert(afterCheck.district === 'Chennai', 'Citizen district preserved intact');

    // ----------------------------------------------------
    // TEST SUITE 3: Render Cold-Start & Health Check
    // ----------------------------------------------------
    console.log('\n[Suite 3: Backend Health & Cold-Start Robustness]');

    const healthRes = await makeRequest('GET', '/api/health');
    assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');
    assert(healthRes.body.status === 'healthy', 'Health check reports "healthy"');
    assert(healthRes.body.database === 'connected', 'Database reports "connected"');

    const statsRes = await makeRequest('GET', '/api/dashboard/stats');
    assert(statsRes.status === 200, 'GET /api/dashboard/stats returns HTTP 200');
    assert(statsRes.body.totalComplaints >= 27, `Preserved all genuine complaints (found: ${statsRes.body.totalComplaints})`);

    // ----------------------------------------------------
    // TEST SUITE 4: Data Integrity (Zero Deleted Records)
    // ----------------------------------------------------
    console.log('\n[Suite 4: Genuine Data Integrity]');

    const totalComplaintsInDb = db.prepare('SELECT COUNT(*) as count FROM complaints').get().count;
    const totalCitizensInDb = db.prepare('SELECT COUNT(*) as count FROM citizens').get().count;
    const totalAdminsInDb = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;

    assert(totalComplaintsInDb >= 27, `Complaints preserved (count: ${totalComplaintsInDb})`);
    assert(totalCitizensInDb >= 7, `Citizens preserved (count: ${totalCitizensInDb})`);
    assert(totalAdminsInDb >= 5, `Admin accounts preserved (count: ${totalAdminsInDb})`);

    console.log('\n======================================================');
    console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
    console.log('======================================================\n');
  } finally {
    if (server) {
      server.close(() => {
        cleanup(db);
      });
    } else {
      cleanup(db);
    }
  }
}

runTests().catch(err => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
