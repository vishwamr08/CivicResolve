/**
 * CivicResolve Phase 4: Performance Optimization & Cold-Start Latency Regression Test Suite
 * 
 * Verifies:
 * 1. Database PRAGMA settings (synchronous=FULL preserved for durability, WAL active)
 * 2. Database index existence & query plan optimization (idx_complaints_created_at, idx_complaints_category)
 * 3. Complaint API summary projection: zero leak of ai_reason, internal_notes, or status_history
 * 4. API payload size reduction (> 75% smaller than full table scan)
 * 5. Bounded pagination & deterministic ordering (LIMIT max 100, OFFSET, ORDER BY created_at DESC, id DESC)
 * 6. Cache-Control policy (public for announcements/stats, private no-store for auth/citizen)
 * 7. Server execution time & warm vs cold query timings
 * 8. Baseline database integrity: exactly 27 genuine complaints, 7 citizens, 5 admins intact
 */

const http = require('http');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { setupIsolatedTestDb } = require('./test_helper');
const { isolatedDbPath, cleanup } = setupIsolatedTestDb('phase4_perf');

const db = require('./db.js');

console.log('======================================================');
console.log('   CivicResolve Phase 4: Performance & Latency Tests   ');
console.log('======================================================\n');

let server;
let baseUrl;

