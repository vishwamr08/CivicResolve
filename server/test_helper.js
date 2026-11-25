/**
 * CivicResolve - Automated Test Synthetic Isolation Helper (Phase 1.4)
 * 
 * Guarantees 100% test privacy and isolation:
 * 1. Creates a fresh, unique temporary directory per test run.
 * 2. Initializes a brand-new SQLite database using the official application schema.
 * 3. Seeds purely synthetic, fictional records (27 complaints, 7 citizens, 5 admins, 3 announcements, 2 audit logs).
 * 4. NEVER reads, accesses, or copies the genuine database or safety backup.
 * 5. Sets NODE_ENV=test and explicit SQLITE_DB_PATH.
 * 6. Safely unlinks temporary test directories upon completion.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

// Precomputed bcrypt hashes for testing speed and deterministic fixture verification
// Password: 'CivicAdmin#2026!Secure'
const SYNTHETIC_ADMIN_PW_HASH = bcrypt.hashSync('CivicAdmin#2026!Secure', 10);
// Password: 'Citizen#2026!Demo'
const SYNTHETIC_CITIZEN_PW_HASH = bcrypt.hashSync('Citizen#2026!Demo', 10);

function createSyntheticSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      image_url TEXT,
      status TEXT DEFAULT 'Submitted',
      priority TEXT DEFAULT 'Medium',
      department TEXT,
      ai_summary TEXT,
      ai_category TEXT,
      ai_priority TEXT,
      ai_department TEXT,
      ai_confidence REAL,
      ai_reason TEXT,
      ai_safety_risk TEXT,
      ai_recommended_action TEXT,
      ai_suggested_response_time TEXT,
      ai_status TEXT DEFAULT 'UNAVAILABLE',
      resolution_remarks TEXT,
      status_history TEXT,
      is_gps_verified INTEGER DEFAULT 0,
      district TEXT DEFAULT 'Chennai',
      local_body TEXT DEFAULT 'Greater Chennai Corporation',
      ward TEXT DEFAULT 'Zone 9 - Ward 114',
      citizen_id INTEGER,
      citizen_name TEXT,
      citizen_phone TEXT,
      citizen_email TEXT,
      sla_hours INTEGER DEFAULT 24,
      sla_deadline DATETIME,
      assigned_officer TEXT,
      internal_notes TEXT,
      resolution_evidence_url TEXT,
      citizen_rating INTEGER,
      citizen_feedback TEXT,
      is_appealed INTEGER DEFAULT 0,
      appeal_reason TEXT,
      duplicate_of_ref_id TEXT,
      language TEXT DEFAULT 'en',
      verification_otp TEXT,
      otp_expires_at DATETIME,
      reopen_count INTEGER DEFAULT 0,
      location_accuracy REAL,
      detection_method TEXT DEFAULT 'manual',
      zone TEXT,
      postal_code TEXT,
      jurisdiction_source TEXT DEFAULT 'unverified',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'super_admin',
      district TEXT DEFAULT 'Statewide',
      department TEXT DEFAULT 'Municipal Administration & Water Supply',
      designation TEXT DEFAULT 'Director of Municipal Operations',
      profile_photo_data TEXT,
      profile_photo_mime TEXT,
      profile_photo_url TEXT,
      profile_photo_updated_at DATETIME,
      web_push_enabled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS citizens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      district TEXT DEFAULT 'Chennai',
      municipality TEXT DEFAULT 'Greater Chennai Corporation',
      ward TEXT DEFAULT 'Ward 114',
      email_verified INTEGER DEFAULT 1,
      mobile_verified INTEGER DEFAULT 1,
      email_notifications INTEGER DEFAULT 1,
      sms_notifications INTEGER DEFAULT 1,
      whatsapp_notifications INTEGER DEFAULT 0,
      sms_consent INTEGER DEFAULT 1,
      whatsapp_consent INTEGER DEFAULT 0,
      profile_photo_data TEXT,
      profile_photo_mime TEXT,
      profile_photo_url TEXT,
      profile_photo_updated_at DATETIME,
      web_push_enabled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_citizens_phone_unique ON citizens(phone);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_citizens_email_unique ON citizens(email);

    CREATE TABLE IF NOT EXISTS citizen_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      purpose TEXT DEFAULT 'login',
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 5,
      expires_at DATETIME NOT NULL,
      verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_citizen_otps_phone ON citizen_otps(phone);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_ref TEXT,
      actor_id INTEGER,
      actor_name TEXT,
      actor_role TEXT,
      action TEXT NOT NULL,
      previous_state TEXT,
      new_state TEXT,
      remarks TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      title_ta TEXT,
      content TEXT NOT NULL,
      content_ta TEXT,
      category TEXT DEFAULT 'Public Notice',
      priority TEXT DEFAULT 'Normal',
      department TEXT DEFAULT 'Municipal Administration',
      is_active INTEGER DEFAULT 1,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_type TEXT NOT NULL,
      recipient_id INTEGER,
      ref_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      event_type TEXT DEFAULT 'grievance_update',
      action_url TEXT,
      is_read INTEGER DEFAULT 0,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_type TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME
    );

    CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_type, user_id);

    CREATE TABLE IF NOT EXISTS notification_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_id TEXT,
      recipient TEXT NOT NULL,
      channel TEXT NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL,
      subject TEXT,
      body TEXT,
      provider_response TEXT,
      error_message TEXT,
      attempts INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS revoked_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_complaints_ref_id ON complaints(ref_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
    CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
    CREATE INDEX IF NOT EXISTS idx_complaints_citizen_id ON complaints(citizen_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_citizen_phone ON complaints(citizen_phone);
    CREATE INDEX IF NOT EXISTS idx_complaints_citizen_email ON complaints(citizen_email);
    CREATE INDEX IF NOT EXISTS idx_complaints_district ON complaints(district);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_complaint_ref ON audit_logs(complaint_ref);
    CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id);
  `);
}

function seedSyntheticFixtures(db) {
  // 1. Seed 5 Administrators
  const insertAdmin = db.prepare(`
    INSERT INTO admins (email, password_hash, name, role, district, department, designation)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const admins = [
    ['admin@civicresolve.gov', SYNTHETIC_ADMIN_PW_HASH, 'Director of Municipal Operations', 'super_admin', 'Statewide', 'Municipal Administration & Water Supply', 'Director of Municipal Operations'],
    ['gcc.officer@civicresolve.gov', SYNTHETIC_ADMIN_PW_HASH, 'Thiru. S. Rajendran, IAS', 'municipal_admin', 'Chennai', 'Greater Chennai Corporation', 'Zonal Officer (Zone 9 - Teynampet)'],
    ['tangedco.officer@civicresolve.gov', SYNTHETIC_ADMIN_PW_HASH, 'Er. M. Kousalya', 'department_officer', 'Chennai', 'Tamil Nadu Generation and Distribution Corporation (TANGEDCO)', 'Superintending Engineer (Distribution Central)'],
    ['cmwssb.officer@civicresolve.gov', SYNTHETIC_ADMIN_PW_HASH, 'Er. V. Murugan', 'department_officer', 'Chennai', 'Chennai Metro Water Supply & Sewerage Board (CMWSSB) / TWAD', 'Area Executive Engineer'],
    ['admin2026@munnicipal.org', SYNTHETIC_ADMIN_PW_HASH, 'Director of Municipal Operations', 'super_admin', 'Statewide', 'Municipal Administration & Water Supply', 'Director of Municipal Operations']
  ];
  for (const a of admins) insertAdmin.run(...a);

  // 2. Seed 7 Synthetic Citizens
  const insertCitizen = db.prepare(`
    INSERT INTO citizens (name, email, phone, password_hash, district, municipality, ward)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const citizens = [
    ['Selvi Anitha Sundaram', 'citizen@example.com', '9840123456', SYNTHETIC_CITIZEN_PW_HASH, 'Chennai', 'Greater Chennai Corporation', 'Ward 114'],
    ['Karthik Raja S', 'karthik@example.com', '9443654321', SYNTHETIC_CITIZEN_PW_HASH, 'Coimbatore', 'Coimbatore City Municipal Corporation', 'Ward 23'],
    ['Meenakshi Sundaram', 'meenakshi@example.com', '9840111111', SYNTHETIC_CITIZEN_PW_HASH, 'Madurai', 'Madurai Corporation', 'Ward 45'],
    ['Ramesh Kumar V', 'ramesh@example.com', '9840222222', SYNTHETIC_CITIZEN_PW_HASH, 'Tiruchirappalli', 'Tiruchirappalli City Corporation', 'Ward 12'],
    ['Priya Dharshini', 'priya@example.com', '9840333333', SYNTHETIC_CITIZEN_PW_HASH, 'Salem', 'Salem Corporation', 'Ward 30'],
    ['Balamurugan K', 'bala@example.com', '9840444444', SYNTHETIC_CITIZEN_PW_HASH, 'Tirunelveli', 'Tirunelveli Municipal Corporation', 'Ward 18'],
    ['Divya Bharathi', 'divya@example.com', '9840555555', SYNTHETIC_CITIZEN_PW_HASH, 'Tiruppur', 'Tiruppur City Municipal Corporation', 'Ward 5']
  ];
  for (const c of citizens) insertCitizen.run(...c);

  // 3. Seed 3 Synthetic Municipal Announcements
  const insertAnn = db.prepare(`
    INSERT INTO announcements (title, title_ta, content, content_ta, category, priority, department, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const announcements = [
    [
      'Emergency Storm Drain Desilting Drive Across Chennai & Coastal Districts',
      'சென்னை மற்றும் கடலோர மாவட்டங்களில் அவசர மழைநீர் வடிகால் தூர்வாரும் பணி',
      'Pre-monsoon desilting of major stormwater culverts is underway. Citizens are requested to report blocked catchpits.',
      'பருவமழை முன்னெச்சரிக்கை நடவடிக்கையாக முக்கிய மழைநீர் வடிகால்கள் தூர்வாரப்பட்டு வருகின்றன.',
      'Public Notice', 'High', 'Greater Chennai Corporation', 'State Operations Desk'
    ],
    [
      '24x7 Drinking Water Supply Helpline & Rapid Repair Taskforce Activated',
      '24x7 குடிநீர் விநியோக உதவி மையம் மற்றும் அவசர சீரமைப்பு பிரிவு செயல்பாடு',
      'CMWSSB and TWAD Board have deployed mobile pipeline welding vans.',
      'குடிநீர் குழாய் உடைப்புகள் குறித்த புகார்களுக்கு 12 மணி நேரத்திற்குள் தீர்வு காண நடமாடும் அவசர சீரமைப்பு குழுக்கள் தயார்.',
      'Service Update', 'Normal', 'CMWSSB / TWAD Board', 'State Operations Desk'
    ],
    [
      'Smart LED Streetlight Replacement Initiative in Suburban Zones',
      'புறநகர் பகுதிகளில் ஸ்மார்ட் எல்இடி தெருவிளக்குகள் பொருத்தும் திட்டம்',
      'Energy-efficient automatic timer LED lights are being installed across 18 suburban municipalities.',
      'இருள் சூழ்ந்த பகுதிகளை அகற்ற 18 நகராட்சிகளில் புதிய எல்இடி தெருவிளக்குகள் பொருத்தப்பட்டு வருகின்றன.',
      'Infrastructure', 'Normal', 'TANGEDCO / Municipal Admin', 'State Operations Desk'
    ]
  ];
  for (const a of announcements) insertAnn.run(...a);

  // 4. Seed 2 Synthetic Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (complaint_ref, actor_id, actor_name, actor_role, action, remarks)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertAudit.run('CR-TN-2026-0001', 1, 'Director of Municipal Operations', 'super_admin', 'SYSTEM_AUDIT', 'Initial system integrity check completed.');
  insertAudit.run('CR-TN-2026-0002', 2, 'Thiru. S. Rajendran, IAS', 'municipal_admin', 'OFFICER_ASSIGN', 'Assigned zone inspection team.');

  // 5. Seed 27 Purely Synthetic Complaints
  const insertComplaint = db.prepare(`
    INSERT INTO complaints (
      ref_id, title, description, category, location, latitude, longitude,
      status, priority, department, district, local_body, ward,
      citizen_id, citizen_name, citizen_phone, citizen_email,
      sla_hours, sla_deadline, is_gps_verified, status_history, created_at,
      ai_summary, ai_category, ai_priority, ai_department, ai_confidence,
      ai_reason, ai_safety_risk, ai_recommended_action, ai_suggested_response_time,
      internal_notes, resolution_remarks
    ) VALUES (
      @ref_id, @title, @description, @category, @location, @latitude, @longitude,
      @status, @priority, @department, @district, @local_body, @ward,
      @citizen_id, @citizen_name, @citizen_phone, @citizen_email,
      @sla_hours, datetime('now', '+' || @sla_hours || ' hours'), @is_gps_verified, @status_history, @created_at,
      @ai_summary, @ai_category, @ai_priority, @ai_department, @ai_confidence,
      @ai_reason, @ai_safety_risk, @ai_recommended_action, @ai_suggested_response_time,
      @internal_notes, @resolution_remarks
    )
  `);

  const categories = [
    'Road Damage', 'Water Supply', 'Garbage', 'Streetlight', 'Sewage',
    'Drainage', 'Public Health', 'Encroachment', 'Stray Animals', 'Parks & Playgrounds'
  ];
  const departments = [
    'Greater Chennai Corporation', 'Tamil Nadu Water Supply and Drainage Board',
    'Solid Waste Management Division', 'TANGEDCO Public Lighting', 'CMWSSB Sewerage Operations',
    'Stormwater Drainage Wing', 'Public Health Department', 'Town Planning & Enforcement'
  ];
  const districts = ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Erode', 'Vellore', 'Thanjavur'];
  const statuses = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];
  const priorities = ['Low', 'Medium', 'High', 'Critical'];

  for (let i = 1; i <= 27; i++) {
    const pad = String(i).padStart(4, '0');
    const ref_id = `CR-TN-2026-${pad}`;
    const category = categories[(i - 1) % categories.length];
    const dept = departments[(i - 1) % departments.length];
    const dist = districts[(i - 1) % districts.length];
    const status = statuses[(i - 1) % statuses.length];
    const priority = priorities[(i - 1) % priorities.length];
    const citizen = citizens[(i - 1) % citizens.length];

    const history = JSON.stringify([
      { status: 'Submitted', timestamp: new Date(Date.now() - 3600000 * (30 - i)).toISOString(), note: 'Synthetic test grievance registered via citizen portal with initial geolocation telemetry', actor: 'Citizen' },
      { status: 'Under Review', timestamp: new Date(Date.now() - 3000000 * (30 - i)).toISOString(), note: 'AI triage engine processed classification, safety severity index, and department routing', actor: 'Automated AI Engine' },
      ...(status !== 'Submitted' && status !== 'Under Review' ? [{ status: 'Assigned', timestamp: new Date(Date.now() - 2400000 * (30 - i)).toISOString(), note: `Work order dispatched to jurisdictional municipal engineering division in ${dist}`, actor: 'Municipal Administrator' }] : []),
      ...(status === 'In Progress' || status === 'Resolved' ? [{ status: 'In Progress', timestamp: new Date(Date.now() - 1800000 * (30 - i)).toISOString(), note: 'Field response team on site conducting initial repairs and remediation measures', actor: 'Field Officer' }] : []),
      ...(status === 'Resolved' ? [{ status: 'Resolved', timestamp: new Date(Date.now() - 600000 * (30 - i)).toISOString(), note: 'Remediation completed and verified with photographic evidence by field supervisor', actor: 'Field Supervisor' }] : [])
    ]);

    insertComplaint.run({
      ref_id,
      title: `Synthetic Civic Issue ${i}: ${category} in ${dist}`,
      description: `Automated synthetic test fixture describing ${category.toLowerCase()} Redressal required on Municipal Corridor ${i}. Resident reported public inconvenience requiring immediate civic intervention.`,
      category,
      location: `Ward ${10 + i}, Main Avenue, ${dist}`,
      latitude: 13.0827 + (i * 0.01),
      longitude: 80.2707 + (i * 0.01),
      status,
      priority,
      department: dept,
      district: dist,
      local_body: `${dist} Municipal Body`,
      ward: `Ward ${10 + i}`,
      citizen_id: ((i - 1) % citizens.length) + 1,
      citizen_name: citizen[0],
      citizen_phone: citizen[2],
      citizen_email: citizen[1],
      sla_hours: 24,
      is_gps_verified: 1,
      status_history: history,
      created_at: new Date(Date.now() - 3600000 * (30 - i)).toISOString(),
      ai_summary: `AI triage summary for grievance ${ref_id}: ${category} issue in ${dist} requiring ${dept} attention.`,
      ai_category: category,
      ai_priority: priority,
      ai_department: dept,
      ai_confidence: 0.94,
      ai_reason: `Automated algorithmic classification evaluated image indicators, semantic severity markers, and municipal jurisdiction routing protocols for ${dist}. Location confirmed via synthetic geospatial telemetry.`,
      ai_safety_risk: `Moderate public convenience disruption requiring standard municipal field intervention and safety precautions.`,
      ai_recommended_action: `Dispatch municipal field inspection team to verify ground situation and initiate corrective civil works.`,
      ai_suggested_response_time: `24 hours`,
      internal_notes: `Synthetic operational note: priority logged and tracked via automated test pipeline with standard municipal SLAs.`,
      resolution_remarks: status === 'Resolved' ? `Remediation completed and verified with photographic evidence by field supervisor.` : null
    });
  }
}

/**
 * Creates an isolated temporary SQLite database for automated testing.
 * Seeds ONLY fresh synthetic fixtures. Never copies genuine database files.
 */
