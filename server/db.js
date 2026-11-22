const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const fs = require('fs');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { PostgresDatabaseAdapter, SqliteDatabaseAdapter } = require('./db_adapter');

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const genuineDbPath = path.resolve(path.join(__dirname, 'civicresolve.db'));
const backupDbPath = path.resolve(path.join(__dirname, 'civicresolve_safety_backup_phase1.db'));

// Determine target database engine:
// 1. In production (NODE_ENV=production):
//    - DATABASE_URL is strictly required for PostgreSQL deployment.
//    - Ephemeral or silent SQLite fallback is strictly prohibited.
//    - If USE_SQLITE=true is explicitly set, validates persistent disk/path isolation.
// 2. In automated test (NODE_ENV=test):
//    - Defaults to SQLite for isolated synthetic test suites unless TEST_DB_ENGINE=postgres is explicit.
// 3. In local development:
//    - If DATABASE_URL is set and USE_SQLITE is not 'true', connects to PostgreSQL.
//    - If DATABASE_URL is absent or USE_SQLITE='true', uses SQLite.
let targetEngine;
if (isProduction) {
  if (process.env.USE_SQLITE === 'true') {
    targetEngine = 'sqlite';
  } else if (process.env.DATABASE_URL) {
    targetEngine = 'postgres';
  } else {
    const errorMsg = '[FATAL DATABASE STARTUP FAILURE]: Production environment (NODE_ENV=production) requires an explicit persistent database path via DATABASE_URL pointing to the authoritative PostgreSQL database. Ephemeral or silent SQLite fallback is strictly prohibited to prevent data loss.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
} else if (isTest) {
  if (process.env.TEST_DB_ENGINE === 'postgres' && process.env.DATABASE_URL) {
    targetEngine = 'postgres';
  } else {
    targetEngine = 'sqlite';
  }
} else {
  // Local development
  if (process.env.DATABASE_URL && process.env.USE_SQLITE !== 'true') {
    targetEngine = 'postgres';
  } else {
    targetEngine = 'sqlite';
  }
}

let db;

// =============================================================================
// POSTGRESQL ENGINE INITIALIZATION (Supabase / Render Managed PostgreSQL)
// =============================================================================
if (targetEngine === 'postgres') {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PG_SSL_DISABLE === 'true' ? false : { rejectUnauthorized: false },
    max: parseInt(process.env.PG_POOL_MAX || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  const schema = (isTest && process.env.TEST_DB_SCHEMA) ? process.env.TEST_DB_SCHEMA : 'public';
  db = new PostgresDatabaseAdapter(pool, { schema });

  // In production or development, verify/run migrations asynchronously
  if (process.env.AUTO_MIGRATE !== 'false' && !isTest) {
    const { runMigrations } = require('./migrate');
    runMigrations({ pool, schema }).catch(err => {
      console.warn('[DATABASE MIGRATION NOTICE]: Automatic migration check notice:', err.message);
    });
  }

  console.log(`[DATABASE ENGINE]: Connected to PostgreSQL (${isProduction ? 'Production' : 'Development/Test'}, Schema: "${schema}").`);
} else {
  // =============================================================================
  // SQLITE ENGINE INITIALIZATION (Local Development & Isolated Test Suites)
  // =============================================================================
  let dbPath;

  // Path resolution precedence:
  if (process.env.SQLITE_DB_PATH) {
    dbPath = path.resolve(process.env.SQLITE_DB_PATH);
  } else if (process.env.DATA_DIR) {
    dbPath = path.resolve(path.join(process.env.DATA_DIR, 'civicresolve.db'));
  } else {
    if (isProduction) {
      const errorMsg = '[FATAL DATABASE STARTUP FAILURE]: Production environment requires an explicit persistent database path via SQLITE_DB_PATH or DATA_DIR. Silent fallback to local ephemeral storage is strictly prohibited to prevent data loss.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    if (isTest) {
      const testIsolationMsg = '[FATAL TEST ISOLATION FAILURE]: Automated tests (NODE_ENV=test) must explicitly configure an isolated temporary database via process.env.SQLITE_DB_PATH before requiring database modules. Fallback to genuine database is strictly prohibited.';
      console.error(testIsolationMsg);
      throw new Error(testIsolationMsg);
    }
    dbPath = genuineDbPath;
  }

  // Strict Test Isolation Guard: Prevent test execution from ever pointing to the genuine database or backup
  if (isTest) {
    if (path.resolve(dbPath) === genuineDbPath || path.resolve(dbPath) === backupDbPath) {
      const testIsolationError = `[FATAL TEST ISOLATION FAILURE]: Automated tests (NODE_ENV=test) are strictly forbidden from connecting to or mutating the genuine local database at "${dbPath}". Tests must set process.env.SQLITE_DB_PATH to an isolated temporary test database.`;
      console.error(testIsolationError);
      throw new Error(testIsolationError);
    }
  }

  // In production, verify that a configured persistent storage mount directory actually exists
  if (isProduction && process.env.DATA_DIR && !fs.existsSync(process.env.DATA_DIR)) {
    const mountError = `[FATAL DATABASE STARTUP FAILURE]: Configured persistent storage mount directory DATA_DIR="${process.env.DATA_DIR}" does not exist. Verify persistent disk attachment in Render Dashboard.`;
    console.error(mountError);
    throw new Error(mountError);
  }

  // In production, prevent silent creation of unintended empty replacement databases
  if (isProduction && !fs.existsSync(dbPath)) {
    if (process.env.REQUIRE_EXISTING_DB === 'true' || process.env.ALLOW_NEW_PRODUCTION_DB !== 'true') {
      const missingDbError = `[FATAL DATABASE STARTUP FAILURE]: Expected production database file does not exist at "${dbPath}" while REQUIRE_EXISTING_DB=true. Refusing to create an unverified empty replacement database. If this is an intentional initial deployment on a new disk, set ALLOW_NEW_PRODUCTION_DB=true.`;
      console.error(missingDbError);
      throw new Error(missingDbError);
    }
  }

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
    } catch (err) {
      console.error(`[DATABASE ERROR]: Failed to create directory for database at ${dbDir}:`, err.message);
      throw err;
    }
  }

  try {
    fs.accessSync(dbDir, fs.constants.W_OK);
  } catch (err) {
    console.error(`[DATABASE ERROR]: Database directory ${dbDir} is not writable:`, err.message);
    throw err;
  }

  class BetterSqliteAdapter {
    constructor(filename) {
      const { DatabaseSync } = require('node:sqlite');
      this.syncDb = new DatabaseSync(filename);
      this._open = true;
    }
    get open() {
      return this._open;
    }
    exec(sql) {
      return this.syncDb.exec(sql);
    }
    prepare(sql) {
      const stmt = this.syncDb.prepare(sql);
      return {
        get: (...args) => stmt.get(...args),
        all: (...args) => stmt.all(...args),
        run: (...args) => stmt.run(...args),
        bind: (...args) => stmt.bind(...args)
      };
    }
    pragma(pragmaStr) {
      try {
        return this.syncDb.prepare(`PRAGMA ${pragmaStr}`).all();
      } catch {
        return [];
      }
    }
    transaction(fn) {
      return (...args) => {
        this.syncDb.exec('BEGIN IMMEDIATE');
        try {
          const res = fn(...args);
          this.syncDb.exec('COMMIT');
          return res;
        } catch (e) {
          this.syncDb.exec('ROLLBACK');
          throw e;
        }
      };
    }
    async backup(destPath) {
      if (typeof this.syncDb.backup === 'function') {
        return this.syncDb.backup(destPath);
      }
      this.syncDb.exec(`VACUUM INTO '${destPath.replace(/'/g, "''")}'`);
      return destPath;
    }
    close() {
      this._open = false;
      return this.syncDb.close();
    }
  }

  let rawSqliteDb;
  try {
    const BetterSqlite = require('better-sqlite3');
    rawSqliteDb = new BetterSqlite(dbPath);
  } catch (err) {
    rawSqliteDb = new BetterSqliteAdapter(dbPath);
  }

  // Set SQLite concurrency pragmas
  try {
    if (typeof rawSqliteDb.pragma === 'function') {
      rawSqliteDb.pragma('journal_mode = WAL');
      rawSqliteDb.pragma('synchronous = FULL');
      rawSqliteDb.pragma('busy_timeout = 5000');
    }
  } catch (_) {}

  function initializeSqliteDatabase(sqliteDb) {
    try {
      if (typeof sqliteDb.pragma === 'function') {
        const integrity = sqliteDb.pragma('integrity_check');
        const isOk = Array.isArray(integrity) && integrity.length > 0 && (integrity[0].integrity_check === 'ok' || Object.values(integrity[0])[0] === 'ok');
        if (!isOk) {
          console.error('[DATABASE INTEGRITY WARNING]: PRAGMA integrity_check reported issues:', integrity);
        }
      }
    } catch (_) {}

    sqliteDb.exec(`
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
      'reopen_count INTEGER DEFAULT 0',
      'location_accuracy REAL',
      'detection_method TEXT DEFAULT "manual"',
      'zone TEXT',
      'postal_code TEXT',
      'jurisdiction_source TEXT DEFAULT "unverified"'
    ];

    for (const colDef of newComplaintCols) {
      try {
        sqliteDb.exec(`ALTER TABLE complaints ADD COLUMN ${colDef};`);
      } catch {}
    }

    try {
      sqliteDb.exec(`
        UPDATE complaints 
        SET sla_deadline = datetime(created_at, '+' || COALESCE(sla_hours, 24) || ' hours')
        WHERE sla_deadline IS NULL;
      `);
      sqliteDb.exec(`
        UPDATE complaints
        SET district = 'Chennai' WHERE district IS NULL;
        UPDATE complaints
        SET local_body = 'Greater Chennai Corporation' WHERE local_body IS NULL;
      `);
    } catch {}

    sqliteDb.exec(`
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
      sqliteDb.exec(`ALTER TABLE admins ADD COLUMN district TEXT DEFAULT 'Statewide';`);
    } catch {}
    try {
      sqliteDb.exec(`ALTER TABLE admins ADD COLUMN department TEXT DEFAULT 'Municipal Administration & Water Supply';`);
    } catch {}
    try {
      sqliteDb.exec(`ALTER TABLE admins ADD COLUMN designation TEXT DEFAULT 'Municipal Officer';`);
    } catch {}

    sqliteDb.exec(`
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
        sqliteDb.exec(`ALTER TABLE citizens ADD COLUMN ${cCol};`);
      } catch {}
    }

    try {
      sqliteDb.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_citizens_phone_unique ON citizens(phone);`);
      sqliteDb.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_citizens_email_unique ON citizens(email);`);
    } catch {}

    sqliteDb.exec(`
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
      sqliteDb.exec(`CREATE INDEX IF NOT EXISTS idx_citizen_otps_phone ON citizen_otps(phone);`);
    } catch {}

    sqliteDb.exec(`
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

    sqliteDb.exec(`
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

    const annCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM announcements').get().count;
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

      const annInsert = sqliteDb.prepare(`
        INSERT INTO announcements (title, title_ta, content, content_ta, category, priority, department, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'State Operations Desk')
      `);
      for (const a of defaultAnnouncements) {
        annInsert.run(a.title, a.title_ta, a.content, a.content_ta, a.category, a.priority, a.department);
      }
    }

    sqliteDb.exec(`
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

    sqliteDb.exec(`
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

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_hash TEXT UNIQUE NOT NULL,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      sqliteDb.exec(`
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
        CREATE INDEX IF NOT EXISTS idx_revoked_tokens_hash ON revoked_tokens(token_hash);
      `);
    } catch {}

    // One-time initial seed for clean/synthetic test databases only.
    // Strictly NEVER resets or overrides existing administrator passwords on application startup.
    const defaultMasterEmail = 'admin@civicresolve.gov';
    const existingMaster = sqliteDb.prepare('SELECT id FROM admins WHERE LOWER(email) = ?').get(defaultMasterEmail);
    if (!existingMaster) {
      const defaultMasterPassword = 'CivicAdmin#2026!Secure';
      const masterPasswordHash = bcrypt.hashSync(defaultMasterPassword, 12);
      sqliteDb.prepare(`
        INSERT INTO admins (email, password_hash, name, role, district, department, designation)
        VALUES (?, ?, 'Director of Municipal Operations', 'super_admin', 'Statewide', 'Municipal Administration & Water Supply', 'Director of Municipal Operations')
      `).run(defaultMasterEmail, masterPasswordHash);
    }
  }

  initializeSqliteDatabase(rawSqliteDb);
  db = new SqliteDatabaseAdapter(rawSqliteDb, dbPath);
  console.log(`[DATABASE ENGINE]: Connected to SQLite (${isTest ? 'Isolated Test Database' : 'Local Development'}: ${path.basename(dbPath)}).`);
}

module.exports = db;
