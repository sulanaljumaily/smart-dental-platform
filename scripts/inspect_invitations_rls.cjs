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

    // Check clinic_invitations RLS policies
    const res = await client.query(`
        SELECT pol.polname, pol.polcmd, 
               pg_get_expr(pol.polqual, pol.polrelid) AS qual, 
               pg_get_expr(pol.polwithcheck, pol.polrelid) AS withcheck
        FROM pg_policy pol 
        JOIN pg_class rel ON pol.polrelid = rel.oid 
        WHERE rel.relname = 'clinic_invitations';
    `);
    console.log('=== clinic_invitations POLICIES ===');
    res.rows.forEach(r => console.log(JSON.stringify(r)));

    // Also check column defaults/nullable for staff table
    const res2 = await client.query(`
        SELECT column_name, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'staff' 
          AND column_name IN ('salary','department','phone','full_name','join_date','address')
        ORDER BY ordinal_position;
    `);
    console.log('\n=== STAFF nullable/defaults ===');
    res2.rows.forEach(r => console.log(JSON.stringify(r)));

    await client.end();
}
run().catch(console.error);
