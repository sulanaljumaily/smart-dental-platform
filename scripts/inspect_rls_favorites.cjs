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
            .from('pg_policies')
            .select('*')
            .eq('tablename', 'clinic_lab_favorites');

        if (error) {
            console.log("Error querying pg_policies via REST:", error.message);
            // It usually denies direct querying of pg_ views, so this will fail to read.
        } else {
            console.log("RLS Policies for clinic_lab_favorites:", data);
        }
    } catch (e) {
        console.error("Failed:", e);
    }
}

inspect();
