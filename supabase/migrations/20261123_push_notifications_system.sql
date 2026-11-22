-- ============================================================================
-- Dental Platform — Complete Push Notifications, Scheduled Campaigns,
-- Automatic Appointment/Course Triggers & 1-Day Advance Reminders System
-- Based on Supabase Push Notifications architecture (FCM HTTP v1 + DB Triggers)
-- ============================================================================

-- 1. Ensure `notifications` table has all required columns & read-state sync
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS laboratory_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- Keep `is_read` and `read` always synchronized
CREATE OR REPLACE FUNCTION public.sync_notification_read_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.is_read := COALESCE(NEW.is_read, NEW.read, false);
        NEW.read := NEW.is_read;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.is_read IS DISTINCT FROM OLD.is_read THEN
            NEW.read := NEW.is_read;
        ELSIF NEW.read IS DISTINCT FROM OLD.read THEN
            NEW.is_read := NEW.read;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_notification_read ON public.notifications;
CREATE TRIGGER trg_sync_notification_read
    BEFORE INSERT OR UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.sync_notification_read_columns();

-- Normalize any legacy rows where is_read was NULL
UPDATE public.notifications SET is_read = COALESCE(is_read, read, false), read = COALESCE(is_read, read, false) WHERE is_read IS NULL OR read IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_clinic_id ON public.notifications(clinic_id);

