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

    // Check clinic_invitations columns
    const r1 = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'clinic_invitations'
        ORDER BY ordinal_position;
    `);
    console.log('=== clinic_invitations COLUMNS ===');
    r1.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type} nullable=${r.is_nullable} default=${r.column_default}`));

    // Check all RLS policies on clinic_invitations
    const r2 = await client.query(`
        SELECT pol.polname, pol.polcmd,
               pg_get_expr(pol.polqual, pol.polrelid) AS qual,
               pg_get_expr(pol.polwithcheck, pol.polrelid) AS withcheck
        FROM pg_policy pol
        JOIN pg_class rel ON pol.polrelid = rel.oid
        WHERE rel.relname = 'clinic_invitations';
    `);
    console.log('\n=== clinic_invitations ALL RLS POLICIES ===');
    r2.rows.forEach(r => console.log(JSON.stringify(r)));

    // Check RLS policies on staff table
    const r3 = await client.query(`
        SELECT pol.polname, pol.polcmd,
               pg_get_expr(pol.polqual, pol.polrelid) AS qual
        FROM pg_policy pol
        JOIN pg_class rel ON pol.polrelid = rel.oid
        WHERE rel.relname = 'staff';
    `);
    console.log('\n=== staff ALL RLS POLICIES ===');
    r3.rows.forEach(r => console.log(JSON.stringify(r)));

    await client.end();
}
run().catch(console.error);
