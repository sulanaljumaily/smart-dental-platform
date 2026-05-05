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

const SQL = `
ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0;
`;

async function run() {
    try {
        await client.connect();
        await client.query(SQL);
        console.log("Migration successful: amount_paid column added to subscription_requests.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

run();
