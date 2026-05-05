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
            FROM pg_proc p
            WHERE p.proname = 'on_clinic_created';
        `);
        
        if (res.rows.length > 0) {
            const def = res.rows[0].function_def;
            fs.writeFileSync('C:\\Users\\AL NABAA\\Desktop\\ANTI\\smart-dental\\on_clinic_created.sql', def);
            console.log("Written function definition to on_clinic_created.sql");
        } else {
            console.log("Function on_clinic_created not found");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
