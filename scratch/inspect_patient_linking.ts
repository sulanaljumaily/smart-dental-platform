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

async function inspectPatientData() {
  const phone = '07818641727';
  
  console.log(`Inspecting data for phone: ${phone}`);

  // 1. Find the user profile
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role, phone')
    .eq('phone', phone);

  if (profileError) {
    console.error('Error fetching profile:', profileError);
  } else {
    console.log('Profiles found:', JSON.stringify(profiles, null, 2));
  }

  // 2. Find the patient files by phone
  const { data: patients, error: patientError } = await supabase
    .from('patients')
    .select('id, full_name, phone, user_id, patient_user_id, clinic_id')
    .eq('phone', phone);

  if (patientError) {
    console.error('Error fetching patients by phone:', patientError);
  } else {
    console.log('Patient files found by phone:', JSON.stringify(patients, null, 2));
  }

  // 3. Specific check for patient 43
  // Note: id might be integer or uuid. 43 is likely integer.
  const { data: specificPatient, error: specificError } = await supabase
    .from('patients')
    .select('id, full_name, phone, user_id, patient_user_id, clinic_id')
    .eq('id', 43);

  if (specificError) {
    console.error('Error fetching patient 43:', specificError);
  } else {
    console.log('Patient 43 details:', JSON.stringify(specificPatient, null, 2));
  }
}

inspectPatientData();
