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
-- 1. Drop old trigger to unhook previous mappings
DROP TRIGGER IF EXISTS on_clinic_created_seed ON public.clinics;

-- 2. Drop function (since triggers can rely on diff signatures)
DROP FUNCTION IF EXISTS public.seed_clinic_defaults();

-- 3. Create function anew
CREATE OR REPLACE FUNCTION public.seed_clinic_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Seed Treatments
    INSERT INTO treatments (
        clinic_id, name, category, base_price, cost_estimate, 
        profit_margin, popularity, expected_sessions, is_complex, default_phases
    )
    SELECT 
        NEW.id, name, category, base_price, cost_estimate, 
        profit_margin, popularity, expected_sessions, is_complex, default_phases
    FROM system_treatment_templates;

    -- Seed Inventory
    INSERT INTO inventory (
        clinic_id, item_name, category, min_quantity, unit, unit_price, quantity
    )
    SELECT 
        NEW.id, name, category, min_quantity, unit, price, 0 -- Start with 0 stock
    FROM system_inventory_templates;

    RETURN NEW;
END;
$function$;

-- 4. Re-create trigger
CREATE TRIGGER on_clinic_created_seed 
AFTER INSERT ON public.clinics 
FOR EACH ROW 
EXECUTE FUNCTION seed_clinic_defaults();
`;

async function run() {
    try {
        await client.connect();
        await client.query(SQL);
        console.log("Migration successful: Trigger and Function fully recreated.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

run();
