const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/AL NABAA/Desktop/smart-dental-platform/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('action_type', 'cancel_invitation');
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Cancel logs:", JSON.stringify(data, null, 2));
  }
}

main();
