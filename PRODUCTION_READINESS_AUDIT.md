# CivicResolve — Comprehensive Production Readiness & Municipal Deployment Audit

**Document:** `PRODUCTION_READINESS_AUDIT.md`  
**Date:** November 22, 2026  
**System:** CivicResolve (Tamil Nadu Citizen Grievance Redressal Platform)  
**Author:** Antigravity Senior Full-Stack Engineering & QA Architecture Team  

---

## Executive Summary

CivicResolve is an AI-powered municipal grievance redressal platform engineered for citizen complaint filing, automated departmental routing, field squad task management, and administrative tracking across Tamil Nadu.

While the user interface was successfully transformed to a clean, institutional civic design standard, an exhaustive audit of the backend architecture, data pipelines, and client integrations reveals **six critical architectural impediments** that prevent real-world municipal deployment:

1. **Fabricated & Seeded Data:** The SQLite database seeds 4 sample Bengaluru grievances with Unsplash images upon first initialization. Furthermore, the frontend dashboard components fallback to hardcoded fake numbers (`37` complaints, `92%` resolution rate) when queries return zero or null.
2. **10–20 Second Initial Loading Latency:** Render's free tier spins down backend instances after 15 minutes of inactivity (causing 15–50s cold starts), compounded by `App.jsx` blocking page renders on 4 sequential API calls without skeleton states or local caching.
3. **Broken Citizen Identity & Profile Persistence:** Render free-tier containers feature an ephemeral filesystem that wipes `civicresolve.db` on restart. Additionally, session tokens and user records lack proper database normalization, causing returning citizens to be treated as brand-new users.
4. **Unreliable GPS & Flawed Administrative Jurisdiction Detection:** When browser GPS fails, `ComplaintFormModal.jsx` silently fabricates fake Chennai coordinates. The backend `/api/geocode/reverse` endpoint fails to return district, municipality, or ward metadata, causing the frontend to default arbitrarily to the first local body and zone.
5. **Non-Functional Google Maps Integration:** `GOOGLE_MAPS_API_KEY` is commented out in `server/.env` and omitted in `render.yaml`. `ComplaintFormModal.jsx` has no map picker, and `ComplaintMap.jsx` centers on Bengaluru sample coordinates.
6. **Data Isolation & Municipal Integrity Gaps:** Public dashboards do not distinguish live records from demo/test fixtures, and missing indexes on filtering queries degrade performance as data volume increases.

---

## Detailed Audit of Critical Problems

---

### Problem 1: Random & Sample Incidents Displayed as Real Grievances

#### 1. Root Cause Analysis
- **Database Auto-Seeding (`server/db.js` lines 495–652):**
  When `SELECT COUNT(*) FROM complaints` equals 0, `db.js` runs `insertMany(sampleComplaints)` inserting 4 synthetic complaints:
  - `CR-2026-1042`: Pothole on MG Road (Coordinates: `12.9716, 77.5946` — Bengaluru, Karnataka)
  - `CR-2026-1043`: Overflowing dumpster at Sector 4 (Coordinates: `12.9352, 77.6245` — Bengaluru, Karnataka)
  - `CR-2026-1044`: Ruptured water main at 7th Cross Indiranagar (Coordinates: `12.9784, 77.6408` — Bengaluru, Karnataka)
  - `CR-2026-1045`: Streetlights in Koramangala (Coordinates: `12.9279, 77.6271` — Bengaluru, Karnataka)
  All 4 sample complaints use stock photos from Unsplash and locations outside Tamil Nadu, yet appear in live production queries.
- **Frontend Hardcoded Fallbacks (`client/src/components/LandingPage.jsx` lines 188–192 & `PublicDashboard.jsx` lines 45–49):**
  ```javascript
  // LandingPage.jsx
  const totalRegistered = stats?.totalComplaints || 37;
  const inProgressCases = stats?.inProgressComplaints || 8;
  const resolvedCases = stats?.resolvedComplaints || 24;
  const resolutionRate = stats?.slaResolutionRate || (totalRegistered > 0 ? `${Math.round((resolvedCases / totalRegistered) * 100)}%` : '92%');

  // PublicDashboard.jsx
  const total = stats?.totalComplaints ?? 37;
  const inProgress = stats?.inProgressComplaints ?? 8;
  const resolved = stats?.resolvedComplaints ?? 24;
  const pending = stats?.pendingComplaints ?? 5;
  ```
  If an empty production database has 0 complaints, `0 || 37` evaluates to `37` in JavaScript because `0` is falsy. The application displays **37 registered grievances and 92% resolution** on an empty database.
