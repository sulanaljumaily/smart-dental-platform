-- Create platform_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow all authenticated users to read platform settings
DROP POLICY IF EXISTS "Allow authenticated read for platform_settings" ON public.platform_settings;
CREATE POLICY "Allow authenticated read for platform_settings" ON public.platform_settings
  FOR SELECT TO authenticated USING (true);

-- All policy: Allow all authenticated users to manage platform settings (or adjust for specific admin role if needed)
DROP POLICY IF EXISTS "Allow authenticated manage for platform_settings" ON public.platform_settings;
CREATE POLICY "Allow authenticated manage for platform_settings" ON public.platform_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default messaging configuration
INSERT INTO public.platform_settings (key, value) VALUES (
  'messaging',
  '{
    "active_provider": "whatsapp_web",
    "providers": {
      "twilio": {
        "account_sid": "",
        "auth_token": "",
        "sender_phone": "",
        "enabled": false
      },
      "ultramsg": {
        "instance_id": "",
        "token": "",
        "enabled": false
      },
      "greenapi": {
        "id_instance": "",
        "api_token": "",
        "enabled": false
      },
      "whatsapp_web": {
        "enabled": true
      }
    },
    "allow_platform_messages": true,
    "allow_whatsapp_web": true
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;
