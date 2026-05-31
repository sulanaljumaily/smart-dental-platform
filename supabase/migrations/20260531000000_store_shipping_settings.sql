-- Insert default store shipping configuration
INSERT INTO public.platform_settings (key, value) VALUES (
  'store_shipping',
  '{
    "patient_shipping_cost": 5000,
    "doctor_shipping_cost": 10000
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;
