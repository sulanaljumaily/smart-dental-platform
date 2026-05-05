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
                tgname AS trigger_name,
                pg_get_triggerdef(oid) AS trigger_def
            FROM pg_trigger
            WHERE tgname = 'on_clinic_created';
        `);
        
        console.log("=== TRIGGER DEFINITION ===");
        res.rows.forEach(r => {
            console.log(`\nTrigger: ${r.trigger_name}`);
            console.log(`Def: ${r.trigger_def}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
