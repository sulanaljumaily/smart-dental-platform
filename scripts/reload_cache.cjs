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
    console.log('Connected to DB. Reloading schema cache...');
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log('Schema cache reloaded successfully.');
    await client.end();
}
run().catch(console.error);
