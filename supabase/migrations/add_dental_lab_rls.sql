DO $$ 
BEGIN
  -- Drop existing policies if they conflict
  DROP POLICY IF EXISTS "Admins and Lab owners can insert their lab" ON dental_laboratories;
  DROP POLICY IF EXISTS "Admins and Lab owners can update their lab" ON dental_laboratories;

  -- Create Insert Policy
  CREATE POLICY "Admins and Lab owners can insert their lab" ON dental_laboratories 
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') 
    OR 
    (user_id = auth.uid())
  );

  -- Create Update Policy
  CREATE POLICY "Admins and Lab owners can update their lab" ON dental_laboratories 
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') 
    OR 
    (user_id = auth.uid())
  );

END $$;
