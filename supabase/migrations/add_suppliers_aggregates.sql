-- Add missing columns to suppliers table to support Admin statistics
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS commission_percentage INTEGER DEFAULT 10;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS total_sales DECIMAL(12,2) DEFAULT 0.0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pending_commission DECIMAL(12,2) DEFAULT 0.0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS orders_count INTEGER DEFAULT 0;
