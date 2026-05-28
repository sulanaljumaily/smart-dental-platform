const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/AL NABAA/Desktop/smart-dental-platform/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  // Let's query ALL rows in clinic_invitations (even deleted if soft deleted, though typically it's hard deleted)
  const { data, error } = await supabase
    .from('clinic_invitations')
    .select('*');
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Clinic Invitations count:", data.length);
    console.log("Invitations list:", JSON.stringify(data, null, 2));
  }
}

main();
