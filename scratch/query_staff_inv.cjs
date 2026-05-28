const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/AL NABAA/Desktop/smart-dental-platform/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data, error } = await supabase
    .from('staff')
    .select('*');
  
  if (error) {
    console.error("Error:", error);
  } else {
    const matches = data.filter(row => JSON.stringify(row).includes('d5c4b130'));
    console.log("Matches in staff:", JSON.stringify(matches, null, 2));
  }
}

main();
