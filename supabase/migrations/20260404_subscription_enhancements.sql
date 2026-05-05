-- ============================================================
-- Migration: Subscription System Enhancements
-- Date: 2026-04-04
-- Description:
--   1. Add amount_paid, payment_details (JSONB), user_id columns
--      to subscription_requests (if not already present)
--   2. Add semi_annual price support to subscription_plans.price JSONB
--   3. Ensure existing Seed data is up-to-date with new price structure
-- ============================================================

-- 1. Add missing columns to subscription_requests
ALTER TABLE subscription_requests
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}';

-- 2. Back-fill user_id from doctor_id where missing
UPDATE subscription_requests
SET user_id = doctor_id
WHERE user_id IS NULL AND doctor_id IS NOT NULL;

-- 3. Ensure discount column exists (for legacy data support)
ALTER TABLE subscription_requests
  ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;

-- 4. Update RLS policies for the new columns
-- (No schema change needed since JSONB column accepts any keys)

-- 5. Update existing plans to include semi_annual pricing (10% off monthly * 6)
UPDATE subscription_plans
SET price = jsonb_set(
    price,
    '{semiAnnual}',
    to_jsonb(ROUND((price->>'monthly')::numeric * 6 * 0.9))
)
WHERE price->>'semiAnnual' IS NULL
  AND (price->>'monthly')::numeric > 0;

-- 6. Update existing plans to include yearly pricing if missing (15% off monthly * 12)
UPDATE subscription_plans
SET price = jsonb_set(
    price,
    '{yearly}',
    to_jsonb(ROUND((price->>'monthly')::numeric * 12 * 0.85))
)
WHERE price->>'yearly' IS NULL
  AND (price->>'monthly')::numeric > 0;

-- 7. Ensure limits JSONB column exists on subscription_plans for frontend usage
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS limits JSONB DEFAULT '{}';

-- 8. Add subscription_requests index for payment_details coupon_code lookup
CREATE INDEX IF NOT EXISTS idx_subscription_requests_coupon
  ON subscription_requests USING GIN (payment_details);

-- 9. Confirm result
SELECT 
  'subscription_requests columns' AS check_name,
  string_agg(column_name, ', ') AS columns
FROM information_schema.columns
WHERE table_name = 'subscription_requests'
  AND column_name IN ('amount_paid', 'payment_details', 'user_id', 'discount');
