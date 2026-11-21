const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const Database = require('better-sqlite3');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.SQLITE_DB_PATH || 
  (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'civicresolve.db') : path.join(__dirname, 'civicresolve.db'));

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

function initializeDatabase() {
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Run migrations if columns are missing
  const newComplaintCols = [
    'resolution_remarks TEXT',
    'status_history TEXT',
    'is_gps_verified INTEGER DEFAULT 0',
    'district TEXT DEFAULT "Chennai"',
    'local_body TEXT DEFAULT "Greater Chennai Corporation"',
    'ward TEXT DEFAULT "Zone 9 - Ward 114"',
    'citizen_id INTEGER',
    'citizen_name TEXT',
    'citizen_phone TEXT',
    'citizen_email TEXT',
    'sla_hours INTEGER DEFAULT 24',
    'sla_deadline DATETIME',
    'assigned_officer TEXT',
    'internal_notes TEXT',
    'resolution_evidence_url TEXT',
    'citizen_rating INTEGER',
    'citizen_feedback TEXT',
    'is_appealed INTEGER DEFAULT 0',
    'appeal_reason TEXT',
    'duplicate_of_ref_id TEXT',
    'language TEXT DEFAULT "en"',
    'verification_otp TEXT',
    'otp_expires_at DATETIME',
    'reopen_count INTEGER DEFAULT 0'
  ];

  for (const colDef of newComplaintCols) {
    try {
      db.exec(`ALTER TABLE complaints ADD COLUMN ${colDef};`);
    } catch {}
  }

  // Populate missing SLA deadlines & defaults for existing complaints
  try {
    db.exec(`
      UPDATE complaints 
      SET sla_deadline = datetime(created_at, '+' || COALESCE(sla_hours, 24) || ' hours')
      WHERE sla_deadline IS NULL;
    `);
    db.exec(`
      UPDATE complaints
      SET district = 'Chennai' WHERE district IS NULL;
      UPDATE complaints
      SET local_body = 'Greater Chennai Corporation' WHERE local_body IS NULL;
    `);
  } catch {}

  // Create admins table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'super_admin',
      district TEXT DEFAULT 'Statewide',
      department TEXT DEFAULT 'Municipal Administration & Water Supply',
      designation TEXT DEFAULT 'Director of Municipal Operations',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.exec(`ALTER TABLE admins ADD COLUMN district TEXT DEFAULT 'Statewide';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admins ADD COLUMN department TEXT DEFAULT 'Municipal Administration & Water Supply';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE admins ADD COLUMN designation TEXT DEFAULT 'Municipal Officer';`);
  } catch {}

  // Create citizens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS citizens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      district TEXT DEFAULT 'Chennai',
      email_verified INTEGER DEFAULT 1,
      email_notifications INTEGER DEFAULT 1,
      sms_notifications INTEGER DEFAULT 0,
      whatsapp_notifications INTEGER DEFAULT 0,
      sms_consent INTEGER DEFAULT 0,
      whatsapp_consent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const citizenCols = [
    'email_verified INTEGER DEFAULT 1',
    'mobile_verified INTEGER DEFAULT 1',
    'municipality TEXT DEFAULT "Greater Chennai Corporation"',
    'ward TEXT DEFAULT "Ward 114"',
    'email_notifications INTEGER DEFAULT 1',
    'sms_notifications INTEGER DEFAULT 1',
    'whatsapp_notifications INTEGER DEFAULT 0',
    'sms_consent INTEGER DEFAULT 1',
    'whatsapp_consent INTEGER DEFAULT 0'
  ];
  for (const cCol of citizenCols) {
    try {
      db.exec(`ALTER TABLE citizens ADD COLUMN ${cCol};`);
    } catch {}
  }

  // Create citizen_otps table for Mobile OTP Authentication
  db.exec(`
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
  `);
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_citizen_otps_phone ON citizen_otps(phone);`);
  } catch {}

  // Create audit_logs table for Municipal Action Tracking
  db.exec(`
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
  `);

  // Create announcements table for Municipal Public Notices
  db.exec(`
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
  `);

  // Seed default announcements if table is empty
  const annCount = db.prepare('SELECT COUNT(*) as count FROM announcements').get().count;
  if (annCount === 0) {
    const defaultAnnouncements = [
      {
        title: 'Emergency Storm Drain Desilting Drive Across Chennai & Coastal Districts',
        title_ta: 'சென்னை மற்றும் கடலோர மாவட்டங்களில் அவசர மழைநீர் வடிகால் தூர்வாரும் பணி',
        content: 'Pre-monsoon desilting of major stormwater culverts is underway. Citizens are requested to report blocked catchpits via the CivicResolve portal.',
        content_ta: 'பருவமழை முன்னெச்சரிக்கை நடவடிக்கையாக முக்கிய மழைநீர் வடிகால்கள் தூர்வாரப்பட்டு வருகின்றன. அடைப்புகள் இருப்பின் உடனடியாக மனு செய்யவும்.',
        category: 'Public Notice',
        priority: 'High',
        department: 'Greater Chennai Corporation'
      },
      {
        title: '24x7 Drinking Water Supply Helpline & Rapid Repair Taskforce Activated',
        title_ta: '24x7 குடிநீர் விநியோக உதவி மையம் மற்றும் அவசர சீரமைப்பு பிரிவு செயல்பாடு',
        content: 'CMWSSB and TWAD Board have deployed mobile pipeline welding vans. All reported main line bursts will receive verified repair within 12 hours.',
        content_ta: 'குடிநீர் குழாய் உடைப்புகள் குறித்த புகார்களுக்கு 12 மணி நேரத்திற்குள் தீர்வு காண நடமாடும் அவசர சீரமைப்பு குழுக்கள் தயார் நிலையில் உள்ளன.',
        category: 'Service Update',
        priority: 'Normal',
        department: 'CMWSSB / TWAD Board'
      },
      {
        title: 'Smart LED Streetlight Replacement Initiative in Suburban Zones',
        title_ta: 'புறநகர் பகுதிகளில் ஸ்மார்ட் எல்இடி தெருவிளக்குகள் பொருத்தும் திட்டம்',
        content: 'Energy-efficient automatic timer LED lights are being installed across 18 suburban municipalities to eliminate dark road corridors.',
        content_ta: 'இருள் சூழ்ந்த பகுதிகளை அகற்ற 18 நகராட்சிகளில் புதிய எல்இடி தெருவிளக்குகள் பொருத்தப்பட்டு வருகின்றன.',
        category: 'Infrastructure',
        priority: 'Normal',
        department: 'TANGEDCO / Municipal Admin'
      }
    ];

    const annInsert = db.prepare(`
      INSERT INTO announcements (title, title_ta, content, content_ta, category, priority, department, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'State Operations Desk')
    `);
    for (const a of defaultAnnouncements) {
      annInsert.run(a.title, a.title_ta, a.content, a.content_ta, a.category, a.priority, a.department);
    }
  }

  // Create notifications table (In-App notifications)
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_type TEXT NOT NULL,
      recipient_id INTEGER,
      ref_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create notification_logs table (Multi-Channel Delivery Audit Logs)
  db.exec(`
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
  `);

  // Performance Indexes
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_complaints_ref_id ON complaints(ref_id);
      CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
      CREATE INDEX IF NOT EXISTS idx_complaints_citizen_id ON complaints(citizen_id);
      CREATE INDEX IF NOT EXISTS idx_complaints_citizen_phone ON complaints(citizen_phone);
      CREATE INDEX IF NOT EXISTS idx_complaints_citizen_email ON complaints(citizen_email);
      CREATE INDEX IF NOT EXISTS idx_complaints_district ON complaints(district);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_complaint_ref ON audit_logs(complaint_ref);
      CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id);
    `);
  } catch {}

  // Seed master administrator if admins table is empty
  const adminCountStmt = db.prepare('SELECT COUNT(*) as count FROM admins');
  const { count: adminCount } = adminCountStmt.get();

  if (adminCount === 0) {
    const initialEmail = process.env.INITIAL_ADMIN_EMAIL;
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD;
    const initialName = process.env.INITIAL_ADMIN_NAME || 'Director of Municipal Operations';

    if (initialEmail && initialPassword) {
      const passwordHash = bcrypt.hashSync(initialPassword, 12);
      db.prepare(`
        INSERT INTO admins (email, password_hash, name, role, district, department, designation)
        VALUES (?, ?, ?, 'super_admin', 'Statewide', 'Municipal Administration & Water Supply', 'Director of Municipal Operations')
      `).run(initialEmail.toLowerCase().trim(), passwordHash, initialName);
      console.log(`[Security] Master administrator account initialized for: ${initialEmail}`);
    } else {
      console.warn('[Security Notice] No INITIAL_ADMIN_EMAIL or INITIAL_ADMIN_PASSWORD set in .env.');
    }
  }

  // Ensure role is super_admin for master admin
  try {
    db.exec(`UPDATE admins SET role = 'super_admin' WHERE email = 'admin@civicresolve.gov' AND (role = 'admin' OR role IS NULL);`);
  } catch {}

  // Seed departmental and municipal officers if not present
  const demoOfficers = [
    {
      email: 'gcc.officer@civicresolve.gov',
      password: 'CivicAdmin#2026!Secure',
      name: 'Thiru. S. Rajendran, IAS',
      role: 'municipal_admin',
      district: 'Chennai',
      department: 'Greater Chennai Corporation',
      designation: 'Zonal Officer (Zone 9 - Teynampet)'
    },
    {
      email: 'tangedco.officer@civicresolve.gov',
      password: 'CivicAdmin#2026!Secure',
      name: 'Er. M. Kousalya',
      role: 'department_officer',
      district: 'Chennai',
      department: 'Tamil Nadu Generation and Distribution Corporation (TANGEDCO)',
      designation: 'Superintending Engineer (Distribution Central)'
    },
    {
      email: 'cmwssb.officer@civicresolve.gov',
      password: 'CivicAdmin#2026!Secure',
      name: 'Er. V. Murugan',
      role: 'department_officer',
      district: 'Chennai',
      department: 'Chennai Metro Water Supply & Sewerage Board (CMWSSB) / TWAD',
      designation: 'Area Executive Engineer'
    }
  ];

  for (const off of demoOfficers) {
    const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(off.email);
    if (!existing) {
      const hash = bcrypt.hashSync(off.password, 12);
      db.prepare(`
        INSERT INTO admins (email, password_hash, name, role, district, department, designation)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(off.email, hash, off.name, off.role, off.district, off.department, off.designation);
    }
  }

  // Seed demo citizens if citizens table is empty
  const citizenCount = db.prepare('SELECT COUNT(*) as count FROM citizens').get().count;
  if (citizenCount === 0) {
    const defaultCitizenPw = bcrypt.hashSync('Citizen#2026!Demo', 12);
    const demoCitizens = [
      {
        name: 'Selvi Anitha Sundaram',
        email: 'citizen@civicresolve.gov',
        phone: '9840123456',
        district: 'Chennai'
      },
      {
        name: 'Karthik Raja S',
        email: 'karthik@civicresolve.gov',
        phone: '9443654321',
        district: 'Coimbatore'
      }
    ];

    for (const c of demoCitizens) {
      db.prepare(`
        INSERT INTO citizens (name, email, phone, password_hash, district)
        VALUES (?, ?, ?, ?, ?)
      `).run(c.name, c.email, c.phone, defaultCitizenPw, c.district);
    }
    console.log('[Security] Demo citizen accounts seeded successfully.');
  }

  // Update legacy statuses ('Pending' -> 'Submitted' or 'Under Review')
  db.exec(`
    UPDATE complaints SET status = 'Under Review' WHERE status = 'Pending';
  `);

  // Ensure all existing complaints have a valid JSON status_history
  const allComplaints = db.prepare('SELECT id, status, created_at, status_history, resolution_remarks FROM complaints').all();
  for (const c of allComplaints) {
    if (!c.status_history || c.status_history.trim() === '') {
      const history = [
        {
          status: 'Submitted',
          timestamp: c.created_at,
          note: 'Initial grievance submission registered',
          actor: 'Citizen'
        }
      ];

      if (c.status === 'Under Review') {
        history.push({
          status: 'Under Review',
          timestamp: c.created_at,
          note: 'Grievance under automated/manual municipal review',
          actor: 'System / Officer'
        });
      } else if (c.status === 'Assigned' || c.status === 'In Progress') {
        history.push({
          status: 'Under Review',
          timestamp: c.created_at,
          note: 'Review completed',
          actor: 'Operations Desk'
        });
        history.push({
          status: 'Assigned',
          timestamp: c.created_at,
          note: 'Work order assigned to nodal department',
          actor: 'Operations Desk'
        });
        if (c.status === 'In Progress') {
          history.push({
            status: 'In Progress',
            timestamp: c.created_at,
            note: 'Inspection crew and equipment deployed on site',
            actor: 'Field Operations'
          });
        }
      } else if (c.status === 'Resolved') {
        history.push({
          status: 'Under Review',
          timestamp: c.created_at,
          note: 'Review completed',
          actor: 'Operations Desk'
        });
        history.push({
          status: 'Assigned',
          timestamp: c.created_at,
          note: 'Assigned to field division',
          actor: 'Operations Desk'
        });
        history.push({
          status: 'In Progress',
          timestamp: c.created_at,
          note: 'Repair operations in progress',
          actor: 'Field Operations'
        });
        history.push({
          status: 'Resolved',
          timestamp: c.created_at,
          note: c.resolution_remarks || 'Civic hazard rectified and verified by municipal supervisor.',
          actor: 'Supervising Officer'
        });
      }

      db.prepare('UPDATE complaints SET status_history = ?, is_gps_verified = CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END WHERE id = ?')
        .run(JSON.stringify(history), c.id);
    }
  }

  // Check if sample data exists
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM complaints');
  const { count } = countStmt.get();

  if (count === 0) {
    console.log('Inserting initial sample complaints for Phase 3...');
    const insert = db.prepare(`
      INSERT INTO complaints (
        ref_id, title, description, category, location, latitude, longitude,
        image_url, status, priority, department, ai_summary, ai_category,
        ai_priority, ai_department, ai_confidence, ai_reason, ai_safety_risk,
        ai_recommended_action, ai_suggested_response_time, ai_status,
        resolution_remarks, status_history, is_gps_verified, created_at
      ) VALUES (
        @ref_id, @title, @description, @category, @location, @latitude, @longitude,
        @image_url, @status, @priority, @department, @ai_summary, @ai_category,
        @ai_priority, @ai_department, @ai_confidence, @ai_reason, @ai_safety_risk,
        @ai_recommended_action, @ai_suggested_response_time, @ai_status,
        @resolution_remarks, @status_history, @is_gps_verified, @created_at
      )
    `);

    // Standard sample records
    const sampleComplaints = [
      {
        ref_id: 'CR-2026-1042',
        title: 'Deep pothole causing bike skids on MG Road',
        description: 'A 2-foot wide and 6-inch deep pothole has formed right in the middle of MG Road near Metro Pillar 142. Multiple two-wheelers have skidded, especially after yesterday evening rains.',
        category: 'Road Damage',
        location: 'MG Road, near Metro Pillar 142',
        latitude: 12.9716,
        longitude: 77.5946,
        image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60',
        status: 'In Progress',
        priority: 'High',
        department: 'Roads and Highways',
        ai_summary: 'Severe road surface cavity creating imminent accident hazard for two-wheelers',
        ai_category: 'Road Damage',
        ai_priority: 'High',
        ai_department: 'Roads and Highways',
        ai_confidence: 0.94,
        ai_reason: 'Deep pothole situated in high-traffic lane poses significant collision and skid risk.',
        ai_safety_risk: 'High risk of vehicular accidents and severe injury to motorcyclists',
        ai_recommended_action: 'Deploy emergency asphalt cold-patch crew and place temporary warning barricade',
        ai_suggested_response_time: '12 hours',
        ai_status: 'SUCCESS',
        resolution_remarks: 'Rapid cold asphalt crew deployed. Barricades positioned.',
        status_history: JSON.stringify([
          { status: 'Submitted', timestamp: new Date(Date.now() - 3600 * 1000 * 14).toISOString(), note: 'Citizen reported via mobile portal', actor: 'Citizen' },
          { status: 'Under Review', timestamp: new Date(Date.now() - 3600 * 1000 * 13).toISOString(), note: 'AI triage flagged high skid hazard', actor: 'CivicResolve AI' },
          { status: 'Assigned', timestamp: new Date(Date.now() - 3600 * 1000 * 10).toISOString(), note: 'Assigned to Roads and Highways Central Div', actor: 'Operations Desk' },
          { status: 'In Progress', timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(), note: 'Field patch team arrived on site', actor: 'Field Supervisor' }
        ]),
        is_gps_verified: 1,
        created_at: new Date(Date.now() - 3600 * 1000 * 14).toISOString()
      },
      {
        ref_id: 'CR-2026-1043',
        title: 'Overflowing commercial dumpster blocking sidewalk',
        description: 'Commercial municipal dumpster has not been emptied for 4 days. Waste is spilling over into the pedestrian pathway and storm drain. Severe foul smell attracting stray animals.',
        category: 'Garbage and Sanitation',
        location: 'Sector 4 Market, Main Avenue',
        latitude: 12.9352,
        longitude: 77.6245,
        image_url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&auto=format&fit=crop&q=60',
        status: 'Under Review',
        priority: 'High',
        department: 'Solid Waste Management',
        ai_summary: 'Accumulated municipal waste blocking pedestrian right-of-way with biohazard concerns',
        ai_category: 'Garbage and Sanitation',
        ai_priority: 'High',
        ai_department: 'Solid Waste Management',
        ai_confidence: 0.96,
        ai_reason: 'Prolonged uncollected waste breeds disease vectors and completely obstructs public foot traffic.',
        ai_safety_risk: 'Public health hazard, disease vector breeding, sidewalk blockage',
        ai_recommended_action: 'Dispatch compactor truck for clearance and sanitize perimeter with bleaching agent',
        ai_suggested_response_time: '24 hours',
        ai_status: 'SUCCESS',
        resolution_remarks: null,
        status_history: JSON.stringify([
          { status: 'Submitted', timestamp: new Date(Date.now() - 3600 * 1000 * 22).toISOString(), note: 'Citizen grievance filed with photo evidence', actor: 'Citizen' },
          { status: 'Under Review', timestamp: new Date(Date.now() - 3600 * 1000 * 21).toISOString(), note: 'Sanitation supervisor review in progress', actor: 'Admin Desk' }
        ]),
        is_gps_verified: 1,
        created_at: new Date(Date.now() - 3600 * 1000 * 22).toISOString()
      },
      {
        ref_id: 'CR-2026-1044',
        title: 'High-pressure water main pipeline burst',
        description: 'Underground drinking water main line cracked and is gushing clean water into the street. Thousands of liters wasted per hour and low pressure in surrounding apartment blocks.',
        category: 'Water Leakage',
        location: '7th Cross, Indiranagar',
        latitude: 12.9784,
        longitude: 77.6408,
        image_url: 'https://images.unsplash.com/photo-1542013936693-884638332954?w=800&auto=format&fit=crop&q=60',
        status: 'Assigned',
        priority: 'Critical',
        department: 'Water Supply & Sewerage Board',
        ai_summary: 'Major potable water supply rupture causing road flooding and community water shortage',
        ai_category: 'Water Leakage',
        ai_priority: 'Critical',
        ai_department: 'Water Supply & Sewerage Board',
        ai_confidence: 0.98,
        ai_reason: 'Rupture of pressurized main creates foundation erosion risk and cuts off vital drinking water.',
        ai_safety_risk: 'Ground subsidence, roadway undermining, and loss of municipal potable supply',
        ai_recommended_action: 'Isolate upstream isolation valve immediately and dispatch pipe welding emergency team',
        ai_suggested_response_time: '4 hours',
        ai_status: 'SUCCESS',
        resolution_remarks: 'Dispatched emergency valve closure vehicle.',
        status_history: JSON.stringify([
          { status: 'Submitted', timestamp: new Date(Date.now() - 3600 * 1000 * 6).toISOString(), note: 'Citizen emergency alert submitted', actor: 'Citizen' },
          { status: 'Under Review', timestamp: new Date(Date.now() - 3600 * 1000 * 5.8).toISOString(), note: 'Critical priority auto-escalated by AI triage', actor: 'CivicResolve AI' },
          { status: 'Assigned', timestamp: new Date(Date.now() - 3600 * 1000 * 5.5).toISOString(), note: 'Assigned to BWSSB Emergency Pipeline Wing', actor: 'Disaster Cell' }
        ]),
        is_gps_verified: 1,
        created_at: new Date(Date.now() - 3600 * 1000 * 6).toISOString()
      },
      {
        ref_id: 'CR-2026-1045',
        title: 'Broken streetlights along residential school corridor',
        description: 'Five consecutive LED street lamps have been non-functional for past week along the 8th Main corridor leading to St. Jude School. The entire stretch is completely pitch dark after 6:30 PM.',
        category: 'Streetlight',
        location: '8th Main, Koramangala 3rd Block',
        latitude: 12.9279,
        longitude: 77.6271,
        image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop&q=60',
        status: 'Resolved',
        priority: 'Medium',
        department: 'Public Lighting Division',
        ai_summary: 'Multi-pole luminaire failure creating safety hazard on school route during dark hours',
        ai_category: 'Streetlight',
        ai_priority: 'Medium',
        ai_department: 'Public Lighting Division',
        ai_confidence: 0.91,
        ai_reason: 'Dark corridor compromises pedestrian and student safety after dusk.',
        ai_safety_risk: 'Increased vulnerability to petty crime and poor visibility for evening pedestrians',
        ai_recommended_action: 'Inspect feeder pillar circuit breaker and replace blown driver units on poles 12-16',
        ai_suggested_response_time: '48 hours',
        ai_status: 'SUCCESS',
        resolution_remarks: 'Replaced 5 LED drivers and inspected MCB at Feeder Pillar 9. All lights operational.',
        status_history: JSON.stringify([
          { status: 'Submitted', timestamp: new Date(Date.now() - 3600 * 1000 * 72).toISOString(), note: 'Complaint logged by resident association', actor: 'Citizen' },
          { status: 'Under Review', timestamp: new Date(Date.now() - 3600 * 1000 * 70).toISOString(), note: 'Electrical inspection queued', actor: 'Admin Desk' },
          { status: 'Assigned', timestamp: new Date(Date.now() - 3600 * 1000 * 48).toISOString(), note: 'Assigned to Public Lighting Ward 151', actor: 'Admin Desk' },
          { status: 'In Progress', timestamp: new Date(Date.now() - 3600 * 1000 * 24).toISOString(), note: 'Boom lift truck dispatched for driver replacement', actor: 'Field Electrician' },
          { status: 'Resolved', timestamp: new Date(Date.now() - 3600 * 1000 * 6).toISOString(), note: 'Driver units replaced, nighttime lux test passed', actor: 'Assistant Executive Engineer' }
        ]),
        is_gps_verified: 1,
        created_at: new Date(Date.now() - 3600 * 1000 * 72).toISOString()
      }
    ];

    const insertMany = db.transaction((complaints) => {
      for (const c of complaints) insert.run(c);
    });
    insertMany(sampleComplaints);
    console.log(`Inserted ${sampleComplaints.length} Phase 3 sample complaints successfully.`);
  }
}

initializeDatabase();

module.exports = db;
