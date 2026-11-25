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
  authenticateAnyUser,
  requireRole,
  generateSecureOtp,
  hashOtp,
  normalizePhone,
  findCitizenByPhone,
  revokeToken
} = require('./auth');
const { computeSlaMetrics, getTargetSlaHours } = require('./sla-engine');
const { findDuplicateCandidates } = require('./duplicate-engine');
const {
  saveUserProfilePhoto,
  removeUserProfilePhoto,
  getUserProfilePhoto,
  handleAvatarUpload
} = require('./profilePhotoService');
const {
  getPublicVapidState,
  registerPushSubscription,
  removePushSubscription,
  getUserPushStatus
} = require('./pushService');
const {
  sendSms,
  sendComplaintRegistrationSms,
  sendComplaintResolutionSms,
  notifyCitizenEvent,
  createInAppNotification,
  retryNotificationLog,
  testEmailConnection,
  testSmtpConnection,
  isResendConfigured,
  isSmtpConfigured,
  isSmsConfigured,
  isWhatsAppConfigured
} = require('./notifications');
const { TAMIL_NADU_DISTRICTS, TN_CIVIC_DEPARTMENTS } = require('./data/tamilnadu-geo');
const { reverseGeocodeLocation, checkGeocodeRateLimit } = require('./geocoding-service');
const { determineMunicipalJurisdiction, validateTamilNaduMembership } = require('./gis-engine');

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
  'https://civicresolve-frontend.onrender.com',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : []),
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []),
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
    'X-Portal-Context',
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

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// CSRF & Exact Origin Validation for Mutation Requests
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const hasCookieAuth = !!(req.cookies && (req.cookies.civic_admin_token || req.cookies.civic_citizen_token));

  if (hasCookieAuth) {
    if (origin) {
      const cleanOrigin = origin.trim().replace(/\/$/, '');
      const isAllowed = allowedOrigins.some(allowed => allowed.toLowerCase() === cleanOrigin.toLowerCase()) ||
        (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin));
      if (!isAllowed) {
        return res.status(403).json({ error: 'CSRF security violation: Origin not authorized for state-changing request.' });
      }
    } else if (referer) {
      try {
        const refUrl = new URL(referer);
        const refOrigin = refUrl.origin.toLowerCase();
        const isAllowed = allowedOrigins.some(allowed => allowed.toLowerCase() === refOrigin) ||
          (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(refOrigin));
        if (!isAllowed) {
          return res.status(403).json({ error: 'CSRF security violation: Referer not authorized for state-changing request.' });
        }
      } catch {
        return res.status(403).json({ error: 'CSRF security violation: Malformed Referer header.' });
      }
    }
  }

  next();
});

