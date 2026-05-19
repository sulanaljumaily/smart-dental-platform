const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
let envContent = '';
try { envContent = fs.readFileSync(envPath, 'utf-8'); } catch (e) {}

const getEnv = (key) => {
    const match = envContent.match(new RegExp(`${key}=(.*)`, 'm'));
    return match ? match[1].trim() : process.env[key];
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Sultan's known account info
const SULTAN_PHONE = '07818641727';
const SULTAN_NAME = 'sultan aljumaily';

async function inspect() {
    console.log('\n════════════════════════════════════════════');
    console.log('   PATIENT DATA INSPECTION REPORT');
    console.log('════════════════════════════════════════════\n');

    // 1. Find Sultan's profile in auth
    console.log('📌 [1] Looking for Sultan\'s account in profiles table...');
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, role, email, created_at')
        .or(`phone.eq.${SULTAN_PHONE},phone.eq.+964${SULTAN_PHONE.slice(1)}`);
    
    if (profileError) console.error('Profile error:', profileError.message);
    else console.log('Matching profiles:', JSON.stringify(profiles, null, 2));

    // 2. Check appointments columns
    console.log('\n📌 [2] Appointments for Sultan\'s phone number...');
    const { data: apts, error: aptError } = await supabase
        .from('appointments')
        .select('id, clinic_id, patient_name, phone_number, patient_user_id, status, appointment_date, is_online_booking, created_at')
        .eq('phone_number', SULTAN_PHONE)
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (aptError) console.error('Appointments error:', aptError.message);
    else {
        console.log(`Found ${apts?.length || 0} appointments:`);
        apts?.forEach(a => console.log(`  - ID: ${a.id} | Clinic: ${a.clinic_id} | patient_user_id: ${a.patient_user_id} | Status: ${a.status} | Online: ${a.is_online_booking}`));
    }

    // 3. Check patients table columns
    console.log('\n📌 [3] Patient records matching phone number...');
    const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('id, name, phone, clinic_id, patient_user_id, user_id, created_at')
        .or(`phone.eq.${SULTAN_PHONE},name.ilike.%sultan%`)
        .order('created_at', { ascending: false });
    
    if (patientsError) console.error('Patients error:', patientsError.message);
    else {
        console.log(`Found ${patients?.length || 0} patient records:`);
        patients?.forEach(p => console.log(`  - ID: ${p.id} | Clinic: ${p.clinic_id} | Name: ${p.name} | Phone: ${p.phone} | patient_user_id: ${p.patient_user_id} | user_id: ${p.user_id}`));
    }

    // 4. Check if there's a patient record with ID 43 (the one that should show)
    console.log('\n📌 [4] Checking patient record ID 43...');
    const { data: record43, error: r43Error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', 43)
        .maybeSingle();
    
    if (r43Error) console.error('Error:', r43Error.message);
    else console.log('Record 43:', JSON.stringify(record43, null, 2));

    // 5. Check appointments table columns
    console.log('\n📌 [5] Checking appointments table columns (via RPC or direct)...');
    const { data: aptSample } = await supabase
        .from('appointments')
        .select('*')
        .limit(1)
        .single();
    if (aptSample) {
        console.log('Appointment columns:', Object.keys(aptSample).join(', '));
    }

    // 6. Check patients table columns
    const { data: patSample } = await supabase
        .from('patients')
        .select('*')
        .limit(1)
        .single();
    if (patSample) {
        console.log('\nPatients table columns:', Object.keys(patSample).join(', '));
    }

    // 7. Look for appointments by patient_user_id (if Sultan has a profile)
    if (profiles && profiles.length > 0) {
        const userId = profiles[0].id;
        console.log(`\n📌 [6] Appointments linked to user_id: ${userId}...`);
        const { data: userApts } = await supabase
            .from('appointments')
            .select('id, clinic_id, patient_name, phone_number, patient_user_id, status')
            .eq('patient_user_id', userId);
        console.log(`Found ${userApts?.length || 0} appointments linked by user_id`);
        userApts?.forEach(a => console.log(`  - ID: ${a.id} | Clinic: ${a.clinic_id} | Status: ${a.status}`));

        console.log(`\n📌 [7] Patient records linked to user_id: ${userId}...`);
        const { data: userPatients } = await supabase
            .from('patients')
            .select('id, name, phone, clinic_id, patient_user_id, user_id')
            .or(`patient_user_id.eq.${userId},user_id.eq.${userId}`);
        console.log(`Found ${userPatients?.length || 0} patient records linked by user_id`);
        userPatients?.forEach(p => console.log(`  - Patient ID: ${p.id} | Clinic: ${p.clinic_id} | Name: ${p.name}`));
    }

    console.log('\n════════════════════════════════════════════\n');
}

inspect().catch(console.error);
