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
        
        console.log('\n--- Searching for Maryam Faris ---');
        const res = await client.query("SELECT id, full_name, patient_user_id, user_id FROM patients WHERE full_name ILIKE '%Maryam%'");
        console.log(res.rows);

        console.log('\n--- Checking all records linked to Sultan Sulaiman ID ---');
        const res2 = await client.query("SELECT id, full_name, patient_user_id, user_id FROM patients WHERE patient_user_id = 'dac8c601-2f4e-4478-a470-e979606fe74b' OR user_id = 'dac8c601-2f4e-4478-a470-e979606fe74b'");
        console.log(res2.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

search();
