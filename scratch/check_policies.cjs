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

    console.log('RLS status on promotional_cards:');
    const rls = await client.query(`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'promotional_cards'
    `);
    console.log(`  Row Security Enabled: ${rls.rows[0].relrowsecurity}`);

    console.log('\nPolicies on promotional_cards:');
    const policies = await client.query(`
        SELECT * 
        FROM pg_policies 
        WHERE tablename = 'promotional_cards'
    `);
    policies.rows.forEach(p => {
        console.log(`  Policy Name: ${p.policyname}`);
        console.log(`    Cmd: ${p.cmd}`);
        console.log(`    Roles: ${p.roles}`);
        console.log(`    Using: ${p.using}`);
        console.log(`    With Check: ${p.with_check}`);
    });

    await client.end();
}

run().catch(console.error);
