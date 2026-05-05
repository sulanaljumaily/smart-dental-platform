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
        // 1. Get valid lab.user_id
        const { data: labData } = await supabase
            .from('dental_laboratories')
            .select('user_id')
            .limit(1);

        if (!labData || labData.length === 0) {
            console.log("No lab users found to test with.");
            return;
        }
        const labUserId = labData[0].user_id;
        console.log("Testing with labUserId:", labUserId);

        // 2. Insert test row with clinic_id as string
        const testClinicIdStr = "99999";
        const { data: insData, error: insErr } = await supabase
            .from('lab_chat_conversations')
            .insert({
                clinic_id: testClinicIdStr,
                lab_id: labUserId,
                created_at: new Date().toISOString()
            })
            .select('id')
            .single();

        if (insErr) {
            console.log("Insert failed with string clinic_id:", insErr.message);
        } else {
            console.log("Insert Succeeded with string, id:", insData.id);

            // 3. Select back using STRING
            const { data: selStr, error: errStr } = await supabase
                .from('lab_chat_conversations')
                .select('id')
                .eq('clinic_id', testClinicIdStr)
                .eq('lab_id', labUserId)
                .maybeSingle();

            console.log("Select using string:", selStr ? "Found" : "NOT Found", errStr?.message || "");

            // 4. Select back using NUMBER
            const { data: selNum, error: errNum } = await supabase
                .from('lab_chat_conversations')
                .select('id')
                .eq('clinic_id', Number(testClinicIdStr))
                .eq('lab_id', labUserId)
                .maybeSingle();

             console.log("Select using number:", selNum ? "Found" : "NOT Found", errNum?.message || "");

             // Cleanup test row
             await supabase.from('lab_chat_conversations').delete().eq('id', insData.id);
        }
    } catch (e) {
        console.error("Failed:", e);
    }
}

inspect();