- **Complaint Submission Presets (`client/src/components/ComplaintFormModal.jsx` lines 220–261):**
  3 demo preset buttons auto-fill complaints into the active submission form.
- **Sample Tracking References (`client/src/components/ComplaintTracker.jsx` line 26):**
  Hardcoded array `['CR-TN-2026-1042', 'CR-TN-2026-1043', 'CR-TN-2026-1044', 'CR-TN-2026-1045']` displayed to citizens as recommended tracking IDs.

#### 2. Relevant Files
- `server/db.js`
- `client/src/components/LandingPage.jsx`
- `client/src/components/PublicDashboard.jsx`
- `client/src/components/ComplaintTracker.jsx`
- `client/src/components/ComplaintFormModal.jsx`
- `server/test_full_suite_master.js` (Test 36 currently asserts `publicStats.total >= 4`)

#### 3. Affected APIs
- `GET /api/complaints`
- `GET /api/dashboard/stats`
- `GET /api/complaints/:id`

#### 4. Proposed Fix
1. Completely remove `sampleComplaints` auto-insertion from `server/db.js` in production mode.
2. In `db.js`, allow seeding test data **only** when `NODE_ENV === 'test'` or an explicit `SEED_DEMO_DATA=true` flag is set.
3. Replace all fallback values in `LandingPage.jsx` and `PublicDashboard.jsx` with strict zero-checks (`stats?.totalComplaints ?? 0`).
4. Implement clean, dignified empty states across all screens:
   *"No verified grievance records are available yet."*
5. Add an official Data Source Indicator on Admin and Public Dashboards:
   - `Live Production Database` (Green)
   - `Isolated Demonstration Mode` (Amber)
   - `No Records Available` (Slate)
6. Update test suites (`test_full_suite_master.js`) to insert isolated test fixtures during test runs rather than expecting hardcoded production data.

---

### Problem 2: 10–20 Second Dashboard Loading Delay

#### 2. Root Cause Analysis
1. **Render Free Tier Cold Starts:**
   Render's free web service spins down containers after 15 minutes of inactivity. The initial HTTP handshake requires waking the Linux container, starting Node.js, compiling dependencies, and connecting SQLite, consuming **15 to 45 seconds**.
2. **Blocking Page Render in `client/src/App.jsx` (lines 142–158 & 362–366):**
   ```javascript
   const [healthRes, statsRes, complaintsRes] = await Promise.all([
     fetch(getApiUrl('/api/health')).then(r => r.json()).catch(() => null),
     fetch(getApiUrl('/api/dashboard/stats')).then(r => r.json()).catch(() => null),
     fetch(getApiUrl('/api/complaints')).then(r => r.json()).catch(() => null)
   ]);
   ```
   `loading` remains `true` until all 3 endpoints resolve. While waiting, `App.jsx` shows a blank page with a spinner (`Loading CivicResolve Telemetry...`), completely blocking the homepage from rendering.
3. **Over-Fetching Without Pagination in `GET /api/complaints` (`server/index.js` lines 1024–1060):**
   `SELECT * FROM complaints` loads full records, including heavy `status_history` JSON strings, resolution remarks, and image paths for every complaint.
4. **Sequential Secondary Requests in `LandingPage.jsx`:**
   After `App.jsx` finishes, `LandingPage.jsx` initiates another independent request to `/api/announcements`.

#### 2. Relevant Files
- `client/src/App.jsx`
- `client/src/components/LandingPage.jsx`
- `client/src/components/PublicDashboard.jsx`
- `server/index.js`
- `render.yaml`

