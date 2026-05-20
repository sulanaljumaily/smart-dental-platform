const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    try {
        const { data, error } = await supabase
            .from('clinics')
            .select('*')
            .limit(1);

        if (error) {
            console.log("Error querying clinics:", error);
        } else {
            console.log("Clinics Row Keys:", Object.keys(data[0] || {}));
            console.log("Clinics Row Data:", data[0]);
        }
    } catch (e) {
        console.error("Failed:", e);
    }
}

inspect();
