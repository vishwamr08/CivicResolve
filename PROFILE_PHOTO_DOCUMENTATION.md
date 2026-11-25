# CivicResolve — Secure Profile Photo System Documentation

## 1. Overview & Persistence Architecture

CivicResolve provides unified profile photo management for **Citizens**, **Municipal Administrators**, and **Field Officers** across portals and navigation bars, engineered specifically to operate safely on free/ephemeral container hosts like **Render** without requiring paid image CDNs.

### Why Database-Backed WebP Storage?
Standard container restarts and redeployments on Render wipe local ephemeral `/uploads` folders unless a mounted disk is purchased/attached for media. To guarantee uploaded profile photos persist cleanly across logout/login sessions and server restarts without paid cloud buckets:
1. Uploaded images are accepted strictly into **Multer memory buffers** (`multer.memoryStorage()`), never written directly as raw client files to disk.
2. Verified images are decoded, stripped of EXIF/GPS metadata, resized to `256×256` cover thumbnails, and re-encoded as compressed **WebP** (`quality: 82`) via **`sharp`** in [server/profilePhotoService.js](server/profilePhotoService.js).
3. The normalized base64 WebP payload and MIME type (`image/webp`) are stored inside `profile_photo_data` / `profile_photo_mime` / `profile_photo_url` columns on the `citizens` and `admins` tables (`migrations/005_profile_photos_and_free_notifications.sql` and [server/db.js](server/db.js)).
4. Public serving occurs via safe parameterized database lookup on `GET /api/avatars/:userType/:id` with versioned cache-busting query strings (`/api/avatars/citizen/1?v=...`).

---

## 2. Security Controls

Every avatar upload passes a multi-stage defense pipeline ([server/profilePhotoService.js](server/profilePhotoService.js)):

| Threat Vector | Implemented Control |
| :--- | :--- |
| **Spoofed MIME headers / file extensions** | `detectImageMagicFormat()` inspects raw binary headers (`FF D8 FF` JPEG, `89 50 4E 47 0D 0A 1A 0A` PNG, `RIFF....WEBP` WebP) regardless of client `Content-Type` or filename |
| **Polyglot / corrupted / SVG / HTML uploads** | `sharp(buffer, { failOn: 'error' }).metadata()` must decode cleanly as `jpeg`, `png`, or `webp` (rejects SVGs, executables, scripts, text files, corrupted images) |
| **Pixel flood / DoS dimensions** | Rejects images with zero dimensions or width/height `> 10,000 px` |
| **Large upload exhaustion** | Strict **2 MB (`2 * 1024 * 1024` bytes)** limit enforced at both Multer transport (`LIMIT_FILE_SIZE`) and buffer validation |
| **EXIF / GPS privacy leakage** | Full re-encode via `.rotate().resize(256, 256, { fit: 'cover', position: 'centre' }).webp({ quality: 82 })` strips camera EXIF, GPS tags, and embedded metadata |
| **Path traversal & filesystem writes** | Uploaded avatars never construct disk file paths; `/api/avatars/:userType/:id` restricts `userType` strictly to `'citizen'` \| `'admin'` and `id` to digits (`/^\d+$/`) |
| **XSS / MIME sniffing on avatar responses** | Sets `Content-Type: image/webp`, `X-Content-Type-Options: nosniff`, and `Cross-Origin-Resource-Policy: cross-origin` |
| **Privilege escalation & cross-role access** | `authenticateAdmin` rejects citizen JWTs (`decoded.type === 'citizen' || !ADMIN_ROLES.includes(decoded.role)`), preventing overlapping integer ID collisions; `PUT /api/admin/profile` permits updating only `name`, `designation`, `web_push_enabled` |
| **Ownership enforcement** | Upload/remove handlers strictly bind SQL updates to `req.citizen.id` or `req.admin.id` — users cannot modify another account's avatar |

---

## 3. API Routes

| Method | Endpoint | Middleware | Behavior |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/avatars/:userType/:id` | Public (validated params) | Serves binary WebP avatar image (`404` when absent or invalid params) |
| `POST` / `PUT` | `/api/citizen/profile/photo` | `authenticateCitizen` + `handleAvatarUpload` | Validates & saves citizen avatar; returns sanitized citizen profile |
| `DELETE` | `/api/citizen/profile/photo` | `authenticateCitizen` | Clears stored avatar columns, restoring default initials/icon avatar |
| `GET` | `/api/admin/profile` | `authenticateAdmin` | Returns sanitized administrator profile including `profile_photo_url` |
| `PUT` | `/api/admin/profile` | `authenticateAdmin` | Updates allowed fields (`name`, `designation`, `web_push_enabled`) |
| `POST` / `PUT` | `/api/admin/profile/photo` | `authenticateAdmin` + `handleAvatarUpload` | Validates & saves administrator avatar |
| `DELETE` | `/api/admin/profile/photo` | `authenticateAdmin` | Clears stored administrator avatar columns |

---

## 4. Frontend Components & UX Integration

- **[client/src/components/AvatarDisplay.jsx](client/src/components/AvatarDisplay.jsx):**
  - Renders circular non-distorted `object-cover object-center` avatar thumbnails (`xs`, `sm`, `md`, `lg`, `xl` sizes).
  - Resets failed URL error state cleanly whenever `profile_photo_url` or local `previewUrl` updates (`failedUrl !== rawPhotoUrl`).
  - Automatically renders crisp role-tinted initials or fallback `User` / `ShieldCheck` icon when no photo is set.
- **[client/src/components/ProfilePhotoUploader.jsx](client/src/components/ProfilePhotoUploader.jsx):**
  - Supports image file picker (`accept="image/jpeg,image/png,image/webp"`), instant local preview via `URL.createObjectURL` with cleanup, client pre-validation (MIME & 2 MB check), progress indicator, **Save Photo**, **Cancel Preview**, **Change Photo**, and **Remove Photo** restoring the default avatar.
- **State Synchronization Across Portals:**
  - `handleCitizenUpdated` & `handleAdminUpdated` in [client/src/App.jsx](client/src/App.jsx) synchronize updated `profile_photo_url` state and `localStorage` immediately across:
    - [Header.jsx](client/src/components/Header.jsx) (Desktop navigation bar & mobile drawer)
    - [CitizenPortal.jsx](client/src/components/CitizenPortal.jsx) (Portal header & Account Settings tab)
    - [AdminDashboard.jsx](client/src/components/AdminDashboard.jsx) (Command Center header & "My Profile & Alerts" tab)
    - [OfficerPortal.jsx](client/src/components/OfficerPortal.jsx) (Field Officer banner)

---

## 5. Automated Security & Lifecycle Test Coverage

Verified in [server/test_profile_photos_and_free_notifications.js](server/test_profile_photos_and_free_notifications.js) and [client/scripts/test_frontend_components.mjs](client/scripts/test_frontend_components.mjs):
- Real PNG, JPEG, and WebP upload, resize (`256×256` WebP), EXIF stripping, persistence across re-login, photo replacement (`v=` cache-buster bump), and `DELETE` default avatar restoration for both Citizens and Administrators.
- Rejection of spoofed `.png` PHP payloads, SVG scripts, oversized `> 2 MB` uploads, non-numeric ID path traversal probes, unauthenticated mutations, Citizen-JWT-to-Admin-ID=1 escalation attempts, and Admin privilege escalation fields.
