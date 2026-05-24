import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE env variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log("Checking if platform_settings exists...");
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error or table missing:", error.message);
  } else {
    console.log("platform_settings exists! Data:", data);
  }
}

main();
