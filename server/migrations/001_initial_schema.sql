-- Migration: 001_initial_schema.sql
-- Description: Core application tables for CivicResolve
-- Engine: PostgreSQL 14+ / Supabase

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'super_admin',
  district VARCHAR(100) DEFAULT 'Statewide',
  department VARCHAR(255) DEFAULT 'Municipal Administration & Water Supply',
  designation VARCHAR(255) DEFAULT 'Director of Municipal Operations',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Citizens Table
CREATE TABLE IF NOT EXISTS citizens (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  district VARCHAR(100) DEFAULT 'Chennai',
  municipality VARCHAR(255) DEFAULT 'Greater Chennai Corporation',
  ward VARCHAR(100) DEFAULT 'Ward 114',
  email_verified INTEGER DEFAULT 1,
  mobile_verified INTEGER DEFAULT 1,
  email_notifications INTEGER DEFAULT 1,
  sms_notifications INTEGER DEFAULT 1,
  whatsapp_notifications INTEGER DEFAULT 0,
  sms_consent INTEGER DEFAULT 1,
  whatsapp_consent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
  id SERIAL PRIMARY KEY,
  ref_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  location VARCHAR(500) NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  image_url TEXT,
  status VARCHAR(50) DEFAULT 'Submitted',
  priority VARCHAR(50) DEFAULT 'Medium',
  department VARCHAR(255),
  ai_summary TEXT,
  ai_category VARCHAR(100),
  ai_priority VARCHAR(50),
  ai_department VARCHAR(255),
  ai_confidence REAL,
  ai_reason TEXT,
  ai_safety_risk TEXT,
  ai_recommended_action TEXT,
  ai_suggested_response_time VARCHAR(100),
  ai_status VARCHAR(50) DEFAULT 'UNAVAILABLE',
  resolution_remarks TEXT,
  status_history TEXT,
  is_gps_verified INTEGER DEFAULT 0,
  district VARCHAR(100) DEFAULT 'Chennai',
  local_body VARCHAR(255) DEFAULT 'Greater Chennai Corporation',
  ward VARCHAR(100) DEFAULT 'Zone 9 - Ward 114',
  citizen_id INTEGER,
  citizen_name VARCHAR(255),
  citizen_phone VARCHAR(50),
  citizen_email VARCHAR(255),
  sla_hours INTEGER DEFAULT 24,
  sla_deadline TIMESTAMPTZ,
  assigned_officer VARCHAR(255),
  internal_notes TEXT,
  resolution_evidence_url TEXT,
  citizen_rating INTEGER,
  citizen_feedback TEXT,
  is_appealed INTEGER DEFAULT 0,
  appeal_reason TEXT,
  duplicate_of_ref_id VARCHAR(50),
  language VARCHAR(10) DEFAULT 'en',
  verification_otp VARCHAR(20),
  otp_expires_at TIMESTAMPTZ,
  reopen_count INTEGER DEFAULT 0,
  location_accuracy REAL,
  detection_method VARCHAR(50) DEFAULT 'manual',
  zone VARCHAR(100),
  postal_code VARCHAR(20),
  jurisdiction_source VARCHAR(50) DEFAULT 'unverified',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Citizen OTPs Table
CREATE TABLE IF NOT EXISTS citizen_otps (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(50) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) DEFAULT 'login',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  verified INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  complaint_ref VARCHAR(50),
  actor_id INTEGER,
  actor_name VARCHAR(255),
  actor_role VARCHAR(50),
  action VARCHAR(255) NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  remarks TEXT,
  ip_address VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  title_ta VARCHAR(500),
  content TEXT NOT NULL,
  content_ta TEXT,
  category VARCHAR(100) DEFAULT 'Public Notice',
  priority VARCHAR(50) DEFAULT 'Normal',
  department VARCHAR(255) DEFAULT 'Municipal Administration',
  is_active INTEGER DEFAULT 1,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  recipient_type VARCHAR(50) NOT NULL,
  recipient_id INTEGER,
  ref_id VARCHAR(50),
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  ref_id VARCHAR(50),
  recipient VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  subject VARCHAR(500),
  body TEXT,
  provider_response TEXT,
  error_message TEXT,
  attempts INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMPTZ
);

-- 9. Revoked Tokens Table (For security & logout token blacklisting)
CREATE TABLE IF NOT EXISTS revoked_tokens (
  id SERIAL PRIMARY KEY,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
