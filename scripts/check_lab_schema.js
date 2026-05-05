const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-url.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-key';

// Parse from .env if possible
if (fs.existsSync('.env')) {
    const env = fs.readFileSync('.env', 'utf-8');
    const urlMatch = env.match(/VITE_SUPABASE_URL=(.+)/);
    const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
    if (urlMatch && keyMatch) {
            global.supabaseUrl = urlMatch[1].trim();
            global.supabaseKey = keyMatch[1].trim();
    }
}

const supabase = createClient(global.supabaseUrl, global.supabaseKey);

async function inspect() {
    console.log("Inspecting dental_laboratories:");
    const { data: cols1 } = await supabase.rpc('inspect_table_columns', { table_name_param: 'dental_laboratories' });
    if (cols1) console.log(cols1.map(c => c.column_name).join(', '));
    else {
        // Fallback: fetch 1 rows to see keys
        const { data: rows } = await supabase.from('dental_laboratories').select('*').limit(1);
        if (rows && rows.length > 0) console.log(Object.keys(rows[0]).join(', '));
    }

    console.log("\nInspecting dental_lab_orders:");
    const { data: cols2 } = await supabase.rpc('inspect_table_columns', { table_name_param: 'dental_lab_orders' });
    if (cols2) console.log(cols2.map(c => c.column_name).join(', '));
     else {
        const { data: rows } = await supabase.from('dental_lab_orders').select('*').limit(1);
        if (rows && rows.length > 0) console.log(Object.keys(rows[0]).join(', '));
    }
}

inspect();
