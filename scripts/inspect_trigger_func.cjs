const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTrigger() {
    try {
        const { data, error } = await supabase.rpc('inspect_function_definition', { 
            func_name: 'seed_clinic_defaults' 
        });
        
        if (error) {
            console.log("RPC failed, trying raw query via anon SQL block...");
            // Query pg_proc
            const { data: procs, error: err } = await supabase
                .from('pg_proc')
                .select('prosrc')
                .eq('proname', 'seed_clinic_defaults')
                .limit(1);
            if (err) throw err;
            console.log("Function Definition:", procs[0]?.prosrc);
            process.exit(0);
        }
        console.log("Function Definition:", data);
    } catch (e) {
        console.error("Error:", e);
        
        // Let's create a scratch script to query pg_proc via a RPC that runs raw SQL if possible, 
        // or execute anonymous block if supported by rpc.
        // Failing that, we can just recreate complete function appending the logic!
    }
}

inspectTrigger();
