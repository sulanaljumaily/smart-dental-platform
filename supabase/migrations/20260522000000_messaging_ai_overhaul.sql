-- Migration to add support for custom message types and clinic WhatsApp settings
-- Easiest step of the messaging and AI overhaul roadmap

-- 1. Add type and metadata columns to direct_messages if they do not exist
ALTER TABLE public.direct_messages 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';

ALTER TABLE public.direct_messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Create the whatsapp_settings table to store clinic specific WhatsApp integration details
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id INTEGER REFERENCES public.clinics(id) ON DELETE CASCADE UNIQUE,
    phone_number TEXT,
    provider TEXT DEFAULT 'whatsapp_web', -- 'whatsapp_web' | 'twilio' | 'ultramsg' | 'greenapi'
    api_key TEXT,
    api_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on whatsapp_settings
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- 4. Recreate RLS Policies on whatsapp_settings
DROP POLICY IF EXISTS "Allow all select for authenticated users" ON public.whatsapp_settings;
CREATE POLICY "Allow all select for authenticated users" ON public.whatsapp_settings
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow clinic staff/owner full control" ON public.whatsapp_settings;
CREATE POLICY "Allow clinic staff/owner full control" ON public.whatsapp_settings
    FOR ALL TO authenticated USING (
        clinic_id IN (
            SELECT id FROM public.clinics WHERE owner_id = auth.uid()
            UNION
            SELECT clinic_id FROM public.staff WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        clinic_id IN (
            SELECT id FROM public.clinics WHERE owner_id = auth.uid()
            UNION
            SELECT clinic_id FROM public.staff WHERE user_id = auth.uid()
        )
    );
