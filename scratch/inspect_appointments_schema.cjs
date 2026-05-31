const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function testStatus(statusValue) {
  console.log(`Testing status: "${statusValue}"...`);
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      clinic_id: 19,
      patient_id: 50,
      doctor_id: 1,
      date: '2026-05-30',
      start_time: '12:00:00',
      end_time: '12:30:00',
      duration: 30,
      type: 'consultation',
      status: statusValue,
      title: 'Test Status Constraint'
    })
    .select();

  if (error) {
    console.log(`❌ Failed for "${statusValue}": ${error.message} (Code: ${error.code})`);
    return false;
  } else {
    console.log(`✅ Succeeded for "${statusValue}"! Row ID:`, data[0].id);
    // Cleanup
    await supabase.from('appointments').delete().eq('id', data[0].id);
    return true;
  }
}

async function run() {
  const statusesToTest = ['noshow', 'no_show', 'no-show', 'noshowed', 'absent'];
  for (const s of statusesToTest) {
    const ok = await testStatus(s);
    if (ok) {
      console.log(`\n🎉 Correct status key found: "${s}"`);
      break;
    }
  }
}

run();
