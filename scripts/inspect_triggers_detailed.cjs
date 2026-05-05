const { Client } = require('pg');

const DB_CONFIG = {
    user: 'postgres.nhueyaeyutfmadbgghfe',
    password: '10770$ULTAn0770',
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
};

const client = new Client(DB_CONFIG);

async function inspect() {
    try {
        await client.connect();
        
        // 1. Get triggers on 'clinics' table with definition
        const triggerRes = await client.query(`
            SELECT 
                t.tgname AS trigger_name,
                pg_get_triggerdef(t.oid) AS trigger_def,
                p.proname AS function_name,
                pg_get_functiondef(p.oid) AS function_def
            FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            LEFT JOIN pg_proc p ON t.tgfoid = p.oid
            WHERE c.relname = 'clinics' AND t.tgisinternal = false;
        `);
        
        console.log("=== TRIGGERS ON CLINICS ===");
        triggerRes.rows.forEach(r => {
            console.log(`\n--- Trigger: ${r.trigger_name} ---`);
            console.log(`Def: ${r.trigger_def}`);
            console.log(`Function: ${r.function_name}`);
            console.log(`Function Def:\n${r.function_def}\n`);
        });

        // 2. Inspect 'inventory' table columns
        const columnRes = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'inventory'
            ORDER BY ordinal_position;
        `);
        console.log("=== INVENTORY COLUMNS ===");
        columnRes.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));

    } catch (err) {
        console.error(err);
    } client.end();
}

inspect();
