-- Add settlement tracking columns to store_orders
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT false;
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS settlement_id UUID;
