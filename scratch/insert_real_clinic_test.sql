BEGIN;

-- Insert a test clinic for Mezher's profile (cd079a40-ebf2-46a7-bc19-def2b6fac70b)
INSERT INTO clinics (name, owner_id, phone, address, governorate) 
VALUES ('عيادة اختبارية للمالك مزهر', 'cd079a40-ebf2-46a7-bc19-def2b6fac70b', '07700000000', 'الكرادة', 'بغداد')
RETURNING id, name, owner_id;

-- Check if treatments were seeded
SELECT count(*) as treatment_count FROM treatments WHERE clinic_id = (SELECT id FROM clinics WHERE name = 'عيادة اختبارية للمالك مزهر');

-- Check if inventory was seeded
SELECT count(*) as inventory_count FROM inventory WHERE clinic_id = (SELECT id FROM clinics WHERE name = 'عيادة اختبارية للمالك مزهر');

ROLLBACK;
