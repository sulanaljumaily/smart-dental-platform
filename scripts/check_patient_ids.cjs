const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('patients').select('id, full_name').limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Patient record:", data);
    if (data.length > 0) {
      console.log("ID Type:", typeof data[0].id);
    }
  }
}
run();
