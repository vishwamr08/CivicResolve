// Phase 3: GPS Location Detection & Authoritative GIS Routing Automated Tests
// Tests GIS point-in-polygon verification, Tamil Nadu state boundary validation,
// reverse geocoding with caching, rate-limiting, coordinate validation, zero-fake coordinate rule,
// and complaint location provenance persistence.

const http = require('http');
const path = require('path');
const fs = require('fs');

const { setupIsolatedTestDb } = require('./test_helper');
const { isolatedDbPath, cleanup } = setupIsolatedTestDb('phase3_routing');

process.env.JWT_SECRET = 'test_jwt_secret_civicresolve_2026';

const app = require('./index');
const db = require('./db');
const { isPointInPolygon, validateTamilNaduMembership, determineMunicipalJurisdiction, GCC_ZONE_POLYGONS, CCMC_ZONE_POLYGONS } = require('./gis-engine');

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
  console.log('   CivicResolve Phase 3: GIS Location & Routing Tests');
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

  const createdTestRefIds = [];

  try {
    // Baseline count verification
    const initialComplaints = db.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
    const initialCitizens = db.prepare('SELECT COUNT(*) as c FROM citizens').get().c;
    const initialAdmins = db.prepare('SELECT COUNT(*) as c FROM admins').get().c;
    assert(initialComplaints === 27, `Baseline genuine complaints intact (expected 27, found ${initialComplaints})`);
    assert(initialCitizens === 7, `Baseline citizen accounts intact (expected 7, found ${initialCitizens})`);
    assert(initialAdmins === 5, `Baseline admin accounts intact (expected 5, found ${initialAdmins})`);

    // --- SUITE 1: Authoritative GIS Point-In-Polygon & State Membership ---
    console.log('\n>>> [Suite 1] Point-In-Polygon & Tamil Nadu State Boundary');

    // Test 1: Anna Nagar coordinates (13.0850, 80.2101) inside Tamil Nadu
    const stateCheckAnnaNagar = validateTamilNaduMembership(13.0850, 80.2101);
    assert(stateCheckAnnaNagar.isTamilNadu === true, 'Test 1: Anna Nagar coordinates verified inside Tamil Nadu boundary');

    // Test 2: Out of state coordinates (Bangalore: 12.9716, 77.5946) rejected from TN
    const stateCheckBangalore = validateTamilNaduMembership(12.9716, 77.5946);
    assert(stateCheckBangalore.isTamilNadu === false, 'Test 2: Bangalore coordinates recognized as outside Tamil Nadu boundary');

    // Test 3: Delhi coordinates (28.6139, 77.2090) fast-rejected via bounding box
    const stateCheckDelhi = validateTamilNaduMembership(28.6139, 77.2090);
    assert(stateCheckDelhi.isTamilNadu === false, 'Test 3: Delhi coordinates fast-screened out by Tamil Nadu bounding box');

    // Test 4: GCC Zone 8 (Anna Nagar) Polygon Point-in-Polygon
    const gccAnnaNagarResult = determineMunicipalJurisdiction(13.0850, 80.2101);
    assert(
      gccAnnaNagarResult.in_tamil_nadu === true &&
      gccAnnaNagarResult.corporation === 'Greater Chennai Corporation' &&
      gccAnnaNagarResult.zone === 'Zone 8 - Anna Nagar' &&
      gccAnnaNagarResult.jurisdiction_source === 'authoritative_gis' &&
      Array.isArray(gccAnnaNagarResult.available_wards) &&
      gccAnnaNagarResult.available_wards.includes(104),
      'Test 4: Point-in-polygon accurately routes Anna Nagar coordinates to GCC Zone 8 with official wards'
    );

    // Test 5: CCMC Central Zone Polygon Point-in-Polygon (Coimbatore: 11.0000, 76.9600)
    const ccmcResult = determineMunicipalJurisdiction(11.0000, 76.9600);
    assert(
      ccmcResult.in_tamil_nadu === true &&
      ccmcResult.corporation === 'Coimbatore City Municipal Corporation' &&
      ccmcResult.zone === 'Central Zone' &&
      ccmcResult.jurisdiction_source === 'authoritative_gis' &&
      ccmcResult.available_wards.includes(64),
      'Test 5: Point-in-polygon accurately routes Gandhipuram coordinates to CCMC Central Zone'
    );

    // Test 6: Rural Tamil Nadu coordinate outside corporation GIS layers (e.g. rural Thanjavur: 10.7870, 79.1378)
    const ruralResult = determineMunicipalJurisdiction(10.7870, 79.1378);
    assert(
      ruralResult.in_tamil_nadu === true &&
      ruralResult.corporation === null &&
      ruralResult.jurisdiction_source === 'unverified',
      'Test 6: Coordinates in rural Tamil Nadu outside surveyed corporations marked unverified (no fabricated wards)'
    );

    // --- SUITE 2: Server-Side Reverse Geocoding Endpoint (GET /api/geocode/reverse) ---
    console.log('\n>>> [Suite 2] Reverse Geocoding Endpoint & Provenance');

    // Test 7: Missing parameters rejected (HTTP 400)
    const missingParamsRes = await makeRequest('GET', '/api/geocode/reverse');
    assert(missingParamsRes.status === 400, 'Test 7: Missing lat/lng parameters rejected with HTTP 400');

    // Test 8: Invalid latitude > 90 rejected (HTTP 400)
    const invalidLatRes = await makeRequest('GET', '/api/geocode/reverse?lat=145.2&lng=80.2');
    assert(invalidLatRes.status === 400, 'Test 8: Latitude > 90 rejected with HTTP 400');

    // Test 9: Valid reverse geocoding with GIS integration for Anna Nagar
    const geocodeRes = await makeRequest('GET', '/api/geocode/reverse?lat=13.0850&lng=80.2101&accuracy=24');
    assert(
      geocodeRes.status === 200 &&
      geocodeRes.data.in_tamil_nadu === true &&
      geocodeRes.data.district === 'Chennai' &&
      geocodeRes.data.local_body === 'Greater Chennai Corporation' &&
      geocodeRes.data.zone === 'Zone 8 - Anna Nagar' &&
      geocodeRes.data.jurisdiction_source === 'authoritative_gis' &&
      geocodeRes.data.accuracy === 24,
      'Test 9: GET /api/geocode/reverse returns structured address, district, corporation, zone, and accuracy'
    );

    // Test 10: In-Memory Cache Hit on repeated coordinate lookup
    const cacheHitRes = await makeRequest('GET', '/api/geocode/reverse?lat=13.0850&lng=80.2101');
    assert(
      cacheHitRes.status === 200 && cacheHitRes.data.cached === true,
      'Test 10: In-memory geocoding cache returns immediate cached result on identical coordinates'
    );

    // Test 11: Out-of-state coordinate reverse geocode generates warning
    const outOfStateRes = await makeRequest('GET', '/api/geocode/reverse?lat=12.9716&lng=77.5946');
    assert(
      outOfStateRes.status === 200 &&
      outOfStateRes.data.in_tamil_nadu === false &&
      typeof outOfStateRes.data.warning === 'string',
      'Test 11: Out-of-state coordinate generates explicit jurisdiction warning without substituting Chennai'
    );

    // --- SUITE 3: Complaint Submission & Location Provenance (POST /api/complaints) ---
    console.log('\n>>> [Suite 3] Complaint Submission & Location Provenance');

    // Test 12: Verified GPS submission (detection_method: 'gps', isGpsVerified: true)
    const gpsComplaintRes = await makeRequest('POST', '/api/complaints', {}, {
      title: 'Water pipe leak on 2nd Avenue Anna Nagar',
      description: 'Severe high pressure water leakage overflowing on road causing traffic slowdown.',
      category: 'Water Leakage',
      location: '2nd Avenue, near Anna Nagar Tower Park',
      latitude: '13.085000',
      longitude: '80.210100',
      isGpsVerified: 'true',
      detection_method: 'gps',
      location_accuracy: '18',
      ward: 'Ward 104'
    });
    assert(
      gpsComplaintRes.status === 201 && gpsComplaintRes.data.complaint,
      'Test 12a: Successfully submitted complaint with browser GPS telemetry'
    );
    const gpsComplaintId = gpsComplaintRes.data.complaint.id;
    createdTestRefIds.push(gpsComplaintRes.data.complaint.ref_id);

    const savedGpsRow = db.prepare('SELECT * FROM complaints WHERE id = ?').get(gpsComplaintId);
    assert(
      savedGpsRow.is_gps_verified === 1 &&
      savedGpsRow.detection_method === 'gps' &&
      savedGpsRow.location_accuracy === 18 &&
      savedGpsRow.district === 'Chennai' &&
      savedGpsRow.local_body === 'Greater Chennai Corporation' &&
      savedGpsRow.zone === 'Zone 8 - Anna Nagar' &&
      savedGpsRow.ward === 'Ward 104' &&
      savedGpsRow.jurisdiction_source === 'citizen_confirmed',
      'Test 12b: Complaint correctly persisted as is_gps_verified=1, detection_method="gps", accuracy=18m, and citizen_confirmed ward'
    );

    // Test 13: Map Pin Adjustment submission (detection_method: 'map_pin') MUST NOT be marked GPS verified
    const mapPinComplaintRes = await makeRequest('POST', '/api/complaints', {}, {
      title: 'Deep road cave-in near central bus stand',
      description: 'Pothole cave-in observed on main arterial road. Needs immediate asphalt patching.',
      category: 'Road Damage',
      location: 'Gandhipuram Main Bus Stand, Coimbatore',
      latitude: '11.016800',
      longitude: '76.965800',
      isGpsVerified: 'false',
      detection_method: 'map_pin',
      ward: 'Ward 64'
    });
    assert(mapPinComplaintRes.status === 201, 'Test 13a: Successfully submitted complaint via interactive map pin adjustment');
    createdTestRefIds.push(mapPinComplaintRes.data.complaint.ref_id);

    const savedMapPinRow = db.prepare('SELECT * FROM complaints WHERE id = ?').get(mapPinComplaintRes.data.complaint.id);
    assert(
      savedMapPinRow.is_gps_verified === 0 &&
      savedMapPinRow.detection_method === 'map_pin' &&
      savedMapPinRow.district === 'Coimbatore' &&
      savedMapPinRow.local_body === 'Coimbatore City Municipal Corporation' &&
      savedMapPinRow.zone === 'Central Zone',
      'Test 13b: Map pin adjustment is strictly marked is_gps_verified=0 and detection_method="map_pin" (No false GPS claim)'
    );

    // Test 14: Manual text address submission with ZERO fake coordinates
    const manualComplaintRes = await makeRequest('POST', '/api/complaints', {}, {
      title: 'Streetlights flickering on North Car Street',
      description: 'Sodium vapor lamps flickering erratically for the past 3 days in heritage street.',
      category: 'Streetlights',
      location: 'North Car Street, Madurai',
      district: 'Madurai',
      local_body: 'Madurai Corporation',
      ward: 'Ward 12'
      // No latitude or longitude provided
    });
    assert(manualComplaintRes.status === 201, 'Test 14a: Successfully submitted manual address complaint without coordinates');
    createdTestRefIds.push(manualComplaintRes.data.complaint.ref_id);

    const savedManualRow = db.prepare('SELECT * FROM complaints WHERE id = ?').get(manualComplaintRes.data.complaint.id);
    assert(
      savedManualRow.latitude === null &&
      savedManualRow.longitude === null &&
      savedManualRow.is_gps_verified === 0 &&
      savedManualRow.detection_method === 'manual',
      'Test 14b: Manual address has null coordinates and is_gps_verified=0 (Zero fake coordinate insertion)'
    );

    // Test 15: Out-of-state coordinates marked jurisdiction_source = 'out_of_state'
    const oosComplaintRes = await makeRequest('POST', '/api/complaints', {}, {
      title: 'Pothole outside border checkpost',
      description: 'Pothole located just beyond the border checkpost on highway.',
      category: 'Road Damage',
      location: 'Near Hosur-Attibele Border',
      latitude: '12.820000',
      longitude: '77.720000', // Karnataka side
      detection_method: 'map_pin'
    });
    assert(oosComplaintRes.status === 201, 'Test 15a: Successfully ingested border-coordinate complaint');
    createdTestRefIds.push(oosComplaintRes.data.complaint.ref_id);

    const savedOosRow = db.prepare('SELECT * FROM complaints WHERE id = ?').get(oosComplaintRes.data.complaint.id);
    assert(
      savedOosRow.jurisdiction_source === 'out_of_state' &&
      savedOosRow.district === 'Out of State Jurisdiction',
      'Test 15b: Out-of-state incident location independently identified and marked jurisdiction_source="out_of_state"'
    );

    // --- CLEANUP & BASELINE DATA VERIFICATION ---
    console.log('\n>>> [Suite 4] Baseline Database Integrity & Final Counts');
    for (const ref of createdTestRefIds) {
      db.prepare('DELETE FROM complaints WHERE ref_id = ?').run(ref);
    }

    const finalComplaints = db.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
    const finalCitizens = db.prepare('SELECT COUNT(*) as c FROM citizens').get().c;
    const finalAdmins = db.prepare('SELECT COUNT(*) as c FROM admins').get().c;

    assert(finalComplaints === 27, `Final Count: All 27 baseline complaints intact (found ${finalComplaints})`);
    assert(finalCitizens === 7, `Final Count: All 7 baseline citizens intact (found ${finalCitizens})`);
    assert(finalAdmins === 5, `Final Count: All 5 baseline admins intact (found ${finalAdmins})`);

  } catch (err) {
    console.error('Test run failed with error:', err);
    failed++;
  } finally {
    if (server) {
      server.close(() => {
        cleanup(db);
      });
    } else {
      cleanup(db);
    }
  }

  console.log('\n------------------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

server = app.listen(0, '127.0.0.1', () => {
  serverPort = server.address().port;
  baseUrl = `http://127.0.0.1:${serverPort}`;
  runTests();
});
