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
        
        // 1. Get exact function definition for 'on_clinic_created'
        const funcRes = await client.query(`
            SELECT 
                p.proname AS function_name,
                pg_get_functiondef(p.oid) AS function_def
            FROM pg_proc p
            WHERE p.proname = 'on_clinic_created' OR p.proname LIKE '%clinic%create%';
        `);
        
        console.log("=== FUNCTIONS ===");
        funcRes.rows.forEach(r => {
            console.log(`\n--- Function: ${r.function_name} ---`);
            console.log(r.function_def);
        });

        // 2. Inspect 'inventory' columns
        const colRes = await client.query(`
            SELECT column_name        FROM information_schema.columns 
            WHERE table_name = 'inventory'
            ORDER BY ordinal_position;
        `);
        console.log("\n=== INVENTORY COLUMNS ===");
        colRes.rows.forEach(r => console.log(r.column_name));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
