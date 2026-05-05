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
        // We need a valid user ID to test the RPC. Let's find one.
        // Or if we don't have one, let's query the table directly using what's left of the rules.
        // Actually, let's look for user IDs in profiles table!
        const { data: profs } = await supabase.from('profiles').select('id').limit(1);
        if (!profs || profs.length === 0) {
            console.log("No users found to test with.");
            return;
        }

        const testId = profs[0].id;
        console.log("Testing with user_id:", testId);
        const { data, error } = await supabase.rpc('get_lab_conversations', {
            p_user_id: testId
        });

        if (error) {
            console.log("RPC Error:", error.message);
        } else {
            console.log("RPC Success, data:", data);
        }
    } catch (e) {
        console.error("Failed:", e);
    }
}

inspect();
