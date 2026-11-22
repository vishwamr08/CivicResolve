-- Migration: 003_seed_master_admin_and_announcements.sql
-- Description: Idempotent initialization of default administrative officer and municipal announcements
-- Engine: PostgreSQL 14+ / Supabase
-- Note: Fixed/plaintext credentials must NEVER be stored in SQL migrations.
-- Master admin is seeded with a locked hash; authorized credentials are set via `node provision_admin.js`.

-- Seed default master administrator placeholder if not already present
INSERT INTO admins (email, password_hash, name, role, district, department, designation)
VALUES (
  'admin@civicresolve.gov',
  '*LOCKED*PROVISION_REQUIRED*',
  'Director of Municipal Operations',
  'super_admin',
  'Statewide',
  'Municipal Administration & Water Supply',
  'Director of Municipal Operations'
)
ON CONFLICT (email) DO NOTHING;

-- Seed default municipal announcements if announcements table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM announcements LIMIT 1) THEN
    INSERT INTO announcements (title, title_ta, content, content_ta, category, priority, department, created_by)
    VALUES
      (
        'Emergency Storm Drain Desilting Drive Across Chennai & Coastal Districts',
        'சென்னை மற்றும் கடலோர மாவட்டங்களில் அவசர மழைநீர் வடிகால் தூர்வாரும் பணி',
        'Pre-monsoon desilting of major stormwater culverts is underway. Citizens are requested to report blocked catchpits via the CivicResolve portal.',
        'பருவமழை முன்னெச்சரிக்கை நடவடிக்கையாக முக்கிய மழைநீர் வடிகால்கள் தூர்வாரப்பட்டு வருகின்றன. அடைப்புகள் இருப்பின் உடனடியாக மனு செய்யவும்.',
        'Public Notice',
        'High',
        'Greater Chennai Corporation',
        'State Operations Desk'
      ),
      (
        '24x7 Drinking Water Supply Helpline & Rapid Repair Taskforce Activated',
        '24x7 குடிநீர் விநியோக உதவி மையம் மற்றும் அவசர சீரமைப்பு பிரிவு செயல்பாடு',
        'CMWSSB and TWAD Board have deployed mobile pipeline welding vans. All reported main line bursts will receive verified repair within 12 hours.',
        'குடிநீர் குழாய் உடைப்புகள் குறித்த புகார்களுக்கு 12 மணி நேரத்திற்குள் தீர்வு காண நடமாடும் அவசர சீரமைப்பு குழுக்கள் தயார் நிலையில் உள்ளன.',
        'Service Update',
        'Normal',
        'CMWSSB / TWAD Board',
        'State Operations Desk'
      ),
      (
        'Smart LED Streetlight Replacement Initiative in Suburban Zones',
        'புறநகர் பகுதிகளில் ஸ்மார்ட் எல்இடி தெருவிளக்குகள் பொருத்தும் திட்டம்',
        'Energy-efficient automatic timer LED lights are being installed across 18 suburban municipalities to eliminate dark road corridors.',
        'இருள் சூழ்ந்த பகுதிகளை அகற்ற 18 நகராட்சிகளில் புதிய எல்இடி தெருவிளக்குகள் பொருத்தப்பட்டு வருகின்றன.',
        'Infrastructure',
        'Normal',
        'TANGEDCO / Municipal Admin',
        'State Operations Desk'
      );
  END IF;
END $$;
