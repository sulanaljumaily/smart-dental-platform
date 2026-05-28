const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/AL NABAA/Desktop/smart-dental-platform/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data, error } = await supabase
    .from('activity_logs')
    .update({
      details: {
        reason: "Soft delete from UI",
        name: "طارق محمد احمد الفريجة"
      }
    })
    .eq('id', 'fe6bcb2c-157b-409b-92bd-a7672a90e925')
    .select();
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Updated delete patient log:", JSON.stringify(data, null, 2));
  }
}

main();