// Cache-Control Security Policy: Ensure sensitive routes are never cached by intermediate proxies
app.use((req, res, next) => {
  const sensitivePrefixes = ['/api/auth', '/api/citizen', '/api/admin', '/api/notifications', '/api/push/status'];
  if (sensitivePrefixes.some(prefix => req.path.startsWith(prefix)) || req.method !== 'GET') {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

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
app.get('/', async (req, res) => {
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
app.get('/health', async (req, res) => {
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

    const dbCheck = await db.prepare('SELECT 1 as test').get();
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
  if (!name || typeof name !== 'string') return 'Citizen';
  const clean = name.trim();
  if (!clean || clean.toLowerCase() === 'citizen') return 'Citizen';
  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    const w = parts[0];
    return w.length > 2 ? `${w.slice(0, 2)}****` : `${w[0]}*`;
  }
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first.slice(0, 2)}*** ${last[0]}.`;
}

function maskPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length <= 4) return '******';
  const last10 = digits.slice(-10);
  if (last10.length === 10) {
    return `+91-******${last10.slice(-4)}`;
  }
  return `${digits.slice(0, 2)}******${digits.slice(-2)}`;
}

function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return null;
  const [user, domain] = email.trim().split('@');
  if (!domain) return '••••@••••';
  const maskedUser = user.length <= 2
    ? user[0] + '***'
    : user.slice(0, 2) + '***' + user.slice(-1);
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
    base.citizen_id = null; // Zero correlation across public grievances
    base.internal_notes = null; // Hide confidential officer notes from public
    base.ai_reason = null;
    base.ai_safety_risk = null;
    base.ai_recommended_action = null;
    base.verification_otp = null;
    base.otp_expires_at = null;
    if (Array.isArray(base.status_history)) {
      base.status_history = base.status_history.map(h => {
        let actor = h.actor || 'System';
        if (actor.toLowerCase().includes('citizen')) {
          actor = 'Citizen (Verified)';
        }
        return { ...h, actor };
      });
    }
  }

  return base;
}

// Helper to generate a lean, privacy-conscious complaint summary for lists & public explorer
function parseComplaintSummary(c, isAuthorized = false) {
  if (!c) return null;
  const sla = computeSlaMetrics(c);

  return {
    id: c.id,
    ref_id: c.ref_id,
    title: c.title,
    description: c.description,
    category: c.category,
    location: c.location,
    latitude: c.latitude,
    longitude: c.longitude,
    image_url: c.image_url,
    status: c.status,
    priority: c.priority,
    department: c.department,
    district: c.district,
    local_body: c.local_body,
    ward: c.ward,
    zone: c.zone,
    is_gps_verified: Boolean(c.is_gps_verified),
    location_accuracy: c.location_accuracy,
    detection_method: c.detection_method,
    jurisdiction_source: c.jurisdiction_source,
    created_at: c.created_at,
    updated_at: c.updated_at,
    resolution_remarks: c.resolution_remarks,
    sla_hours: c.sla_hours,
    sla_deadline: c.sla_deadline,
    citizen_name: isAuthorized ? c.citizen_name : maskName(c.citizen_name),
    citizen_phone: isAuthorized ? c.citizen_phone : maskPhone(c.citizen_phone),
    citizen_email: isAuthorized ? c.citizen_email : maskEmail(c.citizen_email),
    citizen_rating: c.citizen_rating,
    sla
  };
}

// Helper to record in-app notification in database
async function createNotification(recipientType, recipientId, refId, title, message, options = {}) {
  return createInAppNotification({
    recipientType,
    recipientId,
    refId,
    title,
    message,
    eventType: options.eventType || 'grievance_update',
    actionUrl: options.actionUrl || null
  });
}

// Safely resolve owning citizen ID for a complaint
async function resolveComplaintCitizenId(complaint) {
  if (!complaint) return null;
  if (complaint.citizen_id) return complaint.citizen_id;
  try {
    if (complaint.citizen_email) {
      const row = await db.prepare('SELECT id FROM citizens WHERE LOWER(email) = ? LIMIT 1').get(complaint.citizen_email.toLowerCase().trim());
      if (row) return row.id;
    }
    if (complaint.citizen_phone) {
      const found = await findCitizenByPhone(db, complaint.citizen_phone);
      if (found) return found.id;
    }
  } catch {}
  return null;
}

function sanitizeCitizenUser(c) {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    district: c.district || 'Chennai',
    municipality: c.municipality || 'Greater Chennai Corporation',
    ward: c.ward || 'Ward 114',
    mobile_verified: Boolean(c.mobile_verified),
    email_verified: Boolean(c.email_verified),
    email_notifications: c.email_notifications !== undefined ? Boolean(c.email_notifications) : true,
    web_push_enabled: Boolean(c.web_push_enabled),
    profile_photo_url: c.profile_photo_url || null,
    profile_photo_updated_at: c.profile_photo_updated_at || null
  };
}

function sanitizeAdminUser(a) {
  if (!a) return null;
  return {
    id: a.id,
    email: a.email,
    name: a.name,
    role: a.role,
    district: a.district,
    department: a.department,
    designation: a.designation,
    web_push_enabled: Boolean(a.web_push_enabled),
    profile_photo_url: a.profile_photo_url || null,
    profile_photo_updated_at: a.profile_photo_updated_at || null
  };
}

// Helper to record audit log in SQLite
async function recordAuditLog({ complaintRef, actorId, actorName, actorRole, action, previousState, newState, remarks, ip }) {
  try {
    await db.prepare(`
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
app.get('/api/health', async (req, res) => {
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

    const dbCheck = await db.prepare('SELECT 1 as test').get();
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
app.get('/api/geo/districts', async (req, res) => {
  res.json({ districts: TAMIL_NADU_DISTRICTS });
});

// GET /api/geo/corporations
app.get('/api/geo/corporations', async (req, res) => {
  const corps = [];
  TAMIL_NADU_DISTRICTS.forEach(d => {
    (d.localBodies || []).forEach(lb => {
      if (lb.type === 'Corporation' || lb.is_corporation) {
        corps.push({
          district_id: d.id,
          district_name: d.name,
          district_name_ta: d.name_ta,
          id: lb.id,
          name: lb.name,
          name_ta: lb.name_ta,
          type: lb.type,
          zones_count: (lb.zones || []).length
        });
      }
    });
  });
  res.json({ total: corps.length, corporations: corps });
});

// GET /api/geo/hierarchy
app.get('/api/geo/hierarchy', async (req, res) => {
  res.json({
    state: 'Tamil Nadu',
    state_ta: 'தமிழ்நாடு',
    total_districts: TAMIL_NADU_DISTRICTS.length,
    districts: TAMIL_NADU_DISTRICTS
  });
});

// GET /api/geo/departments
app.get('/api/geo/departments', async (req, res) => {
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
app.get('/api/config/client', async (req, res) => {
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

    const cleanPhone = normalizePhone(phone);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    // Check resend cooldown (30 seconds)
    const recentOtp = await db.prepare(`
      SELECT created_at
      FROM citizen_otps
      WHERE phone = ? AND verified = 0
      ORDER BY id DESC LIMIT 1
    `).get(cleanPhone);

    if (recentOtp && recentOtp.created_at) {
      const elapsedSec = Math.floor((Date.now() - new Date(recentOtp.created_at).getTime()) / 1000);
      if (elapsedSec < 30) {
        const waitTime = 30 - elapsedSec;
        return res.status(429).json({
          error: `Please wait ${waitTime} seconds before requesting another OTP.`
        });
      }
    }

    // Invalidate existing unverified OTPs
    await db.prepare('UPDATE citizen_otps SET verified = -1 WHERE phone = ? AND verified = 0').run(cleanPhone);

    // Generate secure 6-digit numeric OTP
    const otp = generateSecureOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Insert into citizen_otps with 10 minutes expiry
    await db.prepare(`
      INSERT INTO citizen_otps (phone, otp_hash, purpose, attempts, max_attempts, expires_at)
      VALUES (?, ?, ?, 0, 5, ?)
    `).run(cleanPhone, otpHash, purpose, expiresAt);

    const existingCitizen = await findCitizenByPhone(db, cleanPhone);
    const isExisting = Boolean(existingCitizen);

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
app.post('/api/auth/citizen/verify-otp', async (req, res) => {
  try {
    const { phone, otp, _purpose = 'login' } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and 6-digit OTP are required.' });
    }

    const cleanPhone = normalizePhone(phone);
    const cleanOtp = String(otp).trim();

    // Find active non-expired OTP
    const otpRecord = await db.prepare(`
      SELECT * FROM citizen_otps
      WHERE phone = ? AND verified = 0 AND expires_at > CURRENT_TIMESTAMP
      ORDER BY id DESC LIMIT 1
    `).get(cleanPhone);

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new code.' });
    }

    if (otpRecord.attempts >= otpRecord.max_attempts) {
      await db.prepare('UPDATE citizen_otps SET verified = -1 WHERE id = ?').run(otpRecord.id);
      return res.status(400).json({ error: 'Maximum verification attempts exceeded. Please generate a new OTP.' });
    }

    const inputHash = hashOtp(cleanOtp);
    if (inputHash !== otpRecord.otp_hash) {
      await db.prepare('UPDATE citizen_otps SET attempts = attempts + 1 WHERE id = ?').run(otpRecord.id);
      const remaining = otpRecord.max_attempts - (otpRecord.attempts + 1);
      return res.status(400).json({
        error: `Incorrect OTP. ${remaining} attempt(s) remaining.`
      });
    }

    // Mark OTP verified
    await db.prepare('UPDATE citizen_otps SET verified = 1 WHERE id = ?').run(otpRecord.id);

    // Check citizen record using normalized mobile lookup
    const citizen = await findCitizenByPhone(db, cleanPhone);

    if (citizen) {
      // Existing citizen: issue session token and refresh verification
      await db.prepare('UPDATE citizens SET mobile_verified = 1 WHERE id = ?').run(citizen.id);

      // Auto-link any unassociated complaints with this verified phone number
      try {
        await db.prepare(`
          UPDATE complaints
          SET citizen_id = ?
          WHERE citizen_phone = ? AND (citizen_id IS NULL OR citizen_id = 0)
        `).run(citizen.id, cleanPhone);
      } catch (linkErr) {
        console.warn('[Complaint Link Notice]:', linkErr.message);
      }

      const token = generateToken({ id: citizen.id, email: citizen.email, name: citizen.name, phone: citizen.phone, type: 'citizen' });

      res.cookie('civic_citizen_token', token, getCookieOptions());

      return res.json({
        success: true,
        verified: true,
        isNewUser: false,
        token,
        citizen: sanitizeCitizenUser({ ...citizen, mobile_verified: true })
      });
    } else {
      // New citizen: issue cryptographically signed 15-minute registration verification token
      const registrationToken = generateToken({
        phone: cleanPhone,
        purpose: 'citizen_registration'
      });

      return res.json({
        success: true,
        verified: true,
        isNewUser: true,
        phone: cleanPhone,
        registrationToken,
        message: 'Mobile number verified successfully. Please complete your citizen profile.'
      });
    }
  } catch (err) {
    console.error('[Verify OTP Error]:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// POST /api/auth/citizen/register-with-otp
app.post('/api/auth/citizen/register-with-otp', async (req, res) => {
  try {
    const { name, phone, otp, registrationToken, email, district, municipality, ward, password } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Citizen full name is required.' });
    }

    let verifiedPhone = null;

    // 1. Verify via signed registrationToken (preferred, tamper-proof)
    if (registrationToken) {
      const decoded = verifyToken(registrationToken);
      if (decoded && decoded.purpose === 'citizen_registration' && decoded.phone) {
        if (phone && normalizePhone(phone) !== decoded.phone) {
          return res.status(403).json({ error: 'Phone number does not match verified registration token.' });
        }
        verifiedPhone = decoded.phone;
      } else {
        return res.status(403).json({ error: 'Invalid or expired registration token.' });
      }
    }

    // 2. Fallback: Verify via OTP code in database
    if (!verifiedPhone && phone && otp) {
      const cleanPhone = normalizePhone(phone);
      const cleanOtp = String(otp).trim();
      const inputHash = hashOtp(cleanOtp);

      const otpRecord = await db.prepare(`
        SELECT * FROM citizen_otps
        WHERE phone = ? AND otp_hash = ? AND (verified = 1 OR (verified = 0 AND expires_at > CURRENT_TIMESTAMP))
        ORDER BY id DESC LIMIT 1
      `).get(cleanPhone, inputHash);

      if (otpRecord) {
        verifiedPhone = cleanPhone;
        await db.prepare('UPDATE citizen_otps SET verified = 1 WHERE id = ?').run(otpRecord.id);
      }
    }

    // Requirement 10: Never trust a mobile number supplied by frontend without successful OTP verification
    if (!verifiedPhone) {
      return res.status(403).json({
        error: 'Mobile verification required. Please verify your phone number via OTP first.'
      });
    }

    const cleanPhone = verifiedPhone;
    const cleanEmail = email && email.trim() ? email.toLowerCase().trim() : `citizen.${cleanPhone}@civicresolve.gov`;

    // Check if phone already registered (idempotent / safe returning citizen resolution)
    const existing = await findCitizenByPhone(db, cleanPhone);
    if (existing) {
      // Non-destructive update: only fill fields that are non-empty; never overwrite existing details with empty/blank values
      const updateName = (name && name.trim()) ? name.trim() : existing.name;
      const updateDistrict = (district && district.trim()) ? district.trim() : existing.district;
      const updateMunicipality = (municipality && municipality.trim()) ? municipality.trim() : existing.municipality;
      const updateWard = (ward && ward.trim()) ? ward.trim() : existing.ward;

      await db.prepare(`
        UPDATE citizens
        SET name = ?,
            district = ?,
            municipality = ?,
            ward = ?,
            mobile_verified = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(updateName, updateDistrict, updateMunicipality, updateWard, existing.id);

      const citizen = await db.prepare('SELECT id, name, email, phone, district, municipality, ward, mobile_verified, email_verified FROM citizens WHERE id = ?').get(existing.id);
      const token = generateToken({ id: citizen.id, email: citizen.email, name: citizen.name, phone: citizen.phone, type: 'citizen' });
      res.cookie('civic_citizen_token', token, getCookieOptions());

      return res.json({
        success: true,
        message: 'Citizen profile verified and updated.',
        token,
        citizen: {
          ...citizen,
          mobile_verified: Boolean(citizen.mobile_verified),
          email_verified: Boolean(citizen.email_verified)
        }
      });
    }

    // Check if email already used by a different citizen
    if (email && email.trim()) {
      const emailConflict = await db.prepare('SELECT id FROM citizens WHERE LOWER(email) = ? AND phone != ?').get(cleanEmail, cleanPhone);
      if (emailConflict) {
        return res.status(409).json({ error: 'This email address is already associated with another citizen account.' });
      }
    }

    const passwordHash = hashPassword(password || 'Citizen#2026!MobileVerified');
    const result = await db.prepare(`
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

    const citizen = await db.prepare('SELECT id, name, email, phone, district, municipality, ward, mobile_verified, email_verified FROM citizens WHERE id = ?').get(result.lastInsertRowid);

    // Auto-link any complaints previously submitted with this phone number
    try {
      await db.prepare(`
        UPDATE complaints
        SET citizen_id = ?
        WHERE citizen_phone = ? AND (citizen_id IS NULL OR citizen_id = 0)
      `).run(citizen.id, cleanPhone);
    } catch {}

    const token = generateToken({ id: citizen.id, email: citizen.email, name: citizen.name, phone: citizen.phone, type: 'citizen' });

    res.cookie('civic_citizen_token', token, getCookieOptions());

    await createNotification('citizen', citizen.id, null, 'Welcome to CivicResolve', `வணக்கம் ${citizen.name}! Your citizen portal account is verified and ready.`);

    return res.status(201).json({
      success: true,
      message: 'Citizen account created and mobile verified successfully.',
      token,
      citizen: {
        ...citizen,
        mobile_verified: Boolean(citizen.mobile_verified),
        email_verified: Boolean(citizen.email_verified)
      }
    });
  } catch (err) {
    console.error('[Register with OTP Error]:', err);
    res.status(500).json({ error: 'Failed to complete registration.' });
  }
});

// POST /api/auth/citizen/register
app.post('/api/auth/citizen/register', async (req, res) => {
  try {
    const { name, email, phone, password, district } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Name, email, phone number, and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    // Check existing
    const existing = await db.prepare('SELECT id FROM citizens WHERE LOWER(email) = ?').get(cleanEmail) || await findCitizenByPhone(db, cleanPhone);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email or phone number already exists.' });
    }

    const passwordHash = hashPassword(password);
    const result = await db.prepare(`
      INSERT INTO citizens (name, email, phone, password_hash, district, email_verified, email_notifications)
      VALUES (?, ?, ?, ?, ?, 1, 1)
    `).run(name.trim(), cleanEmail, cleanPhone, passwordHash, district || 'Chennai');

    const citizen = await db.prepare('SELECT id, name, email, phone, district, municipality, ward, mobile_verified, email_verified, email_notifications, web_push_enabled, profile_photo_url, profile_photo_updated_at FROM citizens WHERE id = ?').get(result.lastInsertRowid);
    const token = generateToken({ id: citizen.id, email: citizen.email, name: citizen.name, phone: citizen.phone, type: 'citizen' });

    res.cookie('civic_citizen_token', token, getCookieOptions());

    // Fire welcome notification asynchronously
    notifyCitizenEvent({
      eventType: 'citizen_registration',
      citizenId: citizen.id,
      citizenName: citizen.name,
      citizenEmail: citizen.email
    });

    res.status(201).json({
      message: 'Citizen account registered successfully',
      token,
      citizen: sanitizeCitizenUser(citizen)
    });
  } catch (err) {
    console.error('[Citizen Register Error]:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/citizen/login
app.post('/api/auth/citizen/login', async (req, res) => {
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

    const citizen = await db.prepare('SELECT * FROM citizens WHERE LOWER(email) = ? OR phone = ?').get(cleanId, cleanId);

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
      citizen: sanitizeCitizenUser(citizen)
    });
  } catch (err) {
    console.error('[Citizen Login Error]:', err);
    res.status(500).json({ error: 'Login internal error' });
  }
});

// GET /api/auth/citizen/me
app.get('/api/auth/citizen/me', authenticateCitizen, async (req, res) => {
  const token = generateToken({
    id: req.citizen.id,
    email: req.citizen.email,
    name: req.citizen.name,
    phone: req.citizen.phone,
    type: 'citizen'
  });
  res.cookie('civic_citizen_token', token, getCookieOptions());
  res.json({
    authenticated: true,
    token,
    citizen: sanitizeCitizenUser(req.citizen)
  });
});

function extractToken(req, cookieName) {
  if (req.cookies && req.cookies[cookieName]) {
    return req.cookies[cookieName];
  }
  if (req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }
  return null;
}

// POST /api/auth/citizen/logout
app.post('/api/auth/citizen/logout', async (req, res) => {
  try {
    const token = extractToken(req, 'civic_citizen_token');
    if (token) {
      const decoded = verifyToken(token);
      await revokeToken(token, decoded?.exp);
    }
  } catch {}
  res.clearCookie('civic_citizen_token', getClearCookieOptions());
  res.json({ message: 'Citizen logged out successfully' });
});

// GET /api/avatars/:userType/:id (Serve database-persisted resized avatar cleanly)
app.get('/api/avatars/:userType/:id', async (req, res) => {
  try {
    const { userType, id } = req.params;
    const avatar = await getUserProfilePhoto(userType, id);
    if (!avatar || !avatar.buffer) {
      return res.status(404).json({ error: 'Profile photo not found' });
    }
    res.setHeader('Content-Type', avatar.mimeType || 'image/webp');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    return res.send(avatar.buffer);
  } catch (err) {
    console.error('[Avatar Serve Error]:', err.message);
    return res.status(500).json({ error: 'Failed to serve profile photo' });
  }
});

// GET /api/citizen/profile
app.get('/api/citizen/profile', authenticateCitizen, async (req, res) => {
  try {
    const c = await db.prepare(`
      SELECT id, name, email, phone, district, municipality, ward,
             mobile_verified, email_verified, email_notifications, sms_notifications,
             whatsapp_notifications, sms_consent, whatsapp_consent, web_push_enabled,
             profile_photo_url, profile_photo_updated_at, created_at
      FROM citizens WHERE id = ?
    `).get(req.citizen.id);
    if (!c) return res.status(404).json({ error: 'Citizen not found' });
    res.json({ profile: c, citizen: sanitizeCitizenUser(c) });
  } catch (err) {
    console.error('[Profile Fetch Error]:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/citizen/profile
app.put('/api/citizen/profile', authenticateCitizen, async (req, res) => {
  try {
    const { name, phone, district, municipality, ward, email_notifications, sms_notifications, whatsapp_notifications, sms_consent, whatsapp_consent, web_push_enabled } = req.body;

    await db.prepare(`
      UPDATE citizens
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          district = COALESCE(?, district),
          municipality = COALESCE(?, municipality),
          ward = COALESCE(?, ward),
          email_notifications = COALESCE(?, email_notifications),
          sms_notifications = COALESCE(?, sms_notifications),
          whatsapp_notifications = COALESCE(?, whatsapp_notifications),
          sms_consent = COALESCE(?, sms_consent),
          whatsapp_consent = COALESCE(?, whatsapp_consent),
          web_push_enabled = COALESCE(?, web_push_enabled),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || null,
      phone ? normalizePhone(phone) : null,
      district || null,
      municipality || null,
      ward || null,
      email_notifications !== undefined ? (email_notifications ? 1 : 0) : null,
      sms_notifications !== undefined ? (sms_notifications ? 1 : 0) : null,
      whatsapp_notifications !== undefined ? (whatsapp_notifications ? 1 : 0) : null,
      sms_consent !== undefined ? (sms_consent ? 1 : 0) : null,
      whatsapp_consent !== undefined ? (whatsapp_consent ? 1 : 0) : null,
      web_push_enabled !== undefined ? (web_push_enabled ? 1 : 0) : null,
      req.citizen.id
    );

    const updated = await db.prepare(`
      SELECT id, name, email, phone, district, municipality, ward,
             mobile_verified, email_verified, email_notifications, sms_notifications,
             whatsapp_notifications, sms_consent, whatsapp_consent, web_push_enabled,
             profile_photo_url, profile_photo_updated_at
      FROM citizens WHERE id = ?
    `).get(req.citizen.id);
    res.json({ message: 'Profile updated successfully', profile: updated, citizen: sanitizeCitizenUser(updated) });
  } catch (err) {
    console.error('[Profile Update Error]:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST / PUT /api/citizen/profile/photo (Upload/Replace own citizen avatar)
app.post('/api/citizen/profile/photo', authenticateCitizen, handleAvatarUpload, async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Please select a JPEG, PNG, or WebP photo to upload.' });
    }
    const saved = await saveUserProfilePhoto('citizen', req.citizen.id, req.file.buffer);
    const updated = await db.prepare('SELECT id, name, email, phone, district, municipality, ward, mobile_verified, email_verified, email_notifications, web_push_enabled, profile_photo_url, profile_photo_updated_at FROM citizens WHERE id = ?').get(req.citizen.id);
    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      profile_photo_url: saved.profile_photo_url,
      citizen: sanitizeCitizenUser(updated)
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to process profile photo.' });
  }
});

app.put('/api/citizen/profile/photo', authenticateCitizen, handleAvatarUpload, async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Please select a JPEG, PNG, or WebP photo to upload.' });
    }
    const saved = await saveUserProfilePhoto('citizen', req.citizen.id, req.file.buffer);
    const updated = await db.prepare('SELECT id, name, email, phone, district, municipality, ward, mobile_verified, email_verified, email_notifications, web_push_enabled, profile_photo_url, profile_photo_updated_at FROM citizens WHERE id = ?').get(req.citizen.id);
    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      profile_photo_url: saved.profile_photo_url,
      citizen: sanitizeCitizenUser(updated)
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to process profile photo.' });
  }
});

// DELETE /api/citizen/profile/photo (Remove own citizen avatar)
app.delete('/api/citizen/profile/photo', authenticateCitizen, async (req, res) => {
  try {
    await removeUserProfilePhoto('citizen', req.citizen.id);
    const updated = await db.prepare('SELECT id, name, email, phone, district, municipality, ward, mobile_verified, email_verified, email_notifications, web_push_enabled, profile_photo_url, profile_photo_updated_at FROM citizens WHERE id = ?').get(req.citizen.id);
    res.json({
      success: true,
      message: 'Profile photo removed and default avatar restored.',
      profile_photo_url: null,
      citizen: sanitizeCitizenUser(updated)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove profile photo' });
  }
});

// POST /api/auth/citizen/password-reset
app.post('/api/auth/citizen/password-reset', async (req, res) => {
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

    const citizen = await db.prepare('SELECT id FROM citizens WHERE LOWER(email) = ? AND phone = ?').get(cleanEmail, cleanPhone);
    if (!citizen) {
      return res.status(404).json({ error: 'No citizen account found with matching email and phone.' });
    }

    const newHash = hashPassword(newPassword);
    await db.prepare('UPDATE citizens SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, citizen.id);

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('[Password Reset Error]:', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// GET /api/citizen/my-complaints (Private to authenticated citizen)
app.get('/api/citizen/my-complaints', authenticateCitizen, async (req, res) => {
  try {
    const raw = await db.prepare(`
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
app.post('/api/auth/login', async (req, res) => {
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

    const admin = await db.prepare('SELECT * FROM admins WHERE LOWER(email) = ?').get(cleanEmail);

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
      admin: sanitizeAdminUser(admin)
    });
  } catch (err) {
    console.error('[Admin Login Error]:', err);
    res.status(500).json({ error: 'Internal login error' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = extractToken(req, 'civic_admin_token');
    if (token) {
      const decoded = verifyToken(token);
      await revokeToken(token, decoded?.exp);
    }
  } catch {}
  res.clearCookie('civic_admin_token', getClearCookieOptions());
  res.json({ message: 'Officer logged out successfully' });
});

// GET /api/auth/me (Verify session)
app.get('/api/auth/me', authenticateAdmin, async (req, res) => {
  res.json({
    authenticated: true,
    admin: sanitizeAdminUser(req.admin)
  });
});

// GET /api/admin/profile
app.get('/api/admin/profile', authenticateAdmin, async (req, res) => {
  try {
    const admin = await db.prepare(`
      SELECT id, email, name, role, district, department, designation,
             web_push_enabled, profile_photo_url, profile_photo_updated_at, created_at
      FROM admins WHERE id = ?
    `).get(req.admin.id);
    if (!admin) return res.status(404).json({ error: 'Administrator not found' });
    res.json({ profile: sanitizeAdminUser(admin), admin: sanitizeAdminUser(admin) });
  } catch (err) {
    console.error('[Admin Profile Fetch Error]:', err);
    res.status(500).json({ error: 'Failed to fetch admin profile' });
  }
});

// PUT /api/admin/profile (Strict ownership: updates only own safe display fields; role escalation forbidden)
app.put('/api/admin/profile', authenticateAdmin, async (req, res) => {
  try {
    const { name, designation, web_push_enabled } = req.body;
    await db.prepare(`
      UPDATE admins
      SET name = COALESCE(?, name),
          designation = COALESCE(?, designation),
          web_push_enabled = COALESCE(?, web_push_enabled),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name && String(name).trim() ? String(name).trim() : null,
      designation && String(designation).trim() ? String(designation).trim() : null,
      web_push_enabled !== undefined ? (web_push_enabled ? 1 : 0) : null,
      req.admin.id
    );

    const updated = await db.prepare(`
      SELECT id, email, name, role, district, department, designation,
             web_push_enabled, profile_photo_url, profile_photo_updated_at
      FROM admins WHERE id = ?
    `).get(req.admin.id);
    res.json({
      message: 'Administrator profile updated successfully',
      profile: sanitizeAdminUser(updated),
      admin: sanitizeAdminUser(updated)
    });
  } catch (err) {
    console.error('[Admin Profile Update Error]:', err);
    res.status(500).json({ error: 'Failed to update admin profile' });
  }
});

// POST / PUT /api/admin/profile/photo (Upload/Replace own admin avatar)
app.post('/api/admin/profile/photo', authenticateAdmin, handleAvatarUpload, async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Please select a JPEG, PNG, or WebP photo to upload.' });
    }
    const saved = await saveUserProfilePhoto('admin', req.admin.id, req.file.buffer);
    const updated = await db.prepare('SELECT id, email, name, role, district, department, designation, web_push_enabled, profile_photo_url, profile_photo_updated_at FROM admins WHERE id = ?').get(req.admin.id);
    res.json({
      success: true,
      message: 'Administrator profile photo updated successfully',
      profile_photo_url: saved.profile_photo_url,
      admin: sanitizeAdminUser(updated)
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to process profile photo.' });
  }
});

app.put('/api/admin/profile/photo', authenticateAdmin, handleAvatarUpload, async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Please select a JPEG, PNG, or WebP photo to upload.' });
    }
    const saved = await saveUserProfilePhoto('admin', req.admin.id, req.file.buffer);
    const updated = await db.prepare('SELECT id, email, name, role, district, department, designation, web_push_enabled, profile_photo_url, profile_photo_updated_at FROM admins WHERE id = ?').get(req.admin.id);
    res.json({
      success: true,
      message: 'Administrator profile photo updated successfully',
      profile_photo_url: saved.profile_photo_url,
      admin: sanitizeAdminUser(updated)
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to process profile photo.' });
  }
});

// DELETE /api/admin/profile/photo (Remove own admin avatar)
app.delete('/api/admin/profile/photo', authenticateAdmin, async (req, res) => {
  try {
    await removeUserProfilePhoto('admin', req.admin.id);
    const updated = await db.prepare('SELECT id, email, name, role, district, department, designation, web_push_enabled, profile_photo_url, profile_photo_updated_at FROM admins WHERE id = ?').get(req.admin.id);
    res.json({
      success: true,
      message: 'Administrator profile photo removed and default avatar restored.',
      profile_photo_url: null,
      admin: sanitizeAdminUser(updated)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove profile photo' });
  }
});

// -------------------------------------------------------------
// 4. GRIEVANCE REGISTRY & TRACKING (PUBLIC & ADVANCED FILTERS)
// -------------------------------------------------------------

// GET /api/complaints (Optimized Summary Projection & Deterministic Pagination)
app.get('/api/complaints', optionalCitizenAuth, async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const {
      search, category, priority, status, department,
      district, local_body, ward, sla_status
    } = req.query;

    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let whereSql = ' WHERE 1=1';
    const params = [];

    if (search && search.trim() !== '') {
      whereSql += ' AND (title LIKE ? OR description LIKE ? OR location LIKE ? OR ref_id LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (category && category !== 'All') {
      whereSql += ' AND category = ?';
      params.push(category);
    }

    if (priority && priority !== 'All') {
      whereSql += ' AND priority = ?';
      params.push(priority);
    }

    if (status && status !== 'All') {
      whereSql += ' AND status = ?';
      params.push(status);
    }

    if (department && department !== 'All') {
      whereSql += ' AND department = ?';
      params.push(department);
    }

    if (district && district !== 'All') {
      whereSql += ' AND district = ?';
      params.push(district);
    }

    if (local_body && local_body !== 'All') {
      whereSql += ' AND local_body = ?';
      params.push(local_body);
    }

    if (ward && ward !== 'All') {
      whereSql += ' AND ward = ?';
      params.push(ward);
    }

    // Check authorization for officer unmasking
    let isAuthorized = false;
    const adminToken = req.cookies?.civic_admin_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (adminToken) {
      const decoded = verifyToken(adminToken);
      if (decoded && (decoded.type === 'admin' || decoded.role)) {
        isAuthorized = true;
      }
    }

    // Count total matching records for pagination
    const countRow = await db.prepare(`SELECT COUNT(*) as total FROM complaints ${whereSql}`).get(...params);
    const total = countRow ? countRow.total : 0;

    // Explicit summary projection columns: excludes AI reasoning, confidential internal notes, and raw JSON history
    const selectSql = `
      SELECT
        id, ref_id, title, description, category, location, latitude, longitude,
        image_url, status, priority, department, district, local_body, ward, zone,
        is_gps_verified, location_accuracy, detection_method, jurisdiction_source,
        created_at, updated_at, resolution_remarks, sla_hours, sla_deadline,
        citizen_name, citizen_phone, citizen_email, citizen_rating
      FROM complaints
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limitNum, offset];
    const rawComplaints = await db.prepare(selectSql).all(...queryParams);
    let complaints = rawComplaints.map(c => parseComplaintSummary(c, isAuthorized));

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
      total,
      page: pageNum,
      pageSize: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      complaints
    });
  } catch (err) {
    console.error('Error fetching complaints:', err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// GET /api/complaints/track/:refId (Privacy-Safe Public Tracking)
app.get('/api/complaints/track/:refId', optionalCitizenAuth, async (req, res) => {
  try {
    const refId = req.params.refId.trim().toUpperCase();
    const complaint = await db.prepare('SELECT * FROM complaints WHERE UPPER(ref_id) = ?').get(refId);

    if (!complaint) {
      return res.status(404).json({ error: `No complaint found with Reference ID "${refId}"` });
    }

    // Check if requester is authorized citizen owner or admin
    let isAuthorized = false;
    if (req.citizen) {
      const citizenEmail = (req.citizen.email || '').toLowerCase().trim();
      const complaintEmail = (complaint.citizen_email || '').toLowerCase().trim();
      const citizenPhone = String(req.citizen.phone || '').replace(/\D/g, '').slice(-10);
      const complaintPhone = String(complaint.citizen_phone || '').replace(/\D/g, '').slice(-10);

      if (
        (req.citizen.id && req.citizen.id === complaint.citizen_id) ||
        (citizenEmail && complaintEmail && citizenEmail === complaintEmail) ||
        (citizenPhone && complaintPhone && citizenPhone === complaintPhone)
      ) {
        isAuthorized = true;
      }
    }

    // Check if admin token is present in cookie or bearer
    const adminToken = req.cookies?.civic_admin_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (adminToken) {
      const decoded = verifyToken(adminToken);
      if (decoded && (decoded.type === 'admin' || decoded.role)) {
        isAuthorized = true;
      }
    }

    const parsed = parseComplaint(complaint, isAuthorized);
    res.json(Object.assign({}, parsed, { complaint: parsed }));
  } catch (err) {
    console.error('Error tracking complaint:', err);
    res.status(500).json({ error: 'Failed to track complaint' });
  }
});

// POST /api/complaints/track/:refId/verify-access (Verify Phone/Email to unmask private file)
app.post('/api/complaints/track/:refId/verify-access', async (req, res) => {
  try {
    const { refId } = req.params;
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Registered email or phone number is required to verify ownership.' });
    }

    const cleanRef = refId.trim().toUpperCase();
    const c = await db.prepare('SELECT * FROM complaints WHERE UPPER(ref_id) = ?').get(cleanRef);
    if (!c) {
      return res.status(404).json({ error: `Grievance ${cleanRef} not found.` });
    }

    const cred = String(credential).trim().toLowerCase();
    const credPhoneDigits = cred.replace(/\D/g, '').slice(-10);
    const complaintPhoneDigits = c.citizen_phone ? String(c.citizen_phone).replace(/\D/g, '').slice(-10) : '';

    const emailMatch = Boolean(c.citizen_email && c.citizen_email.toLowerCase().trim() === cred);
    const phoneMatch = Boolean(complaintPhoneDigits && credPhoneDigits && credPhoneDigits.length === 10 && complaintPhoneDigits === credPhoneDigits);

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
app.get('/api/complaints/:id', optionalCitizenAuth, async (req, res) => {
  try {
    const idParam = req.params.id;
    let complaint;

    if (/^\d+$/.test(idParam)) {
      complaint = await db.prepare('SELECT * FROM complaints WHERE id = ?').get(parseInt(idParam, 10));
    }

    if (!complaint) {
      complaint = await db.prepare('SELECT * FROM complaints WHERE ref_id = ?').get(idParam);
    }

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Check authorization
    let isAuthorized = false;
    if (req.citizen) {
      const citizenEmail = (req.citizen.email || '').toLowerCase().trim();
      const complaintEmail = (complaint.citizen_email || '').toLowerCase().trim();
      const citizenPhone = String(req.citizen.phone || '').replace(/\D/g, '').slice(-10);
      const complaintPhone = String(complaint.citizen_phone || '').replace(/\D/g, '').slice(-10);

      if (
        (req.citizen.id && req.citizen.id === complaint.citizen_id) ||
        (citizenEmail && complaintEmail && citizenEmail === complaintEmail) ||
        (citizenPhone && complaintPhone && citizenPhone === complaintPhone)
      ) {
        isAuthorized = true;
      }
    }
    const adminToken = req.cookies?.civic_admin_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (adminToken) {
      const decoded = verifyToken(adminToken);
      if (decoded && (decoded.type === 'admin' || decoded.role)) {
        isAuthorized = true;
      }
    }

    const parsed = parseComplaint(complaint, isAuthorized);
    res.json(Object.assign({}, parsed, { complaint: parsed }));
  } catch (err) {
    console.error('Error fetching complaint details:', err);
    res.status(500).json({ error: 'Failed to fetch complaint details' });
  }
});

// POST /api/complaints (Multi-step Submission + Groq AI + SLA + Duplicate Detection + Notification)
app.post('/api/complaints', optionalCitizenAuth, upload.single('image'), async (req, res) => {
  try {
    // Phase 4: Mandatory Citizen Authentication Check
    if (!req.citizen && !req.admin) {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(401).json({
        error: 'Citizen authentication required. Please log in or create an account to register a grievance.'
      });
    }

    const {
      title, description, category, location,
      district, local_body, ward, zone, latitude, longitude,
      isGpsVerified, location_accuracy, detection_method,
      language, citizen_name, citizen_phone, citizen_email
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

    // Coordinate validation & telemetry
    const hasCoordinates = (latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null &&
      !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude)));
    const parsedLat = hasCoordinates ? parseFloat(latitude) : null;
    const parsedLng = hasCoordinates ? parseFloat(longitude) : null;

    const rawAccuracy = location_accuracy ? parseFloat(location_accuracy) : null;
    const parsedAccuracy = (rawAccuracy !== null && !isNaN(rawAccuracy)) ? rawAccuracy : null;
    const validMethods = ['gps', 'map_pin', 'manual'];
    const parsedMethod = validMethods.includes(detection_method) ? detection_method : (hasCoordinates ? 'manual' : 'manual');

    // Requirement 7: is_gps_verified is strictly true ONLY when actual browser GPS succeeded
    const isGpsProven = (parsedMethod === 'gps' && hasCoordinates && (isGpsVerified === 'true' || isGpsVerified === true || isGpsVerified === 1));
    const gpsFlag = isGpsProven ? 1 : 0;

    // Independent Server-Side Jurisdiction Resolution from Incident Location
    let effectiveDistrict = district && district.trim() ? district.trim() : null;
    let effectiveLocalBody = local_body && local_body.trim() ? local_body.trim() : null;
    let effectiveZone = zone && zone.trim() ? zone.trim() : null;
    let effectiveWard = ward && ward.trim() ? ward.trim() : null;
    let jurisdictionSource = 'unverified';

    if (hasCoordinates) {
      const gisResult = determineMunicipalJurisdiction(parsedLat, parsedLng);
      if (gisResult.in_tamil_nadu) {
        if (gisResult.jurisdiction_source === 'authoritative_gis') {
          // Authoritative GIS determination takes precedence for corporation & zone
          effectiveDistrict = gisResult.district;
          effectiveLocalBody = gisResult.corporation;
          effectiveZone = gisResult.zone;
          jurisdictionSource = 'authoritative_gis';

          if (ward && String(ward).trim()) {
            effectiveWard = String(ward).trim();
            jurisdictionSource = 'citizen_confirmed'; // Ward verified by citizen within authoritative zone
          }
        } else {
          // In Tamil Nadu, outside surveyed corporation GIS layers
          if (!effectiveDistrict) effectiveDistrict = 'Tamil Nadu District';
          if (!effectiveLocalBody) effectiveLocalBody = 'Local Administration';
          jurisdictionSource = 'unverified';
        }
      } else {
        jurisdictionSource = 'out_of_state';
        if (!effectiveDistrict) effectiveDistrict = 'Out of State Jurisdiction';
        if (!effectiveLocalBody) effectiveLocalBody = 'Non-TN Jurisdiction';
      }
    } else {
      // Manual / Text address only
      if (!effectiveDistrict) effectiveDistrict = 'Tamil Nadu District';
      if (!effectiveLocalBody) effectiveLocalBody = 'Local Administration';
      jurisdictionSource = 'citizen_confirmed';
    }

    const effectiveLang = language || 'en';

    // Derive Citizen identity strictly from server-side authenticated identity
    const citizenId = req.citizen ? req.citizen.id : (req.admin ? (req.body.citizen_id ? parseInt(req.body.citizen_id, 10) : null) : null);
    const finalCitizenName = req.citizen ? req.citizen.name : (req.admin ? (citizen_name || 'Citizen') : 'Citizen');
    const finalCitizenPhone = req.citizen ? req.citizen.phone : (req.admin && citizen_phone ? normalizePhone(citizen_phone) : null);
    const finalCitizenEmail = req.citizen ? req.citizen.email : (req.admin ? (citizen_email || null) : null);

    // Prevent duplicate rapid submissions from the same citizen within 60 seconds
    if (citizenId) {
      const spaceFormat = new Date(Date.now() - 60000).toISOString().replace('T', ' ').slice(0, 19);
      const isoFormat = new Date(Date.now() - 60000).toISOString();
      const recentDup = await db.prepare(`
        SELECT id, ref_id FROM complaints
        WHERE citizen_id = ? AND title = ? AND location = ? AND (created_at > ? OR created_at > ?)
        LIMIT 1
      `).get(citizenId, title.trim(), location.trim(), spaceFormat, isoFormat);
      if (recentDup) {
        return res.status(409).json({
          error: `Duplicate grievance detected. Grievance ${recentDup.ref_id} was submitted less than 60 seconds ago.`,
          ref_id: recentDup.ref_id,
          id: recentDup.id
        });
      }
    }

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

    // Check for potential duplicates
    const duplicates = await findDuplicateCandidates({
      title,
      description,
      category: effectiveCategory,
      district: effectiveDistrict,
      ward: effectiveWard,
      latitude: hasCoordinates ? parseFloat(latitude) : null,
      longitude: hasCoordinates ? parseFloat(longitude) : null
    });

    const insert = await db.prepare(`
      INSERT INTO complaints (
        ref_id, title, description, category, location, latitude, longitude,
        image_url, status, priority, department,
        ai_summary, ai_category, ai_priority, ai_department, ai_confidence,
        ai_reason, ai_safety_risk, ai_recommended_action, ai_suggested_response_time,
        ai_status, resolution_remarks, status_history, is_gps_verified,
        district, local_body, ward, zone, location_accuracy, detection_method, jurisdiction_source,
        citizen_id, citizen_name, citizen_phone, citizen_email,
        sla_hours, sla_deadline, language,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, NULL, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `);

    // Await async insertion in dual database architecture
    const result = await insert.run(
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
      effectiveZone,
      parsedAccuracy,
      parsedMethod,
      jurisdictionSource,
      citizenId,
      finalCitizenName,
      finalCitizenPhone,
      finalCitizenEmail,
      targetSlaHours,
      deadlineIso,
      effectiveLang
    );

    const insertId = result?.lastInsertRowid;
    let created = null;
    if (insertId) {
      created = await db.prepare('SELECT * FROM complaints WHERE id = ?').get(insertId);
    }
    if (!created) {
      created = await db.prepare('SELECT * FROM complaints WHERE ref_id = ?').get(ref_id);
    }

    // Admin In-App Queue Alert
    await createNotification(
      'admin',
      null,
      ref_id,
      `New Grievance Submitted: ${ref_id}`,
      `New ${effectivePriority} priority complaint filed in ${effectiveDistrict}: "${title.slice(0, 80)}"`,
      { eventType: 'complaint_registered', actionUrl: `/?trackRef=${encodeURIComponent(ref_id)}` }
    );

    // Free-First Multi-Channel Dispatch (In-App + Resend Email + Web Push)
    await notifyCitizenEvent({
      eventType: 'submission_acknowledgement',
      citizenId: citizenId || (await resolveComplaintCitizenId(created)),
      citizenName: finalCitizenName,
      citizenEmail: finalCitizenEmail,
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
      success: true,
      message: 'Complaint submitted and analyzed successfully',
      complaint: parseComplaint(created, true),
      ref_id: created?.ref_id || ref_id,
      id: created?.id || insertId,
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

// POST /api/complaints/:id/feedback & /api/complaints/:id/rate (Satisfaction Rating)
app.post(['/api/complaints/:id/feedback', '/api/complaints/:id/rate'], optionalCitizenAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback, credential } = req.body;

    const complaint = await db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);
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

    await db.prepare(`
      UPDATE complaints
      SET citizen_rating = ?, citizen_feedback = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR ref_id = ?
    `).run(rating || 5, feedback || null, id, id);

    const updated = await db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);
    res.json({ message: 'Thank you! Your feedback has been recorded.', complaint: parseComplaint(updated, true) });
  } catch (err) {
    console.error('[Feedback Record Error]:', err);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// POST /api/complaints/:id/appeal (Citizen requests reopening)
app.post('/api/complaints/:id/appeal', optionalCitizenAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { appeal_reason, reason, credential } = req.body;
    const finalReason = (appeal_reason || reason || '').trim();

    if (!finalReason || finalReason.length < 10) {
      return res.status(400).json({ error: 'Please explain why the resolution was unsatisfactory (min 10 characters).' });
    }

    const complaint = await db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);
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

    await db.prepare(`
      UPDATE complaints
      SET status = 'Under Review',
          is_appealed = 1,
          appeal_reason = ?,
          reopen_count = COALESCE(reopen_count, 0) + 1,
          status_history = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR ref_id = ?
    `).run(finalReason, JSON.stringify(history), id, id);

    await createNotification(
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

    const updated = await db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);
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
app.get('/api/officer/tasks', authenticateAdmin, async (req, res) => {
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
    const raw = await db.prepare(query).all(...params);
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
app.post('/api/officer/tasks/:id/report', authenticateAdmin, upload.single('evidence'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, internalNotes } = req.body;
    const evidenceUrl = req.file ? `/uploads/${req.file.filename}` : req.body.evidenceUrl;

    const current = await db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);
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

    await db.prepare(`
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

    const updated = await db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);

    // Record administrative audit trail
    await recordAuditLog({
      complaintRef: updated.ref_id,
      actorId: req.admin ? req.admin.id : null,
      actorName: req.admin ? req.admin.name : 'Officer',
      actorRole: req.admin ? req.admin.role : 'officer',
      action: 'OFFICER_FIELD_REPORT',
      previousState: current.status,
      newState: newStatus,
      remarks: remarks || 'Officer field progress report filed',
      ip: req.ip
    });

    // Free-First Citizen Notification on Resolution / Status Change
    const isNewResolution = newStatus === 'Resolved' && current.status !== 'Resolved';
    const statusChanged = newStatus !== current.status;
    if (isNewResolution || statusChanged) {
      const targetCitizenId = await resolveComplaintCitizenId(updated);
      await notifyCitizenEvent({
        eventType: isNewResolution ? 'resolution_certified' : 'status_update',
        citizenId: targetCitizenId,
        citizenName: updated.citizen_name,
        citizenEmail: updated.citizen_email,
        refId: updated.ref_id,
        grievanceTitle: updated.title,
        status: newStatus,
        details: {
          remarks,
          evidenceUrl,
          officer: req.admin.name
        }
      });
    }

    res.json({ message: 'Field report saved successfully', complaint: parseComplaint(updated, true) });
  } catch (err) {
    console.error('Error submitting officer report:', err);
    res.status(500).json({ error: 'Failed to submit officer report' });
  }
});

// -------------------------------------------------------------
// 7. AUTHENTICATED IN-APP NOTIFICATIONS, WEB PUSH & DELIVERY AUDIT LOGS
// -------------------------------------------------------------

// GET /api/notifications (Strict Ownership-Scoped Notification Inbox with Pagination)
app.get('/api/notifications', authenticateAnyUser, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10) || 20, 1), 50);
    const offset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0);
    const unreadOnly = req.query.unreadOnly === 'true';

    let ownerWhere = '';
    const params = [];

    if (req.actor.userType === 'citizen') {
      ownerWhere = "recipient_type = 'citizen' AND recipient_id = ?";
      params.push(req.actor.id);
    } else {
      ownerWhere = "recipient_type = 'admin' AND (recipient_id = ? OR recipient_id IS NULL)";
      params.push(req.actor.id);
    }

    const filterClause = unreadOnly ? ` AND is_read = 0` : '';

    const notifications = await db.prepare(`
      SELECT id, recipient_type, recipient_id, ref_id, title, message, event_type, action_url, is_read, read_at, created_at
      FROM notifications
      WHERE ${ownerWhere}${filterClause}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const unreadRow = await db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE ${ownerWhere} AND is_read = 0
    `).get(...params);

    const totalRow = await db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE ${ownerWhere}
    `).get(...params);

    const unreadCount = Number(unreadRow?.count || 0);
    const totalCount = Number(totalRow?.count || 0);

    res.json({
      notifications: notifications.map(n => ({
        ...n,
        is_read: Boolean(n.is_read)
      })),
      unreadCount,
      totalCount,
      limit,
      offset,
      hasMore: offset + notifications.length < totalCount
    });
  } catch (err) {
    console.error('[Notifications Fetch Error]:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/read-all (Mark all owned notifications read)
app.patch('/api/notifications/read-all', authenticateAnyUser, async (req, res) => {
  try {
    if (req.actor.userType === 'citizen') {
      await db.prepare(`
        UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP
        WHERE recipient_type = 'citizen' AND recipient_id = ? AND is_read = 0
      `).run(req.actor.id);
    } else {
      await db.prepare(`
        UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP
        WHERE recipient_type = 'admin' AND (recipient_id = ? OR recipient_id IS NULL) AND is_read = 0
      `).run(req.actor.id);
    }
    res.json({ success: true, unreadCount: 0 });
  } catch (err) {
    console.error('[Notification Mark-All Error]:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// PATCH /api/notifications/:id/read (Strict ownership enforcement)
app.patch('/api/notifications/:id/read', authenticateAnyUser, async (req, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    if (isNaN(notifId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    let result;
    if (req.actor.userType === 'citizen') {
      result = await db.prepare(`
        UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP
        WHERE id = ? AND recipient_type = 'citizen' AND recipient_id = ?
      `).run(notifId, req.actor.id);
    } else {
      result = await db.prepare(`
        UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP
        WHERE id = ? AND recipient_type = 'admin' AND (recipient_id = ? OR recipient_id IS NULL)
      `).run(notifId, req.actor.id);
    }

    if (!result || result.changes === 0) {
      return res.status(404).json({ error: 'Notification not found or access denied' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Notification Mark Error]:', err);
    res.status(500).json({ error: 'Failed to mark notification' });
  }
});

// DELETE /api/notifications/:id (Strict ownership enforcement)
app.delete('/api/notifications/:id', authenticateAnyUser, async (req, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    if (isNaN(notifId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    let result;
    if (req.actor.userType === 'citizen') {
      result = await db.prepare(`
        DELETE FROM notifications
        WHERE id = ? AND recipient_type = 'citizen' AND recipient_id = ?
      `).run(notifId, req.actor.id);
    } else {
      result = await db.prepare(`
        DELETE FROM notifications
        WHERE id = ? AND recipient_type = 'admin' AND (recipient_id = ? OR recipient_id IS NULL)
      `).run(notifId, req.actor.id);
    }

    if (!result || result.changes === 0) {
      return res.status(404).json({ error: 'Notification not found or access denied' });
    }

    res.json({ success: true, deletedId: notifId });
  } catch (err) {
    console.error('[Notification Delete Error]:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// -------------------------------------------------------------
// 7B. FREE-FIRST BROWSER WEB PUSH ENDPOINTS (VAPID)
// -------------------------------------------------------------

// GET /api/push/vapid-public-key (Public VAPID key only; never exposes private key)
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json(getPublicVapidState());
});

// GET /api/push/status (Authenticated subscription status)
app.get('/api/push/status', authenticateAnyUser, async (req, res) => {
  try {
    const status = await getUserPushStatus(req.actor.userType, req.actor.id);
    res.json(status);
  } catch (err) {
    console.error('[Web Push Status Error]:', err);
    res.status(500).json({ error: 'Failed to inspect push notification status' });
  }
});

// POST /api/push/subscribe (Authenticated Web Push registration)
app.post('/api/push/subscribe', authenticateAnyUser, async (req, res) => {
  try {
    const subscription = req.body?.subscription || req.body;
    const result = await registerPushSubscription({
      userType: req.actor.userType,
      userId: req.actor.id,
      subscription,
      userAgent: req.headers['user-agent'] || ''
    });
    res.status(201).json({
      success: true,
      message: 'Browser push notifications enabled for this device.',
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Invalid push subscription payload' });
  }
});

// POST / DELETE /api/push/unsubscribe & /api/push/subscribe
async function handlePushUnsubscribe(req, res) {
  try {
    const endpoint = req.body?.endpoint || req.query?.endpoint || null;
    const result = await removePushSubscription({
      userType: req.actor.userType,
      userId: req.actor.id,
      endpoint
    });
    res.json({
      success: true,
      message: 'Browser push notifications disabled.',
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to remove push subscription' });
  }
}

app.post('/api/push/unsubscribe', authenticateAnyUser, handlePushUnsubscribe);
app.delete('/api/push/subscribe', authenticateAnyUser, handlePushUnsubscribe);

// GET /api/admin/notifications/logs (Real-Time Notification Delivery Logs)
app.get('/api/admin/notifications/logs', authenticateAdmin, async (req, res) => {
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

    const logs = await db.prepare(query).all(...params);
    res.json({ logs });
  } catch (err) {
    console.error('[Notification Logs Fetch Error]:', err);
    res.status(500).json({ error: 'Failed to fetch notification logs' });
  }
});

// POST /api/admin/notifications/test-email (Live Resend / SMTP Verification)
app.post('/api/admin/notifications/test-email', authenticateAdmin, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to || !to.includes('@')) {
      return res.status(400).json({ error: 'A valid recipient email address is required.' });
    }

    const result = await testEmailConnection(to, req.admin.name);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Email verification error' });
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
app.patch('/api/complaints/:id/manage', authenticateAdmin, async (req, res) => {
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

    const current = await db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);
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

    const update = await db.prepare(`
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

    await update.run(
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

    const updated = await db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);

    // Free-First Multi-Channel Notification to citizen (In-App + Resend Email + Web Push)
    const isNewResolution = newStatus === 'Resolved' && current.status !== 'Resolved';
    const statusChanged = newStatus !== current.status;
    const officerChanged = Boolean(newOfficer && newOfficer !== current.assigned_officer);

    if (isNewResolution || statusChanged || officerChanged) {
      const targetCitizenId = await resolveComplaintCitizenId(updated);
      const evt = isNewResolution
        ? 'resolution_certified'
        : statusChanged
          ? 'status_update'
          : 'officer_assignment';

      await notifyCitizenEvent({
        eventType: evt,
        citizenId: targetCitizenId,
        citizenName: updated.citizen_name,
        citizenEmail: updated.citizen_email,
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
    }

    // Record administrative audit trail
    await recordAuditLog({
      complaintRef: updated.ref_id,
      actorId: req.admin ? req.admin.id : null,
      actorName: req.admin ? req.admin.name : 'Municipal Officer',
      actorRole: req.admin ? req.admin.role : 'officer',
      action: 'MANAGE_COMPLAINT',
      previousState: { status: current.status, department: current.department, officer: current.assigned_officer },
      newState: { status: newStatus, department: newDept, officer: newOfficer },
      remarks: noteText,
      ip: req.ip
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
app.patch('/api/complaints/:id/status', authenticateAdmin, async (req, res) => {
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

    const current = await db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);
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

    await db.prepare(`
      UPDATE complaints
      SET status = ?, status_history = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR ref_id = ?
    `).run(status, JSON.stringify(history), id, id);

    const updated = await db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);

    // Record audit log
    await recordAuditLog({
      complaintRef: updated.ref_id,
      actorId: req.admin ? req.admin.id : null,
      actorName: req.admin ? req.admin.name : 'Municipal Officer',
      actorRole: req.admin ? req.admin.role : 'officer',
      action: 'STATUS_UPDATE',
      previousState: current.status,
      newState: status,
      remarks: `Status updated to ${status}`,
      ip: req.ip
    });

    const isNewResolution = status === 'Resolved' && current.status !== 'Resolved';
    const statusChanged = status !== current.status;
    if (isNewResolution || statusChanged) {
      const targetCitizenId = await resolveComplaintCitizenId(updated);
      await notifyCitizenEvent({
        eventType: isNewResolution ? 'resolution_certified' : 'status_update',
        citizenId: targetCitizenId,
        citizenName: updated.citizen_name,
        citizenEmail: updated.citizen_email,
        refId: updated.ref_id,
        grievanceTitle: updated.title,
        status,
        details: {
          remarks: `Status updated to ${status}`
        }
      });
    }

    invalidateStatsCache();

    res.json({ message: 'Status updated successfully', complaint: parseComplaint(updated, true) });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// PATCH /api/complaints/:id/assign (Assign department & field officer)
app.patch('/api/complaints/:id/assign', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { department, assigned_officer, internal_notes } = req.body;
    if (!department && !assigned_officer) {
      return res.status(400).json({ error: 'Department or assigned officer is required for assignment.' });
    }

    const current = await db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);
    if (!current) return res.status(404).json({ error: 'Complaint not found' });

    const newDept = department || current.department;
    const newOfficer = assigned_officer || current.assigned_officer;
    const newNotes = internal_notes !== undefined ? internal_notes : current.internal_notes;
    const newStatus = (current.status === 'Submitted' || current.status === 'Under Review') ? 'Assigned' : current.status;

    const parsed = parseComplaint(current, true);
    const history = parsed.status_history || [];
    history.push({
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: `Assigned to department "${newDept}" and officer "${newOfficer}"`,
      actor: `${req.admin.name} (${req.admin.designation || 'Officer'})`
    });

    await db.prepare(`
      UPDATE complaints
      SET department = ?, assigned_officer = ?, internal_notes = ?, status = ?, status_history = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR ref_id = ?
    `).run(newDept, newOfficer, newNotes, newStatus, JSON.stringify(history), id, id);

    const updated = await db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);

    await recordAuditLog({
      complaintRef: updated.ref_id,
      actorId: req.admin.id,
      actorName: req.admin.name,
      actorRole: req.admin.role,
      action: 'ASSIGN_COMPLAINT',
      previousState: { department: current.department, assigned_officer: current.assigned_officer },
      newState: { department: newDept, assigned_officer: newOfficer },
      remarks: `Assigned to ${newDept} / ${newOfficer}`,
      ip: req.ip
    });

    invalidateStatsCache();
    res.json({ message: 'Complaint assigned successfully', complaint: parseComplaint(updated, true) });
  } catch (err) {
    console.error('Error assigning complaint:', err);
    res.status(500).json({ error: 'Failed to assign complaint' });
  }
});

// POST /api/complaints/:id/escalate (Escalate overdue or critical complaint)
app.post('/api/complaints/:id/escalate', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, escalation_level = 'Supervisor Review' } = req.body;

    const current = await db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);
    if (!current) return res.status(404).json({ error: 'Complaint not found' });

    const parsed = parseComplaint(current, true);
    const history = parsed.status_history || [];
    const escalateNote = reason || 'Escalated due to SLA urgency or critical public safety concern';

    history.push({
      status: escalation_level,
      timestamp: new Date().toISOString(),
      note: `Administrative escalation: ${escalateNote}`,
      actor: `${req.admin.name} (${req.admin.designation || 'Officer'})`
    });

    await db.prepare(`
      UPDATE complaints
      SET status = ?, priority = 'Critical', status_history = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR ref_id = ?
    `).run(escalation_level, JSON.stringify(history), id, id);

    const updated = await db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(id, id);

    await recordAuditLog({
      complaintRef: updated.ref_id,
      actorId: req.admin.id,
      actorName: req.admin.name,
      actorRole: req.admin.role,
      action: 'ESCALATE_COMPLAINT',
      previousState: { status: current.status, priority: current.priority },
      newState: { status: escalation_level, priority: 'Critical' },
      remarks: escalateNote,
      ip: req.ip
    });

    invalidateStatsCache();
    res.json({ message: 'Complaint escalated successfully', complaint: parseComplaint(updated, true) });
  } catch (err) {
    console.error('Error escalating complaint:', err);
    res.status(500).json({ error: 'Failed to escalate complaint' });
  }
});

// GET /api/admin/duplicates/:id (Inspect duplicate candidates for a complaint)
app.get('/api/admin/duplicates/:id', authenticateAdmin, async (req, res) => {
  try {
    const target = await db.prepare('SELECT * FROM complaints WHERE id = ? OR ref_id = ?').get(req.params.id, req.params.id);
    if (!target) return res.status(404).json({ error: 'Complaint not found' });

    const duplicates = await findDuplicateCandidates({
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
app.post('/api/admin/link-duplicate', authenticateAdmin, async (req, res) => {
  try {
    const { primaryRefId, duplicateRefId } = req.body;
    if (!primaryRefId || !duplicateRefId) {
      return res.status(400).json({ error: 'Both primaryRefId and duplicateRefId are required.' });
    }

    await db.prepare(`
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

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=15');
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
    const countsRow = await db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('Submitted', 'Under Review') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as high_priority,
        SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN status IN ('Assigned', 'In Progress') THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status != 'Resolved' AND sla_deadline IS NOT NULL AND CURRENT_TIMESTAMP > sla_deadline THEN 1 ELSE 0 END) as overdue
      FROM complaints ${whereClause}
    `).get(...params) || {};

    // Distinct departments with counts
    const departments = await db.prepare(`
      SELECT department, COUNT(*) as count
      FROM complaints
      ${whereClause} AND department IS NOT NULL AND department != ''
      GROUP BY department
      ORDER BY count DESC
    `).all(...params);

    // District distribution
    const districtRows = await db.prepare(`
      SELECT district, COUNT(*) as count
      FROM complaints
      ${whereClause}
      GROUP BY district
      ORDER BY count DESC
    `).all(...params);

    // Category distribution
    const categoryRows = await db.prepare(`
      SELECT category, COUNT(*) as count
      FROM complaints
      ${whereClause}
      GROUP BY category
      ORDER BY count DESC
    `).all(...params);

    // Priority distribution
    const priorityRows = await db.prepare(`
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

    const total = Number(countsRow.total) || 0;
    const resolved = Number(countsRow.resolved) || 0;
    const slaRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const normalizedDepartments = (departments || []).map(d => ({
      department: d.department || 'General',
      count: Number(d.count) || 0
    }));

    const normalizedDistricts = (districtRows || []).map(d => ({
      district: d.district || 'General',
      count: Number(d.count) || 0
    }));

    const normalizedCategories = (categoryRows || []).map(c => ({
      category: c.category || 'General',
      count: Number(c.count) || 0
    }));

    const normalizedPriorities = (priorityRows || []).map(p => ({
      priority: p.priority || 'Medium',
      count: Number(p.count) || 0
    }));

    const payload = {
      total: total,
      totalComplaints: total,
      pending: Number(countsRow.pending) || 0,
      pendingComplaints: Number(countsRow.pending) || 0,
      highPriority: Number(countsRow.high_priority) || 0,
      highPriorityComplaints: Number(countsRow.high_priority) || 0,
      critical: Number(countsRow.critical) || 0,
      criticalComplaints: Number(countsRow.critical) || 0,
      inProgress: Number(countsRow.in_progress) || 0,
      inProgressComplaints: Number(countsRow.in_progress) || 0,
      resolved: resolved,
      resolvedComplaints: resolved,
      overdue: Number(countsRow.overdue) || 0,
      overdueComplaints: Number(countsRow.overdue) || 0,
      resolutionRate: slaRate,
      slaResolutionRate: `${slaRate}%`,
      departments: normalizedDepartments,
      districts: normalizedDistricts,
      districtDistribution: normalizedDistricts,
      categoryDistribution: normalizedCategories,
      priorityDistribution: normalizedPriorities
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
app.get('/api/announcements', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    const announcements = await db.prepare(`
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
app.post('/api/admin/announcements', authenticateAdmin, async (req, res) => {
  try {
    const { title, title_ta, content, content_ta, category, priority, department } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    const insert = await db.prepare(`
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

    await recordAuditLog({
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
app.delete('/api/admin/announcements/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.prepare('SELECT id, title FROM announcements WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    await db.prepare('DELETE FROM announcements WHERE id = ?').run(id);

    await recordAuditLog({
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
app.get('/api/admin/audit-logs', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const logs = await db.prepare(`
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

// GET /api/admin/database/info (Inspect database storage location, persistence, and record counts)
app.get('/api/admin/database/info', authenticateAdmin, async (req, res) => {
  try {
    if (db && db.isPostgres) {
      const complaintRow = await db.prepare('SELECT COUNT(*) as c FROM complaints').get();
      const citizenRow = await db.prepare('SELECT COUNT(*) as c FROM citizens').get();
      const adminRow = await db.prepare('SELECT COUNT(*) as c FROM admins').get();
      return res.json({
        engine: 'postgresql',
        dbPath: 'Supabase PostgreSQL Managed Cluster',
        exists: true,
        sizeBytes: 0,
        sizeKb: 0,
        persistentDiskMounted: true,
        storageType: 'Supabase Managed PostgreSQL (AWS ap-northeast-1)',
        journalMode: 'WAL (PostgreSQL Engine)',
        synchronous: 'Full (Remote Replica Guaranteed)',
        counts: {
          complaints: Number(complaintRow?.c ?? 0),
          citizens: Number(citizenRow?.c ?? 0),
          admins: Number(adminRow?.c ?? 0)
        }
      });
    }

    const dbPath = db.dbPath || process.env.SQLITE_DB_PATH ||
      (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'civicresolve.db') : path.join(__dirname, 'civicresolve.db'));
    const isPersistentDisk = Boolean(process.env.DATA_DIR && process.env.DATA_DIR.includes('/var/data'));
    const fileStats = fs.existsSync(dbPath) ? fs.statSync(dbPath) : null;
    const complaintRow = await db.prepare('SELECT COUNT(*) as c FROM complaints').get();
    const citizenRow = await db.prepare('SELECT COUNT(*) as c FROM citizens').get();
    const adminRow = await db.prepare('SELECT COUNT(*) as c FROM admins').get();
    const complaintCount = complaintRow ? complaintRow.c : 0;
    const citizenCount = citizenRow ? citizenRow.c : 0;
    const adminCount = adminRow ? adminRow.c : 0;

    let journalMode = 'unknown';
    let syncMode = 'unknown';
    try {
      journalMode = db.pragma('journal_mode')[0]?.journal_mode || 'unknown';
      syncMode = db.pragma('synchronous')[0]?.synchronous ?? 'unknown';
    } catch (_) {}

    res.json({
      engine: 'sqlite',
      dbPath,
      exists: Boolean(fileStats),
      sizeBytes: fileStats ? fileStats.size : 0,
      sizeKb: fileStats ? Math.round(fileStats.size / 1024) : 0,
      persistentDiskMounted: isPersistentDisk,
      storageType: isPersistentDisk ? 'Render Persistent Disk (/var/data)' : 'Local Filesystem',
      journalMode,
      synchronous: syncMode,
      counts: {
        complaints: complaintCount,
        citizens: citizenCount,
        admins: adminCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to inspect database status' });
  }
});

// GET /api/admin/database/backup (Super Admin-authorized SQLite Online Backup API snapshot download)
app.get('/api/admin/database/backup', authenticateAdmin, requireRole('super_admin'), async (req, res) => {
  let tempSnapshotPath = null;
  try {
    const tempDir = path.join(__dirname, 'backups_temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    if (db && db.isPostgres) {
      const { createDatabaseBackup } = require('./backup_manager');
      const backupResult = await createDatabaseBackup(db, { backupDir: tempDir });
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${backupResult.filename}"`);
      const stream = fs.createReadStream(backupResult.backupPath);
      stream.pipe(res);
      stream.on('end', () => {
        try { fs.unlinkSync(backupResult.backupPath); } catch (_) {}
      });
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const downloadName = `civicresolve-backup-${timestamp}.db`;
    tempSnapshotPath = path.join(tempDir, `snapshot-${timestamp}-${Math.random().toString(36).slice(2, 8)}.db`);

    // Execute non-destructive online backup using SQLite Online Backup API
    if (typeof db.backup === 'function') {
      await db.backup(tempSnapshotPath);
    } else {
      // Non-destructive fallback for adapter
      db.exec(`VACUUM INTO '${tempSnapshotPath.replace(/'/g, "''")}'`);
    }

    if (!fs.existsSync(tempSnapshotPath)) {
      throw new Error('Online backup snapshot file was not created.');
    }

    // Verify snapshot integrity and table counts using a read-only connection
    const Database = require('better-sqlite3');
    let verifyDb;
    try {
      verifyDb = new Database(tempSnapshotPath, { readonly: true });
      const integrity = verifyDb.pragma('integrity_check');
      const isOk = Array.isArray(integrity) && integrity.length > 0 &&
        (integrity[0].integrity_check === 'ok' || Object.values(integrity[0])[0] === 'ok');
      if (!isOk) {
        throw new Error('Backup snapshot integrity check failed: ' + JSON.stringify(integrity));
      }

      // Verify table counts without exposing any personal information
      const complaintCount = verifyDb.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
      const citizenCount = verifyDb.prepare('SELECT COUNT(*) as c FROM citizens').get().c;
      const adminCount = verifyDb.prepare('SELECT COUNT(*) as c FROM admins').get().c;
      console.log(`[Database Backup]: Online backup snapshot verified. Complaints: ${complaintCount}, Citizens: ${citizenCount}, Admins: ${adminCount}.`);
    } finally {
      if (verifyDb && verifyDb.open) {
        verifyDb.close();
      }
    }

    // Stream the verified snapshot directly to client and delete the temporary file after transfer
    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    const stream = fs.createReadStream(tempSnapshotPath);
    stream.pipe(res);
    stream.on('end', () => {
      if (tempSnapshotPath && fs.existsSync(tempSnapshotPath)) {
        try { fs.unlinkSync(tempSnapshotPath); } catch (_) {}
      }
    });
    stream.on('error', (err) => {
      if (tempSnapshotPath && fs.existsSync(tempSnapshotPath)) {
        try { fs.unlinkSync(tempSnapshotPath); } catch (_) {}
      }
      if (!res.headersSent) {
        console.error('[DB Backup Error]: Stream transfer failed:', err.message);
        res.status(500).json({ error: 'Database backup download stream interrupted.' });
      }
    });
  } catch (err) {
    if (tempSnapshotPath && fs.existsSync(tempSnapshotPath)) {
      try {
        fs.unlinkSync(tempSnapshotPath);
      } catch (_) {}
    }
    console.error('[DB Backup Error]:', err.message);
    res.status(500).json({ error: 'Database backup generation failed: ' + err.message });
  }
});

// GET /api/geocode/reverse (Authoritative GIS & Reverse Geocoding Endpoint)
app.get('/api/geocode/reverse', async (req, res) => {
  try {
    const { lat, lng, accuracy } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and Longitude are required parameters.' });
    }

    const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const rateCheck = checkGeocodeRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Reverse geocoding rate limit exceeded. Please retry in ${rateCheck.retryAfter} seconds.`
      });
    }

    const result = await reverseGeocodeLocation(lat, lng, accuracy ? parseFloat(accuracy) : null);
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }

    res.json(result);
  } catch (err) {
    console.error('[Reverse Geocode Error]:', err);
    res.status(500).json({ error: 'Failed to reverse geocode location' });
  }
});

// GET /api/complaints/:refId/receipt (Official Complaint Acknowledgement Receipt)
app.get('/api/complaints/:refId/receipt', optionalCitizenAuth, async (req, res) => {
  try {
    const { refId } = req.params;
    const complaint = await db.prepare('SELECT * FROM complaints WHERE ref_id = ?').get(refId);
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
  (async () => {
    // Phase 8: Database migrations must finish before accepting requests; migration failures prevent startup.
    if (db && db.isPostgres && process.env.AUTO_MIGRATE !== 'false' && process.env.NODE_ENV !== 'test') {
      const { runMigrations } = require('./migrate');
      try {
        console.log('[CivicResolve Server] Verifying PostgreSQL database migrations before accepting traffic...');
        await runMigrations({ pool: db.pool, schema: db.schema });
        console.log('[CivicResolve Server] Database migrations verified successfully.');
      } catch (migErr) {
        console.error('[FATAL STARTUP ERROR] Migration verification failed. Server refusing to start:', migErr.message);
        process.exit(1);
      }
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[CivicResolve Server] Live on http://127.0.0.1:${PORT} (0.0.0.0)`);
      console.log(`[CivicResolve Server] AI Engine: Google Gemini (${process.env.GEMINI_MODEL || 'gemini-2.5-flash'})`);
      console.log(`[CivicResolve Server] SMS Provider: ${isSmsConfigured() ? (process.env.SMS_PROVIDER || 'Twilio') : 'SAFE DEVELOPMENT SIMULATION'}`);
      console.log(`[CivicResolve Server] SMTP Email Delivery: ${isSmtpConfigured() ? 'CONFIGURED' : 'UNCONFIGURED'}`);
    });

    const handleShutdown = (signal) => {
      console.log(`[CivicResolve Server] Received ${signal}. Starting graceful shutdown...`);
      // Stop accepting new connections; allow existing active requests to finish
      server.close(() => {
        console.log('[CivicResolve Server] HTTP server closed; all in-flight requests completed.');
        try {
          if (db && db.open) {
            // Perform WAL checkpoint and inspect results
            const cpRes = db.pragma('wal_checkpoint(TRUNCATE)');
            const cpRow = Array.isArray(cpRes) && cpRes.length > 0 ? cpRes[0] : null;
            const isBusy = cpRow ? (cpRow.busy === 1 || cpRow.busy === '1') : false;

            if (isBusy) {
              console.warn('[CivicResolve Server] WAL checkpoint returned busy/incomplete status:', cpRow);
              // Attempt non-blocking passive checkpoint fallback
              try {
                const passiveRes = db.pragma('wal_checkpoint(PASSIVE)');
                console.log('[CivicResolve Server] Secondary passive WAL checkpoint result:', passiveRes);
              } catch (passiveErr) {
                console.warn('[CivicResolve Server] Secondary checkpoint error:', passiveErr.message);
              }
            } else {
              console.log('[CivicResolve Server] Database WAL checkpointed successfully:', cpRow);
            }

            db.close();
            console.log('[CivicResolve Server] Database connection closed cleanly.');
          }
        } catch (dbErr) {
          console.error('[CivicResolve Server] Error closing database during shutdown:', dbErr.message);
        }
        process.exit(0);
      });

      // Force exit if connections do not drain within 10 seconds (avoid closing DB while requests are still in-flight)
      setTimeout(() => {
        console.error('[CivicResolve Server] Graceful shutdown timed out (10s). Forcing process exit without closing database on active in-flight requests.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  })().catch(err => {
    console.error('[CivicResolve Server] Fatal initialization failure:', err);
    process.exit(1);
  });
}

module.exports = app;
