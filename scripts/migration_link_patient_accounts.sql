-- ════════════════════════════════════════════
--  MIGRATION: Link existing patient data to portal accounts
--  Run via: node scripts/run_migration.cjs scripts/migration_link_patient_accounts.sql
--  Date: 2026-05-19
-- ════════════════════════════════════════════

-- Step 1: Link patient files to portal accounts via phone number
UPDATE patients pt
SET patient_user_id = pr.id
FROM profiles pr
WHERE pt.patient_user_id IS NULL
  AND pt.deleted_at IS NULL
  AND pr.role = 'patient'
  AND REPLACE(REPLACE(pt.phone, ' ', ''), '-', '') = REPLACE(REPLACE(pr.phone, ' ', ''), '-', '');

-- Step 2: Link appointments to portal accounts via phone number
UPDATE appointments a
SET patient_user_id = pr.id
FROM profiles pr
WHERE a.patient_user_id IS NULL
  AND pr.role = 'patient'
  AND REPLACE(REPLACE(a.phone_number, ' ', ''), '-', '') = REPLACE(REPLACE(pr.phone, ' ', ''), '-', '');

-- Step 3: Link appointments to their patient files
-- For appointments that now have patient_user_id but no patient_id
UPDATE appointments a
SET patient_id = pt.id
FROM patients pt
WHERE a.patient_id IS NULL
  AND a.patient_user_id IS NOT NULL
  AND a.patient_user_id = pt.patient_user_id
  AND a.clinic_id::text = pt.clinic_id::text
  AND pt.deleted_at IS NULL;
