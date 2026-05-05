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
        
        const triggerRes = await client.query(`
            SELECT 
                t.tgname AS trigger_name,
                n.nspname AS schema_name,
                p.proname AS function_name,
                pg_get_functiondef(p.oid) AS function_def
            FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            JOIN pg_proc p ON t.tgfoid = p.oid
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE c.relname = 'inventory' AND t.tgisinternal = false;
        `);
        
        console.log("=== TRIGGERS ON INVENTORY ===");
        triggerRes.rows.forEach(r => {
            console.log(`\n--- Trigger: ${r.trigger_name} (Function: ${r.schema_name}.${r.function_name}) ---`);
            console.log(r.function_def);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
