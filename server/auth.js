const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'civicresolve_jwt_fallback_secret_key_2026';
const JWT_EXPIRES_IN = '24h';

// Cryptographically Secure OTP Utilities
function generateSecureOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp) {
  const salt = process.env.OTP_SALT || 'civic_resolve_otp_salt_2026';
  return crypto.createHash('sha256').update(String(otp).trim() + salt).digest('hex');
}

// Password utilities
function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

// Token utilities
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// In-Memory Login Rate Limiter (Max 5 failed attempts per 15 mins per IP)
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 mins
const MAX_ATTEMPTS = 5;

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record) return { allowed: true };

  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      message: `Account locked due to consecutive failed attempts. Please retry in ${remainingSeconds} seconds.`
    };
  }

  // Window expired
  if (now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + RATE_LIMIT_WINDOW_MS;
    return {
      allowed: false,
      message: 'Too many failed login attempts. Login temporarily locked for 15 minutes.'
    };
  }

  return { allowed: true };
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: null };
  record.count += 1;
  loginAttempts.set(ip, record);
}

function recordSuccessfulLogin(ip) {
  loginAttempts.delete(ip);
}

const ADMIN_ROLES = ['admin', 'super_admin', 'district_admin', 'municipal_admin', 'department_officer', 'field_officer'];

// Admin Authentication Middleware
function authenticateAdmin(req, res, next) {
  try {
    let token = null;

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies.civic_admin_token) {
      token = req.cookies.civic_admin_token;
    }

    // 2. Check Authorization Bearer header
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        error: 'Administrator authentication required. Please log in.'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        error: 'Invalid or expired administrator token. Please log in again.'
      });
    }

    // Verify admin in database
    const admin = db.prepare('SELECT id, email, name, role, district, department, designation FROM admins WHERE id = ?').get(decoded.id);
    if (!admin || !ADMIN_ROLES.includes(admin.role)) {
      return res.status(403).json({
        error: 'Access denied: Active administrator privileges required.'
      });
    }

    req.admin = admin;
    next();
  } catch (err) {
    console.error('[Auth Error]:', err.message);
    res.status(500).json({ error: 'Authentication internal error' });
  }
}

// Citizen Authentication Middleware
function authenticateCitizen(req, res, next) {
  try {
    let token = null;

    if (req.cookies && req.cookies.civic_citizen_token) {
      token = req.cookies.civic_citizen_token;
    }

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        error: 'Citizen authentication required. Please log in to view personal records.'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        error: 'Session expired. Please log in again.'
      });
    }

    const citizen = db.prepare('SELECT id, name, email, phone, district FROM citizens WHERE id = ?').get(decoded.id);
    if (!citizen) {
      return res.status(401).json({ error: 'Citizen record not found.' });
    }

    req.citizen = citizen;
    next();
  } catch (err) {
    console.error('[Citizen Auth Error]:', err.message);
    res.status(500).json({ error: 'Citizen authentication error' });
  }
}

// Optional Citizen Auth Middleware (attaches req.citizen if valid token exists)
function optionalCitizenAuth(req, res, next) {
  try {
    let token = null;

    if (req.cookies && req.cookies.civic_citizen_token) {
      token = req.cookies.civic_citizen_token;
    }

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        const citizen = db.prepare('SELECT id, name, email, phone, district FROM citizens WHERE id = ?').get(decoded.id);
        if (citizen) req.citizen = citizen;
      }
    }
  } catch {}
  next();
}

// Role-Based Access Control middleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Administrator authentication required.' });
    }
    const role = req.admin.role;
    if (role === 'super_admin' || allowedRoles.includes(role)) {
      return next();
    }
    return res.status(403).json({
      error: `Access denied. Authorized roles: [${allowedRoles.join(', ')}]`
    });
  };
}

module.exports = {
  generateSecureOtp,
  hashOtp,
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
  requireRole,
  ADMIN_ROLES
};
