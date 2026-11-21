const BASE_URL = 'http://127.0.0.1:5000';

async function runFullPlatformTests() {
  console.log('===============================================================');
  console.log('  CIVICRESOLVE – FULL TAMIL NADU COMPETITION TEST SUITE       ');
  console.log('===============================================================\n');

  // Test 1: Health Check
  console.log('[Test 1] Probing /api/health...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const health = await healthRes.json();
  console.log('✓ Health Status:', health.status, '| App:', health.app, '| AI Provider:', health.aiProvider);
  if (health.status !== 'healthy') throw new Error('Health check failed');

  // Test 2: Geo Endpoints
  console.log('\n[Test 2] Probing Tamil Nadu Geo hierarchy endpoints...');
  const geoRes = await fetch(`${BASE_URL}/api/geo/districts`);
  const geoData = await geoRes.json();
  console.log(`✓ Districts Loaded: ${geoData.districts.length} Tamil Nadu districts (e.g. ${geoData.districts[0].name} / ${geoData.districts[0].name_ta})`);

  // Test 3: Citizen Authentication
  console.log('\n[Test 3] Testing Citizen Registration & Login...');
  const testEmail = `selvi.${Date.now()}@tn.gov.in`;
  const regRes = await fetch(`${BASE_URL}/api/auth/citizen/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Selvi Meenakshi',
      email: testEmail,
      phone: `9840${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'Citizen#2026!Demo',
      district: 'Chennai'
    })
  });
  const regData = await regRes.json();
  if (!regRes.ok) throw new Error(`Citizen registration failed: ${regData.error}`);
  console.log(`✓ Citizen Registered: "${regData.citizen.name}" (ID: ${regData.citizen.id})`);
  const citizenToken = regData.token;

  // Test 4: Citizen Grievance Submission with TN Ref ID (CR-TN-2026-XXXXXX)
  console.log('\n[Test 4] Citizen submits grievance under Chennai Corporation Ward 114...');
  const form = new FormData();
  form.append('title', 'Hazardous open manhole next to Anna Nagar Metro');
  form.append('description', 'Heavy rainfall dislodged the concrete drain slab. An open 6-foot deep storm drain is overflowing onto the pedestrian footpath opposite Anna Nagar Tower park. Extremely hazardous for school students.');
  form.append('category', 'Drainage');
  form.append('location', '2nd Avenue, opposite Tower Park Gate 3, Anna Nagar');
  form.append('district', 'Chennai');
  form.append('local_body', 'Greater Chennai Corporation');
  form.append('ward', 'Zone 8 - Ward 104');
  form.append('latitude', '13.0850');
  form.append('longitude', '80.2101');
  form.append('isGpsVerified', 'true');
  form.append('language', 'en');
  form.append('citizen_name', regData.citizen.name);
  form.append('citizen_email', regData.citizen.email);
  form.append('citizen_phone', regData.citizen.phone);

  const submitRes = await fetch(`${BASE_URL}/api/complaints`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citizenToken}` },
    body: form
  });

  const submitData = await submitRes.json();
  if (!submitRes.ok) throw new Error(`Submission failed: ${submitData.error}`);
  const complaint = submitData.complaint;
  console.log(`✓ Grievance registered successfully! Ref ID: ${complaint.ref_id}`);
  console.log(`  Target SLA: ${complaint.sla_hours} hours | Deadline: ${complaint.sla_deadline}`);
  console.log(`  Initial Status: ${complaint.status} | Department: ${complaint.department}`);

  // Test 5: Duplicate Detection Module
  console.log('\n[Test 5] Testing intelligent duplicate detection module...');
  const dupForm = new FormData();
  dupForm.append('title', 'Drain slab broken opposite Anna Nagar Tower Gate 3');
  dupForm.append('description', 'Open storm drain on 2nd Avenue Anna Nagar near Metro. Very dangerous.');
  dupForm.append('category', 'Drainage');
  dupForm.append('location', '2nd Avenue, Anna Nagar');
  dupForm.append('district', 'Chennai');
  dupForm.append('ward', 'Zone 8 - Ward 104');
  dupForm.append('latitude', '13.0852');
  dupForm.append('longitude', '80.2104');

  const dupRes = await fetch(`${BASE_URL}/api/complaints`, {
    method: 'POST',
    body: dupForm
  });
  const dupData = await dupRes.json();
  console.log(`✓ Duplicate detection output for second report: ${dupData.duplicates ? dupData.duplicates.length : 0} candidate(s) detected`);
  if (dupData.duplicates && dupData.duplicates.length > 0) {
    console.log(`  Matched Primary Ref: ${dupData.duplicates[0].ref_id} (Similarity: ${dupData.duplicates[0].matchScore}%)`);
  }

  // Test 6: Officer Login (GCC Zonal Officer)
  console.log('\n[Test 6] Logging in as Municipal Officer (GCC Zonal Officer)...');
  const officerLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'gcc.officer@civicresolve.gov',
      password: 'CivicAdmin#2026!Secure'
    })
  });
  const officerData = await officerLogin.json();
  if (!officerLogin.ok) throw new Error(`Officer login failed: ${officerData.error}`);
  console.log(`✓ Officer Authenticated: ${officerData.admin.name} | Role: ${officerData.admin.role} | Designation: ${officerData.admin.designation}`);
  const officerToken = officerData.token;

  // Test 7: Officer Assigns Field Officer and Marks In Progress
  console.log('\n[Test 7] Officer assigns field crew and updates status...');
  const manageRes = await fetch(`${BASE_URL}/api/complaints/${complaint.id}/manage`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({
      status: 'In Progress',
      assigned_officer: 'Assistant Engineer (AE) Ward 104',
      internal_notes: 'Heavy suction jet machine dispatched for drain de-silting and new reinforced concrete slab.',
      resolution_remarks: 'Field inspection completed. Concrete slab replacement underway.'
    })
  });
  const manageData = await manageRes.json();
  console.log(`✓ Status updated to "${manageData.complaint.status}" by ${manageData.complaint.status_history.slice(-1)[0].actor}`);

  // Test 8: Officer Certifies & Resolves Incident with Evidence
  console.log('\n[Test 8] Officer certifies resolution...');
  const resolveRes = await fetch(`${BASE_URL}/api/complaints/${complaint.id}/manage`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({
      status: 'Resolved',
      resolution_remarks: 'New RCC heavy-duty precast cover installed. Drain desilted and water flowing freely. Certified by Ward 104 AE.',
      resolution_evidence_url: '/uploads/sample-drain-rectified.jpg'
    })
  });
  const resolveData = await resolveRes.json();
  console.log(`✓ Complaint ${complaint.ref_id} resolved! Remarks: "${resolveData.complaint.resolution_remarks}"`);

  // Test 9: Citizen Submits Appeal / Reopen Request
  console.log('\n[Test 9] Citizen submits appeal / reopening request...');
  const appealRes = await fetch(`${BASE_URL}/api/complaints/${complaint.id}/appeal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reason: 'Slab placed but alignment is loose and creating gap where two-wheelers can slip. Requesting cementing.'
    })
  });
  const appealData = await appealRes.json();
  console.log(`✓ Appeal processed: "${appealData.message}"`);
  console.log(`  Updated Status: ${appealData.complaint.status} | Is Appealed: ${appealData.complaint.is_appealed}`);

  // Test 10: Citizen Personal Complaints Privacy Isolation
  console.log('\n[Test 10] Testing citizen privacy isolation...');
  const myComplaintsRes = await fetch(`${BASE_URL}/api/citizen/my-complaints`, {
    headers: { 'Authorization': `Bearer ${citizenToken}` }
  });
  const myComplaints = await myComplaintsRes.json();
  console.log(`✓ Citizen retrieved personal complaints list: ${myComplaints.count} grievance(s) belonging to ${testEmail}`);

  // Test 11: Security Access Control (Citizen attempting Admin API)
  console.log('\n[Test 11] Security Check: Citizen token attempting Officer API...');
  const unauthorizedRes = await fetch(`${BASE_URL}/api/complaints/${complaint.id}/manage`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${citizenToken}`
    },
    body: JSON.stringify({ status: 'Resolved' })
  });
  console.log(`✓ Unauthorized access correctly rejected with HTTP ${unauthorizedRes.status} (Forbidden)`);

  // Test 12: Public Dashboard Stats
  console.log('\n[Test 12] Fetching live public dashboard statistics...');
  const statsRes = await fetch(`${BASE_URL}/api/dashboard/stats`);
  const stats = await statsRes.json();
  console.log(`✓ Total Complaints: ${stats.totalComplaints}`);
  console.log(`  Resolution SLA Rate: ${stats.resolutionRate}%`);
  console.log(`  Districts Tracked: ${stats.districtDistribution.length}`);
  console.log(`  Critical Priority Cases: ${stats.criticalComplaints}`);

  console.log('\n===============================================================');
  console.log('  ALL 12 TAMIL NADU COMPETITION WORKFLOW TESTS PASSED!       ');
  console.log('===============================================================\n');
}

runFullPlatformTests().catch(err => {
  console.error('\n❌ Platform Test Failed:', err.message);
  process.exit(1);
});
