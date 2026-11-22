-- Migration: 002_indexes_and_constraints.sql
-- Description: Foreign keys, uniqueness constraints, and performance indexes
-- Engine: PostgreSQL 14+ / Supabase

-- Add foreign key constraint safely if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_complaints_citizen'
  ) THEN
    ALTER TABLE complaints 
      ADD CONSTRAINT fk_complaints_citizen 
      FOREIGN KEY (citizen_id) REFERENCES citizens(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Citizen Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_citizens_phone_unique ON citizens(phone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_citizens_email_unique ON citizens(email);

-- Complaint Lookup & Filter Indexes
CREATE INDEX IF NOT EXISTS idx_complaints_ref_id ON complaints(ref_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_citizen_id ON complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_citizen_phone ON complaints(citizen_phone);
CREATE INDEX IF NOT EXISTS idx_complaints_citizen_email ON complaints(citizen_email);
CREATE INDEX IF NOT EXISTS idx_complaints_district ON complaints(district);
CREATE INDEX IF NOT EXISTS idx_complaints_sla_deadline ON complaints(sla_deadline);

-- OTP Lookup Index
CREATE INDEX IF NOT EXISTS idx_citizen_otps_phone ON citizen_otps(phone);

-- Audit Log Index
CREATE INDEX IF NOT EXISTS idx_audit_logs_complaint_ref ON audit_logs(complaint_ref);

-- Announcement Index
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);

-- Notification Index
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id);

-- Notification Log Index
CREATE INDEX IF NOT EXISTS idx_notification_logs_ref ON notification_logs(ref_id);
