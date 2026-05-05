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

async function inspect() {
    try {
        await client.connect();
        const phone = '07818641727';

        console.log(`\n--- Inspecting linking for phone: ${phone} ---`);

        // 1. Check Profiles
        const profileRes = await client.query('SELECT * FROM profiles WHERE phone = $1', [phone]);
        console.log('\nProfiles:', profileRes.rows);

        // 2. Check Patients
        const patientRes = await client.query('SELECT * FROM patients WHERE phone = $1', [phone]);
        console.log('\nPatient Files (by phone):', patientRes.rows);

        // 3. Check specific Patient 43
        const p43Res = await client.query('SELECT * FROM patients WHERE id = 43');
        console.log('\nPatient 43 Details:', p43Res.rows);

        // 4. Check Clinic 19
        const clinicRes = await client.query('SELECT * FROM clinics WHERE id = 19');
        console.log('\nClinic 19 Details:', clinicRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
