-- Migration: 005_profile_photos_and_free_notifications.sql
-- Description: Profile photo columns (citizens & admins), Web Push VAPID subscriptions, and enhanced in-app notifications
-- Engine: PostgreSQL 14+ / Supabase

-- 1. Citizen Profile Photo & Web Push Preference Columns
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS profile_photo_data TEXT;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS profile_photo_mime VARCHAR(50);
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS profile_photo_updated_at TIMESTAMPTZ;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS web_push_enabled INTEGER DEFAULT 0;

-- 2. Administrator Profile Photo & Web Push Preference Columns
ALTER TABLE admins ADD COLUMN IF NOT EXISTS profile_photo_data TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS profile_photo_mime VARCHAR(50);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS profile_photo_updated_at TIMESTAMPTZ;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS web_push_enabled INTEGER DEFAULT 0;

-- 3. Enhanced In-App Notifications Columns
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_type VARCHAR(100) DEFAULT 'grievance_update';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 4. Browser Web Push Subscriptions Table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_type VARCHAR(50) NOT NULL,
  user_id INTEGER NOT NULL,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(recipient_type, recipient_id, is_read);
