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

async function verify() {
    try {
        const { data, count, error } = await supabase
            .from('staff')
            .select('*', { count: 'exact' })
            .eq('role_title', 'doctor')
            .eq('department', 'الإدارة');
        
        if (error) throw error;
        
        console.log(`Found ${count} owner staff records inserted with role 'doctor' and department 'الإدارة'.`);
        if (data && data.length > 0) {
             console.log("Sample synced row:", data[0]);
        }
    } catch (e) {
        console.error("Verification failed:", e);
    }
}

verify();
