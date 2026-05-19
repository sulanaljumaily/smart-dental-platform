const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzcwNTYsImV4cCI6MjA4NDQxMzA1Nn0.56MIbpOtVu9b_fwEyo-hvlxGxA_E5c-nU7q1MSfTg-g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log('Fetching patient_store_categories via Supabase JS Client...');
    const { data, error } = await supabase
        .from('patient_store_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

    if (error) {
        console.error('Supabase Error:', error);
        return;
    }

    console.log(`Successfully fetched ${data.length} active categories:`);
    data.forEach((r, idx) => {
        console.log(`[${idx}] ID: ${r.id} | Name: ${r.name} | Icon: ${r.icon} | Active: ${r.is_active} | Order: ${r.sort_order}`);
    });
}

run();
