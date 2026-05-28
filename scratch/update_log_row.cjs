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
        invitationId: "d5c4b130-f726-48dd-acad-d542cb7c2716",
        email: "fidanadnan2001@gmail.com",
        role: "assistant"
      }
    })
    .eq('id', '98a35ff6-70ad-4a03-9452-0ab75b9b7463')
    .select();
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Updated log row:", JSON.stringify(data, null, 2));
  }
}

main();
