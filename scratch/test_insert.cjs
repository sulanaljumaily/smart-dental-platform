const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log("Starting checkout insertion simulation...");

  // Let's get a doctor profile to simulate an authenticated insert
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'doctor')
    .limit(1)
    .single();

  if (!profile) {
    console.error("No doctor profile found to test insertion.");
    return;
  }

  console.log(`Using doctor profile: ${profile.full_name} (${profile.id})`);

  // Try to insert a dummy order
  const orderNumber = `ORD-TEST-${Math.floor(Math.random() * 1000000)}`;
  const { data, error } = await supabase
    .from('store_orders')
    .insert({
      order_number: orderNumber,
      user_id: profile.id,
      user_name: profile.full_name,
      ordered_by: profile.full_name,
      total_amount: 50000,
      status: 'pending',
      payment_method: 'cash',
      payment_status: 'pending',
      shipping_address: { city: 'بغداد', address: 'الكرادة', phone: '07700000000' }
    })
    .select()
    .single();

  if (error) {
    console.error("Simulation failed! Database error detail:", error);
  } else {
    console.log("Simulation succeeded! Inserted order ID:", data.id);
    
    // Clean up
    const { error: delError } = await supabase.from('store_orders').delete().eq('id', data.id);
    if (delError) console.error("Error deleting simulated order:", delError);
    else console.log("Cleaned up simulated order successfully.");
  }
}

testInsert();
