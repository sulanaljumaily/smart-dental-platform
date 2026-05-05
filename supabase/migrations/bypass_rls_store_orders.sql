-- Disable RLS on store_orders and items to allow Admin to fetch all rows
ALTER TABLE store_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_order_items DISABLE ROW LEVEL SECURITY;
