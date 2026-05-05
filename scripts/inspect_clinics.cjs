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
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'clinics');

        if (error) {
            console.log("Error querying information_schema columns directly:", error.message);
        } else {
            console.log("Clinics Columns:", data.map(c => c.column_name));
            return;
        }

        // Fallback: Use direct select * and check if it errors with empty row, but we already know it returned empty array perfectly.
        // Wait, if it's denied, we can insert or look for any file with 'city' or 'governorate' in useClinics hook!
        // Yes! useClinics.ts or useClinicLabs.ts will definitely show what columns clinics have!
    } catch (e) {
        console.error("Failed:", e);
    }
}

inspect();
