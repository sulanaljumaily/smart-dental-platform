CREATE OR REPLACE FUNCTION public.add_owner_to_staff()
RETURNS trigger AS $$
DECLARE
    v_full_name text;
    v_phone text;
    v_email text;
BEGIN
    -- Fetch owner details from profiles table
    SELECT full_name, phone, email INTO v_full_name, v_phone, v_email
    FROM public.profiles
    WHERE id = NEW.owner_id;

    -- Insert into staff table
    INSERT INTO public.staff (
        clinic_id,
        user_id,
        full_name,
        email,
        phone,
        role_title,
        department,
        status,
        permissions,
        salary,
        join_date
    ) VALUES (
        NEW.id,
        NEW.owner_id,
        COALESCE(v_full_name, 'المالك'),
        COALESCE(v_email, ''),
        COALESCE(v_phone, ''),
        'doctor',
        'الإدارة',
        'active',
        '{
            "appointments": true,
            "patients": true,
            "financials": true,
            "settings": true,
            "reports": true,
            "activityLog": true,
            "assets": true,
            "staff": true,
            "manageStaff": true,
            "lab": true,
            "assistantManager": true
        }'::jsonb,
        0,
        CURRENT_DATE
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
