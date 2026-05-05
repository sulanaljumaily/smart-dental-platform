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

async function verify() {
    try {
        await client.connect();
        const userId = 'f61eddec-b35f-4c14-860f-5556b533a0e1';

        console.log(`\n--- Verifying records for user: ${userId} ---`);

        const res = await client.query(`
            SELECT id, full_name, patient_user_id, user_id, deleted_at 
            FROM patients 
            WHERE patient_user_id = $1 OR user_id = $1
        `, [userId]);

        console.log(`Found ${res.rowCount} records:`, res.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

verify();
