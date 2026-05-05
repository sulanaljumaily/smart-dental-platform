const { Client } = require('pg');
const client = new Client({
    user: 'postgres.nhueyaeyutfmadbgghfe',
    password: '10770$ULTAn0770',
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();

    console.log('=== profiles TABLE RLS POLICIES ===');
    const res = await client.query(`
        SELECT pol.polname, pol.polcmd,
               pg_get_expr(pol.polqual, pol.polrelid) AS qual,
               pg_get_expr(pol.polwithcheck, pol.polrelid) AS withcheck
        FROM pg_policy pol
        JOIN pg_class rel ON pol.polrelid = rel.oid
        WHERE rel.relname = 'profiles';
    `);
    res.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));

    await client.end();
}
run().catch(console.error);
