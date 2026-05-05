const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE env variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("--- Querying Database Functions ---");
    // We can query information_schema orpg_proc if we have permission.
    // Let's try to fetch list of functions from rpc if we can, or just try to see if we can query pg_catalog
    const { data, error } = await supabase
        .rpc('get_labs_dashboard_stats'); // we know this exists

    console.log("Test RPC get_labs_dashboard_stats data exists:", !!data);

    // Let's try to query pg_proc to find any containing 'order'
    const { data: functions, error: funcError } = await supabase
        .from('pg_proc')
        .select('proname')
        .ilike('proname', '%order%');

    if (funcError) {
        console.error("Error querying functions:", funcError);
    } else {
        console.log("Functions containing 'order':", functions);
    }
}

run();
