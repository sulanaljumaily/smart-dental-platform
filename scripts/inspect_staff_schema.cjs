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

async function inspectTable() {
    try {
        const { data: cols, error: err } = await supabase
            .from('staff')
            .select('*')
            .limit(1);
        
        if (err) throw err;
        
        if (cols && cols[0]) {
            console.log("Full Object keys and types:");
            for (const k in cols[0]) {
                console.log(`- ${k}: ${typeof cols[0][k]} (Value: ${JSON.stringify(cols[0][k])})`);
            }
        } else {
            console.log("No rows found in staff table to inspect.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

inspectTable();
