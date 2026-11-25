/**
 * CivicResolve - Profile Photo System & Free-First Notification Integration Test Suite
 *
 * Covers Phases 2, 3, 4, 5, 6, 8:
 * - Suite 1: Profile Photo Magic-Byte Validation, Sharp Compression & Security Rejection
 * - Suite 2: Citizen Profile Photo Upload, Retrieval, Replacement, Removal & Persistence
 * - Suite 3: Admin Profile Photo Upload, Safe Profile Update, Escalation Defense & Cross-Role Isolation
 * - Suite 4: Web Push VAPID Registration, Deep Links, Unsubscribe & 410 Expired Subscription Cleanup
 * - Suite 5: Resend Email Adapter (Mock/Test Mode), Failure Tolerance, Duplicate Prevention & Retry
 * - Suite 6: Authenticated In-App Notification Centre (Ownership Isolation, Read, Read-All, Delete, Pagination)
 * - Suite 7: Full Integrated Complaint -> Resolution Workflow Across All 3 Free-First Channels
 */

const http = require('http');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

process.env.USE_SQLITE = 'true';
process.env.MOCK_EMAIL = 'false';
process.env.MOCK_PUSH = 'false';
process.env.VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8';
process.env.VAPID_PRIVATE_KEY = 'UUxI4O8-FbRouAf7-f_qR4f7m_tQ5wN_r4J6P5B2nXQ';
process.env.VAPID_SUBJECT = 'mailto:grievance@civicresolve.gov';

const { setupIsolatedTestDb } = require('./test_helper');
const { cleanup } = setupIsolatedTestDb('profile_photos_free_notifs');

const db = require('./db');
const app = require('./index');
const { setTestEmailAdapter } = require('./notifications');
const { setTestPushAdapter } = require('./pushService');
const { MAX_PHOTO_BYTES } = require('./profilePhotoService');

let server;
let BASE_URL = '';
let passed = 0;
let total = 0;

function assert(cond, msg) {
  total++;
  if (cond) {
    passed++;
    console.log(`  [PASS] Test ${total}: ${msg}`);
  } else {
    console.error(`  [FAIL] Test ${total}: ${msg}`);
    throw new Error(`Test ${total} failed: ${msg}`);
  }
}

