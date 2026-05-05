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
        
        console.log('\n--- Patients with Sultan phone ---');
        const res = await client.query("SELECT id, full_name, phone FROM patients WHERE phone = '07818641727'");
        console.log(res.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

search();
