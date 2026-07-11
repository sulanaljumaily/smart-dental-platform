-- Enhance user_clinic_ids function to allow staff and clinic members proper RLS access
CREATE OR REPLACE FUNCTION public.user_clinic_ids()
RETURNS SETOF INTEGER AS $$
BEGIN
  RETURN QUERY 
    SELECT id FROM clinics WHERE owner_id = auth.uid()
    UNION
    SELECT clinic_id FROM staff WHERE user_id = auth.uid()
    UNION
    SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DO $$ BEGIN RAISE NOTICE 'Enhanced staff RLS policies applied successfully.'; END $$;
