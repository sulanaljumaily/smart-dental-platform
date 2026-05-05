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

async function fixLinking() {
    try {
        await client.connect();
        
        const phone = '07818641727';
        const correctPatientUserId = 'dac8c601-2f4e-4478-a470-e979606fe74b';

        console.log(`\n--- Fixing linking for Patient User ID: ${correctPatientUserId} ---`);

        // 1. Update profiles to set phone if missing
        await client.query('UPDATE profiles SET phone = $1 WHERE id = $2 AND phone IS NULL', [phone, correctPatientUserId]);
        console.log('Updated profile phone.');

        // 2. Link all patients with phone 07818641727 to this NEW user ID
        const res = await client.query(`
            UPDATE patients 
            SET patient_user_id = $1, user_id = $1
            WHERE phone = $2 OR full_name ILIKE '%sultan%'
        `, [correctPatientUserId, phone]);
        console.log(`Updated ${res.rowCount} patient records.`);

        // 3. Specifically ensure patient 43 is active and linked
        const res43 = await client.query(`
            UPDATE patients 
            SET deleted_at = NULL, patient_user_id = $1, user_id = $1
            WHERE id = 43
        `, [correctPatientUserId]);
        console.log(`Fixed patient 43: ${res43.rowCount} records.`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

fixLinking();
