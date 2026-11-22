# CivicResolve — Environment Configuration Guide

> **Notice:** CivicResolve is a pilot / demonstration platform. Sensitive credentials (API keys, JWT secrets, database paths) must never be committed to source control.

---

## 1. Environment Variable Reference

| Variable | Required in Production | Default / Sample | Purpose |
| :--- | :--- | :--- | :--- |
| `PORT` | Yes | `5000` | Port for Express HTTP server |
| `NODE_ENV` | Yes | `production` / `development` / `test` | Runtime environment mode |
| `DATA_DIR` | Yes (on Render disk) | `/var/data` | Directory containing persistent `civicresolve.db` |
| `SQLITE_DB_PATH` | Optional | `/var/data/civicresolve.db` | Explicit path to SQLite database file |
| `ALLOW_NEW_PRODUCTION_DB` | No (initial deploy only) | `false` | Allows schema generation on a fresh uninitialized persistent disk |
| `REQUIRE_EXISTING_DB` | Optional | `true` | Prevents starting if target database does not already exist |
| `JWT_SECRET` | Yes | `crypto-random-string` | Secret key for signing and verifying JSON Web Tokens |
| `FRONTEND_URL` | Yes | `https://civicresolve-yc9v.onrender.com` | Allowed CORS origin for frontend client requests |
| `CORS_ORIGIN` | Yes | `https://civicresolve-yc9v.onrender.com` | Primary CORS policy header |
| `GEMINI_API_KEY` | Optional | `AIzaSy...` | Google Gemini AI API key for complaint triage |
| `GEMINI_MODEL` | Optional | `gemini-2.5-flash` | Gemini model variant for triage inference |
| `GROQ_API_KEY` | Optional | `gsk_...` | Groq Cloud Llama API key (alternative triage engine) |
| `GROQ_MODEL` | Optional | `llama-3.3-70b-versatile` | Groq model selection |
| `SMTP_HOST` | Optional | `smtp.gmail.com` | Outbound mail server hostname |
| `SMTP_PORT` | Optional | `587` | Outbound mail server port |
| `SMTP_USER` | Optional | `alerts@civicresolve.gov` | Mail sender username |
| `SMTP_PASS` | Optional | `app-password-string` | Mail sender credentials |
| `FAST2SMS_API_KEY` | Optional | `key-string` | Fast2SMS provider key for telecom SMS delivery |
| `SEED_DEMO_DATA` | Development Only | `false` | Inserts synthetic test complaints on empty dev database |

---

## 2. Production Storage Guard Rules

When `NODE_ENV=production`:
1. The server **strictly forbids** ephemeral fallback. Either `DATA_DIR` or `SQLITE_DB_PATH` must be explicitly configured.
2. If `DATA_DIR` is configured, the directory must exist on the filesystem (verifying persistent disk attachment).
3. If the database file is missing, the server will **abort startup** unless `ALLOW_NEW_PRODUCTION_DB=true` is explicitly provided, preventing silent creation of empty databases on misconfigured mounts.

---

## 3. Render Web Service Configuration

In Render Dashboard -> `civicresolve-api` -> **Environment**:
```env
PORT=5000
NODE_ENV=production
DATA_DIR=/var/data
FRONTEND_URL=https://civicresolve-yc9v.onrender.com
CORS_ORIGIN=https://civicresolve-yc9v.onrender.com
JWT_SECRET=<strong-random-generated-secret>
```

In Render Dashboard -> `civicresolve-api` -> **Disks**:
- Name: `civicresolve-data`
- Mount Path: `/var/data`
- Size: `1 GB`
