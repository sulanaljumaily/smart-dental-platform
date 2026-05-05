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
        
        const res = await client.query(`
            SELECT 
                p.proname AS function_name,
                n.nspname AS schema_name,
                pg_get_functiondef(p.oid) AS function_def
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE p.proname = 'seed_clinic_defaults';
        `);
        
        console.log("=== FUNCTIONS NAMED seed_clinic_defaults ===");
        res.rows.forEach(r => {
            console.log(`\n--- Schema: ${r.schema_name} ---`);
            console.log(r.function_def);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
