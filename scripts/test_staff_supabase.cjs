const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzcwNTYsImV4cCI6MjA4NDQxMzA1Nn0.56MIbpOtVu9b_fwEyo-hvlxGxA_E5c-nU7q1MSfTg-g';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    try {
        // Use a valid user_id from staff table
        const targetUserId = '8118872f-aaa2-4322-a0d1-245b210b484d'; // We need the full uuid from previous log that said Center of Digital Smile
        // Let's first fetch ONE row to get full uuid safely
        const { data: staffCheck } = await supabase.from('staff').select('user_id').not('user_id', 'is', null).limit(1);
        if (!staffCheck || staffCheck.length === 0) {
            console.log("No linked staff found.");
            return;
        }
        const fullUuid = staffCheck[0].user_id;
        console.log(`Testing with full UUID: ${fullUuid}`);

        const { data, error } = await supabase
            .from('staff')
            .select('clinic:clinics(*)')
            .or(`user_id.eq.${fullUuid},auth_user_id.eq.${fullUuid}`)
            .in('status', ['active', 'on_leave']);

        const result = {
            success: !error,
            dataLength: data?.length || 0,
            hasData: !!data,
            error: error ? {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            } : null
        };

        fs.writeFileSync('C:\\Users\\AL NABAA\\Desktop\\ANTI\\smart-dental\\supabase_test_result.json', JSON.stringify(result, null, 2));
        console.log("Test finished. Result saved.");

    } catch (err) {
        console.error(err);
    }
}

test();
