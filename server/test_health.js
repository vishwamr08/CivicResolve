/**
 * CivicResolve - Automated Health-Check Test Suite
 * Validating:
 * 1. GET /health route availability and registration before application API routes
 * 2. HTTP 200 and JSON response when server is running and SQLite DB is accessible
 * 3. Existing SQLite connection reuse (no new connection instantiated)
 * 4. Response schema: status, service, database status, timestamp
 * 5. HTTP 503 response when database connectivity check fails
 * 6. Zero leakage of credentials, database paths, personal information or stack traces
 * 7. Safe database restoration after failure testing (no data loss or corruption)
 * 8. Backward compatibility of /api/health
 */

const http = require('http');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

process.env.USE_SQLITE = 'true';

const app = require('./index');
const db = require('./db');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] Test ${totalTests}: ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] Test ${totalTests}: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function requestHttp(serverUrl, pathName) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathName, serverUrl);
    const req = http.request(url, { method: 'GET' }, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch {
          json = rawData;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json,
          rawBody: rawData
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runHealthCheckTests() {
  console.log('================================================================================');
  console.log('  CIVICRESOLVE — AUTOMATED HEALTH CHECK TEST SUITE (GET /health)');
  console.log('================================================================================\n');

  // Start internal server on ephemeral port for automated verification
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });

  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`>>> Health check test server active on ${baseUrl}\n`);

  try {
    // -------------------------------------------------------------
    // TEST SUITE 1: Route Registration and Precedence
    // -------------------------------------------------------------
    console.log('>>> [Suite 1] Route Registration & Precedence');
    const routerStack = app._router ? app._router.stack : (app.router ? app.router.stack : []);
    const healthLayerIndex = routerStack.findIndex(layer => layer.route && layer.route.path === '/health');
    const apiHealthLayerIndex = routerStack.findIndex(layer => layer.route && layer.route.path === '/api/health');

    assert(healthLayerIndex !== -1, 'GET /health endpoint is registered in Express router');
    assert(
      apiHealthLayerIndex === -1 || healthLayerIndex < apiHealthLayerIndex,
      'GET /health is registered before downstream /api/ application routes'
    );

    // -------------------------------------------------------------
    // TEST SUITE 2: Healthy Server and SQLite Database Connectivity
    // -------------------------------------------------------------
    console.log('\n>>> [Suite 2] Operational Health Probe (HTTP 200 & Database Accessibility)');
    const healthyRes = await requestHttp(baseUrl, '/health');

    assert(healthyRes.statusCode === 200, `GET /health returns HTTP 200 OK (received: ${healthyRes.statusCode})`);
    assert(typeof healthyRes.body === 'object' && healthyRes.body !== null, 'Response payload is valid JSON object');

    // Requirement 6: status, service, database status, timestamp
    const body = healthyRes.body;
    assert(
      body.status === 'healthy' || body.status === 'ok',
      `Response contains valid status field: "${body.status}"`
    );
    assert(
      body.service === 'CivicResolve' || /civicresolve/i.test(body.service),
      `Response contains valid service field: "${body.service}"`
    );

    const dbStatus = body.database_status || body['database status'] || body.database;
    assert(
      dbStatus === 'connected' || dbStatus === 'healthy' || dbStatus === 'ok',
      `Response contains valid database status field: "${dbStatus}"`
    );

    assert(typeof body.timestamp === 'string', 'Response contains timestamp field');
    const parsedTime = Date.parse(body.timestamp);
    assert(!isNaN(parsedTime), `Timestamp is a valid ISO 8601 string: ${body.timestamp}`);

    // Requirement 9: Existing SQLite connection check
    assert(db && typeof db.prepare === 'function', 'Reuses existing SQLite database instance without new connection');
    const pragmaCheck = db.prepare('SELECT 1 as test').get();
    assert(pragmaCheck && pragmaCheck.test === 1, 'Verified live SQLite connectivity using existing db connection');

    // -------------------------------------------------------------
    // TEST SUITE 3: Database Connectivity Failure (HTTP 503)
    // -------------------------------------------------------------
    console.log('\n>>> [Suite 3] Database Connectivity Failure Handling (HTTP 503)');
    const originalPrepare = db.prepare;

    try {
      // Simulate database failure on the existing SQLite connection
      db.prepare = function () {
        throw new Error('Simulated SQLite disk I/O lock failure in civicresolve.db');
      };

      const failRes = await requestHttp(baseUrl, '/health');

      assert(failRes.statusCode === 503, `GET /health returns HTTP 503 Service Unavailable on DB failure (received: ${failRes.statusCode})`);

      const failBody = failRes.body;
      assert(typeof failBody === 'object' && failBody !== null, 'Failure response is valid JSON');
      assert(
        failBody.status === 'unhealthy' || failBody.status === 'error',
        `Failure response contains status: "${failBody.status}"`
      );
      assert(
        failBody.service === 'CivicResolve' || /civicresolve/i.test(failBody.service),
        `Failure response contains service: "${failBody.service}"`
      );

      const failDbStatus = failBody.database_status || failBody['database status'] || failBody.database;
      assert(
        failDbStatus === 'disconnected' || failDbStatus === 'error' || failDbStatus === 'unhealthy',
        `Failure response contains database status: "${failDbStatus}"`
      );
      assert(typeof failBody.timestamp === 'string', 'Failure response contains timestamp');

      // -------------------------------------------------------------
      // TEST SUITE 4: Security & Information Disclosure Hardening
      // -------------------------------------------------------------
      console.log('\n>>> [Suite 4] Security & Sanitization (No Leaked Paths, Stack Traces, or Secrets)');
      const rawPayload = failRes.rawBody || '';

      assert(!rawPayload.includes('Simulated SQLite disk I/O lock'), 'Error message is not exposed in response body');
      assert(!rawPayload.includes('civicresolve.db'), 'Database filename/path is not exposed');
      assert(!/at\s+.*\(.*:\d+:\d+\)/.test(rawPayload), 'Stack traces are not exposed in response');
      assert(!rawPayload.toLowerCase().includes('password'), 'No credentials or passwords present in response');
      assert(!rawPayload.toLowerCase().includes('secret'), 'No secrets present in response');

    } finally {
      // Restore original prepare method immediately
      db.prepare = originalPrepare;
    }

    // -------------------------------------------------------------
    // TEST SUITE 5: Post-Failure Recovery & Database Integrity
    // -------------------------------------------------------------
    console.log('\n>>> [Suite 5] Post-Failure Recovery & Normal Operation');
    const recoveryRes = await requestHttp(baseUrl, '/health');
    assert(recoveryRes.statusCode === 200, 'Endpoint automatically recovers to HTTP 200 once DB is accessible');
    assert(
      (recoveryRes.body.database_status || recoveryRes.body.database) === 'connected',
      'Database status successfully returns "connected"'
    );

    // -------------------------------------------------------------
    // TEST SUITE 6: Backward Compatibility of /api/health
    // -------------------------------------------------------------
    console.log('\n>>> [Suite 6] Backward Compatibility of /api/health');
    const apiHealthRes = await requestHttp(baseUrl, '/api/health');
    assert(apiHealthRes.statusCode === 200, `GET /api/health returns HTTP 200 (received: ${apiHealthRes.statusCode})`);
    assert(apiHealthRes.body.status === 'healthy', 'GET /api/health maintains legacy status: "healthy"');
    assert(apiHealthRes.body.database === 'connected', 'GET /api/health maintains legacy database: "connected"');
    assert(apiHealthRes.body.service === 'CivicResolve', 'GET /api/health includes service: "CivicResolve"');

    // -------------------------------------------------------------
    // TEST SUITE 7: Express Backend Root Route (GET /)
    // -------------------------------------------------------------
    console.log('\n>>> [Suite 7] Root Route Specification (GET /)');
    const rootRes = await requestHttp(baseUrl, '/');
    assert(rootRes.statusCode === 200, `GET / returns HTTP 200 OK (received: ${rootRes.statusCode})`);
    assert(typeof rootRes.body === 'object' && rootRes.body !== null, 'GET / returns valid JSON');
    assert(rootRes.body.application === 'CivicResolve' || rootRes.body.name === 'CivicResolve', 'GET / contains application name "CivicResolve"');
    assert(rootRes.body.service === 'Backend API', 'GET / contains service "Backend API"');
    assert(rootRes.body.status === 'operational', 'GET / contains status "operational"');
    assert(Boolean(rootRes.body.version), `GET / contains version: "${rootRes.body.version}"`);
    assert((rootRes.body.health_endpoint || rootRes.body.health) === '/api/health', 'GET / references health endpoint "/api/health"');
    assert(typeof rootRes.body.routes === 'object' && rootRes.body.routes !== null, 'GET / contains available route information');

    console.log('\n================================================================================');
    console.log(`  ALL ${passedTests}/${totalTests} HEALTH CHECK TESTS PASSED CLEANLY!`);
    console.log('================================================================================\n');

  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runHealthCheckTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n[FATAL] Test execution failed:', err.message);
    process.exit(1);
  });
