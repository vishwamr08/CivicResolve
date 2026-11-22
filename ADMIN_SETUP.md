# CivicResolve – Administrator Setup & Security Guide

> **Audience**: Municipal IT administrators, system operators, and DevOps engineers responsible for deploying and maintaining the CivicResolve platform.

---

## 1. Overview

CivicResolve implements a **secure JWT-based administrator authentication system** using industry-standard libraries:

| Component | Library | Purpose |
|:---|:---|:---|
| Password Hashing | `bcryptjs` (cost factor 12) | Irreversible one-way hash stored in SQLite |
| Session Tokens | `jsonwebtoken` (HS256, 24h TTL) | Signed tokens issued on successful login |
| Cookie Transport | `cookie-parser` + HTTP-only cookie | Browser-safe token delivery |
| Rate Limiting | In-memory per-IP counter | 5 failed attempts → 15-minute lockout |
| Route Protection | `authenticateAdmin` middleware | All admin PATCH routes require valid token |

No plaintext passwords are ever stored, logged, or transmitted.

---

## 2. Environment Variables

The admin system is controlled entirely by backend environment variables in `server/.env`.

### Required Variables

```env
# Google Cloud & Gemini AI Engine (Powered by official @google/genai SDK)
GEMINI_API_KEY="your_gemini_api_key_here"
GEMINI_MODEL="gemini-2.5-flash"

# Google Maps Platform Key (Interactive Geocoding & Maps JS API)
GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"

# Google reCAPTCHA Verification
RECAPTCHA_SECRET_KEY="your_recaptcha_secret_key_here"
RECAPTCHA_SITE_KEY="your_recaptcha_site_key_here"

# JWT Signing Secret — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET="your_64_character_hex_secret_here"

# Initial Administrator Account (used ONLY on first database boot when admins table is empty)
INITIAL_ADMIN_EMAIL="admin@civicresolve.gov"
INITIAL_ADMIN_PASSWORD="YourSecurePassword#2026"
INITIAL_ADMIN_NAME="Director of Municipal Operations"

# Node environment
NODE_ENV="development"
PORT=5000
```

> **CRITICAL**: Values containing special characters (`#`, `!`, `$`, `@`, `&`) MUST be wrapped in double quotes in `.env` files. Without quotes, the shell parser truncates the value at the special character.
>
> ✅ `INITIAL_ADMIN_PASSWORD="CivicAdmin#2026!Secure"` — correct  
> ❌ `INITIAL_ADMIN_PASSWORD=CivicAdmin#2026!Secure` — truncated to `CivicAdmin`

### Safe Defaults (never commit real values)

A safe placeholder template is provided at `server/.env.example`. Copy it and fill in real values:

```bash
cp server/.env.example server/.env
```

---

## 3. Admin Account Initialization & Secure Provisioning

### A. Authoritative Provisioning CLI (`provision_admin.js`)

In production environments (Supabase PostgreSQL / Render), administrators should **never** hardcode passwords into `.env` files or SQL migrations. CivicResolve provides a dedicated, audited provisioning CLI:

```bash
# Provision on Supabase PostgreSQL (requires --confirm flag for safety)
node provision_admin.js --confirm

# Or provision with a designated email and password
node provision_admin.js --email admin@civicresolve.gov --password "YourStrongPassword#2026!" --confirm

# For local development SQLite database:
node provision_admin.js --sqlite --confirm
```

**Security Guarantees:**
1. **Preserves Identity & Role:** Updates the authoritative `admin@civicresolve.gov` (ID 1) account, preserving its `super_admin` role and existing municipal profile.
2. **bcrypt Cost 12:** All passwords are hashed using bcrypt cost factor 12 (~250ms).
3. **Random Password Generation:** When `--password` is omitted, generates a cryptographically secure 24-character random password and prints it once to stdout.
4. **Explicit Confirmation Gate:** In production mode, operations fail closed unless `--confirm` is explicitly provided.
5. **No Boot-Time Overwrite:** The server never automatically overwrites existing passwords on reboot.

### B. First Boot Behavior (Local Development Only)

On **first local server startup** (when the SQLite `admins` table contains zero rows), `server/db.js` automatically:

1. Reads `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` from environment.
2. Hashes the password using `bcryptjs` with cost factor 12 (requires ~250ms on modern hardware by design).
3. Inserts the administrator row into the `admins` table.
4. Logs `[Security] Master administrator account initialized for: <email>` to stdout.

**This seed only runs once.** Subsequent restarts check `COUNT(*) FROM admins` and skip seeding if any admin exists.

### Verifying the Admin Account

Use the SQLite CLI to inspect the admins table:

```bash
cd server
node -e "
const db = require('./db');
const admin = db.prepare('SELECT id, email, name, role, created_at FROM admins').all();
console.table(admin);
"
```

Expected output:

```
┌─────────┬────┬──────────────────────────────┬──────────────────────────────────────┬───────┬──────────────────────────┐
│ (index) │ id │ email                        │ name                                 │ role  │ created_at               │
├─────────┼────┼──────────────────────────────┼──────────────────────────────────────┼───────┼──────────────────────────┤
│    0    │  1 │ 'admin@civicresolve.gov'     │ 'Director of Municipal Operations'   │'admin'│'2026-11-21 04:09:08'     │
└─────────┴────┴──────────────────────────────┴──────────────────────────────────────┴───────┴──────────────────────────┘
```

---

## 4. Admin Login Flow

### Web Browser Login

