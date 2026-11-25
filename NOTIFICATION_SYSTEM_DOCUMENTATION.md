# CivicResolve — Free-First Multi-Channel Notification System

## 1. Architecture Overview

CivicResolve uses a zero-cost-tier, **Free-First Notification Engine** combining three synchronized delivery channels with strict error isolation, duplicate suppression, and ownership-verified API endpoints. No paid SMS gateways are invoked during live citizen or administrator grievance workflows.

| Channel | Implementation | Transport / Storage | Trigger Scope |
| :--- | :--- | :--- | :--- |
| **In-App Notifications** | `notifications` table + `NotificationCenter.jsx` | SQLite / PostgreSQL + authenticated REST polling | Registration, status updates, department/officer assignments, resolution, admin intake alert |
| **Transactional Email** | Official `resend` SDK ([server/notifications.js](server/notifications.js)) | HTTPS API (`RESEND_API_KEY`) with branded HTML + plain-text templates | Registration confirmation, status transitions, complaint resolution, admin test trigger |
| **Browser Web Push** | Standard Web Push (`web-push` VAPID) + [client/public/sw.js](client/public/sw.js) | `push_subscriptions` table + W3C Push API | Real-time status & resolution desktop/mobile push notifications with `/?trackRef=` deep links |

### Failure Isolation & Resilience
Inside `notifyCitizenEvent()` ([server/notifications.js](server/notifications.js)), In-App, Resend Email, and Web Push dispatches each execute inside independent `try/catch` blocks. A missing API key, Resend rate-limit error, or expired browser push endpoint never blocks complaint registration, status transitions, or field officer resolution workflows.

---

## 2. Database Schema

Schema changes live in [server/migrations/005_profile_photos_and_free_notifications.sql](server/migrations/005_profile_photos_and_free_notifications.sql) and are mirrored idempotently for SQLite in [server/db.js](server/db.js):

- **`notifications` table columns added:**
  - `event_type TEXT` — Canonical lifecycle event (`complaint_registered`, `complaint_resolved`, `status_update`, `department_assignment`, `officer_assignment`, etc.)
  - `action_url TEXT` — Deep link such as `/?trackRef=CRV-...`
  - `read_at DATETIME` — Timestamp recorded when marked read
- **`push_subscriptions` table:**
  - `id`, `user_type` (`'citizen'` | `'admin'`), `user_id`, `endpoint` (`UNIQUE`), `p256dh`, `auth`, `user_agent`, `is_active`, `created_at`, `updated_at`, `last_used_at`
  - Indexed via `idx_push_subscriptions_user` on `(user_type, user_id)`
- **`citizens` & `admins` flags:**
  - `web_push_enabled INTEGER DEFAULT 0`
  - `email_notifications INTEGER DEFAULT 1` (on `citizens`)
- **`notification_logs` table:**
  - Tracks email, web push, and retry delivery status (`sent`, `failed`, `provider_response`, `error_message`, `attempts`)

---

## 3. Channel Details

### A. Transactional Email (Resend)
- **Environment Variables:**
  - `EMAIL_ENABLED` (`true` / `false`)
  - `RESEND_API_KEY` (Resend API key; placeholders containing `your_` are rejected as unconfigured)
  - `EMAIL_FROM` (defaults to `CivicResolve <onboarding@resend.dev>` when unset)
  - `FRONTEND_URL` (base URL used to generate `/?trackRef=<refId>` CTA buttons)
- **Templates & Tracking:**
  - `generateEmailTemplate()` renders responsive HTML emails plus plain-text fallbacks with Complaint Reference ID, status badge, remarks, and direct grievance tracker URL.
- **Honest Delivery Status:**
  - When `RESEND_API_KEY` is missing or disabled, `sendEmail()` logs a truthful `failed` record in `notification_logs` rather than fabricating `sent`.
- **Duplicate Prevention:**
  - `hasEmailEventBeenSent(refId, eventType)` checks `notification_logs` so duplicate `complaint_registered` or `complaint_resolved` emails are not sent repeatedly for the same milestone (unless `skipDuplicateCheck: true` is passed for explicit manual retries or test emails).
- **Resend Free-Tier Note:**
  - When using Resend's default onboarding sender (`onboarding@resend.dev`), Resend free-tier accounts can deliver only to the Resend account owner's verified email address until a custom sender domain is verified in the Resend dashboard and set in `EMAIL_FROM`.

