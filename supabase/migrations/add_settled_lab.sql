DO $$
BEGIN
  ALTER TABLE dental_lab_orders ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT false;
  ALTER TABLE dental_lab_orders ADD COLUMN IF NOT EXISTS settlement_id UUID REFERENCES financial_transactions(id) ON DELETE SET NULL;
END $$;
