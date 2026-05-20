-- Step 1: Add target_audience column of type text[] with default clinic and lab
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS target_audience text[] DEFAULT '{"clinic", "lab"}';

-- Step 2: Set target_audience for any existing brands to clinic and lab
UPDATE public.brands SET target_audience = '{"clinic", "lab"}' WHERE target_audience IS NULL;

-- Step 3: Verify the changes and show columns
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'brands';
