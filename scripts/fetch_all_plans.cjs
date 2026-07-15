const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('tooth_treatment_plans').select('*');
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Count:", data.length);
    console.log("Rows:", JSON.stringify(data, null, 2));
  }
}
run();
