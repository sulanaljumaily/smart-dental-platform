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
                p.proname AS function_name,
                pg_get_functiondef(p.oid) AS function_def
            FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            JOIN pg_proc p ON t.tgfoid = p.oid
            WHERE c.relname = 'clinics' AND t.tgisinternal = false;
        `);
        
        if (res.rows.length > 0) {
            res.rows.forEach(r => {
                fs.writeFileSync(`C:\\Users\\AL NABAA\\Desktop\\ANTI\\smart-dental\\${r.function_name}.sql`, r.function_def);
                console.log(`Saved ${r.function_name}.sql`);
            });
        } else {
            console.log("No non-internal triggers found on clinics");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
