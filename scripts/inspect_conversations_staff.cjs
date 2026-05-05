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
        const { error: e1 } = await supabase.from('lab_chat_conversations').select('staff_id').limit(1);
        if (e1 && e1.code === 'PGRST204') {
            console.log("Column 'staff_id' DOES NOT exist.");
        } else if (!e1) {
            console.log("Column 'staff_id' exists!");
        } else {
            console.log("staff_id check hit other error:", e1.message);
        }

        const { error: e2 } = await supabase.from('lab_chat_conversations').select('staff_record_id').limit(1);
        if (e2 && e2.code === 'PGRST204') {
            console.log("Column 'staff_record_id' DOES NOT exist.");
        } else if (!e2) {
            console.log("Column 'staff_record_id' exists!");
        } else {
            console.log("staff_record_id check hit other error:", e2.message);
        }
    } catch (e) {
        console.error("Failed:", e);
    }
}

inspect();