1. Navigate to `http://localhost:5173`
2. Click **Admin Login** in the top navigation bar
3. Enter credentials on the **CivicResolve Command Center** login screen
4. Click **Sign In to Command Center**

For hackathon demonstration, click **"Auto-fill Demo Credentials"** to pre-populate the form.

### API Authentication

```bash
# Login and capture token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@civicresolve.gov", "password": "CivicAdmin#2026!Secure"}' \
  -c cookies.txt

# Use Bearer token for protected routes
curl -X PATCH http://localhost:5000/api/complaints/1/manage \
  -H "Authorization: Bearer <token_from_login_response>" \
  -H "Content-Type: application/json" \
  -d '{"status": "In Progress", "department": "Roads and Highways"}'

# Verify active session
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <token>"

# Logout
curl -X POST http://localhost:5000/api/auth/logout \
  -b cookies.txt
```

---

## 5. JWT Token Details

| Property | Value |
|:---|:---|
| Algorithm | HS256 (HMAC-SHA256) |
| Expiry | 24 hours from issue |
| Transport (Browser) | HTTP-only cookie: `civic_admin_token` |
| Transport (API Clients) | `Authorization: Bearer <token>` header |
| Payload | `{ id, email, name, role }` — no password data |
| Secret | `JWT_SECRET` env var (minimum 32 characters recommended) |

### Token Verification Flow

Every request to a protected admin route:

1. Checks for `civic_admin_token` HTTP-only cookie first.
2. Falls back to `Authorization: Bearer` header.
3. Verifies the JWT signature using `JWT_SECRET`.
4. Cross-checks the decoded `admin.id` against the live `admins` database table.
5. Confirms `role === 'admin'` — rejects if revoked or demoted.
6. Attaches the verified `req.admin` object for downstream audit logging.

---

## 6. Protected API Endpoints

The following routes require a valid administrator JWT:

| Method | Endpoint | Purpose |
|:---|:---|:---|
| `PATCH` | `/api/complaints/:id/manage` | Full complaint management (status, dept, category, remarks) |
| `PATCH` | `/api/complaints/:id/status` | Quick status update |
| `GET` | `/api/auth/me` | Verify current session |
| `POST` | `/api/auth/logout` | Invalidate cookie session |

All other endpoints (`GET /api/complaints`, `POST /api/complaints`, `GET /api/dashboard/stats`, `GET /api/health`) are public — no authentication required.

**Security principle**: Public routes serve citizens. Admin routes enforce JWT validation on the **backend** — never trust role data sent from the frontend.

---

## 7. Rate Limiting

The login endpoint (`POST /api/auth/login`) applies an in-memory per-IP rate limiter:

| Setting | Value |
|:---|:---|
| Max failed attempts | 5 per IP |
| Lockout window | 15 minutes |
| Reset trigger | Successful login |
| HTTP Response on lock | `429 Too Many Requests` |

> **Note**: This is an in-memory implementation — the counter resets on server restart. For production, replace with Redis-backed rate limiting (e.g., `rate-limiter-flexible` package).

---

## 8. Password Reset Procedure

There is no self-service password reset in the MVP. To reset the administrator password manually:

```bash
cd server

# 1. Generate bcrypt hash for the new password
node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('YourNewPassword#2026', 12);
console.log(hash);
"

# 2. Update the hash in the database
node -e "
const db = require('./db');
const hash = '<paste_hash_from_step_1>';
const result = db.prepare('UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?')
  .run(hash, 'admin@civicresolve.gov');
console.log('Updated rows:', result.changes);
"
```

---

## 9. Adding Additional Administrators

```bash
cd server
node -e "
const db = require('./db');
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('NewAdminPassword#2026', 12);
db.prepare('INSERT INTO admins (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
  .run('officer2@civicresolve.gov', hash, 'Deputy Commissioner', 'admin');
console.log('Admin added successfully');
"
```

---

## 10. Security Checklist

Before deploying to production, verify each item:

- [ ] `server/.env` is listed in `.gitignore` and **never committed**
- [ ] `JWT_SECRET` is at least 64 random characters (not the default fallback value)
- [ ] `INITIAL_ADMIN_PASSWORD` is a strong password (12+ chars, mixed case, numbers, symbols)
- [ ] `NODE_ENV=production` is set in production environment
- [ ] `secure: true` is active on cookies (auto-enabled when `NODE_ENV=production`)
- [ ] `civicresolve.db` SQLite file is excluded from git via `.gitignore`
- [ ] Uploaded images directory (`server/uploads/`) is excluded from git
- [ ] No `console.log(password)` or `console.log(token)` statements exist in code
- [ ] All SQL queries use prepared statements (no string concatenation)
- [ ] File upload MIME validation is enforced (`image/jpeg`, `image/png`, `image/webp` only)
- [ ] `GEMINI_API_KEY` only exists in backend `.env` — never referenced in any frontend file
- [ ] Admin API routes return `401` without a valid token (verified in automated tests)

---

## 11. Demo Credentials (Hackathon Only)

> **WARNING**: These credentials are for demonstration purposes only. Change immediately before any real deployment.

| Field | Value |
|:---|:---|
| **Email** | `admin@civicresolve.gov` |
| **Password** | `CivicAdmin#2026!Secure` |
| **Role** | Administrator |
| **Token Validity** | 24 hours from login |

The Admin Login page includes an **"Auto-fill Demo Credentials"** button to streamline hackathon judging sessions.