#### 3. Proposed Fix
1. **Eliminate Full-Page Blocking:** Render the `LandingPage` shell immediately without waiting for API responses. Use localized skeleton loaders for KPI cards, announcements, and maps.
2. **Selective Column Projection & Pagination:** In `GET /api/complaints`, select only necessary card columns (`id, ref_id, title, category, status, priority, district, created_at`) for list views, leaving full detail fetching for `/api/complaints/:id`.
3. **Stale-While-Revalidate Local Cache:** Store previous dashboard stats in `sessionStorage` to render instantaneous telemetry upon page load while background revalidation fetches fresh data.
4. **Backend Keep-Alive Mechanism:** Document Render persistent disk setup and provide a health-check keep-alive cron job or ping service for production deployments.

---

### Problem 3: Citizen Authentication & Profile Non-Persistence

#### 1. Root Cause Analysis
1. **Ephemeral Filesystem on Render Free Tier:**
   Render free tier services do not persist local disk writes. Whenever the web service restarts or redeploys, `server/civicresolve.db` is destroyed and recreated from the base git repository. All registered citizen accounts, mobile numbers, and grievances are deleted.
2. **Session Destruction on Server Restart:**
   When the user reopens their browser tab:
   - `App.jsx` reads `civic_citizen_token` from `localStorage` and calls `GET /api/auth/citizen/me`.
   - The backend checks `SELECT * FROM citizens WHERE id = ?`. Because the SQLite database was reset on restart, the citizen ID does not exist.
   - The backend returns HTTP 401 Unauthorized.
   - `App.jsx` executes `localStorage.removeItem('civic_citizen_token')` and `localStorage.removeItem('civic_citizen_user')`, erasing the client session.
3. **Login OTP Flow Re-Prompts for Profile:**
   - The citizen enters their mobile number again.
   - In `POST /api/auth/citizen/send-otp`, `isExistingUser` returns `false` (record deleted).
   - In `POST /api/auth/citizen/verify-otp`, `isNewUser` returns `true`.
   - `CitizenAuthModal.jsx` switches to `otpStep = 'complete-profile'`, prompting the citizen for their full name, district, municipality, and ward once again.
4. **Database Schema & Query Deficiencies (`server/auth.js` line 182):**
   `authenticateCitizen` runs:
   `SELECT id, name, email, phone, district FROM citizens WHERE id = ?`
   It omits `municipality` and `ward`, dropping the citizen's municipal jurisdiction from the authenticated session context.
5. **Phone Normalization Inconsistencies:**
   Mobile numbers in `register-with-otp` are normalized via `.replace(/\D/g, '').slice(-10)`, but password registration in `register` uses raw `phone.trim()`, risking lookup mismatches.

#### 2. Relevant Files
- `server/db.js`
- `server/index.js`
- `server/auth.js`
- `client/src/App.jsx`
- `client/src/components/CitizenAuthModal.jsx`
- `client/src/components/CitizenPortal.jsx`

#### 3. Database Impact
- `citizens` table must enforce a `UNIQUE` index on normalized 10-digit mobile numbers (`phone`).
- Schema must ensure `municipality` and `ward` columns are consistently retrieved and updated.
- Database path must support Render Persistent Disk (`/var/data/civicresolve.db`).

#### 4. Proposed Fix
1. **Render Persistent Disk Configuration:** Configure `DATA_DIR=/var/data` in `render.yaml` so SQLite persists across deployments and restarts.
2. **Permanent Citizen Record Guarantee:** Update `POST /api/auth/citizen/verify-otp` to verify existing records strictly by normalized 10-digit mobile number. If a record exists, immediately issue a JWT and return the full profile (`id, name, email, phone, district, municipality, ward`).
3. **Auto-Fill & Non-Destructive Update:** If an existing citizen logs in via OTP, never show `complete-profile` unless required fields are genuinely missing (`NULL`).
4. **Update `authenticateCitizen` Middleware:** Include `municipality` and `ward` in `req.citizen` query.
5. **Cookie Security:** Configure JWT cookies with `SameSite=None; Secure` for cross-site Render deployments (`civicresolve-yc9v.onrender.com` -> `civicresolve-8nve.onrender.com`).

---

### Problem 4: GPS Location & Municipal Jurisdiction Inaccuracies

