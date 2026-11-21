const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== CIVICRESOLVE FINAL PHASE VERIFICATION ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
    }
  }

  // 1. Health Endpoint
  try {
    const health = await request({ host: '127.0.0.1', port: 5000, path: '/api/health', method: 'GET' });
    assert(health.status === 200, 'GET /api/health returned 200');
    assert(health.data.database === 'connected', 'Database is connected');
  } catch (e) {
    assert(false, `Health test failed: ${e.message}`);
  }

  // 2. Public Announcements
  try {
    const ann = await request({ host: '127.0.0.1', port: 5000, path: '/api/announcements', method: 'GET' });
    assert(ann.status === 200, 'GET /api/announcements returned 200');
    assert(Array.isArray(ann.data.announcements), 'Announcements array returned');
  } catch (e) {
    assert(false, `Announcements test failed: ${e.message}`);
  }

  // 3. Send OTP without configured SMS provider (Must return 503 and zero dev_otp)
  try {
    const otpRes = await request({
      host: '127.0.0.1',
      port: 5000,
      path: '/api/auth/citizen/send-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { phone: '9840123456', purpose: 'login' });

    assert(otpRes.status === 503, 'POST /api/auth/citizen/send-otp returned 503 when SMS unconfigured');
    assert(Boolean(otpRes.data.error), `Returned honest error: "${otpRes.data.error}"`);
    assert(!otpRes.data.dev_otp, 'dev_otp field is strictly absent from response');
    assert(!otpRes.data.dev_notice, 'dev_notice field is strictly absent from response');
  } catch (e) {
    assert(false, `Send OTP test failed: ${e.message}`);
  }

  // 4. Admin Login and Announcement Lifecycle (Create & Delete)
  try {
    const loginRes = await request({
      host: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'admin@civicresolve.gov', password: 'CivicAdmin#2026!Secure' });

    assert(loginRes.status === 200, 'Admin login succeeded');
    const token = loginRes.data.token;

    // Create Announcement
    const createRes = await request({
      host: '127.0.0.1',
      port: 5000,
      path: '/api/admin/announcements',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      title: 'Automated Test Notice',
      title_ta: 'தானியங்கி சோதனை அறிவிப்பு',
      category: 'Public Notice',
      priority: 'Normal',
      department: 'Municipal Operations',
      content: 'This is a test announcement to verify admin lifecycle.',
      content_ta: 'அறிவிப்பு சோதனை விளக்கம்.'
    });

    assert(createRes.status === 201, 'POST /api/admin/announcements created notice');

    // Fetch announcements to get ID
    const listRes = await request({ host: '127.0.0.1', port: 5000, path: '/api/announcements', method: 'GET' });
    const createdItem = listRes.data.announcements.find(a => a.title === 'Automated Test Notice');
    assert(Boolean(createdItem), 'Created announcement appears in public list');

    if (createdItem) {
      // Delete Announcement
      const delRes = await request({
        host: '127.0.0.1',
        port: 5000,
        path: `/api/admin/announcements/${createdItem.id}`,
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      assert(delRes.status === 200, `DELETE /api/admin/announcements/${createdItem.id} succeeded`);
    }
  } catch (e) {
    assert(false, `Admin announcement lifecycle test failed: ${e.message}`);
  }

  console.log(`\nVerification Complete: ${passed}/${total} passed.`);
}

runTests();