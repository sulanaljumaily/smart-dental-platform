const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/AL NABAA/Desktop/smart-dental-platform/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*');
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Total logs count:", data.length);
    const matches = data.filter(row => JSON.stringify(row).includes('d5c4b130'));
    console.log("Matches:", JSON.stringify(matches, null, 2));
  }
}

main();
