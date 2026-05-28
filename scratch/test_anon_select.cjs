const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/AL NABAA/Desktop/smart-dental-platform/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', 'f61eddec-b35f-4c14-860f-5556b533a0e1')
    .single();
  
  if (error) {
    console.error("Error with anon key:", error);
  } else {
    console.log("Profile details with anon key:", data);
  }

  // Let's also check if activity_logs select works with anon key!
  const { data: logs, error: logsError } = await supabase
    .from('activity_logs')
    .select('*, profiles:user_id(full_name, email)')
    .limit(3);
  
  if (logsError) {
    console.error("Logs error with anon key:", logsError);
  } else {
    console.log("Logs with profiles (anon key):", JSON.stringify(logs, null, 2));
  }
}

main();