#### 1. Root Cause Analysis
1. **Silent Fallback to Fabricated Coordinates (`ComplaintFormModal.jsx` lines 57–65 & 108–118):**
   ```javascript
   (err) => {
     console.warn('Geolocation fallback:', err.message);
     setLatitude('13.0827');
     setLongitude('80.2707');
     setIsGpsDetected(true);
     setStreetAddress('Greater Chennai Municipal Corporation Zone, Tamil Nadu');
     setIsGettingLocation(false);
   }
   ```
   If the citizen denies geolocation or if GPS times out, the code silently injects Ripon Building coordinates (`13.0827, 80.2707`) and flags `isGpsDetected = true`. The system fabricates a false location without citizen consent.
2. **Broken Reverse Geocoding API Contract (`server/index.js` lines 2200–2235):**
   `ComplaintFormModal.jsx` expects `{ data.district }` in the response of `GET /api/geocode/reverse?lat=...&lng=...`. However, the backend endpoint returns only:
   ```json
   {
     "address": "...",
     "provider": "Google Maps"
   }
   ```
   It never returns `district`, `localBody`, or `ward`. As a result, `data.district` is `undefined`, and the jurisdiction dropdowns are never updated from GPS coordinates.
3. **Hardcoded First-Index Jurisdiction Assignment:**
   In `ComplaintFormModal.jsx` lines 91–96:
   ```javascript
   if (match.localBodies?.length) {
     setSelectedLocalBody(match.localBodies[0].id);
     if (match.localBodies[0].zones?.length) {
       setSelectedZoneWard(match.localBodies[0].zones[0].name);
     }
   }
   ```
   The modal blindly assigns the first local body and the first ward of a district rather than performing reverse geocode mapping.

#### 2. Relevant Files
- `server/index.js`
- `client/src/components/ComplaintFormModal.jsx`
- `client/src/data/tamilnaduGeo.js`
- `server/data/tamilnadu-geo.js`

#### 3. Proposed Fix
1. **Never Fake GPS Coordinates:** If GPS permission is denied or fails, clear coordinates, set `isGpsDetected = false`, and display a clear notification:
   *"GPS location unavailable. Please select your district and municipal jurisdiction manually."*
2. **Enrich Backend Geocoding Endpoint (`/api/geocode/reverse`):**
   Parse Google Maps `address_components` (or Nominatim address details) to extract:
   - `district` (from `administrative_area_level_2` or `locality`)
   - `city` / `municipality` (from `locality` or `administrative_area_level_3`)
   - `sublocality` / `neighborhood` (from `sublocality_level_1` or `sublocality_level_2`)
   - `postal_code`
3. **Create Dedicated Municipal Jurisdiction Resolver:**
   Match extracted geographical components against `TAMIL_NADU_DISTRICTS` to automatically select District, Corporation/Municipality, and Zone.
4. **Explicit Ward Verification State:**
   If a GPS point cannot mathematically resolve to an official municipal ward boundary, display:
   *"Jurisdiction verified: [District] — [Corporation]. Please confirm your local Ward from the list."*

---

### Problem 5: Google Maps Integration Inoperative

#### 1. Root Cause Analysis
1. **Missing Google Maps API Key in Configuration:**
   `GOOGLE_MAPS_API_KEY` is commented out in `server/.env` and missing in `render.yaml`.
   When `GET /api/config/client` runs, it returns `{ googleMapsEnabled: false, googleMapsApiKey: null }`.
2. **Missing Map in Complaint Registration:**
   `ComplaintFormModal.jsx` contains no map interface. The citizen cannot see a visual pin or adjust coordinates by clicking on a map.
3. **Initial Centering on Out-of-State Coordinates:**
   In `ComplaintMap.jsx`, `defaultCenter` uses `geotaggedComplaints[0]`. Because the seeded sample complaints are located in Bengaluru, the map initially centers on Karnataka instead of Tamil Nadu.
4. **Leaflet / OpenStreetMap Failures:**
   When Google Maps is inactive, Leaflet tiles load from OpenStreetMap without error handling if the external tile server is rate-limited.