function makeRequest(method, endpoint, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { ...headers }
    };

    let payload = null;
    if (Buffer.isBuffer(body)) {
      payload = body;
      opts.headers['Content-Length'] = payload.length;
    } else if (body !== null && body !== undefined) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      if (!opts.headers['Content-Type']) {
        opts.headers['Content-Type'] = 'application/json';
      }
      opts.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const rawBuf = Buffer.concat(chunks);
        const contentType = String(res.headers['content-type'] || '');
        let data = null;
        if (contentType.includes('application/json') || contentType.includes('text/')) {
          const text = rawBuf.toString('utf8');
          try { data = JSON.parse(text); } catch { data = text; }
        } else {
          data = rawBuf;
        }
        resolve({ status: res.statusCode, headers: res.headers, data, rawBuf });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function buildMultipartPhoto(fieldName, filename, mimeType, fileBuffer) {
  const boundary = '----CivicBoundary' + crypto.randomBytes(8).toString('hex');
  const partHeader = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`,
    'utf8'
  );
  const partFooter = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  const body = Buffer.concat([partHeader, fileBuffer, partFooter]);
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body
  };
}

async function runSuite() {
  console.log('================================================================================');
  console.log('  CIVICRESOLVE — PROFILE PHOTOS & FREE-FIRST NOTIFICATIONS VERIFICATION SUITE');
  console.log('================================================================================\n');

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      BASE_URL = `http://127.0.0.1:${server.address().port}`;
      console.log(`>>> Test server listening at ${BASE_URL}\n`);
      resolve();
    });
  });

  try {
    // Prepare genuine test images in memory using sharp
    const jpegBuf = await sharp({
      create: { width: 80, height: 80, channels: 3, background: { r: 26, g: 60, b: 110 } }
    }).jpeg().toBuffer();

    const pngBuf = await sharp({
      create: { width: 96, height: 96, channels: 4, background: { r: 244, g: 121, b: 32, alpha: 1 } }
    }).png().toBuffer();

    const webpBuf = await sharp({
      create: { width: 120, height: 120, channels: 3, background: { r: 19, g: 136, b: 8 } }
    }).webp().toBuffer();

    // Authenticate synthetic Citizen 1, Citizen 2, Super Admin (id=1), and Officer (id=2)
    const c1Login = await makeRequest('POST', '/api/auth/citizen/login', {}, {
      identifier: 'citizen@example.com',
      password: 'Citizen#2026!Demo'
    });
    assert(c1Login.status === 200 && c1Login.data.token, 'Citizen 1 authenticated cleanly');
    const c1Token = c1Login.data.token;
    const c1Auth = { Authorization: `Bearer ${c1Token}` };

    const c2Login = await makeRequest('POST', '/api/auth/citizen/login', {}, {
      identifier: 'karthik@example.com',
      password: 'Citizen#2026!Demo'
    });
    assert(c2Login.status === 200 && c2Login.data.token, 'Citizen 2 authenticated cleanly');
    const c2Token = c2Login.data.token;
    const c2Auth = { Authorization: `Bearer ${c2Token}` };

    const adminLogin = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'admin@civicresolve.gov',
      password: 'CivicAdmin#2026!Secure'
    });
    assert(adminLogin.status === 200 && adminLogin.data.token, 'Master Admin authenticated cleanly');
    const adminToken = adminLogin.data.token;
    const adminAuth = { Authorization: `Bearer ${adminToken}` };

    const officerLogin = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'gcc.officer@civicresolve.gov',
      password: 'CivicAdmin#2026!Secure'
    });
    const officerToken = officerLogin.data.token;
    const officerAuth = { Authorization: `Bearer ${officerToken}` };

    // =========================================================================
    // SUITE 1: UPLOAD SECURITY & MAGIC BYTE VALIDATION
    // =========================================================================
    console.log('\n>>> [Suite 1] Profile Photo Upload Security & Validation');

    // Unauthenticated rejected
    const mpValid = buildMultipartPhoto('photo', 'avatar.jpg', 'image/jpeg', jpegBuf);
    const unauthPhoto = await makeRequest('POST', '/api/citizen/profile/photo', { 'Content-Type': mpValid.contentType }, mpValid.body);
    assert(unauthPhoto.status === 401, 'Unauthenticated citizen photo upload rejected with HTTP 401');

    // Spoofed executable/script disguised as image/png rejected
    const fakeScriptBuf = Buffer.from('<script>alert("xss")</script>', 'utf8');
    const mpFakeScript = buildMultipartPhoto('photo', 'evil.png', 'image/png', fakeScriptBuf);
    const scriptRes = await makeRequest('POST', '/api/citizen/profile/photo', { ...c1Auth, 'Content-Type': mpFakeScript.contentType }, mpFakeScript.body);
    assert(scriptRes.status === 400, 'Spoofed HTML/XSS payload disguised with .png and image/png blocked via magic-byte inspection');

    // Fake EXE/PE header disguised as .jpg rejected
    const fakeExeBuf = Buffer.from('MZ\x90\x00\x03\x00\x00\x00FAKEEXECUTABLEDATA', 'binary');
    const mpExe = buildMultipartPhoto('photo', 'malware.jpg', 'image/jpeg', fakeExeBuf);
    const exeRes = await makeRequest('POST', '/api/citizen/profile/photo', { ...c1Auth, 'Content-Type': mpExe.contentType }, mpExe.body);
    assert(exeRes.status === 400, 'Spoofed Windows PE/EXE disguised as JPEG blocked');

    // Oversized > 2 MB file rejected cleanly with 400
    const oversizedBuf = Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(MAX_PHOTO_BYTES + 1024)]);
    const mpLarge = buildMultipartPhoto('photo', 'huge.jpg', 'image/jpeg', oversizedBuf);
    const largeRes = await makeRequest('POST', '/api/citizen/profile/photo', { ...c1Auth, 'Content-Type': mpLarge.contentType }, mpLarge.body);
    assert(largeRes.status === 400 && largeRes.data.error.includes('2 MB'), 'Upload exceeding 2 MB limit blocked with clear HTTP 400 JSON error');

    // =========================================================================
    // SUITE 2: CITIZEN PROFILE PHOTO LIFECYCLE & PERSISTENCE
    // =========================================================================
    console.log('\n>>> [Suite 2] Citizen Profile Photo Upload, Replace, Remove & Persistence');

    const upC1Res = await makeRequest('POST', '/api/citizen/profile/photo', { ...c1Auth, 'Content-Type': mpValid.contentType }, mpValid.body);
    assert(upC1Res.status === 200 && upC1Res.data.success, 'Citizen 1 JPEG upload accepted and processed cleanly');
    const avatarUrl1 = upC1Res.data.profile_photo_url;
    assert(typeof avatarUrl1 === 'string' && avatarUrl1.startsWith('/api/avatars/citizen/1?v='), `Safe non-filesystem URL returned: ${avatarUrl1}`);

    // Serve avatar binary cleanly
    const fetchAv1 = await makeRequest('GET', avatarUrl1);
    assert(fetchAv1.status === 200 && String(fetchAv1.headers['content-type']).includes('image/webp'), 'Resized WebP avatar served with HTTP 200 and image/webp Content-Type');
    assert(fetchAv1.headers['x-content-type-options'] === 'nosniff', 'Avatar endpoint enforces X-Content-Type-Options: nosniff');
    assert(fetchAv1.headers['cross-origin-resource-policy'] === 'cross-origin', 'Avatar endpoint sets Cross-Origin-Resource-Policy: cross-origin');

    // Replace photo with PNG (PUT method)
    const mpPng = buildMultipartPhoto('photo', 'newpic.png', 'image/png', pngBuf);
    const repC1Res = await makeRequest('PUT', '/api/citizen/profile/photo', { ...c1Auth, 'Content-Type': mpPng.contentType }, mpPng.body);
    assert(repC1Res.status === 200 && repC1Res.data.profile_photo_url !== avatarUrl1, 'Citizen replaced existing avatar and got new cache-busted URL');

    // Persistence check after fresh login
    const reloginC1 = await makeRequest('POST', '/api/auth/citizen/login', {}, {
      identifier: 'citizen@example.com',
      password: 'Citizen#2026!Demo'
    });
    assert(reloginC1.data.citizen.profile_photo_url === repC1Res.data.profile_photo_url, 'Citizen profile photo persists after re-login');

    // Path traversal blocked cleanly
    const traversalRes = await makeRequest('GET', '/api/avatars/citizen/..%2F..%2Fpackage.json');
    assert(traversalRes.status === 404, 'Path traversal attempt on /api/avatars blocked cleanly with 404');

    // Delete / Restore default avatar
    const delC1Res = await makeRequest('DELETE', '/api/citizen/profile/photo', c1Auth);
    assert(delC1Res.status === 200 && delC1Res.data.profile_photo_url === null, 'Citizen removed photo and restored default avatar state');
    const fetchDeleted = await makeRequest('GET', '/api/avatars/citizen/1');
    assert(fetchDeleted.status === 404, 'Removed avatar URL cleanly returns 404');

    // =========================================================================
    // SUITE 3: ADMIN PROFILE PHOTO, CROSS-ROLE DEFENSE & ESCALATION PREVENTION
    // =========================================================================
    console.log('\n>>> [Suite 3] Administrator Profile Photo & Role Isolation');

    // Citizen 1 (id=1) MUST NOT be able to upload Admin 1's photo (previously overlapping ID risk!)
    const citizenToAdmin = await makeRequest('POST', '/api/admin/profile/photo', { ...c1Auth, 'Content-Type': mpValid.contentType }, mpValid.body);
    assert(citizenToAdmin.status === 403, 'Citizen id=1 strictly blocked from uploading Admin id=1 photo (HTTP 403)');

    // Citizen attempting admin profile update blocked
    const citizenToAdminProfile = await makeRequest('PUT', '/api/admin/profile', c1Auth, { name: 'Hacked Admin' });
    assert(citizenToAdminProfile.status === 403, 'Citizen blocked from /api/admin/profile (HTTP 403)');

    // Admin uploads WebP avatar cleanly
    const mpWebp = buildMultipartPhoto('photo', 'officer.webp', 'image/webp', webpBuf);
    const upAdminRes = await makeRequest('POST', '/api/admin/profile/photo', { ...adminAuth, 'Content-Type': mpWebp.contentType }, mpWebp.body);
    assert(upAdminRes.status === 200 && upAdminRes.data.profile_photo_url.startsWith('/api/avatars/admin/1?v='), 'Admin WebP avatar uploaded successfully');

    const fetchAdminAv = await makeRequest('GET', upAdminRes.data.profile_photo_url);
    assert(fetchAdminAv.status === 200 && fetchAdminAv.rawBuf.length > 50, 'Admin avatar binary retrieved successfully');

    // Admin /me reflects photo after refresh
    const adminMeCheck = await makeRequest('GET', '/api/auth/me', adminAuth);
    assert(adminMeCheck.data.admin.profile_photo_url === upAdminRes.data.profile_photo_url, 'Admin /api/auth/me returns persisted profile_photo_url');

    // Officer trying to escalate role via PUT /api/admin/profile cannot change role
    const officerEsc = await makeRequest('PUT', '/api/admin/profile', officerAuth, {
      name: 'Thiru. S. Rajendran, IAS',
      role: 'super_admin'
    });
    assert(officerEsc.status === 200 && officerEsc.data.admin.role === 'municipal_admin', 'Role escalation via PUT /api/admin/profile ignored; role stayed municipal_admin');

    // Remove admin photo
    const delAdminRes = await makeRequest('DELETE', '/api/admin/profile/photo', adminAuth);
    assert(delAdminRes.status === 200 && delAdminRes.data.profile_photo_url === null, 'Admin photo removed successfully');

    // =========================================================================
    // SUITE 4: WEB PUSH VAPID REGISTRATION & 410 CLEANUP
    // =========================================================================
    console.log('\n>>> [Suite 4] Free Web Push VAPID Registration & Invalid Subscription Cleanup');

    const vapidRes = await makeRequest('GET', '/api/push/vapid-public-key');
    assert(vapidRes.status === 200 && vapidRes.data.configured && vapidRes.data.publicKey, 'Public VAPID endpoint returns public key when configured');
    assert(!JSON.stringify(vapidRes.data).includes('UUxI4O8'), 'VAPID private key is NEVER leaked to frontend');

    const unauthPush = await makeRequest('POST', '/api/push/subscribe', {}, {
      subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: '1234567890abcdef1234', auth: '123456789' } }
    });
    assert(unauthPush.status === 401, 'Unauthenticated push subscription rejected with HTTP 401');

    const badEndpoint = await makeRequest('POST', '/api/push/subscribe', c1Auth, {
      subscription: { endpoint: 'javascript:alert(1)', keys: { p256dh: '1234567890abcdef1234', auth: '123456789' } }
    });
    assert(badEndpoint.status === 400, 'Non-HTTPS / XSS push endpoint blocked cleanly');

    const c1Endpoint = 'https://fcm.googleapis.com/fcm/send/citizen1-test-sub-001';
    const subC1 = await makeRequest('POST', '/api/push/subscribe', c1Auth, {
      subscription: {
        endpoint: c1Endpoint,
        keys: { p256dh: 'BEl62iUYgUivxIkv69yViEuiBIa-1234567890', auth: 'authSecret12345' }
      }
    });
    assert(subC1.status === 201 && subC1.data.subscribed, 'Authenticated citizen Web Push subscription saved');

    const statusC1 = await makeRequest('GET', '/api/push/status', c1Auth);
    assert(statusC1.status === 200 && statusC1.data.subscribed && statusC1.data.subscriptionCount === 1, 'Push status confirms active subscription');

    // =========================================================================
    // SUITE 5, 6, 7: FREE-FIRST WORKFLOW INTEGRATION + IN-APP OWNERSHIP + RETRY
    // =========================================================================
    console.log('\n>>> [Suites 5-7] Full Complaint -> Resolution Workflow Across Email (Resend), Web Push & In-App');

    const sentEmails = [];
    const sentPushes = [];

    // Failure simulation on 1st attempt, success afterwards
    let failNextEmail = true;
    setTestEmailAdapter(async (mail) => {
      if (failNextEmail) {
        failNextEmail = false;
        throw new Error('Simulated Resend 503 temporary rate limit');
      }
      sentEmails.push(mail);
      return { id: 're_mock_' + Date.now() };
    });

    setTestPushAdapter(async (sub, payloadStr) => {
      sentPushes.push({ sub, payload: JSON.parse(payloadStr) });
    });

    // Submit complaint as Citizen 1 -> email fails transiently on first try, but complaint MUST STILL SUCCEED!
    const submitRes = await makeRequest('POST', '/api/complaints', c1Auth, {
      title: 'Broken drinking water pipeline flooding Teynampet lane',
      description: 'Major pipeline burst causing heavy water wastage and street inundation for 2 days.',
      category: 'Water Leakage',
      location: 'Eldams Road, Teynampet, Chennai',
      district: 'Chennai',
      latitude: 13.0418,
      longitude: 80.2496,
      isGpsVerified: true,
      detection_method: 'gps'
    });
    assert(submitRes.status === 201 && submitRes.data.ref_id, 'Complaint submission SUCCEEDED even when Resend email temporarily failed (non-blocking)');
    const refId = submitRes.data.ref_id;
    const compId = submitRes.data.id;

    // Web Push was still delivered independently!
    assert(sentPushes.length === 1 && sentPushes[0].payload.url === `/?trackRef=${encodeURIComponent(refId)}`, 'Registration Web Push sent with exact complaint deep link despite email failure');

    // Email failure was truthfully recorded as failed (never fake sent!)
    const failedEmailLog = db.prepare(`SELECT * FROM notification_logs WHERE ref_id = ? AND channel = 'email' ORDER BY id DESC LIMIT 1`).get(refId);
    assert(failedEmailLog && failedEmailLog.status === 'failed', 'Temporary Resend failure recorded truthfully with status="failed"');

    // Admin retries failed email safely -> succeeds!
    const retryRes = await makeRequest('POST', `/api/admin/notifications/${failedEmailLog.id}/retry`, adminAuth);
    assert(retryRes.status === 200 && retryRes.data.success, 'Admin retried failed Resend email log successfully');
    assert(sentEmails.length === 1 && sentEmails[0].to === 'citizen@example.com', 'Resend mock adapter delivered retried email to citizen registered address');

    const retriedRow = db.prepare('SELECT status, attempts FROM notification_logs WHERE id = ?').get(failedEmailLog.id);
    assert(retriedRow.status === 'sent' && retriedRow.attempts === 2, 'Notification log marked status="sent" with incremented attempts count');

    // Verify In-App Notification ownership & security
    const unauthInbox = await makeRequest('GET', '/api/notifications');
    assert(unauthInbox.status === 401, 'Unauthenticated access to /api/notifications strictly blocked (HTTP 401)');

    const c1Inbox = await makeRequest('GET', '/api/notifications?limit=10', c1Auth);
    assert(c1Inbox.status === 200 && c1Inbox.data.unreadCount >= 1, 'Citizen 1 In-App Notification Centre returns unread notifications');
    const c1RegNotif = c1Inbox.data.notifications.find(n => n.ref_id === refId);
    assert(Boolean(c1RegNotif), 'Citizen 1 In-App inbox contains registration alert for newly filed complaint');

    // Cross-citizen notification isolation check!
    const c2Inbox = await makeRequest('GET', '/api/notifications', c2Auth);
    const hasC1NotifInC2 = c2Inbox.data.notifications.some(n => n.ref_id === refId);
    assert(!hasC1NotifInC2, 'Cross-citizen isolation: Citizen 2 receives ZERO notifications belonging to Citizen 1');

    const c2ReadC1Attempt = await makeRequest('PATCH', `/api/notifications/${c1RegNotif.id}/read`, c2Auth);
    assert(c2ReadC1Attempt.status === 404, 'Citizen 2 cannot mark Citizen 1 notification read (HTTP 404)');

    const c2DeleteC1Attempt = await makeRequest('DELETE', `/api/notifications/${c1RegNotif.id}`, c2Auth);
    assert(c2DeleteC1Attempt.status === 404, 'Citizen 2 cannot delete Citizen 1 notification (HTTP 404)');

    // Admin resolves complaint -> triggers Email + Web Push + In-App Resolution Alert!
    const resolveRes = await makeRequest('PATCH', `/api/complaints/${compId}/manage`, adminAuth, {
      status: 'Resolved',
      resolution_remarks: 'Main valve isolated and split HDPE sleeve fitted by CMWSSB squad.'
    });
    assert(resolveRes.status === 200 && resolveRes.data.complaint.status === 'Resolved', 'Admin transitioned complaint to Resolved cleanly');

    assert(sentEmails.length === 2 && sentEmails[1].html.includes(refId) && sentEmails[1].text.includes('Resolved'), 'Resend Resolution email generated with HTML & plain text templates');
    assert(sentPushes.length === 2 && sentPushes[1].payload.title.includes('Resolved'), 'Resolution Web Push dispatched with Resolved message & deep link');

    // Duplicate resolution triggers prevented!
    await makeRequest('PATCH', `/api/complaints/${compId}/manage`, adminAuth, {
      status: 'Resolved',
      resolution_remarks: 'Duplicate administrative save note.'
    });
    assert(sentEmails.length === 2 && sentPushes.length === 2, 'Duplicate resolution notifications strictly prevented across Email & Push on re-save');

    // Mark all read + delete own notification
    const markAllRes = await makeRequest('PATCH', '/api/notifications/read-all', c1Auth);
    assert(markAllRes.status === 200 && markAllRes.data.unreadCount === 0, 'Citizen marked all In-App notifications as read');

    const delOwnNotif = await makeRequest('DELETE', `/api/notifications/${c1RegNotif.id}`, c1Auth);
    assert(delOwnNotif.status === 200 && delOwnNotif.data.success, 'Citizen deleted own In-App notification cleanly');

    // Expired Web Push 410 Gone automatic cleanup verification!
    setTestPushAdapter(async () => {
      const err = new Error('Push subscription expired / Gone');
      err.statusCode = 410;
      throw err;
    });

    await makeRequest('POST', '/api/complaints', c1Auth, {
      title: 'Streetlight outage along Cenotaph Road',
      description: 'Three consecutive LED poles switched off creating night safety hazard.',
      category: 'Streetlight',
      location: 'Cenotaph Road, Chennai',
      district: 'Chennai'
    });

    const subAfter410 = await makeRequest('GET', '/api/push/status', c1Auth);
    assert(subAfter410.data.subscriptionCount === 0 && !subAfter410.data.subscribed, 'Expired HTTP 410 Web Push subscription automatically removed from database');

    console.log('\n================================================================================');
    console.log(`  ALL ${passed}/${total} PROFILE PHOTO & FREE-FIRST NOTIFICATION TESTS PASSED!`);
    console.log('================================================================================\n');
  } finally {
    setTestEmailAdapter(null);
    setTestPushAdapter(null);
    if (server) await new Promise((r) => server.close(r));
    cleanup();
  }
}

runSuite().catch((err) => {
  console.error('\n[FATAL TEST SUITE ERROR]:', err);
  setTestEmailAdapter(null);
  setTestPushAdapter(null);
  if (server) server.close();
  cleanup();
  process.exit(1);
});
