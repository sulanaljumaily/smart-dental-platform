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
    console.log("--- Querying Columns for table: store_orders ---");
    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'store_orders'
        `);
        console.log("Columns:");
        res.rows.forEach(r => console.log(`- ${r.column_name}`));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
