ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS treatment_id bigint,
ADD COLUMN IF NOT EXISTS session_id bigint,
ADD COLUMN IF NOT EXISTS inventory_item_id bigint,
ADD COLUMN IF NOT EXISTS lab_request_id bigint;
