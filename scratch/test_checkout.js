const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log("Checking if 'orders' table exists and fetching schema information...");
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  if (ordersError) {
    console.error("Error querying 'orders' table:", ordersError);
  } else {
    console.log("Successfully queried 'orders' table! Sample row:", ordersData);
  }

  console.log("\nChecking if 'store_orders' table exists and fetching schema information...");
  const { data: storeOrdersData, error: storeOrdersError } = await supabase
    .from('store_orders')
    .select('*')
    .limit(1);

  if (storeOrdersError) {
    console.error("Error querying 'store_orders' table:", storeOrdersError);
  } else {
    console.log("Successfully queried 'store_orders' table! Sample row:", storeOrdersData);
  }
}

checkTables();
