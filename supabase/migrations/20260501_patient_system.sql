-- =============================================================
-- Patient System Migration
-- Adds patient account linking to appointments & clinic files,
-- store_type for suppliers, patient store categories table.
-- =============================================================

-- ── 1. Update profiles role constraint to include 'patient' ──
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'doctor', 'patient', 'supplier', 'laboratory', 'staff', 'newuser'));

-- ── 2. Add patient_user_id + is_online_booking to appointments ──
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS patient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_online_booking BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_appointments_patient_user ON appointments(patient_user_id);

-- ── 3. Add patient_user_id to patients (clinic patient files) ──
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS patient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patients_patient_user ON patients(patient_user_id);

-- ── 4. RLS: Patient can view their own appointments ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'appointments' AND policyname = 'patient_view_own_appointments'
  ) THEN
    CREATE POLICY "patient_view_own_appointments" ON appointments
      FOR SELECT TO authenticated
      USING (patient_user_id = auth.uid());
  END IF;
END $$;

-- ── 5. RLS: Patient can view their own clinic files ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'patients' AND policyname = 'patient_view_own_files'
  ) THEN
    CREATE POLICY "patient_view_own_files" ON patients
      FOR SELECT TO authenticated
      USING (patient_user_id = auth.uid());
  END IF;
END $$;

-- ── 6. store_type column for suppliers ──
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'professional'
    CHECK (store_type IN ('professional', 'patient', 'both'));

-- ── 7. Ensure target_audience supports 'patient' (TEXT[]) ──
-- The existing column is already TEXT[] so no constraint change needed;
-- just ensure the column exists:
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS target_audience TEXT[] DEFAULT '{}';

-- ── 8. Patient Store Categories table ──
CREATE TABLE IF NOT EXISTS patient_store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🦷',
  color TEXT DEFAULT '#14b8a6',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for patient_store_categories (public read)
ALTER TABLE patient_store_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'patient_store_categories' AND policyname = 'public_read_patient_categories'
  ) THEN
    CREATE POLICY "public_read_patient_categories" ON patient_store_categories
      FOR SELECT TO public USING (is_active = true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'patient_store_categories' AND policyname = 'admin_manage_patient_categories'
  ) THEN
    CREATE POLICY "admin_manage_patient_categories" ON patient_store_categories
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- ── 9. Seed default patient store categories ──
INSERT INTO patient_store_categories (name, icon, color, sort_order) VALUES
  ('العناية بالأسنان',   '🦷', '#14b8a6', 1),
  ('معجون وغسول',        '🧴', '#3b82f6', 2),
  ('فرش الأسنان',        '🪥', '#22c55e', 3),
  ('مستلزمات صحية',      '💊', '#8b5cf6', 4),
  ('عروض وحزم',          '🎁', '#f97316', 5),
  ('منتجات الأطفال',     '🧸', '#ec4899', 6)
ON CONFLICT DO NOTHING;
