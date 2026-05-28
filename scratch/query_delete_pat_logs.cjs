const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/AL NABAA/Desktop/smart-dental-platform/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: logs, error: logError } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('action_type', 'delete_patient');
  
  if (logError) {
    console.error("Log error:", logError);
    return;
  }

  console.log("Delete patient logs:", JSON.stringify(logs, null, 2));
}

main();
