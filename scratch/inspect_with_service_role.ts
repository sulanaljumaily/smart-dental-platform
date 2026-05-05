import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Supabase URL or Service Key missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function inspectData() {
  const phone = '07818641727';
  
  console.log(`Inspecting data with service role for phone: ${phone}`);

  // 1. Find user profile
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', phone);
  console.log('Profiles:', JSON.stringify(profiles, null, 2));

  // 2. Find patient files
  const { data: patients } = await supabase
    .from('patients')
    .select('*')
    .eq('phone', phone);
  console.log('Patient files by phone:', JSON.stringify(patients, null, 2));

  // 3. Find patient 43
  const { data: p43 } = await supabase
    .from('patients')
    .select('*')
    .eq('id', 43);
  console.log('Patient 43:', JSON.stringify(p43, null, 2));
}

inspectData();
