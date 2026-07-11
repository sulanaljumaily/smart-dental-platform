-- Check tooth_treatment_plans columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tooth_treatment_plans';

-- Check financial_transactions columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'financial_transactions';
