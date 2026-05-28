const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/AL NABAA/Desktop/smart-dental-platform/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  // Let's find the transaction with amount 80000 in clinic 19
  const { data: txs, error: txError } = await supabase
    .from('financial_transactions')
    .select('*, patient:patients(full_name)')
    .eq('amount', 80000)
    .eq('clinic_id', 19);
  
  if (txError) {
    console.error("Tx error:", txError);
    return;
  }
  
  console.log("Found transactions:", JSON.stringify(txs, null, 2));

  // Let's also check if there is an activity log for create_transaction where amount is 80000
  const { data: logs, error: logError } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('action_type', 'create_transaction');
  
  if (logError) {
    console.error("Log error:", logError);
    return;
  }

  const matches = logs.filter(row => row.details?.amount === 80000);
  console.log("Matching logs:", JSON.stringify(matches, null, 2));
}

main();
