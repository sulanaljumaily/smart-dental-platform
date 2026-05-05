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
        
        // 1. Get triggers on 'clinics' table
        const triggerRes = await client.query(`
            SELECT 
                t.tgname AS trigger_name,
                p.proname AS function_name,
                pg_get_functiondef(p.oid) AS function_definition
            FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            JOIN pg_proc p ON t.tgfoid = p.oid
            WHERE c.relname = 'clinics';
        `);
        
        console.log("=== TRIGGERS ON CLINICS ===");
        triggerRes.rows.forEach(r => {
            console.log(`\nTrigger: ${r.trigger_name}`);
            console.log(`Function: ${r.function_name}`);
            console.log(`Definition:\n${r.function_definition}`);
        });

        // 2. Inspect 'inventory' table columns to see what it has
        const columnRes = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'inventory'
            ORDER BY ordinal_position;
        `);
        console.log("\n=== INVENTORY COLUMNS ===");
        columnRes.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
