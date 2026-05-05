-- Drop previous policy if it exists to prevent conflict
DROP POLICY IF EXISTS "public_clinics_map_visibility" ON clinics;

-- Allow public read access to clinics that are active and have showOnMap = true
CREATE POLICY "public_clinics_map_visibility" 
ON clinics 
FOR SELECT 
TO public
USING (
  is_active = true 
  AND settings->>'showOnMap' = 'true'
);
