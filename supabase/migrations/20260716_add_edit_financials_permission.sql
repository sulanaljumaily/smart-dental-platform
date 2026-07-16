-- Database migration: Add editFinancials to staff permissions JSONB

-- 1. Update existing staff permissions to include editFinancials as false if not already present
UPDATE staff 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb), 
  '{editFinancials}', 
  'false'::jsonb, 
  true
)
WHERE permissions IS NULL OR NOT (permissions ? 'editFinancials');

-- 2. Update default constraints for the permissions column
ALTER TABLE staff ALTER COLUMN permissions SET DEFAULT '{
  "appointments": false,
  "patients": false,
  "financials": false,
  "editFinancials": false,
  "settings": false,
  "reports": false,
  "activityLog": false,
  "assets": false,
  "staff": false,
  "manageStaff": false,
  "lab": false,
  "assistantManager": false
}'::jsonb;
