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

async function run() {
    await client.connect();
    const res = await client.query(`
        SELECT * FROM admin_lab_performance_view LIMIT 5;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
}

run().catch(console.error);
