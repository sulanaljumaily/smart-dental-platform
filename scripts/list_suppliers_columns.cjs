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
    console.log("--- Querying Columns for table: suppliers ---");
    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'suppliers'
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
