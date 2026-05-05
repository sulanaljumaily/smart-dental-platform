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
        const { error: e1 } = await supabase.from('lab_chat_conversations').select('order_id').limit(1);
        if (e1 && e1.code === 'PGRST204') {
            console.log("Column 'order_id' DOES NOT exist.");
        } else if (!e1) {
            console.log("Column 'order_id' EXISTS!");
        } else {
             console.log("order_id check other error:", e1.message);
        }

        const { error: e2 } = await supabase.from('lab_chat_conversations').select('last_message').limit(1);
        if (e2 && e2.code === 'PGRST204') {
            console.log("Column 'last_message' DOES NOT exist.");
        } else if (!e2) {
            console.log("Column 'last_message' EXISTS!");
        } else {
             console.log("last_message check other error:", e2.message);
        }

        const { error: e3 } = await supabase.from('lab_chat_conversations').select('last_message_content').limit(1);
        if (e3 && e3.code === 'PGRST204') {
            console.log("Column 'last_message_content' DOES NOT exist.");
        } else if (!e3) {
            console.log("Column 'last_message_content' EXISTS!");
        } else {
             console.log("last_message_content check other error:", e3.message);
        }
    } catch (e) {
        console.error("Failed:", e);
    }
}

inspect();
