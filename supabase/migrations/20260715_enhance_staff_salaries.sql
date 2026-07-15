-- Add salary_type to staff table for flexible salary calculation
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'percentage', 'daily'));