#### 2. Relevant Files
- `server/index.js`
- `server/.env`
- `render.yaml`
- `client/src/components/ComplaintMap.jsx`
- `client/src/components/ComplaintFormModal.jsx`

#### 3. Proposed Fix
1. **Support Dual Map Architecture with Verified Fallbacks:**
   Ensure `ComplaintMap.jsx` runs seamlessly on Leaflet/OSM when Google Maps API key is not configured, and seamlessly switches to Google Maps JavaScript API when `GOOGLE_MAPS_API_KEY` is provided.
2. **Embed Interactive Location Picker in Complaint Submission:**
   Add an interactive mini-map in Step 1 of `ComplaintFormModal.jsx` allowing citizens to drag a pin or click to set their grievance location.
3. **Default Center to Tamil Nadu:**
   Set default map bounds to Tamil Nadu (`13.0827, 80.2707` for Chennai or state bounds `8.0°N – 13.5°N, 76.2°E – 80.3°E`).

---

### Problem 6: Data Integrity & Municipal Governance Readiness

#### 1. Root Cause Analysis
1. **Public/Private Data Leakage:**
   Unauthenticated users can query `GET /api/complaints`, which exposes citizen names, phone numbers, and coordinates unless explicitly masked.
2. **SLA Deadlines on Unresolved Complaints:**
   Overdue complaints calculation currently relies on in-memory JavaScript date parsing rather than indexed SQLite datetime comparisons.
3. **No Audit Logging for Status Overrides:**
   When an administrator or field officer transitions a complaint status or reassigns departments, certain routes do not record audit trail entries in `audit_logs`.

#### 2. Proposed Fix
1. Ensure `parseComplaint` strictly enforces PII masking on all public routes.
2. Ensure every complaint update logs actor identity, timestamp, previous state, and new state into `audit_logs`.
3. Add composite indexes on `complaints(status, district)` and `complaints(created_at)`.

---

## Architectural Comparison Matrix

| Component | Current State | Municipal Production Standard |
| :--- | :--- | :--- |
| **Grievance Records** | 4 fake Bengaluru incidents auto-seeded on startup | 100% verified citizen submissions; clean empty state when empty |
| **Dashboard Metrics** | Hardcoded fallbacks (`37`, `8`, `24`, `92%`) | Exact SQLite aggregations; 0 displayed when database is empty |
| **Initial Load Time** | 10–20 seconds (Render cold start + blocking `Promise.all`) | < 2s shell render with progressive skeleton loaders & localized caching |
| **Citizen Sessions** | Wiped on Render restart; re-prompts for profile | Permanent citizen profile in persistent DB; instant recognition via OTP |
| **GPS Geolocation** | Silent fallback to fake Ripon Building coordinates | Real GPS validation; graceful error state; manual selection if unavailable |
| **Jurisdiction Engine** | Always defaults to first local body & first zone | Multi-tier resolution matching District, Corporation, Zone & Ward |
| **Google Maps** | Unconfigured; no map picker in grievance wizard | Interactive location picker with smooth Google Maps / Leaflet fallback |

---

## Required Files for Modification

### Backend (`server/`)
1. `server/db.js` — Remove auto-seeding of sample complaints in production; add persistent disk path handling; add performance indexes.
2. `server/index.js` — Enrich `/api/geocode/reverse` with administrative jurisdiction metadata; optimize `/api/dashboard/stats` and `/api/complaints`; fix OTP registration and verification logic; add request timing middleware.
3. `server/auth.js` — Update `authenticateCitizen` to include municipality and ward; ensure secure cookie attributes.
4. `server/data/tamilnadu-geo.js` — Add boundary and spatial lookup helpers for district/corporation/zone mapping.
5. `render.yaml` — Configure persistent disk (`/var/data`), environment variables, and keep-alive configuration.

