const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/AL NABAA/Desktop/smart-dental-platform/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data, error } = await supabase
    .from('activity_logs')
    .update({ user_id: 'f61eddec-b35f-4c14-860f-5556b533a0e1' })
    .is('user_id', null)
    .select();
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Updated rows count:", data.length);
  }
}

main();
