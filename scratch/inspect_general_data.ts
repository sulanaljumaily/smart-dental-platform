import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectGeneralData() {
  console.log('Fetching recent 5 patients...');
  const { data: patients, error } = await supabase
    .from('patients')
    .select('id, full_name, phone, clinic_id')
    .limit(5);

  if (error) {
    console.error('Error fetching patients:', error);
  } else {
    console.log('Recent patients:', JSON.stringify(patients, null, 2));
  }

  console.log('Fetching clinics...');
  const { data: clinics, error: clinicError } = await supabase
    .from('clinics')
    .select('id, name')
    .limit(5);

  if (clinicError) {
    console.error('Error fetching clinics:', clinicError);
  } else {
    console.log('Recent clinics:', JSON.stringify(clinics, null, 2));
  }
}

inspectGeneralData();