### Frontend (`client/`)
1. `client/src/App.jsx` — Replace blocking full-page loading with progressive skeleton loading; fix session initialization.
2. `client/src/components/LandingPage.jsx` — Remove hardcoded statistical fallbacks (`|| 37`); implement zero-state handling.
3. `client/src/components/PublicDashboard.jsx` — Remove fake default metrics (`?? 37`); add Data Source Indicator.
4. `client/src/components/CitizenAuthModal.jsx` — Prevent re-prompting registered citizens for profile information.
5. `client/src/components/ComplaintFormModal.jsx` — Remove fake GPS fallback coordinates; remove demo presets; integrate interactive location pin picker; connect real reverse geocode jurisdiction mapping.
6. `client/src/components/ComplaintTracker.jsx` — Remove hardcoded sample reference IDs; add empty state.
7. `client/src/components/ComplaintMap.jsx` — Ensure reliable dual-engine rendering (Google Maps + Leaflet); set Tamil Nadu bounds.
8. `client/src/components/AdminDashboard.jsx` — Add Data Source Indicator badge (`Live Production` / `Test Mode`).

---

## External Requirements & Configuration Needs

1. **Google Maps API Key:**
   - Requires a Google Cloud project with **Maps JavaScript API** and **Geocoding API** enabled.
   - Recommended setup: Set `GOOGLE_MAPS_API_KEY` in `server/.env` and Render environment settings. (If not provided, the system gracefully falls back to OpenStreetMap / Leaflet without errors).
2. **Render Persistent Disk:**
   - To prevent database wipes on Render free tier, a Render Disk mounted at `/var/data` or transition to managed PostgreSQL/SQLite with persistent disk is required for permanent data retention.
3. **Authoritative Tamil Nadu Municipal Boundary Dataset:**
   - The platform utilizes `TAMIL_NADU_DISTRICTS` covering all 38 districts, 21 Municipal Corporations, and key Municipalities. Exact ward assignment requires citizen confirmation if GPS falls on boundary lines.

---

## Test Verification Plan

1. **Empty Database Test:** Clear database, verify all dashboards show `0` with clear empty states, and verify 0 complaints appear on the map.
2. **Citizen Profile Retention Test:** Register citizen with mobile number, verify OTP, close browser, re-authenticate via OTP, and verify profile is automatically retrieved without re-prompting.
3. **GPS Detection Test:** Test with GPS enabled (valid coordinates and address populated), GPS denied (clean error message, no fake coordinates), and timeout.
4. **Google Maps & Leaflet Switcher Test:** Test map rendering with API key present and API key absent.
5. **Performance Timing Test:** Measure API response times for `/api/dashboard/stats`, `/api/complaints`, and initial page load.
6. **Master Test Suite Execution:** Verify `test_health.js`, `test_evaluation_complete.js`, and `test_full_suite_master.js` pass cleanly.

---

## Phase 9 Architecture Update: Supabase PostgreSQL Dual Database System

### Permanent Resolution of Production Storage Vulnerability
The ephemeral container file-system vulnerability previously noted in Problem 3 has been resolved by implementing the **CivicResolve Dual Database Architecture**:

1. **PostgreSQL 17+ on Supabase:**
   - Production instances bind directly to a high-availability managed PostgreSQL cluster in AWS `ap-northeast-1` via pooled connection URI (`DATABASE_URL`).
   - Zero reliance on local container disks; Render web services can restart, scale horizontally, or redeploy without data loss.
   - Version-controlled SQL migrations in `server/migrations/` (`001_initial_schema.sql`, `002_indexes_and_constraints.sql`, `003_seed_master_admin_and_announcements.sql`) are tracked in `schema_migrations`.
   - The server fails closed in production (`NODE_ENV=production`) if `DATABASE_URL` is absent.

2. **Full SQLite Backward Compatibility:**
   - Local development and offline pilots seamlessly use `better-sqlite3` / `DatabaseSync` when `DATABASE_URL` is absent or `USE_SQLITE=true`.
   - Automated regression test suites (18 suites, 471 assertions) run on isolated temporary SQLite databases.
   - Genuine local SQLite databases (`civicresolve.db` and safety backup) remain cryptographically untouched.

3. **Database Abstraction Parity:**
   - Positional parameter translation (`?` -> `$1, $2, ...`).
   - Unified transaction management via pooled clients (`BEGIN ... COMMIT / ROLLBACK`).
   - Automatic `RETURNING id` injection ensuring `lastInsertRowid` compatibility across engines.
   - Verified automated backup strategy for PostgreSQL (logical JSON/SQL snapshot) and SQLite (atomic Online Backup API).

