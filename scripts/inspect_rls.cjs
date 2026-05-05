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

async function inspectRLS() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT pol.polname, pg_get_expr(pol.polqual, pol.polrelid) AS qual, pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check
            FROM pg_policy pol
            JOIN pg_class rel ON pol.polrelid = rel.oid
            WHERE rel.relname = 'staff';
        `);
        console.log("--- STAFF RLS POLICIES ---");
        res.rows.forEach(r => {
            console.log(`POLICY: ${r.polname}`);
            console.log(`USING: ${r.qual}`);
            if (r.with_check) console.log(`WITH CHECK: ${r.with_check}`);
            console.log('------------------------');
        });
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspectRLS();
