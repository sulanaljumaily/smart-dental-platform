const { Client } = require('pg');
const fs = require('fs');

const DB_CONFIG = {
    user: 'postgres.nhueyaeyutfmadbgghfe',
    password: '10770$ULTAn0770',
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
};

const client = new Client(DB_CONFIG);

async function inspect() {
    try {
        await client.connect();
        
        // Count total rows and rows where price is null
        const countRes = await client.query(`
            SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE price IS NULL) AS null_price
            FROM system_inventory_templates;
        `);
        console.log(`Total rows: ${countRes.rows[0].total}`);
        console.log(`Rows with NULL price: ${countRes.rows[0].null_price}`);

        // Also check if any other columns are null that go into NOT NULL slots
        const sampleRes = await client.query(`
            SELECT * FROM system_inventory_templates WHERE price IS NULL LIMIT 3;
        `);
        console.log("\nSamples of NULL price rows:");
        console.log(JSON.stringify(sampleRes.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
