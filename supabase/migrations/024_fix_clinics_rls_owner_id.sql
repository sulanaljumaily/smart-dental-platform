-- Fix Clinics RLS Policies and dependent tables referencing clinics(owner_id) instead of non-existent user_id

-- 1. CLINICS TABLE
DROP POLICY IF EXISTS "Users can view their own clinics" ON clinics;
DROP POLICY IF EXISTS "Users can create their own clinics" ON clinics;
DROP POLICY IF EXISTS "Users can update their own clinics" ON clinics;
DROP POLICY IF EXISTS "Users can delete their own clinics" ON clinics;

CREATE POLICY "Users can view their own clinics"
ON clinics FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Users can create their own clinics"
ON clinics FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own clinics"
ON clinics FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own clinics"
ON clinics FOR DELETE
USING (owner_id = auth.uid());


-- 2. PATIENTS TABLE
DROP POLICY IF EXISTS "Clinic owners can view their patients" ON patients;
DROP POLICY IF EXISTS "Clinic owners can create patients" ON patients;
DROP POLICY IF EXISTS "Clinic owners can update patients" ON patients;
DROP POLICY IF EXISTS "Clinic owners can delete patients" ON patients;

CREATE POLICY "Clinic owners can view their patients"
ON patients FOR SELECT
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Clinic owners can create patients"
ON patients FOR INSERT
WITH CHECK (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Clinic owners can update patients"
ON patients FOR UPDATE
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Clinic owners can delete patients"
ON patients FOR DELETE
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);


-- 3. APPOINTMENTS TABLE
DROP POLICY IF EXISTS "Clinic owners can view appointments" ON appointments;
DROP POLICY IF EXISTS "Clinic owners can create appointments" ON appointments;
DROP POLICY IF EXISTS "Clinic owners can update appointments" ON appointments;
DROP POLICY IF EXISTS "Clinic owners can delete appointments" ON appointments;

CREATE POLICY "Clinic owners can view appointments"
ON appointments FOR SELECT
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Clinic owners can create appointments"
ON appointments FOR INSERT
WITH CHECK (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Clinic owners can update appointments"
ON appointments FOR UPDATE
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Clinic owners can delete appointments"
ON appointments FOR DELETE
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);


-- 4. FINANCIAL TRANSACTIONS TABLE
DROP POLICY IF EXISTS "Transactions are viewable by clinic owners" ON financial_transactions;
DROP POLICY IF EXISTS "Transactions are insertable by clinic owners" ON financial_transactions;
DROP POLICY IF EXISTS "Transactions are updatable by clinic owners" ON financial_transactions;
DROP POLICY IF EXISTS "Transactions are deletable by clinic owners" ON financial_transactions;

CREATE POLICY "Transactions are viewable by clinic owners"
ON financial_transactions FOR SELECT
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Transactions are insertable by clinic owners"
ON financial_transactions FOR INSERT
WITH CHECK (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Transactions are updatable by clinic owners"
ON financial_transactions FOR UPDATE
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Transactions are deletable by clinic owners"
ON financial_transactions FOR DELETE
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);


-- 5. INVENTORY TABLE
DROP POLICY IF EXISTS "Inventory viewable by clinic owners" ON inventory;
DROP POLICY IF EXISTS "Inventory insertable by clinic owners" ON inventory;
DROP POLICY IF EXISTS "Inventory updatable by clinic owners" ON inventory;
DROP POLICY IF EXISTS "Inventory deletable by clinic owners" ON inventory;

CREATE POLICY "Inventory viewable by clinic owners"
ON inventory FOR SELECT
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Inventory insertable by clinic owners"
ON inventory FOR INSERT
WITH CHECK (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Inventory updatable by clinic owners"
ON inventory FOR UPDATE
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Inventory deletable by clinic owners"
ON inventory FOR DELETE
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);


-- 6. STAFF TABLE
DROP POLICY IF EXISTS "Staff viewable by clinic owners" ON staff;
DROP POLICY IF EXISTS "Staff insertable by clinic owners" ON staff;
DROP POLICY IF EXISTS "Staff updatable by clinic owners" ON staff;
DROP POLICY IF EXISTS "Staff deletable by clinic owners" ON staff;

CREATE POLICY "Staff viewable by clinic owners"
ON staff FOR SELECT
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Staff insertable by clinic owners"
ON staff FOR INSERT
WITH CHECK (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Staff updatable by clinic owners"
ON staff FOR UPDATE
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Staff deletable by clinic owners"
ON staff FOR DELETE
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);


-- 7. LAB WORKS TABLE
DROP POLICY IF EXISTS "Clinic Staff can manage their lab works" ON lab_works;

CREATE POLICY "Clinic Staff can manage their lab works"
ON lab_works FOR ALL
USING (
  clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid()) -- Owner
  OR
  requested_by = auth.uid() -- The doctor who requested it
);
