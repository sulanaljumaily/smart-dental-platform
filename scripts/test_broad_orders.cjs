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
    console.log("--- Broad Select from store_orders ---");
    const { data, error } = await supabase
        .from('store_orders')
        .select('*');

    if (error) {
        console.error("Error fetching orders:", error);
    } else {
        console.log(`Found ${data ? data.length : 0} orders.`);
        if (data && data.length > 0) {
            console.log("\nSample Order:");
            console.log(data[0]);
        }
    }
}

run();
