# CivicResolve – REST API Documentation

Base URL: `http://localhost:5000/api`

---

## 1. System Health Check

### `GET /api/health`
Returns runtime system status, database connectivity, and Google Gemini AI configuration status.

#### Sample Response:
```json
{
  "status": "healthy",
  "app": "CivicResolve API",
  "version": "2.5.0",
  "tagline": "Report Issues. Track Action. Build Better Communities.",
  "database": "connected",
  "aiConfigured": true,
  "geminiConfigured": true,
  "aiProvider": "Google Gemini",
  "aiModel": "gemini-2.5-flash",
  "smtpConfigured": false,
  "smsConfigured": false,
  "whatsappConfigured": false,
  "timestamp": "2026-11-21T08:00:00.000Z"
}
```

---

## 2. Authentication Endpoints

### `POST /api/auth/login`
Authenticates administrator with email and bcrypt-hashed password. Returns signed JWT and sets HTTP-only cookie.

#### Request Body:
```json
{
  "email": "admin@civicresolve.gov",
  "password": "CivicAdmin#2026!Secure"
}
```

#### Sample Response (200 OK):
```json
{
  "message": "Administrator authentication successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": 1,
    "email": "admin@civicresolve.gov",
    "name": "Director of Municipal Operations",
    "role": "admin"
  }
}
```

### `GET /api/auth/me` *(Protected)*
Verifies active administrator session using JWT cookie or `Authorization: Bearer <token>`.

### `POST /api/auth/logout`
Clears `civic_admin_token` cookie and terminates session.

---

## 3. Dashboard Statistics

### `GET /api/dashboard/stats`
Returns aggregated live metrics calculated directly from the SQLite database.

#### Sample Response:
```json
{
  "totalComplaints": 18,
  "pendingComplaints": 4,
  "highPriorityComplaints": 6,
  "criticalComplaints": 2,
  "inProgressComplaints": 4,
  "resolvedComplaints": 6,
  "departments": [
    { "department": "Roads and Highways", "count": 6 },
    { "department": "Water Supply & Sewerage Board", "count": 3 },
    { "department": "Solid Waste Management", "count": 3 }
  ],
  "categoryDistribution": [
    { "category": "Road Damage", "count": 6 },
    { "category": "Water Leakage", "count": 3 },
    { "category": "Garbage and Sanitation", "count": 3 }
  ],
  "priorityDistribution": [
    { "priority": "Critical", "count": 2 },
    { "priority": "High", "count": 6 },
    { "priority": "Medium", "count": 7 },
    { "priority": "Low", "count": 3 }
  ],
  "statusDistribution": [
    { "status": "Submitted", "count": 2 },
    { "status": "Under Review", "count": 3 },
    { "status": "Assigned", "count": 3 },
    { "status": "In Progress", "count": 4 },
    { "status": "Resolved", "count": 6 }
  ]
}
```

---

## 4. Complaints Management & Citizen Tracking

### `GET /api/complaints`
Retrieves complaints with multi-filter query parameters: `search`, `category`, `priority`, `status`, `department`, `limit`.

### `GET /api/complaints/track/:refId`
Public tracking endpoint by human-readable reference code (`CR-YYYY-XXXX`).

### `POST /api/complaints`
Citizen grievance submission with multipart image upload and automatic Google Gemini AI triage (powered by `@google/genai`).

#### Form Data Fields:
- `title` *(string, 1-200 chars)*: Summary headline.
- `description` *(string, 15-3000 chars)*: Detailed incident observation.
- `category` *(string)*: Citizen-suggested category.
- `location` *(string)*: Street name or landmark.
- `latitude` *(optional float)*: GPS coordinate.
- `longitude` *(optional float)*: GPS coordinate.
- `isGpsVerified` *(string 'true'/'false')*: Whether device GPS was verified.
- `image` *(optional file)*: Photo evidence (JPEG, PNG, WEBP, up to 10MB).

### `PATCH /api/complaints/:id/manage` *(Admin Protected)*
Requires valid administrator JWT token (`Authorization: Bearer <token>`). Updates department, status, category, priority, and resolution remarks. Appends changes to status history.

### `PATCH /api/complaints/:id/status` *(Admin Protected)*
Quick status toggle with administrative audit logging.
