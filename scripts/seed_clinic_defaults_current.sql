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
$function$
