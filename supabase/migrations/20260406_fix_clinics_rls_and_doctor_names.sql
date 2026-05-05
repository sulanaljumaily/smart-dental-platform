-- ============================================================
-- Migration: Fix Clinics RLS + Subscription Requests Doctor Name
-- Date: 2026-04-06
-- ============================================================

-- 1. Fix clinics RLS - ensure doctors can insert their own clinics
-- Drop old restrictive policies if exist
DROP POLICY IF EXISTS "Doctors can create clinics" ON clinics;
DROP POLICY IF EXISTS "Users can create clinics" ON clinics;
DROP POLICY IF EXISTS "Authenticated users can insert clinics" ON clinics;

-- Allow any authenticated user to insert a clinic where they are the owner
CREATE POLICY "Authenticated users can insert own clinics"
  ON clinics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Allow owners to read their clinics (if not already)
DROP POLICY IF EXISTS "Owners can read own clinics" ON clinics;
CREATE POLICY "Owners can read own clinics"
  ON clinics FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR id IN (
      SELECT clinic_id FROM staff 
      WHERE auth_user_id = auth.uid() 
         OR user_id = auth.uid()
    )
  );

-- Allow owners to update their clinics
DROP POLICY IF EXISTS "Owners can update own clinics" ON clinics;
CREATE POLICY "Owners can update own clinics"
  ON clinics FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Allow owners to delete their clinics
DROP POLICY IF EXISTS "Owners can delete own clinics" ON clinics;
CREATE POLICY "Owners can delete own clinics"
  ON clinics FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- 2. Fix subscription_requests - ensure doctor_name snapshot is saved
-- Add a trigger to auto-fill doctor_name from profiles when missing
CREATE OR REPLACE FUNCTION fill_doctor_name_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.doctor_name IS NULL OR NEW.doctor_name = '' THEN
    SELECT full_name INTO NEW.doctor_name
    FROM profiles
    WHERE id = NEW.doctor_id;
  END IF;
  
  IF NEW.phone IS NULL OR NEW.phone = '' THEN
    SELECT phone INTO NEW.phone
    FROM profiles
    WHERE id = NEW.doctor_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_fill_doctor_name ON subscription_requests;
CREATE TRIGGER trg_fill_doctor_name
  BEFORE INSERT ON subscription_requests
  FOR EACH ROW
  EXECUTE FUNCTION fill_doctor_name_on_insert();

-- 3. Back-fill existing requests with doctor names from profiles
UPDATE subscription_requests sr
SET 
  doctor_name = COALESCE(NULLIF(sr.doctor_name, ''), p.full_name),
  phone = COALESCE(NULLIF(sr.phone, ''), p.phone)
FROM profiles p
WHERE sr.doctor_id = p.id
  AND (sr.doctor_name IS NULL OR sr.doctor_name = '' 
       OR sr.doctor_name IN ('Unknown', 'غير معروف', 'غير محدد'));

-- 4. Verify results
SELECT 
  id, 
  COALESCE(doctor_name, 'MISSING') as doctor_name, 
  status 
FROM subscription_requests 
ORDER BY created_at DESC 
LIMIT 5;