### B. Browser Web Push (VAPID)
- **Environment Variables:**
  - `WEB_PUSH_ENABLED` (`true` / `false`)
  - `VAPID_PUBLIC_KEY` (URL-safe base64 VAPID public key)
  - `VAPID_PRIVATE_KEY` (secret VAPID private key — never returned by public endpoints)
  - `VAPID_SUBJECT` (e.g., `mailto:grievance@civicresolve.gov`)
- **Service Worker & Client Utilities:**
  - [client/public/sw.js](client/public/sw.js) handles `push` payloads (`title`, `body`, `icon`, `badge`, `tag`, `url`, `refId`, `eventType`) and `notificationclick` focus/navigation into `/?trackRef=<refId>`.
  - [client/src/utils/webPushClient.js](client/src/utils/webPushClient.js) registers `/sw.js`, converts VAPID public keys (`urlBase64ToUint8Array`), subscribes via `PushManager.subscribe()`, and synchronizes browser subscription state with backend endpoints.
  - [client/src/components/WebPushControl.jsx](client/src/components/WebPushControl.jsx) gives citizens and administrators one-click Enable/Disable controls and clear status messages when permissions are blocked or server VAPID keys are not configured.
- **Endpoint Validation & 404/410 Cleanup:**
  - `validatePushSubscriptionPayload()` enforces `https://` endpoints (or local dev loopback) and `p256dh`/`auth` encryption key lengths.
  - Expired/revoked endpoints returning HTTP `404`, `410`, or `NotRegistered` from push providers are automatically deleted from `push_subscriptions` in [server/pushService.js](server/pushService.js), and `web_push_enabled` is reset to `0` if zero active subscriptions remain.

### C. In-App Notification Centre
- **Frontend UI:** [client/src/components/NotificationCenter.jsx](client/src/components/NotificationCenter.jsx) renders in the header navigation bar for authenticated citizens and administrators (`unreadCount` badge, All / Unread filter, individual Mark Read, Mark All Read, Delete, `Load More` pagination at 15 items per page, and click-through navigation to tracked complaints).
- **Ownership Isolation:** All notification endpoints require `authenticateAnyUser`, strictly honoring `X-Portal-Context` and JWT token identity isolation (`recipient_type` + `recipient_id`), preventing cross-user or cross-role snooping.

---

## 4. Notification API Endpoints

| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Citizen or Admin (`authenticateAnyUser`) | Paginated list (`limit` 1..50, `offset`, `unreadOnly`), `unreadCount`, `totalCount`, `hasMore` |
| `PATCH` | `/api/notifications/read-all` | Citizen or Admin | Mark all unread in-app notifications for the current user read |
| `PATCH` | `/api/notifications/:id/read` | Citizen or Admin | Mark a single owned notification read (`404` if not owned) |
| `DELETE` | `/api/notifications/:id` | Citizen or Admin | Delete an owned notification (`404` if not owned) |
| `GET` | `/api/push/vapid-public-key` | Public | Returns `{ enabled, configured, publicKey }` (never leaks `VAPID_PRIVATE_KEY`) |
| `GET` | `/api/push/status` | Citizen or Admin | Returns user's active subscription status & count |
| `POST` | `/api/push/subscribe` | Citizen or Admin | Validates and stores browser push subscription |
| `POST` / `DELETE` | `/api/push/unsubscribe` / `/api/push/subscribe` | Citizen or Admin | Deactivates or removes user's browser push subscription |
| `POST` | `/api/admin/notifications/test-email` | Admin (`authenticateAdmin`) | Sends test email via `testEmailConnection()` |
| `POST` | `/api/admin/notifications/:id/retry` | Admin (`authenticateAdmin`) | Retries failed `email`, `push`, or legacy `sms` notification log |

---

## 5. Safe Offline Automated Testing

During automated test execution (`NODE_ENV=test`), [server/notifications.js](server/notifications.js) and [server/pushService.js](server/pushService.js) automatically route outgoing sends through offline mock adapters or injected adapters (`setTestEmailAdapter`, `setTestPushAdapter`), guaranteeing **zero real emails or live Web Push messages** are transmitted by CI or test suites. See [server/test_profile_photos_and_free_notifications.js](server/test_profile_photos_and_free_notifications.js).
