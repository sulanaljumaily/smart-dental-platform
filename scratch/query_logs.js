const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, profiles:user_id(full_name, email)')
    .limit(10);
  
  if (error) {
    console.error("Error querying activity logs:", error);
  } else {
    console.log("Activity logs:", JSON.stringify(data, null, 2));
  }
}

main();
