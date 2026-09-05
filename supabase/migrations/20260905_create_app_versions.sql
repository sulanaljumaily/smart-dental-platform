-- جدول إصدارات التطبيقات للتحديثات الهوائية اللاسلكية (OTA Updates)
CREATE TABLE IF NOT EXISTS public.app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(50) NOT NULL,
    target VARCHAR(50) NOT NULL DEFAULT 'pro', -- 'pro' | 'patient' | 'web'
    bundle_url TEXT NOT NULL,
    description TEXT,
    is_mandatory BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- سياسة الأمان: السماح للجميع (المصرح وغير المصرح) بالقراءة للتحقق من التحديثات
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for app_versions"
ON public.app_versions FOR SELECT
USING (true);

-- السماح للمشرفين فقط بإضافة أو تعديل الإصدارات
CREATE POLICY "Allow admin write for app_versions"
ON public.app_versions FOR ALL
USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' = 'admin@dental-platform.com');
