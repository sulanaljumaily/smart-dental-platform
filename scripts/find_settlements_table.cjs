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
    console.log("--- Querying Tables ---");
    try {
        await client.connect();
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name ILIKE '%settlement%'
        `);
        console.log("Tables found:");
        res.rows.forEach(r => console.log(`- ${r.table_name}`));

        if (res.rows.length > 0) {
            const actualName = res.rows[0].table_name;
            const colRes = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [actualName]);
            console.log(`\nColumns for ${actualName}:`);
            colRes.rows.forEach(r => console.log(`- ${r.column_name}`));
        } else {
            console.log("No table containing 'settlement' found.");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
