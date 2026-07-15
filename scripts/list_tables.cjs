const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_tables'); // Or query via schema
  if (error) {
    // If no RPC, run a select on information_schema or just a dummy query
    console.log("RPC Error:", error.message);
    const { data: data2, error: error2 } = await supabase.from('patients').select('id, full_name').limit(5);
    if (error2) {
      console.error("Patients Query Error:", error2.message);
    } else {
      console.log("Patients data:", data2);
    }
  } else {
    console.log("Tables:", data);
  }
}
run();
