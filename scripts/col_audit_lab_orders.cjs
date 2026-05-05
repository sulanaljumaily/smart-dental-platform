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
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'dental_lab_orders';
    `);
    console.log(res.rows.map(r => r.column_name + ' (' + r.data_type + ')').join('\n'));
    await client.end();
}

run().catch(console.error);
