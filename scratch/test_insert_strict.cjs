const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsertStrict() {
  console.log("Simulating exact insert payload from PatientCartPage...");

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'doctor')
    .limit(1)
    .single();

  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id')
    .limit(1)
    .single();

  const { data: product } = await supabase
    .from('products')
    .select('id')
    .limit(1)
    .single();

  if (!profile || !supplier || !product) {
    console.error("Missing mock data entities.");
    return;
  }

  const orderNumber = `ORD-${Math.floor(Math.random() * 1000000000)}`;
  const subOrderNumber = `${orderNumber}-${supplier.id.slice(0, 4)}`;
  const orderUserName = profile.full_name;
  const orderNotes = `Phone: 07700000000\nAddress: بغداد، الكرادة، شارع 6`;

  console.log("Step 1: Inserting store_orders row...");
  const { data: order, error } = await supabase.from('store_orders').insert({
    order_number: subOrderNumber,
    user_id: profile.id,
    user_name: orderUserName,
    ordered_by: profile.full_name,
    supplier_id: supplier.id,
    total_amount: 45000,
    status: 'pending',
    payment_method: 'cash',
    payment_status: 'pending',
    shipping_address: { governorate: 'بغداد', city: 'الكرادة', address: 'شارع 6', phone: '07700000000', recipientName: profile.full_name },
    notes: orderNotes,
    created_at: new Date().toISOString()
  }).select().single();

  if (error) {
    console.error("Order insertion failed!", error);
    return;
  }

  console.log("Order row inserted! Order ID:", order.id);

  console.log("Step 2: Inserting store_order_items row...");
  const { data: orderItem, error: itemError } = await supabase.from('store_order_items').insert({
    order_id: order.id,
    product_id: product.id,
    supplier_id: supplier.id,
    quantity: 1,
    price_at_purchase: 45000
  }).select().single();

  if (itemError) {
    console.error("Order item insertion failed!", itemError);
  } else {
    console.log("Order item row inserted! Item ID:", orderItem.id);
  }

  // Cleanup
  console.log("Cleaning up simulated test data...");
  await supabase.from('store_orders').delete().eq('id', order.id);
  console.log("Cleanup complete.");
}

testInsertStrict();
