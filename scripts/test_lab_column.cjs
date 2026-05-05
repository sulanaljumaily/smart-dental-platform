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
        const { error: e1 } = await supabase.from('lab_chat_conversations').select('lab_id').limit(1);
        if (!e1) { console.log("Column 'lab_id' exists!"); return; }

        const { error: e2 } = await supabase.from('lab_chat_conversations').select('laboratory_id').limit(1);
        if (!e2) { console.log("Column 'laboratory_id' exists!"); return; }

        const { error: e3 } = await supabase.from('lab_chat_conversations').select('dental_lab_id').limit(1);
        if (!e3) { console.log("Column 'dental_lab_id' exists!"); return; }

        console.log("None of the standard names exist. Errors:", e1.message, e2.message, e3.message);
    } catch (e) {
        console.error("Failed:", e);
    }
}

inspect();
