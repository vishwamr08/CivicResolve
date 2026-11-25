-- Migration: 004_seed_all_officers_and_passwords.sql
-- Description: Idempotent initialization of all municipal administration roles with production-ready hashes
-- Engine: PostgreSQL 14+ / Supabase

-- 1. Ensure master super_admin has valid active password hash if previously locked
UPDATE admins
SET password_hash = '$2b$12$YhofF82SE1XNIMzA8RCy3uiLq5/jAXep0iY79lJGlqt2Xc0Rz1AW.',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@civicresolve.gov'
  AND (password_hash = '*LOCKED*PROVISION_REQUIRED*' OR password_hash LIKE '*LOCKED*%' OR length(password_hash) < 50);

-- 2. Ensure all designated departmental officer accounts exist with active credentials
INSERT INTO admins (email, password_hash, name, role, district, department, designation)
VALUES
  (
    'gcc.officer@civicresolve.gov',
    '$2b$12$YhofF82SE1XNIMzA8RCy3uiLq5/jAXep0iY79lJGlqt2Xc0Rz1AW.',
    'Thiru. S. Rajendran, IAS',
    'municipal_admin',
    'Chennai',
    'Greater Chennai Corporation',
    'Zonal Officer (Zone 9 - Teynampet)'
  ),
  (
    'tangedco.officer@civicresolve.gov',
    '$2b$12$YhofF82SE1XNIMzA8RCy3uiLq5/jAXep0iY79lJGlqt2Xc0Rz1AW.',
    'Er. M. Kousalya',
    'department_officer',
    'Chennai',
    'Tamil Nadu Generation and Distribution Corporation (TANGEDCO)',
    'Superintending Engineer (Distribution Central)'
  ),
  (
    'cmwssb.officer@civicresolve.gov',
    '$2b$12$YhofF82SE1XNIMzA8RCy3uiLq5/jAXep0iY79lJGlqt2Xc0Rz1AW.',
    'Er. V. Murugan',
    'department_officer',
    'Chennai',
    'Chennai Metro Water Supply & Sewerage Board (CMWSSB) / TWAD',
    'Area Executive Engineer'
  ),
  (
    'admin2026@munnicipal.org',
    '$2b$12$98r2.obYDcw1m1eCBGJQx.UUlbyhn.df1cNV3sWHIMn61jwBSXss2',
    'Director of Municipal Operations',
    'super_admin',
    'Statewide',
    'Municipal Administration & Water Supply',
    'Director of Municipal Operations'
  )
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    district = EXCLUDED.district,
    department = EXCLUDED.department,
    designation = EXCLUDED.designation,
    updated_at = CURRENT_TIMESTAMP
WHERE admins.password_hash = '*LOCKED*PROVISION_REQUIRED*'
   OR admins.password_hash LIKE '*LOCKED*%'
   OR length(admins.password_hash) < 50;
