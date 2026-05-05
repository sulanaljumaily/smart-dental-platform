-- 1. Drop the check constraint if it exists. 
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.profiles'::regclass AND contype = 'c' AND conname ILIKE '%role%'
    LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || r.conname;
    END LOOP;
END $$;

-- 2. Add an updated Check constraint that allows 'newuser'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'doctor', 'supplier', 'laboratory', 'staff', 'newuser'));

-- 3. Update the handle_new_user function to use 'newuser' instead of 'patient'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'newuser')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