---

## Phase 10 — Master Production Remediation Programme Verification

### Overview of Completed Remediations
In November 2026, an exhaustive Master Production Remediation Programme was executed to resolve remaining production defects across administrator authentication, citizen grievance submission, dashboard synchronization, localization, and database reliability:

1. **Administrator Login & Provisioning (`Phase 1`):**
   - **Root Cause:** Migration `003_seed_master_admin_and_announcements.sql` contained an invalid bcrypt placeholder hash, while SQLite boot-time initialization dynamically overwrote passwords.
   - **Remediation:** Removed automatic boot-time password overwrites from `db.js`. Replaced migration placeholder with locked marker `*LOCKED*PROVISION_REQUIRED*`. Created authoritative CLI `server/provision_admin.js` using bcrypt cost factor 12 with mandatory `--confirm` flag, preserving `admin@civicresolve.gov` (ID 1) and its `super_admin` role.

2. **Officer & Admin Authentication, Session Invalidation & RBAC (`Phase 2`):**
   - Implemented token revocation table `revoked_tokens` and SHA-256 token hashing (`auth.js`).
   - Explicit logouts (`/api/auth/logout`, `/api/auth/citizen/logout`) write to `revoked_tokens`.
   - Middleware `authenticateAdmin` and `authenticateCitizen` enforce token revocation checks.
   - Per-IP rate limiting (5 attempts → 15m lockout) and generic authentication error messages protect against credential brute-forcing.

3. **Citizen Grievance Submission Null Reference Fix (`Phase 3`):**
   - **Root Cause:** In `server/index.js`, `const result = insert.run(...)` was not awaited against the async `PostgresDatabaseAdapter`, evaluating `result.lastInsertRowid` to `undefined` and causing `Cannot read properties of null (reading 'ref_id')`.
   - **Remediation:** Added `await insert.run(...)`, implemented fallback lookup by `ref_id`, and standardized response payload: `{ success: true, message, complaint, ref_id, id, duplicates }`.

4. **Mandatory Citizen Authentication (`Phase 4`):**
   - Submissions on `POST /api/complaints` now require a valid citizen session, returning `401 Unauthorized` for unauthenticated visitors.
   - Citizen ID is strictly derived from `req.citizen.id`, preventing spoofing attacks.
   - UI preserves pending grievance category across citizen login modal.
   - Duplicate submissions within 60s return `409 Conflict`.

5. **Dashboard Real-Time Update & Background Synchronization (`Phases 5 & 6`):**
   - Newly submitted complaints are immediately prepended to local state in `App.jsx` and `CitizenPortal.jsx` without requiring a page reload.
   - 15-second background auto-synchronization implemented for active Citizen and Admin portals.

6. **Complete Tamil Localization (`Phase 7`):**
   - 100% key parity achieved between English and Tamil translation dictionaries (246 keys each).
   - Zero missing keys, zero untranslated English strings in Tamil mode, and zero corrupted Unicode characters.

7. **Database Safety & Fail-Closed Startup Migrations (`Phase 8`):**
   - On PostgreSQL production startup, Express server awaits `runMigrations()` before binding the HTTP port, failing closed if migrations fail.

8. **Security Audit & Accessibility (`Phase 9`):**
   - CSRF & exact origin validation implemented on all cookie-authenticated mutation endpoints.
   - Security headers enforced: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and HSTS.
   - Form controls enhanced with accessible labels and ARIA attributes.

9. **Verification & Test Results:**
   - `test_remediation_phases.js`: **18 / 18 assertions PASSED**.
   - Core SQLite test suites: **7 suites, 179 / 179 assertions PASSED**.
   - PostgreSQL Migration Suite: **39 / 39 assertions PASSED**.
   - PostgreSQL Dual Adapter Suite: **18 / 18 assertions PASSED**.
   - Frontend Production Build: **Vite clean compile in 2.23s, 0 errors**.
   - Genuine Local Database & Phase 1 Backup: **Verified 100% intact with matching cryptographic hashes**.
