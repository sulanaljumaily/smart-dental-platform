const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
  console.log("Checking products in DB...");
  const { data, error } = await supabase
    .from('products')
    .select('id, name, supplier_id')
    .limit(20);

  if (error) {
    console.error("Error querying products:", error);
  } else {
    console.log("Products in DB:", data);
  }
}

checkProducts();
