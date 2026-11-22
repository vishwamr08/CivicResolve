# CivicResolve — Production Deployment & Readiness Checklist

> **Notice:** Complete this checklist before transitioning CivicResolve from local development into municipal production on Render.

---

## 1. Pre-Deployment Verification Checklist

- [x] **Automated Regression Testing:** All 18 test suites passing (471/471 automated test assertions).
- [x] **Test Isolation:** Tests exclusively generate synthetic databases; zero genuine database copying.
- [x] **Database Safety Baseline:** Genuine local database and Phase 1 safety backup verified byte-for-byte identical (SHA-256 hashes preserved).
- [x] **Frontend Production Build:** Vite production bundle compiles cleanly with 0 errors (`npm --prefix client run build`).
- [x] **Tamil Nadu Geographic Master Data:** All 38 districts and authoritative 25 municipal corporations present.
- [x] **Bilingual Localization:** 100% key parity between English and Tamil dictionaries (240 keys each, zero untranslated labels).
- [x] **WCAG Touch Target Accessibility:** All buttons and interactive controls meet 44px minimum touch target height.
- [x] **Backend RBAC Enforcement:** Role-based access restrictions strictly enforced on all administrative endpoints.

---

## 2. Render Production Setup Checklist

### Backend Web Service (`civicresolve-api`)
- [ ] **Service Plan:** Upgraded to **Starter** ($7/mo) — required for persistent disk attachment.
- [ ] **Persistent Disk Attachment:**
  - Name: `civicresolve-data`
  - Mount Path: `/var/data`
  - Size: `1 GB`
- [ ] **Environment Variables:**
  - `NODE_ENV=production`
  - `DATA_DIR=/var/data`
  - `PORT=5000`
  - `FRONTEND_URL=https://civicresolve-yc9v.onrender.com`
  - `CORS_ORIGIN=https://civicresolve-yc9v.onrender.com`
  - `JWT_SECRET=<strong-cryptographic-random-secret>`
  - `ALLOW_NEW_PRODUCTION_DB=false` (set `true` *only* during the very first deployment on a brand new disk)
- [ ] **Health Check Path:** Configured to `/api/health` in Render Service Settings.

### Frontend Static Site (`civicresolve-frontend`)
- [ ] **Build Command:** `npm install && npm run build`
- [ ] **Publish Directory:** `dist`
- [ ] **Environment Variables:**
  - `VITE_API_BASE_URL=https://civicresolve-8nve.onrender.com`
- [ ] **Rewrite Rule:** `/* -> /index.html` (for client-side React SPA routing).

---

## 3. Post-Deployment Verification Steps

1. **Health Endpoint Check:**
   ```bash
   curl -s https://civicresolve-8nve.onrender.com/api/health
   # Expected response: {"status":"healthy","database":"connected","mode":"production",...}
   ```
2. **Dashboard Persistence Verification:**
   - Submit a test complaint via the live citizen portal.
   - Note the generated Reference ID.
   - Restart the Render web service.
   - Search the Reference ID again to verify persistent disk retention.
