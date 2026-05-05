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
                tgname AS trigger_name,
                pg_get_triggerdef(oid) AS trigger_def
            FROM pg_trigger
            WHERE tgname LIKE '%clinic%' AND tgisinternal = false;
        `);
        
        if (res.rows.length > 0) {
            fs.writeFileSync('C:\\Users\\AL NABAA\\Desktop\\ANTI\\smart-dental\\trigger_exact_def.sql', res.rows[0].trigger_def);
            console.log(`Saved trigger definition to trigger_exact_def.sql`);
        } else {
            console.log("No triggers found matching %clinic%");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
