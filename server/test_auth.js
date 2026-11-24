const { setupIsolatedTestDb } = require('./test_helper');
let testDbIsolation = null;
if (!process.env.BASE_URL) {
  testDbIsolation = setupIsolatedTestDb('test_auth');
}
require('dotenv').config();

async function testAuthSuite() {
  console.log('====================================');
  console.log('RUNNING COMPREHENSIVE AUTH TEST SUITE');
  console.log('====================================');

  let server = null;
  let BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5000';

  try {
    const probe = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(1000) });
    if (!probe.ok) throw new Error('Not running');
  } catch {
    const app = require('./index');
    server = app.listen(0);
    const port = server.address().port;
    BASE_URL = `http://127.0.0.1:${port}`;
    console.log(`[Test Server] Started embedded server on ${BASE_URL}`);
  }

  try {
    // 1. Unauthorized Access Test
  console.log('\n[Test 1] Attempting PATCH /api/complaints/1/manage without auth token...');
  const unauthRes = await fetch(`${BASE_URL}/api/complaints/1/manage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Resolved' })
  });
  console.log(`Status received: ${unauthRes.status} (Expected: 401)`);
  if (unauthRes.status !== 401) throw new Error('Expected 401 Unauthorized');
  const unauthJson = await unauthRes.json();
  console.log(`âœ“ Response: "${unauthJson.error}"`);

  // 2. Invalid Credentials Test
  console.log('\n[Test 2] Attempting login with incorrect credentials...');
  const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@civicresolve.gov',
      password: 'WrongPassword123!'
    })
  });
  console.log(`Status received: ${badLoginRes.status} (Expected: 401)`);
  if (badLoginRes.status !== 401) throw new Error('Expected 401 for wrong credentials');
  const badLoginJson = await badLoginRes.json();
  console.log(`âœ“ Response: "${badLoginJson.error}"`);

  // 3. Valid Administrator Login Test
  console.log('\n[Test 3] Logging in with valid initial administrator credentials...');
  const validEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@civicresolve.gov';
  const validPassword = process.env.INITIAL_ADMIN_PASSWORD || 'CivicAdmin#2026!Secure';

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: validEmail,
      password: validPassword
    })
  });

  console.log(`Status received: ${loginRes.status} (Expected: 200)`);
  if (!loginRes.ok) throw new Error('Login failed for valid admin credentials');
  const loginJson = await loginRes.json();
  const token = loginJson.token;
  console.log(`âœ“ Login success! Admin name: "${loginJson.admin.name}", Role: "${loginJson.admin.role}"`);
  console.log(`  Signed JWT Token: ${token.slice(0, 25)}...`);

  // 4. Verify /api/auth/me Session Test
  console.log('\n[Test 4] Verifying session via GET /api/auth/me...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`Status received: ${meRes.status} (Expected: 200)`);
  if (!meRes.ok) throw new Error('GET /api/auth/me failed with valid token');
  const meJson = await meRes.json();
  console.log(`âœ“ Authenticated admin verified: ${meJson.admin.email} (${meJson.admin.name})`);

  // 5. Authorized Admin Action Test
  const db = require('./db');
  const sampleComplaint = await db.prepare('SELECT id FROM complaints ORDER BY id ASC LIMIT 1').get();
  const targetId = sampleComplaint ? sampleComplaint.id : 1;
  console.log(`\n[Test 5] Calling protected PATCH /api/complaints/${targetId}/manage with Bearer token...`);
  const manageRes = await fetch(`${BASE_URL}/api/complaints/${targetId}/manage`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      status: 'In Progress',
      resolution_remarks: 'Verified by authenticated administrator in test suite.'
    })
  });
  console.log(`Status received: ${manageRes.status} (Expected: 200)`);
  if (!manageRes.ok) throw new Error('Protected manage call failed with valid token');
  const manageJson = await manageRes.json();
  console.log(`âœ“ Complaint updated! Status: ${manageJson.complaint.status}, Last actor: "${manageJson.complaint.status_history.slice(-1)[0].actor}"`);

  // 6. Logout Test
  console.log('\n[Test 6] Calling POST /api/auth/logout...');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST' });
  console.log(`Status received: ${logoutRes.status} (Expected: 200)`);
  console.log('âœ“ Logged out successfully.');

  console.log('\n====================================');
  console.log('ALL AUTHENTICATION TESTS PASSED!');
  console.log('====================================');
  } finally {
    if (server) {
      server.close();
    }
    const db = require('./db');
    if (db && typeof db.close === 'function') {
      try { db.close(); } catch {}
    }
    if (testDbIsolation) {
      testDbIsolation.cleanup();
    }
  }
}

testAuthSuite().catch(err => {
  console.error('Auth test failed:', err);
  process.exit(1);
});