-- Ensure authenticated users can read, update, and delete their own notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (
        auth.uid() = user_id
        OR (
            user_id IS NULL
            AND clinic_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.clinics c
                WHERE c.id = notifications.clinic_id AND c.owner_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- 2. User Device Push Tokens table (FCM / Web Push / Capacitor / Tauri)
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web', 'desktop')),
    app_target TEXT DEFAULT 'pro',
    device_name TEXT,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_active ON public.user_push_tokens(user_id) WHERE is_active = true;

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users manage own push tokens" ON public.user_push_tokens
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view push token stats" ON public.user_push_tokens;
CREATE POLICY "Admins can view push token stats" ON public.user_push_tokens
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 3. Upgrade `notification_campaigns` table for scheduling, offers, discounts, updates & multi-audience targeting
ALTER TABLE public.notification_campaigns DROP CONSTRAINT IF EXISTS notification_campaigns_type_check;
ALTER TABLE public.notification_campaigns ADD CONSTRAINT notification_campaigns_type_check
    CHECK (type IN ('promotional', 'system', 'announcement', 'reminder', 'offer', 'discount', 'update', 'course', 'webinar'));

ALTER TABLE public.notification_campaigns ADD COLUMN IF NOT EXISTS target_audiences TEXT[] DEFAULT ARRAY['all']::TEXT[];
ALTER TABLE public.notification_campaigns ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notification_campaigns ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.notification_campaigns ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notification_campaigns ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notification_campaigns_scheduled ON public.notification_campaigns(status, scheduled_date) WHERE status = 'scheduled';

ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.notification_campaigns;
CREATE POLICY "Admins can manage campaigns" ON public.notification_campaigns
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 4. Create `notification_templates` table (reusable admin templates inside "إرسال إشعارات")
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'promotional',
    target_audiences TEXT[] DEFAULT ARRAY['all']::TEXT[],
    link TEXT,
    image_url TEXT,
    priority TEXT DEFAULT 'normal',
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage notification templates" ON public.notification_templates;
CREATE POLICY "Admins can manage notification templates" ON public.notification_templates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Seed starter professional Arabic templates if table is empty
INSERT INTO public.notification_templates (name, title, content, type, target_audiences, link, priority)
SELECT * FROM (VALUES
    ('عرض خاص على منتجات المتجر', '🔥 عرض خاص وحصري في المتجر الطبي!', 'استفد الآن من تخفيضات تصل إلى 25% على مستلزمات ومواد طب الأسنان المختارة لفترة محدودة.', 'offer', ARRAY['doctor_staff', 'laboratory']::TEXT[], '/store/deals', 'high'),
    ('تخفيضات موسمية للعيادات', '💎 خصومات خاصة للعيادات والمختبرات', 'عروض وتخفيضات حصرية على أحدث الأجهزة والمواد السنية — اطلب الآن قبل نفاد الكمية.', 'discount', ARRAY['doctor_staff', 'laboratory']::TEXT[], '/store/deals', 'normal'),
    ('إشعار تحديث التطبيق', '🚀 تحديث جديد متوفر لتطبيق المنصة', 'تم إطلاق إصدار جديد يتضمن تحسينات كبيرة في السرعة والأداء ومزايا جديدة. يرجى التحديث الآن.', 'update', ARRAY['all']::TEXT[], '/doctor/updates', 'high'),
    ('إعلان دورة أو ندوة علمية', '🎓 دورة علمية جديدة متاحة للتسجيل', 'ندعوكم للانضمام إلى أحدث الدورات والندوات التخصصية في المجتمع الطبي — سجل مقعدك الآن.', 'course', ARRAY['doctor_staff', 'laboratory']::TEXT[], '/community', 'normal'),
    ('تذكير للمراجعين والعروض', '🦷 اعتنِ بابتسامتك مع عروض المنصة', 'احجز موعدك القادم بكل سهولة عبر منصة طب الأسنان وتصفح أحدث عروض العناية بالأسنان.', 'promotional', ARRAY['patient']::TEXT[], '/patient/store/deals', 'normal')
) AS v(name, title, content, type, target_audiences, link, priority)
WHERE NOT EXISTS (SELECT 1 FROM public.notification_templates LIMIT 1);

-- 5. Helper function: Resolve recipient user IDs for the 4 target audiences
-- Audiences: 'all', 'doctor_staff' (or 'doctor'), 'laboratory', 'supplier', 'patient'
CREATE OR REPLACE FUNCTION public.resolve_notification_recipients(
    p_audiences TEXT[],
    p_exclude_user_id UUID DEFAULT NULL
)
RETURNS TABLE(recipient_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_include_all BOOLEAN;
    v_include_doctors BOOLEAN;
    v_include_labs BOOLEAN;
    v_include_suppliers BOOLEAN;
    v_include_patients BOOLEAN;
    v_include_admins BOOLEAN;
BEGIN
    v_include_all := (p_audiences IS NULL OR array_length(p_audiences, 1) IS NULL OR 'all' = ANY(p_audiences));
    v_include_doctors := v_include_all OR ('doctor_staff' = ANY(p_audiences)) OR ('doctor' = ANY(p_audiences)) OR ('staff' = ANY(p_audiences));
    v_include_labs := v_include_all OR ('laboratory' = ANY(p_audiences)) OR ('lab' = ANY(p_audiences));
    v_include_suppliers := v_include_all OR ('supplier' = ANY(p_audiences));
    v_include_patients := v_include_all OR ('patient' = ANY(p_audiences));
    v_include_admins := ('admin' = ANY(p_audiences));

    RETURN QUERY
    WITH matched_users AS (
        -- 1. Doctors & clinic staff (from profiles + linked staff records)
        SELECT p.id AS uid
        FROM public.profiles p
        WHERE v_include_doctors AND p.role IN ('doctor', 'staff')
        UNION
        SELECT s.user_id AS uid
        FROM public.staff s
        WHERE v_include_doctors AND s.user_id IS NOT NULL AND COALESCE(s.status, 'active') IN ('active', 'on_leave')
        UNION
        SELECT s.auth_user_id AS uid
        FROM public.staff s
        WHERE v_include_doctors AND s.auth_user_id IS NOT NULL AND COALESCE(s.status, 'active') IN ('active', 'on_leave')
        UNION
        -- 2. Laboratories
        SELECT p.id AS uid
        FROM public.profiles p
        WHERE v_include_labs AND p.role IN ('laboratory', 'lab')
        UNION
        -- 3. Suppliers
        SELECT p.id AS uid
        FROM public.profiles p
        WHERE v_include_suppliers AND p.role = 'supplier'
        UNION
        -- 4. Patients
        SELECT p.id AS uid
        FROM public.profiles p
        WHERE v_include_patients AND p.role = 'patient'
        UNION
        -- 5. Admins (when explicitly requested e.g. join requests / upgrade alerts)
        SELECT p.id AS uid
        FROM public.profiles p
        WHERE v_include_admins AND p.role = 'admin'
    )
    SELECT DISTINCT m.uid
    FROM matched_users m
    JOIN auth.users au ON au.id = m.uid
    WHERE m.uid IS NOT NULL
      AND (p_exclude_user_id IS NULL OR m.uid <> p_exclude_user_id);
END;
$$;

-- 6. Upgraded RPC: Send or Schedule Campaign Notification (supports 4 audiences, scheduling, offers, links, images)
DROP FUNCTION IF EXISTS public.send_campaign_notifications(TEXT, TEXT, TEXT, TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.send_campaign_notifications(
    p_title TEXT,
    p_message TEXT,
    p_target_role TEXT DEFAULT 'all',
    p_type TEXT DEFAULT 'system',
    p_link TEXT DEFAULT NULL,
    p_sender_id UUID DEFAULT NULL,
    p_target_audiences TEXT[] DEFAULT NULL,
    p_scheduled_date TIMESTAMPTZ DEFAULT NULL,
    p_priority TEXT DEFAULT 'normal',
    p_image_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_channels JSONB DEFAULT '["app","push"]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_audiences TEXT[];
    v_campaign_id UUID;
    v_count INTEGER := 0;
    v_is_scheduled BOOLEAN;
    v_notif_ids UUID[];
    v_audience_label TEXT;
BEGIN
    IF p_target_audiences IS NOT NULL AND array_length(p_target_audiences, 1) > 0 THEN
        v_audiences := p_target_audiences;
    ELSE
        v_audiences := ARRAY[COALESCE(NULLIF(p_target_role, ''), 'all')];
    END IF;

    v_audience_label := array_to_string(v_audiences, ',');
    v_is_scheduled := (p_scheduled_date IS NOT NULL AND p_scheduled_date > NOW() + INTERVAL '30 seconds');

    -- 1. Create Campaign Record
    INSERT INTO public.notification_campaigns (
        title, content, target_audience, target_audiences, type, status,
        scheduled_date, priority, channels, sent_count, link, image_url, metadata, created_by, sent_at
    )
    VALUES (
        p_title, p_message, v_audience_label, v_audiences, COALESCE(p_type, 'system'),
        CASE WHEN v_is_scheduled THEN 'scheduled' ELSE 'sent' END,
        p_scheduled_date, COALESCE(p_priority, 'normal'), COALESCE(p_channels, '["app","push"]'::jsonb),
        0, p_link, p_image_url, COALESCE(p_metadata, '{}'::jsonb), p_sender_id,
        CASE WHEN v_is_scheduled THEN NULL ELSE NOW() END
    )
    RETURNING id INTO v_campaign_id;

    -- If scheduled for future, return immediately without inserting user notifications yet
    IF v_is_scheduled THEN
        RETURN jsonb_build_object(
            'success', true,
            'scheduled', true,
            'sent_count', 0,
            'campaign_id', v_campaign_id
        );
    END IF;

    -- 2. Immediate dispatch to all resolved target recipients
    WITH inserted AS (
        INSERT INTO public.notifications (
            user_id, title, message, type, link, priority, image_url, metadata, is_read, read, created_at
        )
        SELECT
            r.recipient_id,
            p_title,
            p_message,
            COALESCE(p_type, 'system'),
            p_link,
            COALESCE(p_priority, 'normal'),
            p_image_url,
            COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('campaign_id', v_campaign_id, 'audiences', v_audiences),
            false,
            false,
            NOW()
        FROM public.resolve_notification_recipients(v_audiences, p_sender_id) r
        RETURNING id
    )
    SELECT COUNT(*), ARRAY_AGG(id) INTO v_count, v_notif_ids FROM inserted;

    UPDATE public.notification_campaigns
    SET sent_count = v_count, status = 'sent', sent_at = NOW()
    WHERE id = v_campaign_id;

    RETURN jsonb_build_object(
        'success', true,
        'scheduled', false,
        'sent_count', v_count,
        'campaign_id', v_campaign_id,
        'notification_ids', COALESCE(to_jsonb(v_notif_ids), '[]'::jsonb)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- 7. Dispatch single scheduled campaign immediately (admin "إرسال الآن" button)
CREATE OR REPLACE FUNCTION public.dispatch_campaign_now(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_camp RECORD;
    v_audiences TEXT[];
    v_count INTEGER := 0;
    v_notif_ids UUID[];
BEGIN
    SELECT * INTO v_camp
    FROM public.notification_campaigns
    WHERE id = p_campaign_id AND status IN ('scheduled', 'draft')
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Campaign not found or already sent');
    END IF;

    v_audiences := COALESCE(v_camp.target_audiences, ARRAY[COALESCE(v_camp.target_audience, 'all')]);

    WITH inserted AS (
        INSERT INTO public.notifications (
            user_id, title, message, type, link, priority, image_url, metadata, is_read, read, created_at
        )
        SELECT
            r.recipient_id,
            v_camp.title,
            v_camp.content,
            COALESCE(v_camp.type, 'system'),
            v_camp.link,
            COALESCE(v_camp.priority, 'normal'),
            v_camp.image_url,
            COALESCE(v_camp.metadata, '{}'::jsonb) || jsonb_build_object('campaign_id', v_camp.id),
            false,
            false,
            NOW()
        FROM public.resolve_notification_recipients(v_audiences, v_camp.created_by) r
        RETURNING id
    )
    SELECT COUNT(*), ARRAY_AGG(id) INTO v_count, v_notif_ids FROM inserted;

    UPDATE public.notification_campaigns
    SET status = 'sent', sent_count = v_count, sent_at = NOW()
    WHERE id = v_camp.id;

    RETURN jsonb_build_object(
        'success', true,
        'sent_count', v_count,
        'campaign_id', v_camp.id,
        'notification_ids', COALESCE(to_jsonb(v_notif_ids), '[]'::jsonb)
    );
END;
$$;

-- 8. Dispatch all DUE scheduled campaigns
CREATE OR REPLACE FUNCTION public.dispatch_due_scheduled_campaigns()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_camp RECORD;
    v_res JSONB;
    v_total_campaigns INTEGER := 0;
    v_total_notifications INTEGER := 0;
    v_all_ids JSONB := '[]'::jsonb;
BEGIN
    FOR v_camp IN
        SELECT id
        FROM public.notification_campaigns
        WHERE status = 'scheduled'
          AND scheduled_date IS NOT NULL
          AND scheduled_date <= NOW()
        ORDER BY scheduled_date ASC
        LIMIT 20
    LOOP
        v_res := public.dispatch_campaign_now(v_camp.id);
        IF COALESCE((v_res->>'success')::boolean, false) THEN
            v_total_campaigns := v_total_campaigns + 1;
            v_total_notifications := v_total_notifications + COALESCE((v_res->>'sent_count')::integer, 0);
            v_all_ids := v_all_ids || COALESCE(v_res->'notification_ids', '[]'::jsonb);
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'dispatched_campaigns', v_total_campaigns,
        'dispatched_notifications', v_total_notifications,
        'notification_ids', v_all_ids
    );
END;
$$;

-- 9. Automatic Trigger: Notify Clinic Owner, Assigned Doctor & Active Staff on ANY New Appointment (Online or Manual)
CREATE OR REPLACE FUNCTION public.notify_on_appointment_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clinic_name TEXT;
    v_owner_id UUID;
    v_is_online BOOLEAN;
    v_date_str TEXT;
    v_time_str TEXT;
    v_title TEXT;
    v_msg TEXT;
    v_link TEXT;
    v_recipient UUID;
BEGIN
    IF NEW.clinic_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT name, owner_id INTO v_clinic_name, v_owner_id
    FROM public.clinics
    WHERE id = NEW.clinic_id;

    v_is_online := COALESCE(NEW.is_online_booking, false)
        OR COALESCE(NEW.status, '') = 'pending'
        OR COALESCE(NEW.type, '') ILIKE '%أونلاين%'
        OR COALESCE(NEW.type, '') ILIKE '%online%';

    v_date_str := COALESCE(NEW.appointment_date::text, NEW.date::text, '');
    v_time_str := COALESCE(to_char(NEW.appointment_time, 'HH24:MI'), NEW.start_time, '');

    IF v_is_online THEN
        v_title := '📩 طلب موعد أونلاين جديد';
        v_msg := format(
            'حجز إلكتروني جديد من %s في عيادة %s بتاريخ %s الساعة %s',
            COALESCE(NEW.patient_name, 'مراجع جديد'),
            COALESCE(v_clinic_name, 'العيادة'),
            v_date_str,
            v_time_str
        );
    ELSE
        v_title := '📅 تم تسجيل موعد جديد';
        v_msg := format(
            'تم تسجيل موعد للمراجع %s في عيادة %s بتاريخ %s الساعة %s',
            COALESCE(NEW.patient_name, 'مراجع'),
            COALESCE(v_clinic_name, 'العيادة'),
            v_date_str,
            v_time_str
        );
    END IF;

    v_link := '/doctor/clinic/' || NEW.clinic_id::text || '?tab=appointments';

    -- Notify Clinic Owner + Assigned Doctor + Active Clinic Staff with linked accounts
    FOR v_recipient IN
        SELECT DISTINCT uid FROM (
            SELECT v_owner_id AS uid
            UNION
            SELECT s.user_id AS uid
            FROM public.staff s
            WHERE s.clinic_id = NEW.clinic_id
              AND s.user_id IS NOT NULL
              AND COALESCE(s.status, 'active') IN ('active', 'on_leave')
              AND (
                  s.id = NEW.staff_id
                  OR s.id = NEW.staff_record_id
                  OR COALESCE((s.permissions->>'appointments')::boolean, true) = true
              )
            UNION
            SELECT s.auth_user_id AS uid
            FROM public.staff s
            WHERE s.clinic_id = NEW.clinic_id
              AND s.auth_user_id IS NOT NULL
              AND COALESCE(s.status, 'active') IN ('active', 'on_leave')
              AND (
                  s.id = NEW.staff_id
                  OR s.id = NEW.staff_record_id
                  OR COALESCE((s.permissions->>'appointments')::boolean, true) = true
              )
        ) t
        WHERE uid IS NOT NULL
    LOOP
        INSERT INTO public.notifications (
            user_id, clinic_id, type, title, message, link, priority, is_read, read, metadata, created_at
        )
        VALUES (
            v_recipient,
            NEW.clinic_id,
            'appointment',
            v_title,
            v_msg,
            v_link,
            CASE WHEN v_is_online THEN 'high' ELSE 'normal' END,
            false,
            false,
            jsonb_build_object(
                'appointment_id', NEW.id::text,
                'patientName', COALESCE(NEW.patient_name, 'مراجع'),
                'doctorName', NEW.doctor_name,
                'date', v_date_str,
                'time', v_time_str,
                'is_online_booking', v_is_online
            ),
            NOW()
        );
    END LOOP;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Never block appointment insertion if notification fails
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_appointment_insert ON public.appointments;
CREATE TRIGGER trg_notify_on_appointment_insert
    AFTER INSERT ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_appointment_insert();

-- 10. Automatic 1-Day-Before Appointment Reminders (for Doctors/Clinic Staff + Patient Account)
CREATE OR REPLACE FUNCTION public.send_appointment_day_before_reminders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_apt RECORD;
    v_recipient UUID;
    v_count INTEGER := 0;
    v_notif_ids UUID[] := ARRAY[]::UUID[];
    v_new_id UUID;
    v_tomorrow DATE := (NOW() AT TIME ZONE 'Asia/Baghdad')::date + 1;
    v_time_str TEXT;
BEGIN
    FOR v_apt IN
        SELECT
            a.id,
            a.clinic_id,
            a.patient_name,
            a.doctor_name,
            a.staff_id,
            a.staff_record_id,
            a.patient_user_id,
            COALESCE(a.appointment_date, a.date) AS apt_date,
            COALESCE(to_char(a.appointment_time, 'HH24:MI'), a.start_time, '') AS apt_time,
            c.name AS clinic_name,
            c.owner_id AS clinic_owner_id
        FROM public.appointments a
        JOIN public.clinics c ON c.id = a.clinic_id
        WHERE COALESCE(a.appointment_date, a.date) = v_tomorrow
          AND COALESCE(a.status, 'scheduled') NOT IN ('cancelled', 'completed', 'no_show', 'noshow')
    LOOP
        v_time_str := COALESCE(v_apt.apt_time, '');

        -- A) Notify clinic owner & assigned doctor/staff
        FOR v_recipient IN
            SELECT DISTINCT uid FROM (
                SELECT v_apt.clinic_owner_id AS uid
                UNION
                SELECT s.user_id AS uid
                FROM public.staff s
                WHERE s.clinic_id = v_apt.clinic_id
                  AND s.user_id IS NOT NULL
                  AND COALESCE(s.status, 'active') IN ('active', 'on_leave')
                  AND (s.id = v_apt.staff_id OR s.id = v_apt.staff_record_id OR COALESCE((s.permissions->>'appointments')::boolean, true) = true)
                UNION
                SELECT s.auth_user_id AS uid
                FROM public.staff s
                WHERE s.clinic_id = v_apt.clinic_id
                  AND s.auth_user_id IS NOT NULL
                  AND COALESCE(s.status, 'active') IN ('active', 'on_leave')
                  AND (s.id = v_apt.staff_id OR s.id = v_apt.staff_record_id OR COALESCE((s.permissions->>'appointments')::boolean, true) = true)
            ) t
            WHERE uid IS NOT NULL
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications n
                WHERE n.user_id = v_recipient
                  AND n.type = 'reminder'
                  AND n.metadata->>'reminder_kind' = 'appointment_day_before'
                  AND n.metadata->>'appointment_id' = v_apt.id::text
            ) THEN
                INSERT INTO public.notifications (
                    user_id, clinic_id, type, title, message, link, priority, is_read, read, metadata, created_at
                )
                VALUES (
                    v_recipient,
                    v_apt.clinic_id,
                    'reminder',
                    '⏰ تذكير بموعد غداً',
                    format('تذكير: لديكم موعد غداً (%s) الساعة %s للمراجع %s في عيادة %s',
                        v_apt.apt_date::text, v_time_str, COALESCE(v_apt.patient_name, 'مراجع'), COALESCE(v_apt.clinic_name, 'العيادة')),
                    '/doctor/clinic/' || v_apt.clinic_id::text || '?tab=appointments',
                    'high',
                    false,
                    false,
                    jsonb_build_object(
                        'reminder_kind', 'appointment_day_before',
                        'appointment_id', v_apt.id::text,
                        'patientName', COALESCE(v_apt.patient_name, 'مراجع'),
                        'doctorName', v_apt.doctor_name,
                        'date', v_apt.apt_date::text,
                        'time', v_time_str
                    ),
                    NOW()
                )
                RETURNING id INTO v_new_id;

                v_count := v_count + 1;
                v_notif_ids := array_append(v_notif_ids, v_new_id);
            END IF;
        END LOOP;

        -- B) Notify patient if they have a portal account
        IF v_apt.patient_user_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications n
                WHERE n.user_id = v_apt.patient_user_id
                  AND n.type = 'reminder'
                  AND n.metadata->>'reminder_kind' = 'appointment_day_before'
                  AND n.metadata->>'appointment_id' = v_apt.id::text
            ) THEN
                INSERT INTO public.notifications (
                    user_id, clinic_id, type, title, message, link, priority, is_read, read, metadata, created_at
                )
                VALUES (
                    v_apt.patient_user_id,
                    v_apt.clinic_id,
                    'reminder',
                    '⏰ تذكير بموعدك غداً',
                    format('تذكير: موعدك في عيادة %s غداً بتاريخ %s الساعة %s',
                        COALESCE(v_apt.clinic_name, 'العيادة'), v_apt.apt_date::text, v_time_str),
                    '/patient',
                    'high',
                    false,
                    false,
                    jsonb_build_object(
                        'reminder_kind', 'appointment_day_before',
                        'appointment_id', v_apt.id::text,
                        'date', v_apt.apt_date::text,
                        'time', v_time_str
                    ),
                    NOW()
                )
                RETURNING id INTO v_new_id;

                v_count := v_count + 1;
                v_notif_ids := array_append(v_notif_ids, v_new_id);
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'sent_reminders', v_count,
        'notification_ids', to_jsonb(v_notif_ids)
    );
END;
$$;

-- 11. Automatic Trigger: Notify users when a new Course or Webinar is published in `public.courses`
CREATE OR REPLACE FUNCTION public.notify_on_course_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_webinar BOOLEAN;
    v_type TEXT;
    v_title TEXT;
    v_msg TEXT;
    v_link TEXT;
BEGIN
    v_is_webinar := COALESCE(NEW.category, '') = 'ندوة' OR COALESCE(NEW.type, '') ILIKE '%webinar%';
    v_type := CASE WHEN v_is_webinar THEN 'webinar_new' ELSE 'course_new' END;
    v_title := CASE WHEN v_is_webinar THEN '🎙️ ندوة علمية جديدة' ELSE '🎓 دورة تدريبية جديدة' END;
    v_msg := format('تم نشر %s بعنوان: %s%s',
        CASE WHEN v_is_webinar THEN 'ندوة جديدة' ELSE 'دورة تدريبية جديدة' END,
        COALESCE(NEW.title, ''),
        CASE WHEN NEW.date IS NOT NULL AND NEW.date <> '' THEN ' — التاريخ: ' || NEW.date ELSE '' END
    );
    v_link := CASE WHEN v_is_webinar THEN '/community/webinar/' || NEW.id::text ELSE '/community/course/' || NEW.id::text END;

    INSERT INTO public.notifications (
        user_id, type, title, message, link, priority, image_url, metadata, is_read, read, created_at
    )
    SELECT
        r.recipient_id,
        v_type,
        v_title,
        v_msg,
        v_link,
        'normal',
        COALESCE(NEW.image, NEW.thumbnail_url),
        jsonb_build_object('course_id', NEW.id::text, 'category', NEW.category, 'instructor', NEW.instructor),
        false,
        false,
        NOW()
    FROM public.resolve_notification_recipients(ARRAY['doctor_staff', 'laboratory', 'supplier']::TEXT[], NULL) r;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_course_insert ON public.courses;
CREATE TRIGGER trg_notify_on_course_insert
    AFTER INSERT ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_course_insert();

-- 12. Combined RPC callable by cron OR authenticated clients (rate-limited with advisory lock)
CREATE OR REPLACE FUNCTION public.process_due_notifications_and_reminders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sched JSONB;
    v_rem JSONB;
BEGIN
    -- Prevent concurrent overlapping executions
    IF NOT pg_try_advisory_xact_lock(987654321) THEN
        RETURN jsonb_build_object('skipped', true);
    END IF;

    v_sched := public.dispatch_due_scheduled_campaigns();
    v_rem := public.send_appointment_day_before_reminders();

    RETURN jsonb_build_object(
        'scheduled', v_sched,
        'reminders', v_rem
    );
END;
$$;

-- 13. Grant execute permissions to authenticated users where needed
GRANT EXECUTE ON FUNCTION public.send_campaign_notifications(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT[], TIMESTAMPTZ, TEXT, TEXT, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_campaign_now(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_due_scheduled_campaigns() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_appointment_day_before_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_notifications_and_reminders() TO authenticated;

-- 14. Ensure `notifications` table is part of Supabase Realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

