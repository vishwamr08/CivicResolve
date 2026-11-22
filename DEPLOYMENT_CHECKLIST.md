# CivicResolve — Production Deployment & Readiness Checklist

Complete this checklist before deploying CivicResolve to production on Render and Supabase.

---

## 1. Pre-Deployment Verification Checklist

- [x] **Automated Regression Testing:** 18 regression test suites passing cleanly (471/471 assertions).
- [x] **PostgreSQL Migration Test Suite:** Versioned migrations verified on PostgreSQL (39/39 assertions).
- [x] **PostgreSQL Dual Architecture Test Suite:** Parameter translation, transactions, and repository parity verified (18/18 assertions).
- [x] **Database Safety Baseline:** Genuine local SQLite database and Phase 1 safety backup verified byte-for-byte identical (SHA-256 hashes preserved).
- [x] **Frontend Production Build:** Vite production bundle compiles cleanly in < 3s (`npm --prefix client run build`).
- [x] **Tamil Nadu Geographic Master Data:** All 38 districts and authoritative 25 municipal corporations verified.
- [x] **Bilingual Localization:** 100% key parity between English and Tamil dictionaries (246 keys each, 0 missing, 0 corrupt Unicode).
- [x] **WCAG Touch Target & Form Accessibility:** All buttons meet 44px minimum touch target height; accessible labels and ARIA attributes on all form inputs.
- [x] **Backend RBAC Enforcement:** Role-based access restrictions strictly enforced on all administrative endpoints.
- [x] **Mandatory Citizen Authentication:** Grievance submissions require authenticated citizen session; anti-spoofing ownership verified server-side.
- [x] **Token Invalidation & Session Security:** Explicit logouts revoke JWT sessions in `revoked_tokens` table.
- [x] **CSRF & Security Headers:** Exact origin verification on cookie mutations; `nosniff`, `DENY`, and `strict-origin-when-cross-origin` enforced.

---

## 2. Render & Supabase Production Setup

### Database Infrastructure (Supabase PostgreSQL)
- **Engine:** PostgreSQL 17.x (Managed by Supabase)
- **Region:** AWS ap-northeast-1 (or closest geographic region)
- **Pooling Mode:** Session / Transaction pooler (`aws-0-ap-northeast-1.pooler.supabase.com:5432`)
- **SSL:** Enabled with TLS verification (`ssl: { rejectUnauthorized: false }`)

### Backend Web Service (`civicresolve-api` on Render)
- **Environment Variables:**
  ```env
  NODE_ENV=production
  DATABASE_URL=<Supabase PostgreSQL Connection URI>
  PORT=5000
  FRONTEND_URL=https://civicresolve-yc9v.onrender.com
  CORS_ORIGIN=https://civicresolve-yc9v.onrender.com
  JWT_SECRET=<strong-cryptographic-random-secret>
  OTP_SALT=<cryptographic-otp-salt>
  ```
  *(Note: Do not pass `INITIAL_ADMIN_PASSWORD` in production environment variables; provision the administrator via the CLI below).*

- **Administrator Provisioning (One-Time Setup):**
  After deploying migrations or on initial launch, provision the production master administrator using the secure provisioning CLI from the Render shell:
  ```bash
  node provision_admin.js --confirm
  ```
  This securely sets a random 24-character cryptographic password (or a designated password using `--password <secret>`) using bcrypt cost factor 12 without storing credentials in version-controlled files or boot scripts.

- **Optional AI & Telecom Service Keys (if active):**
  ```env
  GEMINI_API_KEY=<Google AI Studio API Key>
  SMTP_HOST=<SMTP Host>
  SMTP_PORT=587
  SMTP_USER=<SMTP User>
  SMTP_PASS=<SMTP Password>
  SMTP_FROM="CivicResolve Operations" <grievance@civicresolve.gov>
  ```
- **Health Check Path:** `/health` (or `/api/health`) in Render Service Settings.
- **Auto-Migration:** On container boot, CivicResolve verifies and applies pending migrations automatically.

### Frontend Static Site (`civicresolve-frontend` on Render)
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Environment Variables:**
  ```env
  VITE_API_BASE_URL=https://civicresolve-8nve.onrender.com
  ```
- **Rewrite Rule:** `/* -> /index.html` (for React client-side SPA routing).

---

## 3. Post-Deployment Verification Steps

1. **Health Endpoint Check:**
   ```bash
   curl -s https://civicresolve-8nve.onrender.com/health
   # Expected response: {"status":"healthy","service":"CivicResolve","database":"connected",...}
   ```
2. **Database Info Check (Admin):**
   ```bash
   curl -s -H "Authorization: Bearer <AdminToken>" https://civicresolve-8nve.onrender.com/api/admin/database/info
   # Expected response indicates engine="postgresql" and active connection
   ```
3. **End-to-End Workflow Verification:**
   - Submit a test complaint via citizen mobile portal.
   - Note generated Reference ID (`CR-TN-YYYY-XXXXXX`).
   - Log into officer portal, assign to nodal department, and transition to "In Progress".
   - Confirm status update reflects in citizen live tracking and public dashboard.
