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
    console.log('Columns in deal_requests table:');
    const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'deal_requests'
    `);
    cols.rows.forEach(c => {
        console.log(`  ${c.column_name}: ${c.data_type}`);
    });

    const pending = await client.query('SELECT * FROM deal_requests');
    console.log(`\nTotal deal requests: ${pending.rows.length}`);
    pending.rows.forEach(r => {
        console.log(JSON.stringify(r));
    });

    await client.end();
}

run().catch(console.error);
