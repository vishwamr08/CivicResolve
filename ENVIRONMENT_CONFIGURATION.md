# CivicResolve — Environment Configuration Guide

This guide details all environment variables supported by the CivicResolve backend across production (Supabase PostgreSQL) and local development (SQLite).

---

## 1. Environment Variable Reference

| Variable | Required in Production | Default / Sample | Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `production` / `development` / `test` | Runtime environment mode |
| `DATABASE_URL` | **Yes (Production)** | `postgresql://user:pass@host:5432/postgres` | PostgreSQL connection URI for Supabase / Render cluster |
| `PORT` | Yes | `5000` | HTTP port for Express backend server |
| `FRONTEND_URL` | Yes | `https://civicresolve-yc9v.onrender.com` | Allowed CORS origin for frontend client requests |
| `CORS_ORIGIN` | Yes | `https://civicresolve-yc9v.onrender.com` | Primary CORS policy header |
| `JWT_SECRET` | Yes | `<strong-cryptographic-secret>` | Secret key for signing and validating session JWTs |
| `OTP_SALT` | Optional | `civic_resolve_otp_salt_2026` | Cryptographic salt for SHA-256 OTP hashing |
| `USE_SQLITE` | Local Dev Only | `false` | When `true`, forces SQLite engine even if `DATABASE_URL` is set |
| `PG_POOL_MAX` | Optional | `20` | Maximum connections in PostgreSQL connection pool |
| `PG_SSL_DISABLE` | Optional | `false` | Set to `true` only for non-SSL local PostgreSQL instances |
| `AUTO_MIGRATE` | Optional | `true` | Automatically runs pending migrations on startup |
| `INITIAL_ADMIN_EMAIL` | Optional | `admin@civicresolve.gov` | Seed account email for initial administrator setup |
| `INITIAL_ADMIN_PASSWORD` | **Deprecated in Prod** | *(None)* | Local dev initial password only. In production, use `provision_admin.js` |
| `GEMINI_API_KEY` | Optional | `AIzaSy...` | Google Gemini AI API key for autonomous complaint triage |
| `GEMINI_MODEL` | Optional | `gemini-2.5-flash` | Gemini model variant for triage inference |
| `GROQ_API_KEY` | Optional | `gsk_...` | Groq Cloud API key (alternative fast AI triage) |
| `GROQ_MODEL` | Optional | `llama-3.3-70b-versatile` | Groq model selection |
| `SMTP_HOST` | Optional | `smtp.gmail.com` | Outbound mail server hostname |
| `SMTP_PORT` | Optional | `587` | Outbound mail server port |
| `SMTP_USER` | Optional | `alerts@civicresolve.gov` | Outbound mail sender account |
| `SMTP_PASS` | Optional | `app-password-string` | Outbound mail application password |
| `FAST2SMS_API_KEY` | Optional | `key-string` | Fast2SMS provider key for telecom SMS delivery |
| `SEED_DEMO_DATA` | Local Dev Only | `false` | Inserts synthetic test complaints on empty dev database |

---

## 2. Production Storage Guard Rules

When `NODE_ENV=production`:
1. The server **fails closed** if `DATABASE_URL` is missing:
   `[FATAL DATABASE STARTUP FAILURE]: Production environment (NODE_ENV=production) requires DATABASE_URL pointing to the authoritative PostgreSQL database.`
2. Silent fallback from PostgreSQL to SQLite is strictly forbidden in production.
3. Database connections run with secure TLS pooling (`ssl: { rejectUnauthorized: false }`).

---

## 3. Render Production Web Service Setup

In the Render Dashboard -> `civicresolve-api` -> **Environment**:
```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres.xxx:yyy@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
PORT=5000
FRONTEND_URL=https://civicresolve-yc9v.onrender.com
CORS_ORIGIN=https://civicresolve-yc9v.onrender.com
JWT_SECRET=<strong-random-generated-secret>
```
*(Do not include `INITIAL_ADMIN_PASSWORD` in production. Instead, run `node provision_admin.js --confirm` from the Render Shell).*

---

## 4. Local Development Configurations

### Option A: Local SQLite (Default)
Simply leave `DATABASE_URL` unset, or set `USE_SQLITE=true` in `server/.env`:
```env
USE_SQLITE=true
PORT=5000
JWT_SECRET=local_development_secret
```

### Option B: Local Development against Supabase
Set `DATABASE_URL` in `server/.env`:
```env
DATABASE_URL=postgresql://postgres.xxx:yyy@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
PORT=5000
JWT_SECRET=local_development_secret
```
The server will automatically connect to Supabase PostgreSQL and ensure all migrations are up to date.
