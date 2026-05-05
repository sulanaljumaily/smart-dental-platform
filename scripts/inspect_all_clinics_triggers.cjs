const { Client } = require('pg');
const fs = require('fs');

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
                t.tgname AS trigger_name,
                pg_get_triggerdef(t.oid) AS trigger_def
            FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            WHERE c.relname = 'clinics' AND tgisinternal = false;
        `);
        
        fs.writeFileSync('C:\\Users\\AL NABAA\\Desktop\\ANTI\\smart-dental\\all_clinics_triggers.json', JSON.stringify(res.rows, null, 2));
        console.log("Saved all trigger definitions to all_clinics_triggers.json");

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
