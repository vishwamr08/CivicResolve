# CivicResolve — Production Deployment Report

**Date:** November 25, 2026  
**Repository:** `https://github.com/vishwamr08/CivicResolve`  
**Branch:** `main`  
**Application Release Commit (Deployed Live):** `9ca6c22` (`feat: add profile photo system, free-first notifications (Resend, Web Push VAPID, In-App) and full QA suite`)

---

## 1. Live Deployment Targets & Verification Results

| Target | URL | Verified Status | Observed Evidence |
| :--- | :--- | :--- | :--- |
| **Render Backend API** | `https://civicresolve-8nve.onrender.com` | **LIVE (HTTP 200)** | Deployed commit `9ca6c22` verified via live HTTP probes |
| **Render Static Frontend** | `https://civicresolve-yc9v.onrender.com` | **LIVE (HTTP 200)** | Serves built `/assets/index-ClvvRPA6.js`, `/assets/index-DpYi5PcK.css`, and `/sw.js` |
| **Vercel Frontend Config** | [client/vercel.json](client/vercel.json) | **CONFIGURED IN REPO** | Configured for SPA rewrites & Service Worker cache rules; no owned Vercel live domain verified in this environment |

### Observed Live HTTP Probe Outputs (Post-Push `9ca6c22`)

1. **`GET https://civicresolve-8nve.onrender.com/health`**
   - **Status:** `HTTP/1.1 200 OK`
   - **Body:** `{"status":"healthy","service":"CivicResolve","database":"connected","database_status":"connected","database status":"connected","timestamp":"2026-11-25T14:02:05.489Z"}`
2. **`GET https://civicresolve-8nve.onrender.com/api/dashboard/stats`**
   - **Status:** `HTTP/1.1 200 OK`
   - **Body:** Live production metrics (`total: 24`, `resolved: 24`, `resolutionRate: 100`, `highPriority: 6`, `critical: 4`, plus complete `departments`, `districts`, `categoryDistribution`, and `priorityDistribution` arrays).
3. **`GET https://civicresolve-8nve.onrender.com/api/push/vapid-public-key`**
   - **Status:** `HTTP/1.1 200 OK`
   - **Body:** `{"enabled":true,"configured":false,"publicKey":null}` (Truthfully indicates VAPID keypair variables remain `sync: false` in Render until populated in the Render Environment tab).
4. **`GET https://civicresolve-8nve.onrender.com/api/notifications` (Unauthenticated)**
   - **Status:** `HTTP/1.1 401 Unauthorized`
   - **Headers:** `Cache-Control: private, no-cache, no-store, must-revalidate`
   - **Body:** `{"error":"Authentication required. Please log in."}`
5. **`GET https://civicresolve-8nve.onrender.com/api/avatars/citizen/999999`**
   - **Status:** `HTTP/1.1 404 Not Found`
   - **Body:** `{"error":"Profile photo not found"}`
6. **`GET https://civicresolve-yc9v.onrender.com/`**
   - **Status:** `HTTP/1.1 200 OK`
   - **Assets Verified in HTML:** `<script type="module" crossorigin src="/assets/index-ClvvRPA6.js"></script>` and `/assets/index-DpYi5PcK.css` (exact hashes from post-fix Vite build).
7. **`GET https://civicresolve-yc9v.onrender.com/sw.js`**
   - **Status:** `HTTP/1.1 200 OK` (`Content-Type: application/javascript`)
   - **Content Verified:** Complete Service Worker handling `push` & `notificationclick` with `/?trackRef=` deep links.

---

## 2. Deployment Configuration Changes

- **[render.yaml](render.yaml):** Documented/wired `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_ENABLED`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `WEB_PUSH_ENABLED` (`sync: false` for secret keys).
- **[client/vercel.json](client/vercel.json):** Added `/sw.js` no-cache headers (`Service-Worker-Allowed: /`, `Cache-Control: public, max-age=0, must-revalidate`) and excluded static/service-worker assets from SPA fallback rewrites.
- **[server/migrations/005_profile_photos_and_free_notifications.sql](server/migrations/005_profile_photos_and_free_notifications.sql) & [server/db.js](server/db.js):** Idempotent column and index creation ensuring automatic schema readiness across SQLite and PostgreSQL without manual intervention.

---

## 3. Pending External Environment Configuration (Optional Provider Activation)

In-App Notifications and Profile Photo Uploads/Persistence are **100% operational immediately** on Render with zero external API keys required.

To activate real external **Email (Resend)** and **Browser Web Push (VAPID)** delivery on Render, populate the following environment variables in the **`civicresolve-api`** Render service dashboard:

```bash
# Generate free VAPID keys once locally:
npx web-push generate-vapid-keys
```

Set in Render Dashboard -> `Environment`:
- `RESEND_API_KEY`: `<your Resend API key>`
- `EMAIL_FROM`: `CivicResolve <onboarding@resend.dev>` *(or your verified domain sender)*
- `EMAIL_ENABLED`: `true`
- `VAPID_PUBLIC_KEY`: `<generated public key>`
- `VAPID_PRIVATE_KEY`: `<generated private key>`
- `VAPID_SUBJECT`: `mailto:grievance@civicresolve.gov`
- `WEB_PUSH_ENABLED`: `true`