function setupIsolatedTestDb(suiteName) {
  const safeName = String(suiteName || 'suite').replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueId = Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const tmpDir = path.join(__dirname, 'tmp_isolated_test_' + safeName + '_' + uniqueId);

  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  const isolatedDbPath = path.join(tmpDir, 'isolated_' + safeName + '.db');

  // Strict Protection Check: Ensure target path is NEVER the genuine DB or backup
  const genuineDbPath = path.resolve(path.join(__dirname, 'civicresolve.db'));
  const backupDbPath = path.resolve(path.join(__dirname, 'civicresolve_safety_backup_phase1.db'));
  const resolvedTarget = path.resolve(isolatedDbPath);

  if (resolvedTarget === genuineDbPath || resolvedTarget === backupDbPath) {
    throw new Error(`[FATAL PRIVACY VIOLATION]: setupIsolatedTestDb attempted to target protected database at ${resolvedTarget}. Aborting.`);
  }

  // Initialize fresh synthetic database
  const initDb = new Database(isolatedDbPath);
  initDb.pragma('journal_mode = WAL');
  initDb.pragma('synchronous = FULL');
  initDb.pragma('busy_timeout = 5000');

  createSyntheticSchema(initDb);
  seedSyntheticFixtures(initDb);
  initDb.close();

  // Enforce isolated test configuration
  process.env.NODE_ENV = 'test';
  process.env.SQLITE_DB_PATH = isolatedDbPath;

  function cleanup(activeDbInstance = null) {
    try {
      if (activeDbInstance && typeof activeDbInstance.close === 'function' && activeDbInstance.open) {
        activeDbInstance.close();
      }
    } catch (_) {}

    try {
      [isolatedDbPath, isolatedDbPath + '-wal', isolatedDbPath + '-shm'].forEach(f => {
        if (fs.existsSync(f)) {
          try { fs.unlinkSync(f); } catch (_) {}
        }
      });
      if (fs.existsSync(tmpDir)) {
        try { fs.rmdirSync(tmpDir); } catch (_) {}
      }
    } catch (_) {}
  }

  return { tmpDir, isolatedDbPath, cleanup };
}

module.exports = { setupIsolatedTestDb };
