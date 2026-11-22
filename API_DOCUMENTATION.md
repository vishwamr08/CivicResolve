# CivicResolve – REST API Documentation

Base URL: `http://localhost:5000/api` (Production: `https://civicresolve-8nve.onrender.com/api`)

---

## 1. System Health & Infrastructure Monitoring

### `GET /health` (Root Infrastructure Probe)
Authoritative health check endpoint consumed by Render orchestration and container health checks.
- **Precedence:** Evaluated before downstream route middleware.
- **Database Connectivity:** Executes `SELECT 1 as test` against active engine (PostgreSQL or SQLite).
- **HTTP 200 OK:** Server is operational and database connection pool is active.
- **HTTP 503 Service Unavailable:** Database connection or I/O failure.

#### Sample Response (200 OK):
```json
{
  "status": "healthy",
  "service": "CivicResolve",
  "database": "connected",
  "database_status": "connected",
  "timestamp": "2026-11-22T14:30:11.376Z"
}
```

### `GET /api/health` (Application Service Diagnostic)
Returns service metadata, database state, AI engine provider (`Google Gemini` or `Groq`), and outbound communication gateway statuses (SMTP, Fast2SMS, Twilio, WhatsApp).

---

## 2. Citizen Mobile Authentication & Profile

### `POST /api/auth/citizen/send-otp`
Generates a cryptographically secure 6-digit numeric OTP with 10-minute validity and 30-second cooldown.
- **Request Body:** `{ "phone": "9840123456", "purpose": "login" }`
- **Response:** `{ "success": true, "message": "Verification code dispatched.", "isExistingUser": true }`

### `POST /api/auth/citizen/verify-otp`
Validates submitted OTP code against SHA-256 salted hash with maximum 5 attempts and replay protection.
- **Existing User:** Automatically logs in citizen, refreshes session, and issues signed JWT cookie.
- **New User:** Returns signed `registrationToken` for tamper-proof registration completion.

### `POST /api/auth/citizen/register-with-otp`
Registers new citizen verified by `registrationToken` or verified OTP. Auto-links past grievances submitted under the verified phone number.

### `GET /api/auth/citizen/me` *(Citizen Protected)*
Returns authenticated citizen profile and jurisdiction information.

---

## 3. Administrative Authentication & Access Control

### `POST /api/auth/login`
Authenticates municipal officer or administrator via email and bcrypt password hash.

### `GET /api/auth/me` *(Admin Protected)*
Validates active administrator session and role scope (`super_admin`, `municipal_admin`, `department_officer`).

---

## 4. Grievance Management & Public Tracking

### `GET /api/complaints`
Paginated, filtered list of civic grievances with privacy redaction for public consumers.
- **Query Parameters:** `page`, `pageSize`, `status`, `category`, `district`, `priority`, `search`.

### `POST /api/complaints`
Citizen grievance submission with multipart photo evidence upload, geospatial coordinates, and automated Google Gemini AI triage.

### `GET /api/complaints/track/:refId`
Public tracking view by human-readable reference code (`CR-TN-YYYY-XXXXXX`).

### `PATCH /api/complaints/:id/manage` *(Admin Protected)*
Updates nodal department, status, priority, and remarks, automatically appending immutable audit log records.

---

## 5. Database Diagnostics & Disaster Recovery (Super Admin)

### `GET /api/admin/database/info` *(Super Admin)*
Inspects active database engine (`postgresql` or `sqlite`), storage mount status, and live table counts.

### `GET /api/admin/database/backup` *(Super Admin)*
Downloads an on-demand verified database snapshot:
- **PostgreSQL:** Logical JSON export of all core relational tables.
- **SQLite:** Atomic online snapshot file (`.db`).
