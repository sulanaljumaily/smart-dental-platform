const { Client } = require('pg');

const DB_CONFIG = {
    user: 'postgres.nhueyaeyutfmadbgghfe',
    password: '10770$ULTAn0770',
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
};

const client = new Client(DB_CONFIG);

const SQL = `
-- 1. Create Trigger Function
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
        join_date -- Added to satisfy NOT NULL
    ) VALUES (
        NEW.id,
        NEW.owner_id,
        COALESCE(v_full_name, 'المالك'),
        v_email,
        v_phone,
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
        CURRENT_DATE -- Added Join Date
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create Trigger
DROP TRIGGER IF EXISTS on_clinic_created_add_owner ON public.clinics;
CREATE TRIGGER on_clinic_created_add_owner
    AFTER INSERT ON public.clinics
    FOR EACH ROW
    EXECUTE FUNCTION public.add_owner_to_staff();

-- 3. Sync Existing Clinics (Insert missing owners)
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
    join_date -- Added
)
SELECT 
    c.id as clinic_id,
    c.owner_id as user_id,
    COALESCE(p.full_name, 'المالك') as full_name,
    p.email,
    p.phone,
    'doctor' as role_title,
    'الإدارة' as department,
    'active' as status,
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
    }'::jsonb as permissions,
    0,
    CURRENT_DATE -- Added
FROM public.clinics c
LEFT JOIN public.profiles p ON c.owner_id = p.id
WHERE NOT EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.clinic_id = c.id AND s.user_id = c.owner_id
);
`;

async function run() {
    try {
        await client.connect();
        const res = await client.query(SQL);
        console.log("Migration successful: Trigger created and existing owners synced into staff table.");
         if (Array.isArray(res)) {
             const syncResult = res[2]; // Third statement is insert sync
             if (syncResult && syncResult.rowCount !== undefined) {
                 console.log(`Synced ${syncResult.rowCount} existing owners into staff list.`);
             }
         }
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

run();
