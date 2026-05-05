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
            WHERE p.proname = 'seed_clinic_defaults';
        `);
        
        if (res.rows.length > 0) {
            fs.writeFileSync('C:\\Users\\AL NABAA\\Desktop\\ANTI\\smart-dental\\seed_clinic_defaults_current.sql', res.rows[0].function_def);
            console.log("Written current function definition to seed_clinic_defaults_current.sql");
        } else {
            console.log("Function seed_clinic_defaults not found");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
