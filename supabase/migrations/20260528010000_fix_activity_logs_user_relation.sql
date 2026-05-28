-- Link user_id in activity_logs directly to profiles table instead of auth.users
ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
ALTER TABLE public.activity_logs ADD CONSTRAINT fk_activity_logs_user_profiles FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
