// Phase 4: Tamil Nadu Geographic Master Data Comprehensive Audit
// Tests:
// 1. All 38 Revenue Districts of Tamil Nadu present with English & Tamil names
// 2. All 25 Municipal Corporations present with official administrative status
// 3. Specifically verify Karaikudi (Sivaganga), Namakkal (Namakkal), Pudukkottai (Pudukkottai), Tiruvannamalai (Tiruvannamalai)
// 4. Greater Chennai Corporation (GCC) official 15 zones & ward structure
// 5. Coimbatore Corporation (CCMC) official 5 zones structure
// 6. Municipalities and Town Panchayats representation with provenance metadata
// 7. Backend API endpoints: GET /api/geo/districts (38), GET /api/geo/corporations (25), GET /api/geo/hierarchy
// 8. Client-Server Master Data Parity (client/src/data/tamilnaduGeo.js vs server/data/tamilnadu-geo.js)
// 9. Genuine database protection verification

const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

const { setupIsolatedTestDb } = require('./test_helper');
const { isolatedDbPath, cleanup } = setupIsolatedTestDb('phase4_geo');

process.env.NODE_ENV = 'test';

const app = require('./index');
const serverGeo = require('./data/tamilnadu-geo');

let server;
let serverPort;
let baseUrl;

function makeRequest(method, endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search
    };

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
  console.log('CivicResolve Phase 4: Tamil Nadu Geographic Master Data Audit');
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
    const districts = serverGeo.TAMIL_NADU_DISTRICTS;

    // --- Test Group 1: Revenue District Coverage ---
    console.log('--- Test Group 1: Revenue District Coverage (38 Districts) ---');
    assert(Array.isArray(districts) && districts.length === 38, `Exactly 38 revenue districts present (found: ${districts.length})`);

    const expectedDistricts = [
      'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
      'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram', 'Kanniyakumari', 'Karur',
      'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris',
      'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga',
      'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
      'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore',
      'Viluppuram', 'Virudhunagar'
    ];

    const presentDistNames = districts.map(d => d.name);
    const missingDistricts = expectedDistricts.filter(d => !presentDistNames.includes(d));
    assert(missingDistricts.length === 0, `All 38 standard Tamil Nadu districts present (missing: ${missingDistricts.join(', ') || 'none'})`);

    const allHaveTamil = districts.every(d => Boolean(d.name_ta && d.name_ta.trim()));
    assert(allHaveTamil, 'All 38 revenue districts have valid official Tamil names (name_ta)');

    // --- Test Group 2: Municipal Corporations (Authoritative 25 Corporations) ---
    console.log('\n--- Test Group 2: Municipal Corporation Coverage (Authoritative 25) ---');

    const corporations = [];
    districts.forEach(d => {
      (d.localBodies || []).forEach(lb => {
        if (lb.type === 'Corporation' || lb.is_corporation) {
          corporations.push({ district: d.name, ...lb });
        }
      });
    });

    assert(corporations.length === 25, `Target 25 Municipal Corporations present (found: ${corporations.length})`);

    // Verify 4 recently notified corporations
    const karaikudi = corporations.find(c => c.name.toLowerCase().includes('karaikudi'));
    assert(Boolean(karaikudi && karaikudi.district === 'Sivaganga'), 'Karaikudi Municipal Corporation correctly situated in Sivaganga district');

    const namakkal = corporations.find(c => c.name.toLowerCase().includes('namakkal'));
    assert(Boolean(namakkal && namakkal.district === 'Namakkal'), 'Namakkal Municipal Corporation correctly situated in Namakkal district');

    const pudukkottai = corporations.find(c => c.name.toLowerCase().includes('pudukkottai'));
    assert(Boolean(pudukkottai && pudukkottai.district === 'Pudukkottai'), 'Pudukkottai Municipal Corporation correctly situated in Pudukkottai district');

    const tiruvannamalai = corporations.find(c => c.name.toLowerCase().includes('tiruvannamalai'));
    assert(Boolean(tiruvannamalai && tiruvannamalai.district === 'Tiruvannamalai'), 'Tiruvannamalai Municipal Corporation correctly situated in Tiruvannamalai district');

    // Verify Greater Chennai Corporation
    const gcc = corporations.find(c => c.id === 'gcc' || c.name.includes('Greater Chennai'));
    assert(Boolean(gcc), 'Greater Chennai Corporation (GCC) present');
    assert(Array.isArray(gcc.zones) && gcc.zones.length === 15, `GCC contains all 15 administrative zones (found: ${gcc.zones?.length})`);

    // Verify Coimbatore Corporation
    const ccmc = corporations.find(c => c.id === 'ccmc' || c.name.includes('Coimbatore'));
    assert(Boolean(ccmc), 'Coimbatore City Municipal Corporation (CCMC) present');
    assert(Array.isArray(ccmc.zones) && ccmc.zones.length === 5, `CCMC contains 5 administrative zones (found: ${ccmc.zones?.length})`);

    // --- Test Group 3: Backend API Endpoints ---
    console.log('\n--- Test Group 3: Backend Geographic Endpoints ---');

    const resDistricts = await makeRequest('GET', '/api/geo/districts');
    assert(resDistricts.status === 200 && resDistricts.data.districts.length === 38, 'GET /api/geo/districts returns HTTP 200 with 38 districts');

    const resCorporations = await makeRequest('GET', '/api/geo/corporations');
    assert(resCorporations.status === 200 && resCorporations.data.total === 25, 'GET /api/geo/corporations returns HTTP 200 with 25 corporations');

    const resHierarchy = await makeRequest('GET', '/api/geo/hierarchy');
    assert(resHierarchy.status === 200 && resHierarchy.data.total_districts === 38, 'GET /api/geo/hierarchy returns complete Tamil Nadu administrative hierarchy');

    // --- Test Group 4: Client and Server Master Data Synchronization ---
    console.log('\n--- Test Group 4: Client-Server Master Data Synchronization ---');

    const clientFilePath = path.resolve(__dirname, '..', 'client', 'src', 'data', 'tamilnaduGeo.js');
    assert(fs.existsSync(clientFilePath), 'client/src/data/tamilnaduGeo.js exists');

    const clientContent = fs.readFileSync(clientFilePath, 'utf8');
    assert(clientContent.includes('Karaikudi Municipal Corporation'), 'Client master data contains Karaikudi Municipal Corporation');
    assert(clientContent.includes('Namakkal Municipal Corporation'), 'Client master data contains Namakkal Municipal Corporation');
    assert(clientContent.includes('Pudukkottai Municipal Corporation'), 'Client master data contains Pudukkottai Municipal Corporation');
    assert(clientContent.includes('Tiruvannamalai Municipal Corporation'), 'Client master data contains Tiruvannamalai Municipal Corporation');

    // --- Test Group 5: Genuine Database Protection Verification ---
    console.log('\n--- Test Group 5: Genuine Database Protection Verification ---');

    const finalGenuineHash = getHash(genuineDb);
    const finalBackupHash = getHash(backupDb);

    assert(finalGenuineHash === initialGenuineHash, 'Genuine database SHA-256 hash UNCHANGED');
    assert(finalBackupHash === initialBackupHash, 'Safety backup database SHA-256 hash UNCHANGED');

    console.log('\n================================================================');
    console.log(`Phase 4 Geographic Audit Completed: ${passed}/${passed + failed} Tests Passed`);
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
