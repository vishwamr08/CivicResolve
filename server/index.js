const path = require('path');
const dotenv = require('dotenv');
// Ensure environment variables are loaded from server/.env regardless of CWD
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');
const { analyzeComplaintWithGemini } = require('./gemini-ai');
const {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  checkLoginRateLimit,
  recordFailedLogin,
  recordSuccessfulLogin,
  authenticateAdmin,
  authenticateCitizen,
  optionalCitizenAuth,
  generateSecureOtp,
  hashOtp
} = require('./auth');
const { computeSlaMetrics, getTargetSlaHours } = require('./sla-engine');
const { findDuplicateCandidates } = require('./duplicate-engine');
const {
  sendSms,
  notifyCitizenEvent,
  retryNotificationLog,
  testSmtpConnection,
  isSmtpConfigured,
  isSmsConfigured,
  isWhatsAppConfigured
} = require('./notifications');
const { TAMIL_NADU_DISTRICTS, TN_CIVIC_DEPARTMENTS } = require('./data/tamilnadu-geo');

const app = express();
app.set('trust proxy', 1);

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// In-Memory Global API Rate Limiter (300 requests per minute per IP)
const ipRequestWindow = new Map();
app.use('/api/', (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const entry = ipRequestWindow.get(ip) || { count: 0, resetTime: now + 60000 };
  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + 60000;
  } else {
    entry.count += 1;
  }
  ipRequestWindow.set(ip, entry);
  if (entry.count > 300) {
    return res.status(429).json({ error: 'Too many requests. Please slow down and try again.' });
  }
  next();
});

// -------------------------------------------------------------
// PRODUCTION CORS CONFIGURATION
// -------------------------------------------------------------
const allowedOrigins = [
  'https://civicresolve-yc9v.onrender.com',
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  // Development origins (only active outside production)
  ...(process.env.NODE_ENV !== 'production' ? [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ] : [])
].filter(Boolean).map(origin => origin.trim().replace(/\/$/, ''));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests with no Origin header (curl, mobile, backend-to-backend)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.trim().replace(/\/$/, '');
    const isExplicitlyAllowed = allowedOrigins.some(allowed => allowed.toLowerCase() === cleanOrigin.toLowerCase());

    if (isExplicitlyAllowed) {
      return callback(null, true);
    }

    // In non-production development mode, allow any localhost/127.0.0.1 port
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
      return callback(null, true);
    }

    // Explicitly reject unapproved origins
    return callback(new Error(`CORS error: Origin '${origin}' is not authorized.`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // Cache preflight for 24h
};

// Apply CORS middleware before any API routes
app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// Cookie options for cross-origin production and local development
function getCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
  };
}

function getClearCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/'
  };
}

// Persistent uploads folder configuration (Supports Render Persistent Disks)
const uploadsDir = process.env.UPLOADS_DIR || 
  (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'uploads') : path.join(__dirname, 'uploads'));

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Root Entry Point (GET /)
app.get('/', (req, res) => {
  res.status(200).json({
    application: 'CivicResolve',
    name: 'CivicResolve',
    service: 'Backend API',
    status: 'operational',
    version: '2.5.0',
    tagline: 'Report Issues. Track Action. Build Better Communities.',
    health_endpoint: '/api/health',
    health: '/api/health',
    routes: {
      health: '/api/health',
      system_health: '/health',
      complaints: '/api/complaints',
      track_complaint: '/api/complaints/track/:refId',
      dashboard_stats: '/api/dashboard/stats',
      announcements: '/api/announcements',
      citizen_auth: '/api/auth/citizen',
      admin_auth: '/api/auth/login'
    }
  });
});

// Root Health Check for Render & Infrastructure Monitors (GET /health)
app.get('/health', (req, res) => {
  try {
    if (!db || typeof db.prepare !== 'function' || db.open === false) {
      return res.status(503).json({
        status: 'unhealthy',
        service: 'CivicResolve',
        database: 'disconnected',
        database_status: 'disconnected',
        'database status': 'disconnected',
        timestamp: new Date().toISOString()
      });
    }

    const dbCheck = db.prepare('SELECT 1 as test').get();
    if (!dbCheck || dbCheck.test !== 1) {
      return res.status(503).json({
        status: 'unhealthy',
        service: 'CivicResolve',
        database: 'disconnected',
        database_status: 'disconnected',
        'database status': 'disconnected',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({
      status: 'healthy',
      service: 'CivicResolve',
      database: 'connected',
      database_status: 'connected',
      'database status': 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Health Check Failure]:', err?.message || err);
    return res.status(503).json({
      status: 'unhealthy',
      service: 'CivicResolve',
      database: 'disconnected',
      database_status: 'disconnected',
      'database status': 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext) ? ext : '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'civic-' + uniqueSuffix + safeExt);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Allowed formats: JPEG, PNG, WEBP, PDF.'));
    }
  }
});

// Unique Reference ID generator (CR-TN-YYYY-XXXXXX)
function generateRefId() {
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `CR-TN-${year}-${randomDigits}`;
}

// PII Masking Helpers
function maskName(name) {
  if (!name) return 'Citizen';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    const w = parts[0];
    return w.length > 2 ? w.slice(0, 2) + '*'.repeat(Math.max(2, w.length - 2)) : w + '*';
  }
  return parts[0].slice(0, 2) + '*** ' + parts[parts.length - 1][0] + '.';
}

function maskPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '******';
  return digits.slice(0, 2) + '******' + digits.slice(-2);
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return null;
  const [user, domain] = email.split('@');
  const maskedUser = user.length > 2 ? user.slice(0, 2) + '***' : user[0] + '***';
  return `${maskedUser}@${domain}`;
}

// Helper to safely parse status_history, attach SLA metrics, and conditionally mask PII
function parseComplaint(c, isAuthorized = false) {
  if (!c) return null;
  let history = [];
  try {
    history = c.status_history ? JSON.parse(c.status_history) : [];
  } catch {
    history = [
      { status: c.status, timestamp: c.created_at, note: 'Grievance record initialized', actor: 'System' }
    ];
  }

  const sla = computeSlaMetrics(c);

  const base = {
    ...c,
    status_history: history,
    is_gps_verified: Boolean(c.is_gps_verified),
    sla
  };

  if (!isAuthorized) {
    base.citizen_name = maskName(c.citizen_name);
    base.citizen_phone = maskPhone(c.citizen_phone);
    base.citizen_email = maskEmail(c.citizen_email);
    base.internal_notes = null; // Hide confidential officer notes from public
  }

  return base;
}

