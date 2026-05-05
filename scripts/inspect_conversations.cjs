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
            .from('lab_chat_conversations')
            .select('*');

        if (error) {
            console.log("Error querying conversations:", error.message);
        } else {
            console.log("Existing Conversations:", data);
        }
    } catch (e) {
        console.error("Failed:", e);
    }
}

inspect();