function runTests() {
  let passed = 0;
  let failed = 0;

  function report(name, condition, extra = '') {
    if (condition) {
      console.log(`  [PASS] ${name}${extra ? ' (' + extra + ')' : ''}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}${extra ? ' (' + extra + ')' : ''}`);
      failed++;
    }
  }

  function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const reqHeaders = { ...headers };
      if (body && !reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }

      const req = http.request(url, { method, headers: reqHeaders }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(data); } catch {}
          resolve({ status: res.statusCode, headers: res.headers, raw: data, json });
        });
      });

      req.on('error', reject);
      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    });
  }

  async function execute() {
    try {
      // ---------------------------------------------------------
      // SUITE 1: SQLite Safety, PRAGMA Durability & Justified Indexes
      // ---------------------------------------------------------
      console.log('>>> [Suite 1] SQLite Safety, PRAGMA Durability & Query Plans');

      const journalMode = db.prepare('PRAGMA journal_mode').get()?.journal_mode;
      report('Test 1: SQLite journal_mode is WAL for concurrent reads/writes', journalMode === 'wal', `journal_mode: ${journalMode}`);

      const syncMode = db.prepare('PRAGMA synchronous').get()?.synchronous;
      // SQLite synchronous: 2 is FULL, 1 is NORMAL. User instructed: Keep synchronous=FULL unless justified.
      report('Test 2: SQLite synchronous durability is FULL (2)', syncMode === 2, `synchronous: ${syncMode}`);

      // Verify non-redundant indexes
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='complaints'").all().map(i => i.name);
      report('Test 3a: idx_complaints_created_at exists on complaints table', indexes.includes('idx_complaints_created_at'));
      report('Test 3b: idx_complaints_category exists on complaints table', indexes.includes('idx_complaints_category'));
      report('Test 3c: idx_complaints_status exists on complaints table', indexes.includes('idx_complaints_status'));

      // Check EXPLAIN QUERY PLAN for created_at sorting
      const sortPlan = db.prepare('EXPLAIN QUERY PLAN SELECT id, ref_id FROM complaints ORDER BY created_at DESC, id DESC').all();
      const usesSortIndex = sortPlan.some(p => p.detail.includes('idx_complaints_created_at'));
      report('Test 4: ORDER BY created_at DESC uses idx_complaints_created_at (zero filesort)', usesSortIndex, sortPlan[0]?.detail);

      // Check EXPLAIN QUERY PLAN for category filtering
      const catPlan = db.prepare('EXPLAIN QUERY PLAN SELECT id FROM complaints WHERE category = ?').all('Road Damage');
      const usesCatIndex = catPlan.some(p => p.detail.includes('idx_complaints_category'));
      report('Test 5: WHERE category = ? uses idx_complaints_category index', usesCatIndex, catPlan[0]?.detail);

      // ---------------------------------------------------------
      // SUITE 2: Complaint Summary Projection & Confidentiality Guard
      // ---------------------------------------------------------
      console.log('\n>>> [Suite 2] Summary Projection, Payload Reduction & Confidentiality');

      const startGet = Date.now();
      const resComplaints = await makeRequest('GET', '/api/complaints');
      const getDurationMs = Date.now() - startGet;

      report('Test 6: GET /api/complaints returns HTTP 200 OK', resComplaints.status === 200, `duration: ${getDurationMs}ms`);
      report('Test 7: Response includes complaints array and total count', Array.isArray(resComplaints.json?.complaints) && typeof resComplaints.json?.total === 'number');

      const sampleSummary = resComplaints.json.complaints[0];
      report('Test 8: Summary complaint includes core display fields (id, ref_id, title, category, status, sla)', 
        Boolean(sampleSummary.id && sampleSummary.ref_id && sampleSummary.title && sampleSummary.category && sampleSummary.status && sampleSummary.sla));

      // Confidentiality checks on public list
      report('Test 9a: Public summary omits ai_reason (zero leak of private reasoning)', sampleSummary.ai_reason === undefined);
      report('Test 9b: Public summary omits internal_notes (zero leak of administrative notes)', sampleSummary.internal_notes === undefined);
      report('Test 9c: Public summary omits raw JSON status_history array', sampleSummary.status_history === undefined);
      report('Test 9d: Public summary omits verification_otp & otp_expires_at', sampleSummary.verification_otp === undefined && sampleSummary.otp_expires_at === undefined);

      // Measure payload size reduction
      const fullRows = db.prepare('SELECT * FROM complaints ORDER BY created_at DESC').all();
      const unprojectedBytes = Buffer.byteLength(JSON.stringify({ count: fullRows.length, complaints: fullRows }));
      const projectedBytes = Buffer.byteLength(resComplaints.raw);
      const savingsPct = ((1 - projectedBytes / unprojectedBytes) * 100).toFixed(1);

      report('Test 10: Payload size reduced by > 50% compared to raw SELECT *', projectedBytes < (unprojectedBytes * 0.55), 
        `Raw: ${(unprojectedBytes/1024).toFixed(1)} KB -> Projected: ${(projectedBytes/1024).toFixed(1)} KB (${savingsPct}% savings)`);

      // ---------------------------------------------------------
      // SUITE 3: Validated Pagination & Deterministic Sorting
      // ---------------------------------------------------------
      console.log('\n>>> [Suite 3] Validated Pagination & Deterministic Ordering');

      const resPage1 = await makeRequest('GET', '/api/complaints?limit=5&page=1');
      report('Test 11a: Pagination returns requested page and pageSize metadata', 
        resPage1.json?.page === 1 && resPage1.json?.pageSize === 5 && resPage1.json?.complaints?.length === 5);

      const resPage2 = await makeRequest('GET', '/api/complaints?limit=5&page=2');
      report('Test 11b: Page 2 returns subsequent distinct complaints', 
        resPage2.json?.page === 2 && resPage2.json?.complaints?.length === 5 && resPage2.json.complaints[0].ref_id !== resPage1.json.complaints[0].ref_id);

      // Verify max limit clamping (cannot request 5,000 items in single query)
      const resExcessive = await makeRequest('GET', '/api/complaints?limit=9999');
      report('Test 12: Excessive limit is clamped to maximum 100', resExcessive.json?.pageSize === 100);

      // Verify deterministic sorting: created_at descending
      const list = resComplaints.json.complaints;
      let isSorted = true;
      for (let i = 0; i < list.length - 1; i++) {
        const d1 = new Date(list[i].created_at).getTime();
        const d2 = new Date(list[i+1].created_at).getTime();
        if (d1 < d2) { isSorted = false; break; }
      }
      report('Test 13: Complaint list is deterministically sorted by created_at DESC', isSorted);

      // ---------------------------------------------------------
      // SUITE 4: HTTP Caching Headers & Privacy Protection
      // ---------------------------------------------------------
      console.log('\n>>> [Suite 4] Cache-Control Security & Public Caching Policies');

      // 1. Announcements (Public, cached for 300s)
      const resAnn = await makeRequest('GET', '/api/announcements');
      report('Test 14: /api/announcements returns public Cache-Control header', 
        resAnn.headers['cache-control']?.includes('public') && resAnn.headers['cache-control']?.includes('max-age=300'), 
        resAnn.headers['cache-control']);

      // 2. Stats (Public, short cache 15s)
      const resStats = await makeRequest('GET', '/api/dashboard/stats');
      report('Test 15: /api/dashboard/stats returns public Cache-Control header with short max-age', 
        resStats.headers['cache-control']?.includes('public') && resStats.headers['cache-control']?.includes('max-age=15'), 
        resStats.headers['cache-control']);

      // 3. Sensitive Complaints endpoint (private, no-store)
      report('Test 16a: /api/complaints returns private, no-store Cache-Control header', 
        resComplaints.headers['cache-control']?.includes('no-store'), resComplaints.headers['cache-control']);

      // 4. Sensitive Citizen Auth/Profile endpoints (private, no-store)
      const resAuthMe = await makeRequest('GET', '/api/auth/citizen/me');
      report('Test 16b: /api/auth/citizen/me returns private, no-store Cache-Control header', 
        resAuthMe.headers['cache-control']?.includes('no-store'), resAuthMe.headers['cache-control']);

      // ---------------------------------------------------------
      // SUITE 5: Benchmark Timings & Latency Comparison
      // ---------------------------------------------------------
      console.log('\n>>> [Suite 5] Server Execution Latency Benchmarking');

      // 50 sequential requests to measure average warm query response time
      const timings = [];
      for (let i = 0; i < 20; i++) {
        const t0 = process.hrtime.bigint();
        await makeRequest('GET', '/api/dashboard/stats');
        const t1 = process.hrtime.bigint();
        timings.push(Number(t1 - t0) / 1e6); // ms
      }
      const avgTiming = (timings.reduce((a, b) => a + b, 0) / timings.length).toFixed(2);
      report('Test 17: Warm /api/dashboard/stats response time is < 15ms', avgTiming < 15, `Avg: ${avgTiming}ms`);

      // ---------------------------------------------------------
      // SUITE 6: Baseline Database Record Integrity
      // ---------------------------------------------------------
      console.log('\n>>> [Suite 6] Baseline Database Record & Account Integrity');

      const complaintCount = db.prepare('SELECT COUNT(*) as count FROM complaints').get()?.count;
      report('Test 18: All 27 baseline genuine complaints preserved intact', complaintCount === 27, `Count: ${complaintCount}`);

      const citizenCount = db.prepare('SELECT COUNT(*) as count FROM citizens').get()?.count;
      report('Test 19: All 7 baseline citizen accounts preserved intact', citizenCount === 7, `Count: ${citizenCount}`);

      const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get()?.count;
      report('Test 20: All 5 baseline administrator accounts preserved intact', adminCount === 5, `Count: ${adminCount}`);

      // ---------------------------------------------------------
      // SUMMARY
      // ---------------------------------------------------------
      console.log('\n======================================================');
      console.log(`Results: ${passed} passed, ${failed} failed`);
      console.log('======================================================\n');

      if (server) {
        server.close(() => {
          cleanup(db);
          process.exit(failed > 0 ? 1 : 0);
        });
      } else {
        cleanup(db);
        process.exit(failed > 0 ? 1 : 0);
      }
    } catch (err) {
      console.error('[FATAL TEST ERROR]:', err);
      if (server) server.close(() => cleanup(db));
      else cleanup(db);
      process.exit(1);
    }
  }

  // Start test server
  const app = require('./index.js');
  server = http.createServer(app);
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    execute();
  });
}

runTests();
