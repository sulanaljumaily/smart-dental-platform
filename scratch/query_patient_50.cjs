const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/AL NABAA/Desktop/smart-dental-platform/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', 50);
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Patient 50 details:", JSON.stringify(data, null, 2));
  }
}

main();
