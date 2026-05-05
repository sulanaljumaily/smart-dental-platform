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
            SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS qual, pg_get_expr(polwithcheck, polrelid) AS withcheck
            FROM pg_policy 
            WHERE polrelid = (SELECT oid FROM pg_class WHERE relname = 'objects' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage'));
        `);
        
        fs.writeFileSync('C:\\Users\\AL NABAA\\Desktop\\ANTI\\smart-dental\\storage_rls.json', JSON.stringify(res.rows, null, 2));
        console.log("Saved RLS policies to storage_rls.json");

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
