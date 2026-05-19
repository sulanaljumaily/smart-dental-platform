ALTER TABLE financial_transactions DROP COLUMN IF EXISTS treatment_id;
ALTER TABLE financial_transactions DROP COLUMN IF EXISTS session_id;
ALTER TABLE financial_transactions DROP COLUMN IF EXISTS inventory_item_id;
ALTER TABLE financial_transactions DROP COLUMN IF EXISTS lab_request_id;

ALTER TABLE financial_transactions ADD COLUMN treatment_id text;
ALTER TABLE financial_transactions ADD COLUMN session_id text;
-- Using UUID since the error showed a UUID string
ALTER TABLE financial_transactions ADD COLUMN inventory_item_id uuid;
ALTER TABLE financial_transactions ADD COLUMN lab_request_id uuid;