// Helper to record in-app notification in SQLite
function createNotification(recipientType, recipientId, refId, title, message) {
  try {
    db.prepare(`
      INSERT INTO notifications (recipient_type, recipient_id, ref_id, title, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(recipientType, recipientId || null, refId || null, title, message);
  } catch (err) {
    console.warn('[Notification DB Notice]:', err.message);
  }
}

// Helper to record audit log in SQLite
function recordAuditLog({ complaintRef, actorId, actorName, actorRole, action, previousState, newState, remarks, ip }) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (complaint_ref, actor_id, actor_name, actor_role, action, previous_state, new_state, remarks, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      complaintRef || null,
      actorId || null,
      actorName || 'System',
      actorRole || 'system',
      action,
      previousState ? (typeof previousState === 'object' ? JSON.stringify(previousState) : String(previousState)) : null,
      newState ? (typeof newState === 'object' ? JSON.stringify(newState) : String(newState)) : null,
      remarks || null,
      ip || null
    );
  } catch (err) {
    console.warn('[Audit Log DB Notice]:', err.message);
  }
}

// High-Performance In-Memory Cache (TTL: 15s)
const statsCache = new Map();
function getCachedStats(key) {
  const item = statsCache.get(key);
  if (item && (Date.now() - item.ts < 15000)) return item.val;
  return null;
}
function setCachedStats(key, val) {
  statsCache.set(key, { ts: Date.now(), val });
}
function invalidateStatsCache() {
  statsCache.clear();
}

// -------------------------------------------------------------
// 1. SYSTEM HEALTH & GEO HIERARCHY
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  try {
    if (!db || typeof db.prepare !== 'function' || db.open === false) {
      return res.status(503).json({
        status: 'unhealthy',
        service: 'CivicResolve',
        database: 'disconnected',
        database_status: 'disconnected',
        'database status': 'disconnected',
        timestamp: new Date().toISOString()
      });
    }

    const dbCheck = db.prepare('SELECT 1 as test').get();
    if (!dbCheck || dbCheck.test !== 1) {
      return res.status(503).json({
        status: 'unhealthy',
        service: 'CivicResolve',
        database: 'disconnected',
        database_status: 'disconnected',
        'database status': 'disconnected',
        timestamp: new Date().toISOString()
      });
    }

    const hasGeminiKey = !!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_');
    res.json({
      status: 'healthy',
      service: 'CivicResolve',
      database_status: 'connected',
      'database status': 'connected',
      app: 'CivicResolve API',
      version: '2.5.0',
      tagline: 'Report Issues. Track Action. Build Better Communities.',
      database: 'connected',
      aiConfigured: hasGeminiKey,
      geminiConfigured: hasGeminiKey,
      aiProvider: 'Google Gemini',
      aiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      smtpConfigured: isSmtpConfigured(),
      smsConfigured: isSmsConfigured(),
      whatsappConfigured: isWhatsAppConfigured(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[API Health Check Failure]:', err?.message || err);
    res.status(503).json({
      status: 'unhealthy',
      service: 'CivicResolve',
      database: 'disconnected',
      database_status: 'disconnected',
      'database status': 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/geo/districts
app.get('/api/geo/districts', (req, res) => {
  res.json({ districts: TAMIL_NADU_DISTRICTS });
});

// GET /api/geo/departments
app.get('/api/geo/departments', (req, res) => {
  res.json({ departments: TN_CIVIC_DEPARTMENTS });
});

// Google reCAPTCHA Verification Helper
async function verifyRecaptcha(token, remoteIp) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey || secretKey.includes('your_')) {
    return { success: true, status: 'unconfigured', message: 'reCAPTCHA test pass: secret key unconfigured in environment' };
  }
  try {
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token);
    if (remoteIp) params.append('remoteip', remoteIp);

    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[reCAPTCHA Verification Error]:', err.message);
    return { success: false, error: err.message };
  }
}

// GET /api/config/client (Public client configuration for Google Maps & reCAPTCHA)
app.get('/api/config/client', (req, res) => {
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  const hasGoogleKey = Boolean(googleKey && !googleKey.includes('your_'));
  res.json({
    googleMapsEnabled: hasGoogleKey,
    googleMapsApiKey: hasGoogleKey ? googleKey : null,
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || null,
    recaptchaConfigured: Boolean(process.env.RECAPTCHA_SECRET_KEY && !process.env.RECAPTCHA_SECRET_KEY.includes('your_')),
    isSmsConfigured: isSmsConfigured(),
    defaultDistrict: 'Chennai'
  });
});

// POST /api/recaptcha/verify (Google reCAPTCHA Token Verification Endpoint)
app.post('/api/recaptcha/verify', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'reCAPTCHA token is required.' });
    }
    const result = await verifyRecaptcha(token, req.ip);
    if (result.success) {
      return res.json({ success: true, verified: true, score: result.score || 1.0 });
    } else {
      return res.status(400).json({ success: false, error: 'reCAPTCHA validation failed.', details: result['error-codes'] });
    }
  } catch (err) {
    console.error('[Recaptcha Error]:', err);
    res.status(500).json({ success: false, error: 'Internal verification error' });
  }
});

// -------------------------------------------------------------
// 2. CITIZEN AUTHENTICATION & MOBILE OTP
// -------------------------------------------------------------

// POST /api/auth/citizen/send-otp
app.post('/api/auth/citizen/send-otp', async (req, res) => {
  try {
    const { phone, purpose = 'login' } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Mobile phone number is required.' });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    // Check resend cooldown (30 seconds)
    const recentOtp = db.prepare(`
      SELECT created_at, (strftime('%s', 'now') - strftime('%s', created_at)) as elapsed_sec
      FROM citizen_otps
      WHERE phone = ? AND verified = 0
      ORDER BY id DESC LIMIT 1
    `).get(cleanPhone);

    if (recentOtp && recentOtp.elapsed_sec < 30) {
      const waitTime = 30 - recentOtp.elapsed_sec;
      return res.status(429).json({
        error: `Please wait ${waitTime} seconds before requesting another OTP.`
      });
    }

    // Invalidate existing unverified OTPs
    db.prepare('UPDATE citizen_otps SET verified = -1 WHERE phone = ? AND verified = 0').run(cleanPhone);

    // Generate secure 6-digit numeric OTP
    const otp = generateSecureOtp();
    const otpHash = hashOtp(otp);

    // Insert into citizen_otps with 10 minutes expiry
    db.prepare(`
      INSERT INTO citizen_otps (phone, otp_hash, purpose, attempts, max_attempts, expires_at)
      VALUES (?, ?, ?, 0, 5, datetime('now', '+10 minutes'))
    `).run(cleanPhone, otpHash, purpose);

    const isExisting = Boolean(db.prepare('SELECT id FROM citizens WHERE phone = ?').get(cleanPhone));

    // If real telecom SMS gateway is configured, dispatch SMS
    const hasSmsGateway = isSmsConfigured();
    if (hasSmsGateway) {
      try {
        const smsText = `Your CivicResolve verification code is ${otp}. Valid for 10 minutes. Do not share with anyone. - CivicResolve Govt Platform`;
        const smsResult = await sendSms({
          to: cleanPhone,
          otp,
          text: smsText,
          eventType: 'citizen_otp'
        });
        if (!smsResult.success) {
          console.warn('[SMS Gateway Dispatch Notice]:', smsResult.error);
        }
      } catch (smsErr) {
        console.warn('[SMS Gateway Error]:', smsErr.message);
      }
    } else {
      console.log(`[SMS Gateway Simulated] Verification OTP for +91-${cleanPhone}: ${otp}`);
    }

    return res.json({
      success: true,
      message: hasSmsGateway
        ? `OTP dispatched to registered mobile ending in ${cleanPhone.slice(-4)}.`
        : `Verification code generated: ${otp} (Telecom test mode)`,
      phone: cleanPhone,
      isExistingUser: isExisting,
      cooldownSeconds: 30,
      devOtp: hasSmsGateway ? undefined : otp
    });
  } catch (err) {
    console.error('[Send OTP Error]:', err);
    res.status(500).json({ error: 'Failed to process OTP request. Please try again.' });
  }
});

// POST /api/auth/citizen/verify-otp
app.post('/api/auth/citizen/verify-otp', (req, res) => {
  try {
    const { phone, otp, _purpose = 'login' } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and 6-digit OTP are required.' });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanOtp = String(otp).trim();

    // Find active non-expired OTP
    const otpRecord = db.prepare(`
      SELECT * FROM citizen_otps
      WHERE phone = ? AND verified = 0 AND expires_at > CURRENT_TIMESTAMP
      ORDER BY id DESC LIMIT 1
    `).get(cleanPhone);

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new code.' });
    }

    if (otpRecord.attempts >= otpRecord.max_attempts) {
      db.prepare('UPDATE citizen_otps SET verified = -1 WHERE id = ?').run(otpRecord.id);
      return res.status(400).json({ error: 'Maximum verification attempts exceeded. Please generate a new OTP.' });
    }

    const inputHash = hashOtp(cleanOtp);
    if (inputHash !== otpRecord.otp_hash) {
      db.prepare('UPDATE citizen_otps SET attempts = attempts + 1 WHERE id = ?').run(otpRecord.id);
      const remaining = otpRecord.max_attempts - (otpRecord.attempts + 1);
      return res.status(400).json({
        error: `Incorrect OTP. ${remaining} attempt(s) remaining.`
      });
    }

    // Mark OTP verified
    db.prepare('UPDATE citizen_otps SET verified = 1 WHERE id = ?').run(otpRecord.id);

    // Check citizen record
    const citizen = db.prepare('SELECT id, name, email, phone, district, municipality, ward FROM citizens WHERE phone = ?').get(cleanPhone);

    if (citizen) {
      // Existing citizen: issue session token
      db.prepare('UPDATE citizens SET mobile_verified = 1 WHERE id = ?').run(citizen.id);
      const token = generateToken({ id: citizen.id, email: citizen.email, name: citizen.name, type: 'citizen' });

      res.cookie('civic_citizen_token', token, getCookieOptions());

      return res.json({
        success: true,
        verified: true,
        isNewUser: false,
        token,
        citizen: {
          id: citizen.id,
          name: citizen.name,
          email: citizen.email,
          phone: citizen.phone,
          district: citizen.district || 'Chennai',
          municipality: citizen.municipality || 'Greater Chennai Corporation',
          ward: citizen.ward || 'Ward 114'
        }
      });
    } else {
      // New citizen: OTP verified, prompt for registration details
      return res.json({
        success: true,
        verified: true,
        isNewUser: true,
        phone: cleanPhone,
        message: 'Mobile number verified successfully. Please complete your citizen profile.'
      });
    }
  } catch (err) {
    console.error('[Verify OTP Error]:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// POST /api/auth/citizen/register-with-otp
app.post('/api/auth/citizen/register-with-otp', (req, res) => {
  try {
    const { name, phone, otp, email, district, municipality, ward, password } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Citizen name and mobile number are required.' });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanEmail = email ? email.toLowerCase().trim() : `citizen.${cleanPhone}@civicresolve.gov`;

    // Check if phone already registered
    const existing = db.prepare('SELECT id FROM citizens WHERE phone = ?').get(cleanPhone);
    if (existing) {
      return res.status(409).json({ error: 'This mobile number is already registered. Please log in.' });
    }

    // Verify OTP if provided in request
    if (otp) {
      const otpRecord = db.prepare(`
        SELECT * FROM citizen_otps
        WHERE phone = ? AND verified = 0 AND expires_at > CURRENT_TIMESTAMP
        ORDER BY id DESC LIMIT 1
      `).get(cleanPhone);

      if (otpRecord) {
        if (hashOtp(otp) !== otpRecord.otp_hash) {
          return res.status(400).json({ error: 'Invalid verification OTP.' });
        }
        db.prepare('UPDATE citizen_otps SET verified = 1 WHERE id = ?').run(otpRecord.id);
      }
    }

    const passwordHash = hashPassword(password || 'Citizen#2026!MobileVerified');
    const result = db.prepare(`
      INSERT INTO citizens (name, email, phone, password_hash, district, municipality, ward, mobile_verified, email_verified, sms_notifications, email_notifications)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1, 1)
    `).run(
      name.trim(),
      cleanEmail,
      cleanPhone,
      passwordHash,
      district || 'Chennai',
      municipality || 'Greater Chennai Corporation',
      ward || 'Ward 114'
    );

    const citizen = db.prepare('SELECT id, name, email, phone, district, municipality, ward FROM citizens WHERE id = ?').get(result.lastInsertRowid);
    const token = generateToken({ id: citizen.id, email: citizen.email, name: citizen.name, type: 'citizen' });

    res.cookie('civic_citizen_token', token, getCookieOptions());

    createNotification('citizen', citizen.id, null, 'Welcome to CivicResolve', `வணக்கம் ${citizen.name}! Your citizen portal account is verified and ready.`);

    return res.status(201).json({
      success: true,
      message: 'Citizen account created and mobile verified successfully.',
      token,
      citizen
    });
  } catch (err) {
    console.error('[Register with OTP Error]:', err);
    res.status(500).json({ error: 'Failed to complete registration.' });
  }
});

// POST /api/auth/citizen/register
app.post('/api/auth/citizen/register', (req, res) => {
  try {
    const { name, email, phone, password, district } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Name, email, phone number, and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.trim();

    // Check existing
    const existing = db.prepare('SELECT id FROM citizens WHERE LOWER(email) = ? OR phone = ?').get(cleanEmail, cleanPhone);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email or phone number already exists.' });
    }

    const passwordHash = hashPassword(password);
    const result = db.prepare(`
      INSERT INTO citizens (name, email, phone, password_hash, district, email_verified, email_notifications)
      VALUES (?, ?, ?, ?, ?, 1, 1)
    `).run(name.trim(), cleanEmail, cleanPhone, passwordHash, district || 'Chennai');

    const citizen = db.prepare('SELECT id, name, email, phone, district, email_verified, email_notifications FROM citizens WHERE id = ?').get(result.lastInsertRowid);
    const token = generateToken({ id: citizen.id, email: citizen.email, name: citizen.name, type: 'citizen' });

    res.cookie('civic_citizen_token', token, getCookieOptions());

    // Fire welcome notification asynchronously
    notifyCitizenEvent({
      eventType: 'citizen_registration',
      citizenName: citizen.name,
      citizenEmail: citizen.email,
      citizenPhone: citizen.phone
    });

    res.status(201).json({
      message: 'Citizen account registered successfully',
      token,
      citizen
    });
  } catch (err) {
    console.error('[Citizen Register Error]:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/citizen/login
app.post('/api/auth/citizen/login', (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const rateCheck = checkLoginRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: rateCheck.message });
    }

    const { identifier, email, password } = req.body;
    const cleanId = (identifier || email || '').trim().toLowerCase();

    if (!cleanId || !password) {
      return res.status(400).json({ error: 'Email or phone and password are required.' });
    }

    const citizen = db.prepare('SELECT * FROM citizens WHERE LOWER(email) = ? OR phone = ?').get(cleanId, cleanId);

    if (!citizen || !comparePassword(password, citizen.password_hash)) {
      recordFailedLogin(clientIp);
      return res.status(401).json({ error: 'Invalid credentials. Please verify your email/phone and password.' });
    }

    recordSuccessfulLogin(clientIp);
    const token = generateToken({ id: citizen.id, email: citizen.email, name: citizen.name, type: 'citizen' });

    res.cookie('civic_citizen_token', token, getCookieOptions());

    res.json({
      message: 'Citizen login successful',
      token,
      citizen: {
        id: citizen.id,
        name: citizen.name,
        email: citizen.email,
        phone: citizen.phone,
        district: citizen.district,
        email_notifications: Boolean(citizen.email_notifications),
        sms_notifications: Boolean(citizen.sms_notifications)
      }
    });
  } catch (err) {
    console.error('[Citizen Login Error]:', err);
    res.status(500).json({ error: 'Login internal error' });
  }
});

// GET /api/auth/citizen/me
app.get('/api/auth/citizen/me', authenticateCitizen, (req, res) => {
  res.json({
    authenticated: true,
    citizen: req.citizen
  });
});

// POST /api/auth/citizen/logout
app.post('/api/auth/citizen/logout', (req, res) => {
  res.clearCookie('civic_citizen_token', getClearCookieOptions());
  res.json({ message: 'Citizen logged out successfully' });
});

// GET /api/citizen/profile
app.get('/api/citizen/profile', authenticateCitizen, (req, res) => {
  try {
    const c = db.prepare('SELECT id, name, email, phone, district, email_notifications, sms_notifications, whatsapp_notifications, sms_consent, whatsapp_consent, created_at FROM citizens WHERE id = ?').get(req.citizen.id);
    if (!c) return res.status(404).json({ error: 'Citizen not found' });
    res.json({ profile: c });
  } catch (err) {
    console.error('[Profile Fetch Error]:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/citizen/profile
app.put('/api/citizen/profile', authenticateCitizen, (req, res) => {
  try {
    const { name, phone, district, email_notifications, sms_notifications, whatsapp_notifications, sms_consent, whatsapp_consent } = req.body;
    
    db.prepare(`
      UPDATE citizens 
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          district = COALESCE(?, district),
          email_notifications = COALESCE(?, email_notifications),
          sms_notifications = COALESCE(?, sms_notifications),
          whatsapp_notifications = COALESCE(?, whatsapp_notifications),
          sms_consent = COALESCE(?, sms_consent),
          whatsapp_consent = COALESCE(?, whatsapp_consent),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || null,
      phone || null,
      district || null,
      email_notifications !== undefined ? (email_notifications ? 1 : 0) : null,
      sms_notifications !== undefined ? (sms_notifications ? 1 : 0) : null,
      whatsapp_notifications !== undefined ? (whatsapp_notifications ? 1 : 0) : null,
      sms_consent !== undefined ? (sms_consent ? 1 : 0) : null,
      whatsapp_consent !== undefined ? (whatsapp_consent ? 1 : 0) : null,
      req.citizen.id
    );

    const updated = db.prepare('SELECT id, name, email, phone, district, email_notifications, sms_notifications, whatsapp_notifications, sms_consent, whatsapp_consent FROM citizens WHERE id = ?').get(req.citizen.id);
    res.json({ message: 'Profile updated successfully', profile: updated });
  } catch (err) {
    console.error('[Profile Update Error]:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/auth/citizen/password-reset
app.post('/api/auth/citizen/password-reset', (req, res) => {
  try {
    const { email, phone, newPassword } = req.body;
    if (!email || !phone || !newPassword) {
      return res.status(400).json({ error: 'Email, registered phone number, and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.trim();

    const citizen = db.prepare('SELECT id FROM citizens WHERE LOWER(email) = ? AND phone = ?').get(cleanEmail, cleanPhone);
    if (!citizen) {
      return res.status(404).json({ error: 'No citizen account found with matching email and phone.' });
    }

    const newHash = hashPassword(newPassword);
    db.prepare('UPDATE citizens SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, citizen.id);

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('[Password Reset Error]:', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// GET /api/citizen/my-complaints (Private to authenticated citizen)
app.get('/api/citizen/my-complaints', authenticateCitizen, (req, res) => {
  try {
    const raw = db.prepare(`
      SELECT * FROM complaints 
      WHERE citizen_id = ? 
         OR (citizen_phone IS NOT NULL AND citizen_phone = ?) 
         OR (citizen_email IS NOT NULL AND LOWER(citizen_email) = ?)
      ORDER BY created_at DESC
    `).all(req.citizen.id, req.citizen.phone || '', (req.citizen.email || '').toLowerCase());

    const complaints = raw.map(c => parseComplaint(c, true));
    res.json({ count: complaints.length, complaints });
  } catch (err) {
    console.error('Error fetching citizen complaints:', err);
    res.status(500).json({ error: 'Failed to fetch personal complaints' });
  }
});

// -------------------------------------------------------------
// 3. ADMINISTRATOR & OFFICER AUTHENTICATION
// -------------------------------------------------------------

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection.remoteAddress || '127.0.0.1';
    const rateLimitKey = `${clientIp}:${cleanEmail}`;
    
    // Check Rate Limiter per client and targeted account
    const rateCheck = checkLoginRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: rateCheck.message });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE LOWER(email) = ?').get(cleanEmail);

    if (!admin || !comparePassword(password, admin.password_hash)) {
      recordFailedLogin(rateLimitKey);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Login successful
    recordSuccessfulLogin(rateLimitKey);

    const tokenPayload = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      district: admin.district,
      department: admin.department,
      designation: admin.designation
    };

    const token = generateToken(tokenPayload);

    // Set secure HTTP-only cookie
    res.cookie('civic_admin_token', token, getCookieOptions());

    res.json({
      message: 'Officer authentication successful',
      token,
      admin: tokenPayload
    });
  } catch (err) {
    console.error('[Admin Login Error]:', err);
    res.status(500).json({ error: 'Internal login error' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('civic_admin_token', getClearCookieOptions());
  res.json({ message: 'Officer logged out successfully' });
});

// GET /api/auth/me (Verify session)
app.get('/api/auth/me', authenticateAdmin, (req, res) => {
  res.json({
    authenticated: true,
    admin: req.admin
  });
});

// -------------------------------------------------------------
// 4. GRIEVANCE REGISTRY & TRACKING (PUBLIC & ADVANCED FILTERS)
// -------------------------------------------------------------

// GET /api/complaints
app.get('/api/complaints', (req, res) => {
  try {
    const { 
      search, category, priority, status, department, 
      district, local_body, ward, sla_status, limit = 100 
    } = req.query;

    let query = 'SELECT * FROM complaints WHERE 1=1';
    const params = [];

    if (search && search.trim() !== '') {
      query += ' AND (title LIKE ? OR description LIKE ? OR location LIKE ? OR ref_id LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (priority && priority !== 'All') {
      query += ' AND priority = ?';
      params.push(priority);
    }

    if (status && status !== 'All') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (department && department !== 'All') {
      query += ' AND department = ?';
      params.push(department);
    }

    if (district && district !== 'All') {
      query += ' AND district = ?';
      params.push(district);
    }

    if (local_body && local_body !== 'All') {
      query += ' AND local_body = ?';
      params.push(local_body);
    }

    if (ward && ward !== 'All') {
      query += ' AND ward = ?';
      params.push(ward);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const rawComplaints = db.prepare(query).all(...params);
    let complaints = rawComplaints.map(c => parseComplaint(c, false));

    // Filter by SLA status if requested
    if (sla_status && sla_status !== 'All') {
      if (sla_status === 'overdue') {
        complaints = complaints.filter(c => c.sla?.isOverdue);
      } else if (sla_status === 'due_soon') {
        complaints = complaints.filter(c => !c.sla?.isOverdue && c.sla?.remainingHours <= 12 && c.status !== 'Resolved');
      } else if (sla_status === 'on_time') {
        complaints = complaints.filter(c => !c.sla?.isOverdue && c.status !== 'Resolved');
      }
    }

    res.json({
      count: complaints.length,
      complaints
    });
  } catch (err) {
    console.error('Error fetching complaints:', err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// GET /api/complaints/track/:refId (Privacy-Safe Public Tracking)
app.get('/api/complaints/track/:refId', optionalCitizenAuth, (req, res) => {
  try {
    const refId = req.params.refId.trim().toUpperCase();
    const complaint = db.prepare('SELECT * FROM complaints WHERE UPPER(ref_id) = ?').get(refId);

    if (!complaint) {
      return res.status(404).json({ error: `No complaint found with Reference ID "${refId}"` });
    }

    // Check if requester is authorized citizen owner or admin
    let isAuthorized = false;
    if (req.citizen && (req.citizen.id === complaint.citizen_id || req.citizen.email.toLowerCase() === (complaint.citizen_email || '').toLowerCase())) {
      isAuthorized = true;
    }

    // Check if admin token is present in cookie or bearer
    const adminToken = req.cookies.civic_admin_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (adminToken) {
      const decoded = verifyToken(adminToken);
      if (decoded && (decoded.type === 'admin' || decoded.role)) {
        isAuthorized = true;
      }
    }

    res.json(parseComplaint(complaint, isAuthorized));
  } catch (err) {
    console.error('Error tracking complaint:', err);
    res.status(500).json({ error: 'Failed to track complaint' });
  }
});

// POST /api/complaints/track/:refId/verify-access (Verify Phone/Email to unmask private file)
app.post('/api/complaints/track/:refId/verify-access', (req, res) => {
  try {
    const { refId } = req.params;
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Registered email or phone number is required to verify ownership.' });
    }

    const cleanRef = refId.trim().toUpperCase();
    const c = db.prepare('SELECT * FROM complaints WHERE UPPER(ref_id) = ?').get(cleanRef);
    if (!c) {
      return res.status(404).json({ error: `Grievance ${cleanRef} not found.` });
    }

    const cred = credential.trim().toLowerCase();
    const emailMatch = c.citizen_email && c.citizen_email.toLowerCase() === cred;
    const phoneMatch = c.citizen_phone && (c.citizen_phone.replace(/\D/g, '') === cred.replace(/\D/g, ''));

    if (emailMatch || phoneMatch) {
      return res.json({
        verified: true,
        complaint: parseComplaint(c, true)
      });
    }

    res.status(401).json({ error: 'Verification failed: Credential does not match the contact details registered with this grievance.' });
  } catch (err) {
    console.error('[Track Verify Error]:', err);
    res.status(500).json({ error: 'Verification error' });
  }
});

// GET /api/complaints/:id
app.get('/api/complaints/:id', optionalCitizenAuth, (req, res) => {
  try {
    const idParam = req.params.id;
    let complaint;

    if (/^\d+$/.test(idParam)) {
      complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(parseInt(idParam, 10));
    }
    
    if (!complaint) {
      complaint = db.prepare('SELECT * FROM complaints WHERE ref_id = ?').get(idParam);
    }

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Check authorization
    let isAuthorized = false;
    if (req.citizen && (req.citizen.id === complaint.citizen_id || req.citizen.email.toLowerCase() === (complaint.citizen_email || '').toLowerCase())) {
      isAuthorized = true;
    }
    const adminToken = req.cookies.civic_admin_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (adminToken) {
      const decoded = verifyToken(adminToken);
      if (decoded && (decoded.type === 'admin' || decoded.role)) {
        isAuthorized = true;
      }
    }

    res.json(parseComplaint(complaint, isAuthorized));
  } catch (err) {
    console.error('Error fetching complaint details:', err);
    res.status(500).json({ error: 'Failed to fetch complaint details' });
  }
});

// POST /api/complaints (Multi-step Submission + Groq AI + SLA + Duplicate Detection + Notification)
app.post('/api/complaints', optionalCitizenAuth, upload.single('image'), async (req, res) => {
  try {
    const { 
      title, description, category, location, 
      district, local_body, ward, latitude, longitude, 
      isGpsVerified, language, citizen_name, citizen_phone, citizen_email 
    } = req.body;

    if (!title || !description || !category || !location) {
      return res.status(400).json({
        error: 'Missing required fields: title, description, category, and location are required.'
      });
    }

    if (title.length > 250) {
      return res.status(400).json({ error: 'Title cannot exceed 250 characters.' });
    }
    if (description.length < 10 || description.length > 4000) {
      return res.status(400).json({ error: 'Description must be between 10 and 4000 characters.' });
    }

    let imageUrl = null;
    let imagePath = null;
    let mimeType = null;

    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      imagePath = req.file.path;
      mimeType = req.file.mimetype;
    }

    const effectiveDistrict = district || 'Chennai';
    const effectiveLocalBody = local_body || 'Greater Chennai Corporation';
    const effectiveWard = ward || 'Zone 9 - Ward 114';
    const effectiveLang = language || 'en';

    // Citizen identity (from session or form)
    const citizenId = req.citizen ? req.citizen.id : null;
    const finalCitizenName = req.citizen ? req.citizen.name : (citizen_name || 'Citizen');
    const finalCitizenPhone = req.citizen ? req.citizen.phone : (citizen_phone || null);
    const finalCitizenEmail = req.citizen ? req.citizen.email : (citizen_email || null);

    // Call Google Gemini AI analysis (with deterministic heuristic fallback)
    const aiResult = await analyzeComplaintWithGemini({
      title,
      description,
      category,
      location,
      district: effectiveDistrict,
      imagePath,
      mimeType
    });

    const ref_id = generateRefId();
    const effectiveCategory = aiResult.ai_status === 'SUCCESS' ? aiResult.ai_category : category;
    const effectivePriority = aiResult.ai_status === 'SUCCESS' ? aiResult.ai_priority : 'Medium';
    const effectiveDepartment = aiResult.ai_department || 'Roads & Highways Department (TN Highways / PWD)';

    // Compute SLA target
    const targetSlaHours = getTargetSlaHours(effectivePriority, effectiveCategory);
    const nowIso = new Date().toISOString();
    const deadlineIso = new Date(Date.now() + targetSlaHours * 3600 * 1000).toISOString();

    const initialHistory = [
      {
        status: 'Submitted',
        timestamp: nowIso,
        note: `Grievance registered under ${effectiveDistrict} jurisdiction (Target SLA: ${targetSlaHours}h)`,
        actor: finalCitizenName ? `${finalCitizenName} (Citizen)` : 'Citizen'
      }
    ];

    if (aiResult.ai_status === 'SUCCESS') {
      const riskTags = Array.isArray(aiResult.risk_flags) ? aiResult.risk_flags.join(', ') : 'Standard';
      initialHistory.push({
        status: 'Under Review',
        timestamp: nowIso,
        note: `Google Gemini AI triage completed (Confidence: ${Math.round((aiResult.ai_confidence || 0.9) * 100)}%). Allocated to ${effectiveDepartment}. Risk flags: [${riskTags}]`,
        actor: 'CivicResolve AI Triage'
      });
    }

    const initialStatus = aiResult.ai_status === 'SUCCESS' ? 'Under Review' : 'Submitted';
    const hasCoordinates = (latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude)));
    const gpsFlag = (isGpsVerified === 'true' || isGpsVerified === true || isGpsVerified === 1) && hasCoordinates ? 1 : 0;

    // Check for potential duplicates
    const duplicates = findDuplicateCandidates({
      title,
      description,
      category: effectiveCategory,
      district: effectiveDistrict,
      ward: effectiveWard,
      latitude: hasCoordinates ? parseFloat(latitude) : null,
      longitude: hasCoordinates ? parseFloat(longitude) : null
    });

    const insert = db.prepare(`
      INSERT INTO complaints (
        ref_id, title, description, category, location, latitude, longitude,
        image_url, status, priority, department,
        ai_summary, ai_category, ai_priority, ai_department, ai_confidence,
        ai_reason, ai_safety_risk, ai_recommended_action, ai_suggested_response_time,
        ai_status, resolution_remarks, status_history, is_gps_verified,
        district, local_body, ward, citizen_id, citizen_name, citizen_phone, citizen_email,
        sla_hours, sla_deadline, language,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, NULL, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `);

    const result = insert.run(
      ref_id,
      title.trim(),
      description.trim(),
      effectiveCategory,
      location.trim(),
      hasCoordinates ? parseFloat(latitude) : null,
      hasCoordinates ? parseFloat(longitude) : null,
      imageUrl,
      initialStatus,
      effectivePriority,
      effectiveDepartment,
      aiResult.ai_summary,
      aiResult.ai_category,
      aiResult.ai_priority,
      aiResult.ai_department,
      aiResult.ai_confidence,
      aiResult.ai_reason,
      aiResult.ai_safety_risk,
      aiResult.ai_recommended_action,
      aiResult.ai_suggested_response_time,
      aiResult.ai_status,
      JSON.stringify(initialHistory),
      gpsFlag,
      effectiveDistrict,
      effectiveLocalBody,
      effectiveWard,
      citizenId,
      finalCitizenName,
      finalCitizenPhone,
      finalCitizenEmail,
      targetSlaHours,
      deadlineIso,
      effectiveLang
    );

    const created = db.prepare('SELECT * FROM complaints WHERE id = ?').get(result.lastInsertRowid);

    // In-App Notification
    createNotification(
      'citizen',
      citizenId,
      ref_id,
      `Grievance Registered: ${ref_id}`,
      `Your report "${title.slice(0, 60)}..." has been submitted to ${effectiveDistrict} administration. Reference ID: ${ref_id}`
    );

    // Multi-Channel Dispatch (Email / SMS)
    notifyCitizenEvent({
      eventType: 'submission_acknowledgement',
      citizenName: finalCitizenName,
      citizenEmail: finalCitizenEmail,
      citizenPhone: finalCitizenPhone,
      refId: ref_id,
      grievanceTitle: title,
      status: initialStatus,
      details: {
        category: effectiveCategory,
        district: effectiveDistrict,
        ward: effectiveWard,
        department: effectiveDepartment,
        slaHours: targetSlaHours
      }
    });

    invalidateStatsCache();

    res.status(201).json({
      message: 'Complaint submitted and analyzed successfully',
      complaint: parseComplaint(created, true),
      duplicates
    });
  } catch (err) {
    console.error('Error submitting complaint:', err);
    res.status(500).json({ error: err.message || 'Failed to submit complaint' });
  }
});

// -------------------------------------------------------------
// 5. CITIZEN FEEDBACK & APPEALS WORKFLOW
// -------------------------------------------------------------

// POST /api/complaints/:id/feedback
app.post('/api/complaints/:id/feedback', optionalCitizenAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback, credential } = req.body;

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    // Enforce ownership: citizen token or matching credential
    let isOwner = false;
    if (req.citizen) {
      if (req.citizen.id === complaint.citizen_id ||
          (req.citizen.phone && req.citizen.phone === complaint.citizen_phone) ||
          (req.citizen.email && req.citizen.email.toLowerCase() === (complaint.citizen_email || '').toLowerCase())) {
        isOwner = true;
      }
    }
    const cred = (credential || req.body.phone || req.body.email || '').trim().toLowerCase();
    if (!isOwner && cred) {
      const emailMatch = complaint.citizen_email && complaint.citizen_email.toLowerCase() === cred;
      const phoneMatch = complaint.citizen_phone && (complaint.citizen_phone.replace(/\D/g, '') === cred.replace(/\D/g, ''));
      if (emailMatch || phoneMatch) isOwner = true;
    }

    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied: Only the citizen who registered this grievance can submit feedback.' });
    }

    db.prepare(`
      UPDATE complaints 
      SET citizen_rating = ?, citizen_feedback = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR ref_id = ?
    `).run(rating || 5, feedback || null, id, id);

    res.json({ message: 'Thank you! Your feedback has been recorded.' });
  } catch (err) {
    console.error('[Feedback Record Error]:', err);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// POST /api/complaints/:id/appeal (Citizen requests reopening)
app.post('/api/complaints/:id/appeal', optionalCitizenAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { appeal_reason, reason, credential } = req.body;
    const finalReason = (appeal_reason || reason || '').trim();

    if (!finalReason || finalReason.length < 10) {
      return res.status(400).json({ error: 'Please explain why the resolution was unsatisfactory (min 10 characters).' });
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    // Enforce ownership: citizen token or matching credential
    let isOwner = false;
    if (req.citizen) {
      if (req.citizen.id === complaint.citizen_id ||
          (req.citizen.phone && req.citizen.phone === complaint.citizen_phone) ||
          (req.citizen.email && req.citizen.email.toLowerCase() === (complaint.citizen_email || '').toLowerCase())) {
        isOwner = true;
      }
    }
    const cred = (credential || req.body.phone || req.body.email || '').trim().toLowerCase();
    if (!isOwner && cred) {
      const emailMatch = complaint.citizen_email && complaint.citizen_email.toLowerCase() === cred;
      const phoneMatch = complaint.citizen_phone && (complaint.citizen_phone.replace(/\D/g, '') === cred.replace(/\D/g, ''));
      if (emailMatch || phoneMatch) isOwner = true;
    }

    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied: Only the citizen who registered this grievance can request an appeal / reopening.' });
    }

    const parsed = parseComplaint(complaint, true);
    const history = parsed.status_history || [];

    history.push({
      status: 'Under Review',
      timestamp: new Date().toISOString(),
      note: `Citizen submitted appeal / reopen request: "${finalReason}"`,
      actor: complaint.citizen_name ? `${complaint.citizen_name} (Citizen)` : 'Citizen'
    });

    db.prepare(`
      UPDATE complaints 
      SET status = 'Under Review',
          is_appealed = 1,
          appeal_reason = ?,
          reopen_count = COALESCE(reopen_count, 0) + 1,
          status_history = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR ref_id = ?
    `).run(finalReason, JSON.stringify(history), id, id);

    createNotification(
      'admin',
      null,
      complaint.ref_id,
      `Appeal Filed: ${complaint.ref_id}`,
      `Citizen has appealed resolution for ${complaint.ref_id}. Reason: "${finalReason.slice(0, 80)}..."`
    );

    // Notify citizen that appeal has been registered
    notifyCitizenEvent({
      eventType: 'appeal_update',
      citizenName: complaint.citizen_name,
      citizenEmail: complaint.citizen_email,
      citizenPhone: complaint.citizen_phone,
      refId: complaint.ref_id,
      grievanceTitle: complaint.title,
      status: 'Under Review',
      details: {
        remarks: finalReason
      }
    });

    const updated = db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);
    invalidateStatsCache();
    res.json({ message: 'Appeal submitted successfully. Escalated for senior officer review.', complaint: parseComplaint(updated, true) });
  } catch (err) {
    console.error('[Appeal Submit Error]:', err);
    res.status(500).json({ error: 'Failed to submit appeal' });
  }
});

// -------------------------------------------------------------
// 6. DEDICATED OFFICER PORTAL ENDPOINTS
// -------------------------------------------------------------

// GET /api/officer/tasks (Assigned Tasks for Logged-In Officer)
app.get('/api/officer/tasks', authenticateAdmin, (req, res) => {
  try {
    const officer = req.admin;
    const isSuperAdmin = officer.role === 'super_admin';
    let query = 'SELECT * FROM complaints WHERE 1=1';
    const params = [];

    if (!isSuperAdmin) {
      query += ' AND (assigned_officer LIKE ? OR department = ? OR district = ?)';
      params.push(`%${officer.name}%`, officer.department, officer.district);
    }

    query += " ORDER BY CASE priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END, created_at DESC";
    const raw = db.prepare(query).all(...params);
    const parsed = raw.map(c => parseComplaint(c, true));

    const pending = parsed.filter(c => c.status === 'Submitted' || c.status === 'Under Review');
    const assigned = parsed.filter(c => c.status === 'Assigned');
    const inProgress = parsed.filter(c => c.status === 'In Progress');
    const resolved = parsed.filter(c => c.status === 'Resolved');
    const overdue = parsed.filter(c => c.sla?.isOverdue && c.status !== 'Resolved');

    res.json({
      total: parsed.length,
      counts: {
        all: parsed.length,
        pending: pending.length,
        assigned: assigned.length,
        inProgress: inProgress.length,
        resolved: resolved.length,
        overdue: overdue.length
      },
      tasks: parsed
    });
  } catch (err) {
    console.error('Error fetching officer tasks:', err);
    res.status(500).json({ error: 'Failed to fetch officer tasks' });
  }
});

// POST /api/officer/tasks/:id/report (Officer Updates Task, Remarks & Resolution Evidence)
app.post('/api/officer/tasks/:id/report', authenticateAdmin, upload.single('evidence'), (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, internalNotes } = req.body;
    const evidenceUrl = req.file ? `/uploads/${req.file.filename}` : req.body.evidenceUrl;

    const current = db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);
    if (!current) return res.status(404).json({ error: 'Complaint not found' });

    const newStatus = status || 'In Progress';
    const nowIso = new Date().toISOString();
    const parsedCurrent = parseComplaint(current, true);
    let history = parsedCurrent.status_history || [];

    history.push({
      status: newStatus,
      timestamp: nowIso,
      note: remarks || `Field report filed by ${req.admin.name} (${req.admin.designation || 'Officer'})`,
      actor: `${req.admin.name} (${req.admin.designation || 'Officer'})`
    });

    db.prepare(`
      UPDATE complaints 
      SET status = ?,
          resolution_remarks = COALESCE(?, resolution_remarks),
          resolution_evidence_url = COALESCE(?, resolution_evidence_url),
          internal_notes = COALESCE(?, internal_notes),
          status_history = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR ref_id = ?
    `).run(
      newStatus,
      remarks || null,
      evidenceUrl || null,
      internalNotes || null,
      JSON.stringify(history),
      id,
      id
    );

    const updated = db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);

    // Notify citizen
    notifyCitizenEvent({
      eventType: newStatus === 'Resolved' ? 'resolution_certified' : 'status_update',
      citizenName: updated.citizen_name,
      citizenEmail: updated.citizen_email,
      citizenPhone: updated.citizen_phone,
      refId: updated.ref_id,
      grievanceTitle: updated.title,
      status: newStatus,
      details: {
        remarks,
        evidenceUrl,
        officer: req.admin.name
      }
    });

    res.json({ message: 'Field report saved successfully', complaint: parseComplaint(updated, true) });
  } catch (err) {
    console.error('Error submitting officer report:', err);
    res.status(500).json({ error: 'Failed to submit officer report' });
  }
});

// -------------------------------------------------------------
// 7. NOTIFICATIONS INBOX & DELIVERY AUDIT LOGS
// -------------------------------------------------------------
app.get('/api/notifications', (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      ORDER BY created_at DESC 
      LIMIT 20
    `).all();
    res.json({ notifications });
  } catch (err) {
    console.error('[Notifications Fetch Error]:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.patch('/api/notifications/:id/read', (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[Notification Mark Error]:', err);
    res.status(500).json({ error: 'Failed to mark notification' });
  }
});

// GET /api/admin/notifications/logs (Real-Time Notification Delivery Logs)
app.get('/api/admin/notifications/logs', authenticateAdmin, (req, res) => {
  try {
    const { channel, status, search, limit = 50 } = req.query;
    let query = 'SELECT * FROM notification_logs WHERE 1=1';
    const params = [];

    if (channel && channel !== 'All') {
      query += ' AND channel = ?';
      params.push(channel);
    }
    if (status && status !== 'All') {
      query += ' AND status = ?';
      params.push(status);
    }
    if (search && search.trim() !== '') {
      query += ' AND (recipient LIKE ? OR ref_id LIKE ? OR subject LIKE ?)';
      const t = `%${search.trim()}%`;
      params.push(t, t, t);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const logs = db.prepare(query).all(...params);
    res.json({ logs });
  } catch (err) {
    console.error('[Notification Logs Fetch Error]:', err);
    res.status(500).json({ error: 'Failed to fetch notification logs' });
  }
});

// POST /api/admin/notifications/test-email (Live SMTP Test)
app.post('/api/admin/notifications/test-email', authenticateAdmin, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to || !to.includes('@')) {
      return res.status(400).json({ error: 'A valid recipient email address is required.' });
    }

    const result = await testSmtpConnection(to, req.admin.name);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'SMTP test error' });
  }
});

// POST /api/admin/notifications/:id/retry (Retry Notification)
app.post('/api/admin/notifications/:id/retry', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await retryNotificationLog(parseInt(id, 10));
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Notification retry error' });
  }
});

// -------------------------------------------------------------
// 8. PROTECTED OFFICER WORKFLOWS (AUTH REQUIRED)
// -------------------------------------------------------------

// PATCH /api/complaints/:id/manage
app.patch('/api/complaints/:id/manage', authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { 
      category, department, status, resolution_remarks, priority,
      assigned_officer, internal_notes, resolution_evidence_url, sla_hours,
      duplicate_of_ref_id
    } = req.body;

    const allowedStatuses = [
      'Submitted', 'Acknowledged', 'Under AI Analysis', 'Forwarded to Department',
      'Assigned to Officer', 'Assigned', 'Under Review', 'Under Investigation',
      'Action in Progress', 'In Progress', 'Awaiting Citizen Information',
      'Evidence Submitted', 'Supervisor Review', 'Resolved', 'Closed', 'Reopened', 'Rejected'
    ];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
    }

    const current = db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);
    if (!current) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const parsedCurrent = parseComplaint(current, true);
    let history = parsedCurrent.status_history || [];

    const nowIso = new Date().toISOString();
    const newStatus = status || current.status;
    const newDept = department || current.department;
    const newCategory = category || current.category;
    const newPriority = priority || current.priority;
    const newRemarks = resolution_remarks !== undefined ? resolution_remarks : current.resolution_remarks;
    const newOfficer = assigned_officer !== undefined ? assigned_officer : current.assigned_officer;
    const newNotes = internal_notes !== undefined ? internal_notes : current.internal_notes;
    const newEvidence = resolution_evidence_url !== undefined ? resolution_evidence_url : current.resolution_evidence_url;
    const newSlaHours = sla_hours !== undefined ? parseInt(sla_hours, 10) : current.sla_hours;
    const newDupId = duplicate_of_ref_id !== undefined ? duplicate_of_ref_id : current.duplicate_of_ref_id;

    // Build timeline change note
    const changes = [];
    if (status && status !== current.status) {
      changes.push(`Status transitioned to "${status}"`);
    }
    if (department && department !== current.department) {
      changes.push(`Department reallocated to "${department}"`);
    }
    if (assigned_officer && assigned_officer !== current.assigned_officer) {
      changes.push(`Field officer assigned: "${assigned_officer}"`);
    }
    if (category && category !== current.category) {
      changes.push(`Category updated to "${category}"`);
    }
    if (resolution_remarks && resolution_remarks !== current.resolution_remarks) {
      changes.push(`Official Remarks: "${resolution_remarks}"`);
    }

    const noteText = changes.length > 0 
      ? changes.join('. ') 
      : (resolution_remarks || 'Updated by Municipal Officer');

    const adminActorName = req.admin 
      ? `${req.admin.name} (${req.admin.designation || 'Officer'})` 
      : 'Municipal Officer';

    history.push({
      status: newStatus,
      timestamp: nowIso,
      note: noteText,
      actor: adminActorName
    });

    const update = db.prepare(`
      UPDATE complaints 
      SET category = ?,
          department = ?,
          status = ?,
          priority = ?,
          resolution_remarks = ?,
          assigned_officer = ?,
          internal_notes = ?,
          resolution_evidence_url = ?,
          sla_hours = ?,
          duplicate_of_ref_id = ?,
          status_history = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR ref_id = ?
    `);

    update.run(
      newCategory,
      newDept,
      newStatus,
      newPriority,
      newRemarks,
      newOfficer,
      newNotes,
      newEvidence,
      newSlaHours,
      newDupId,
      JSON.stringify(history),
      id,
      id
    );

    const updated = db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);

    // Multi-Channel Notification to citizen
    notifyCitizenEvent({
      eventType: newStatus === 'Resolved' ? 'resolution_certified' : 'status_update',
      citizenName: updated.citizen_name,
      citizenEmail: updated.citizen_email,
      citizenPhone: updated.citizen_phone,
      refId: updated.ref_id,
      grievanceTitle: updated.title,
      status: newStatus,
      details: {
        remarks: newRemarks,
        evidenceUrl: newEvidence,
        department: newDept,
        officer: newOfficer
      }
    });

    invalidateStatsCache();

    res.json({
      message: 'Complaint successfully updated by officer',
      complaint: parseComplaint(updated, true)
    });
  } catch (err) {
    console.error('Error managing complaint:', err);
    res.status(500).json({ error: 'Failed to update complaint' });
  }
});

// PATCH /api/complaints/:id/status
app.patch('/api/complaints/:id/status', authenticateAdmin, (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const allowedStatuses = [
      'Submitted', 'Acknowledged', 'Under AI Analysis', 'Forwarded to Department',
      'Assigned to Officer', 'Assigned', 'Under Review', 'Under Investigation',
      'Action in Progress', 'In Progress', 'Awaiting Citizen Information',
      'Evidence Submitted', 'Supervisor Review', 'Resolved', 'Closed', 'Reopened', 'Rejected'
    ];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
    }

    const current = db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);
    if (!current) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const parsedCurrent = parseComplaint(current, true);
    let history = parsedCurrent.status_history || [];
    const adminActorName = req.admin ? `${req.admin.name} (Officer)` : 'Municipal Officer';

    history.push({
      status,
      timestamp: new Date().toISOString(),
      note: `Status updated to ${status}`,
      actor: adminActorName
    });

    db.prepare(`
      UPDATE complaints 
      SET status = ?, status_history = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? OR ref_id = ?
    `).run(status, JSON.stringify(history), id, id);

    const updated = db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);

    notifyCitizenEvent({
      eventType: status === 'Resolved' ? 'resolution_certified' : 'status_update',
      citizenName: updated.citizen_name,
      citizenEmail: updated.citizen_email,
      citizenPhone: updated.citizen_phone,
      refId: updated.ref_id,
      grievanceTitle: updated.title,
      status,
      details: {
        remarks: `Status updated to ${status}`
      }
    });

    invalidateStatsCache();

    res.json({ message: 'Status updated successfully', complaint: parseComplaint(updated, true) });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// GET /api/admin/duplicates/:id (Inspect duplicate candidates for a complaint)
app.get('/api/admin/duplicates/:id', authenticateAdmin, (req, res) => {
  try {
    const target = db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(req.params.id, req.params.id);
    if (!target) return res.status(404).json({ error: 'Complaint not found' });

    const duplicates = findDuplicateCandidates({
      title: target.title,
      description: target.description,
      category: target.category,
      district: target.district,
      ward: target.ward,
      latitude: target.latitude,
      longitude: target.longitude,
      excludeId: target.id
    });

    res.json({ duplicates });
  } catch (err) {
    console.error('[Duplicate Scan Error]:', err);
    res.status(500).json({ error: 'Failed to find duplicates' });
  }
});

// POST /api/admin/link-duplicate (Link complaint to primary incident)
app.post('/api/admin/link-duplicate', authenticateAdmin, (req, res) => {
  try {
    const { primaryRefId, duplicateRefId } = req.body;
    if (!primaryRefId || !duplicateRefId) {
      return res.status(400).json({ error: 'Both primaryRefId and duplicateRefId are required.' });
    }

    db.prepare(`
      UPDATE complaints 
      SET duplicate_of_ref_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE ref_id = ?
    `).run(primaryRefId, duplicateRefId);

    invalidateStatsCache();

    res.json({ message: `Complaint ${duplicateRefId} linked to primary incident ${primaryRefId}` });
  } catch (err) {
    console.error('[Link Duplicate Error]:', err);
    res.status(500).json({ error: 'Failed to link duplicate' });
  }
});

// -------------------------------------------------------------
// 9. DASHBOARD STATISTICS & CIVIC ANALYTICS
// -------------------------------------------------------------

app.get('/api/dashboard/stats', (req, res) => {
  try {
    const { district } = req.query;
    const cacheKey = district || 'all';
    const cached = getCachedStats(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (district && district !== 'All' && district !== 'Statewide') {
      whereClause += ' AND district = ?';
      params.push(district);
    }

    // Consolidated single-pass aggregation query for maximum efficiency
    const countsRow = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('Submitted', 'Under Review') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as high_priority,
        SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN status IN ('Assigned', 'In Progress') THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status != 'Resolved' AND sla_deadline IS NOT NULL AND datetime('now') > datetime(sla_deadline) THEN 1 ELSE 0 END) as overdue
      FROM complaints ${whereClause}
    `).get(...params) || {};

    // Distinct departments with counts
    const departments = db.prepare(`
      SELECT department, COUNT(*) as count 
      FROM complaints 
      ${whereClause} AND department IS NOT NULL AND department != ''
      GROUP BY department
      ORDER BY count DESC
    `).all(...params);

    // District distribution
    const districtRows = db.prepare(`
      SELECT district, COUNT(*) as count 
      FROM complaints 
      ${whereClause}
      GROUP BY district 
      ORDER BY count DESC
    `).all(...params);

    // Category distribution
    const categoryRows = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM complaints 
      ${whereClause}
      GROUP BY category 
      ORDER BY count DESC
    `).all(...params);

    // Priority distribution
    const priorityRows = db.prepare(`
      SELECT priority, COUNT(*) as count 
      FROM complaints 
      ${whereClause}
      GROUP BY priority
      ORDER BY CASE 
        WHEN priority = 'Critical' THEN 1
        WHEN priority = 'High' THEN 2
        WHEN priority = 'Medium' THEN 3
        WHEN priority = 'Low' THEN 4
        ELSE 5 END
    `).all(...params);

    const total = countsRow.total || 0;
    const resolved = countsRow.resolved || 0;
    const slaRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const payload = {
      totalComplaints: total,
      pendingComplaints: countsRow.pending || 0,
      highPriorityComplaints: countsRow.high_priority || 0,
      criticalComplaints: countsRow.critical || 0,
      inProgressComplaints: countsRow.in_progress || 0,
      resolvedComplaints: resolved,
      overdueComplaints: countsRow.overdue || 0,
      resolutionRate: slaRate,
      slaResolutionRate: `${slaRate}%`,
      departments,
      districts: districtRows,
      districtDistribution: districtRows,
      categoryDistribution: categoryRows,
      priorityDistribution: priorityRows
    };

    setCachedStats(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// -------------------------------------------------------------
// 10. ANNOUNCEMENTS, AUDIT LOGS, REVERSE GEOCODE & RECEIPTS
// -------------------------------------------------------------

// GET /api/announcements (Public active announcements)
app.get('/api/announcements', (req, res) => {
  try {
    const announcements = db.prepare(`
      SELECT id, title, title_ta, content, content_ta, category, priority, department, created_at
      FROM announcements
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT 10
    `).all();
    res.json({ announcements });
  } catch (err) {
    console.error('[Announcements Fetch Error]:', err);
    res.status(500).json({ error: 'Failed to fetch public announcements' });
  }
});

// POST /api/admin/announcements (Authorized Admin announcement creation)
app.post('/api/admin/announcements', authenticateAdmin, (req, res) => {
  try {
    const { title, title_ta, content, content_ta, category, priority, department } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    const insert = db.prepare(`
      INSERT INTO announcements (title, title_ta, content, content_ta, category, priority, department, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      title_ta || title.trim(),
      content.trim(),
      content_ta || content.trim(),
      category || 'Public Notice',
      priority || 'Normal',
      department || req.admin.department || 'Municipal Administration',
      req.admin.name
    );

    recordAuditLog({
      complaintRef: null,
      actorId: req.admin.id,
      actorName: req.admin.name,
      actorRole: req.admin.role,
      action: 'PUBLISH_ANNOUNCEMENT',
      newState: title,
      remarks: `Published announcement #${insert.lastInsertRowid}`,
      ip: req.ip
    });

    res.status(201).json({ success: true, message: 'Announcement published successfully.' });
  } catch (err) {
    console.error('[Create Announcement Error]:', err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// DELETE /api/admin/announcements/:id (Admin announcement removal)
app.delete('/api/admin/announcements/:id', authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT id, title FROM announcements WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    db.prepare('DELETE FROM announcements WHERE id = ?').run(id);

    recordAuditLog({
      complaintRef: null,
      actorId: req.admin.id,
      actorName: req.admin.name,
      actorRole: req.admin.role,
      action: 'DELETE_ANNOUNCEMENT',
      newState: `Announcement ${id} deleted`,
      remarks: `Admin removed announcement #${id} ("${existing.title}")`,
      ip: req.ip
    });

    res.json({ success: true, message: 'Announcement removed successfully.' });
  } catch (err) {
    console.error('[Delete Announcement Error]:', err);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// GET /api/admin/audit-logs (Authorized Admin Audit Trails)
app.get('/api/admin/audit-logs', authenticateAdmin, (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const logs = db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ?
    `).all(parseInt(limit, 10));
    res.json({ logs });
  } catch (err) {
    console.error('[Audit Logs Error]:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/geocode/reverse (Reverse Geocoding Proxy with Fallback)
app.get('/api/geocode/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and Longitude are required.' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // If Google Maps API Key is configured on server
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    if (googleKey && !googleKey.includes('your_')) {
      try {
        const gRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleKey}`);
        const gData = await gRes.json();
        if (gData.status === 'OK' && gData.results && gData.results[0]) {
          return res.json({
            address: gData.results[0].formatted_address,
            provider: 'Google Maps'
          });
        }
      } catch (e) {
        console.warn('[Google Geocode Notice]:', e.message);
      }
    }

    // OpenStreetMap Nominatim Fallback
    try {
      const osmRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
        headers: { 'User-Agent': 'CivicResolve-GrievancePortal/2.5 (contact@civicresolve.gov)' }
      });
      if (osmRes.ok) {
        const osmData = await osmRes.json();
        if (osmData && osmData.display_name) {
          return res.json({
            address: osmData.display_name,
            provider: 'OpenStreetMap'
          });
        }
      }
    } catch {}

    // Graceful Tamil Nadu coordinate area fallback
    return res.json({
      address: `Geotagged Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      provider: 'GPS Coordinates'
    });
  } catch (err) {
    console.error('[Reverse Geocode Error]:', err);
    res.status(500).json({ error: 'Failed to reverse geocode location' });
  }
});

// GET /api/complaints/:refId/receipt (Official Complaint Acknowledgement Receipt)
app.get('/api/complaints/:refId/receipt', optionalCitizenAuth, (req, res) => {
  try {
    const { refId } = req.params;
    const complaint = db.prepare('SELECT * FROM complaints WHERE ref_id = ?').get(refId);
    if (!complaint) {
      return res.status(404).json({ error: 'Grievance record not found.' });
    }

    const isAuthorized = Boolean(
      (req.admin) || 
      (req.citizen && complaint.citizen_id === req.citizen.id) ||
      (req.citizen && complaint.citizen_phone === req.citizen.phone)
    );

    const parsed = parseComplaint(complaint, isAuthorized);

    res.json({
      receipt: {
        system: 'CivicResolve Municipal Redressal Platform',
        state: 'Tamil Nadu Municipal Administration',
        ref_id: parsed.ref_id,
        filing_date: parsed.created_at,
        title: parsed.title,
        description: parsed.description,
        category: parsed.category,
        district: parsed.district || 'Chennai',
        ward: parsed.ward || 'General Ward',
        location: parsed.location,
        status: parsed.status,
        priority: parsed.priority,
        sla_hours: parsed.sla_hours || 24,
        sla_deadline: parsed.sla_deadline,
        citizen_name: parsed.citizen_name,
        citizen_phone: parsed.citizen_phone,
        department: parsed.department || 'Municipal Operations',
        assigned_officer: parsed.assigned_officer || 'Supervising Field Engineer',
        verification_code: `CR-VERIFIED-${Math.abs(parsed.ref_id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0))}`
      }
    });
  } catch (err) {
    console.error('[Receipt Error]:', err);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

// Global Generic Error Handler
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err.message && err.message.startsWith('CORS error:')) {
    return res.status(403).json({ error: err.message });
  }
  console.error('[Unhandled Server Error]:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'An internal server error occurred.' : err.message
  });
});

const PORT = process.env.PORT || 5000;

// Start Server
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CivicResolve Server] Live on http://127.0.0.1:${PORT} (0.0.0.0)`);
    console.log(`[CivicResolve Server] AI Engine: Google Gemini (${process.env.GEMINI_MODEL || 'gemini-2.5-flash'})`);
    console.log(`[CivicResolve Server] SMS Provider: ${isSmsConfigured() ? (process.env.SMS_PROVIDER || 'Twilio') : 'SAFE DEVELOPMENT SIMULATION'}`);
    console.log(`[CivicResolve Server] SMTP Email Delivery: ${isSmtpConfigured() ? 'CONFIGURED' : 'UNCONFIGURED'}`);
  });
}

module.exports = app;
