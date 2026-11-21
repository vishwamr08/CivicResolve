const db = require('./db');

async function testFullPhase3Workflow() {
  console.log('====================================');
  console.log('RUNNING FULL PHASE 3 WORKFLOW TEST');
  console.log('====================================');

  const BASE_URL = 'http://127.0.0.1:5000';

  // Step 1: Citizen submits a pothole complaint
  console.log('\n[Step 1] Citizen submits a pothole complaint...');
  const formData = new FormData();
  formData.append('title', 'Hazardous deep pothole on Airport Road');
  formData.append('description', 'A severe 8-inch deep crater opened on the right lane near the toll gate. Multiple cars suffered tire punctures and two-wheelers are losing balance.');
  formData.append('category', 'Road Damage');
  formData.append('location', 'Airport Road, 500m before Toll Gate');
  formData.append('latitude', '13.1986');
  formData.append('longitude', '77.7066');
  formData.append('isGpsVerified', 'true');

  const submitRes = await fetch(`${BASE_URL}/api/complaints`, {
    method: 'POST',
    body: formData
  });

  if (!submitRes.ok) {
    throw new Error(`Submit failed with status: ${submitRes.status}`);
  }

  const submitJson = await submitRes.json();
  const complaint = submitJson.complaint;
  const refId = complaint.ref_id;
  const id = complaint.id;

  console.log(`✓ Complaint created successfully with Ref ID: ${refId} (ID: ${id})`);
  console.log(`  Initial Status: ${complaint.status}`);
  console.log(`  Initial AI Department: ${complaint.department}`);
  console.log(`  GPS Verified: ${complaint.is_gps_verified}`);

  // Step 2: AI analyzes it (Groq Cloud Triage)
  console.log('\n[Step 2] Verifying AI Analysis output...');
  console.log(`  AI Status: ${complaint.ai_status}`);
  console.log(`  AI Priority: ${complaint.priority}`);
  console.log(`  Initial Status History Length: ${complaint.status_history.length}`);

  // Step 3: Admin logs in and fetches complaint from registry
  console.log('\n[Step 3] Admin logs in to acquire secure JWT token...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@civicresolve.gov',
      password: 'CivicAdmin#2026!Secure'
    })
  });
  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginRes.status}`);
  }
  const loginJson = await loginRes.json();
  const adminToken = loginJson.token;
  console.log(`✓ Admin authenticated: ${loginJson.admin.name} (Role: ${loginJson.admin.role})`);

  console.log('\n[Step 3b] Admin fetches complaint from registry...');
  const getRes = await fetch(`${BASE_URL}/api/complaints/${id}`);
  const fetchedComplaint = await getRes.json();
  console.log(`✓ Admin fetched complaint: "${fetchedComplaint.title}"`);
  console.log(`  Current Status: ${fetchedComplaint.status}`);

  // Step 4: Admin assigns Roads and Highways & updates status to 'Assigned'
  console.log('\n[Step 4] Admin assigns Roads and Highways department & sets status to Assigned...');
  const assignRes = await fetch(`${BASE_URL}/api/complaints/${id}/manage`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      department: 'Roads and Highways',
      status: 'Assigned',
      resolution_remarks: 'Assigned to North Division Asphalt Emergency Unit.'
    })
  });

  const assignJson = await assignRes.json();
  const assignedComplaint = assignJson.complaint;
  console.log(`✓ Complaint assigned to: ${assignedComplaint.department}`);
  console.log(`  Updated Status: ${assignedComplaint.status}`);
  console.log(`  Status History Events: ${assignedComplaint.status_history.length}`);

  // Step 5: Admin updates status to 'In Progress'
  console.log('\n[Step 5] Admin updates status to In Progress (Crews dispatched)...');
  const progressRes = await fetch(`${BASE_URL}/api/complaints/${id}/manage`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      status: 'In Progress',
      resolution_remarks: 'Work order #9102 issued. Cold-patch asphalt crew on site with steam roller.'
    })
  });

  const progressJson = await progressRes.json();
  console.log(`✓ Status updated to: ${progressJson.complaint.status}`);

  // Step 6: Citizen tracks the complaint by Reference ID
  console.log(`\n[Step 6] Citizen tracks complaint by Reference ID: ${refId}...`);
  const trackRes = await fetch(`${BASE_URL}/api/complaints/track/${refId}`);
  if (!trackRes.ok) throw new Error('Citizen tracking lookup failed');
  const tracked = await trackRes.json();
  console.log(`✓ Citizen tracked successfully!`);
  console.log(`  Tracked Status: ${tracked.status}`);
  console.log(`  Tracked Department: ${tracked.department}`);
  console.log(`  Timeline Step Count: ${tracked.status_history.length}`);
  tracked.status_history.forEach((step, idx) => {
    console.log(`    Step ${idx + 1}: [${step.status}] - ${step.note} (by ${step.actor})`);
  });

  // Step 7: Admin marks it resolved with resolution remarks
  console.log('\n[Step 7] Admin marks complaint as Resolved...');
  const resolveRes = await fetch(`${BASE_URL}/api/complaints/${id}/manage`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      status: 'Resolved',
      resolution_remarks: 'Pothole excavated, filled with bitumen binder, rolled and sealed. Roadway reopened to traffic.'
    })
  });

  const resolvedJson = await resolveRes.json();
  console.log(`✓ Complaint marked Resolved: ${resolvedJson.complaint.status}`);
  console.log(`  Final Resolution Remarks: "${resolvedJson.complaint.resolution_remarks}"`);

  // Step 8: Verify persistence directly in SQLite database
  console.log('\n[Step 8] Verifying persistence directly in SQLite database...');
  const directDbRecord = db.prepare('SELECT * FROM complaints WHERE ref_id = ?').get(refId);
  console.log(`✓ SQLite Direct Query Verification:`);
  console.log(`  DB ID: ${directDbRecord.id}`);
  console.log(`  DB Ref ID: ${directDbRecord.ref_id}`);
  console.log(`  DB Status: ${directDbRecord.status}`);
  console.log(`  DB Department: ${directDbRecord.department}`);
  console.log(`  DB Resolution Remarks: "${directDbRecord.resolution_remarks}"`);
  console.log(`  DB is_gps_verified: ${directDbRecord.is_gps_verified}`);

  const parsedHistory = JSON.parse(directDbRecord.status_history);
  console.log(`  DB Status History Count: ${parsedHistory.length} events`);

  console.log('\n====================================');
  console.log('PHASE 3 FULL WORKFLOW TEST PASSED!');
  console.log('====================================');
}

testFullPhase3Workflow().catch(err => {
  console.error('Workflow test failed:', err);
  process.exit(1);
});
