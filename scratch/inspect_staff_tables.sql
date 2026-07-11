-- Check staff columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'staff';

-- Check clinic_members columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clinic_members';
