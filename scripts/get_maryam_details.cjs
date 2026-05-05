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

async function search() {
    try {
        await client.connect();
        
        console.log('\n--- Maryam Faris Details ---');
        const res = await client.query("SELECT * FROM patients WHERE full_name ILIKE '%Maryam%'");
        console.log(res.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

search();
