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
        const { data, error } = await supabase.rpc('get_clinic_lab_conversation', {
            p_dental_lab_id: 'some-guid-placeholder', // Doesn't matter if it fails row not found, error string tells parameter issue
            p_user_id: 'some-guid-placeholder',
            p_clinic_id: 'some-guid-placeholder'
        });

        if (error) {
            console.log("RPC Error Text:", error.message);
        } else {
             console.log("RPC Succeeded/Tolerated param! Data:", data);
        }
    } catch (e) {
        console.error("Crash:", e);
    }
}

inspect();
