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

async function inspectUsers() {
    try {
        await client.connect();
        
        console.log('\n--- Inspecting Profiles ---');
        const ids = ['f61eddec-b35f-4c14-860f-5556b533a0e1', 'dac8c601-2f4e-4478-a470-e979606fe74b'];
        const res = await client.query('SELECT id, full_name, role, phone, email FROM profiles WHERE id = ANY($1)', [ids]);
        console.log('Profiles Found:', res.rows);

        console.log('\n--- Searching profiles by phone 07818641727 ---');
        const resPhone = await client.query('SELECT id, full_name, role, phone FROM profiles WHERE phone = $1', ['07818641727']);
        console.log('Profiles by phone:', resPhone.rows);

        console.log('\n--- Checking Patients for new user ID ---');
        const resPatients = await client.query('SELECT id, full_name, patient_user_id, user_id FROM patients WHERE patient_user_id = $1 OR user_id = $1', ['dac8c601-2f4e-4478-a470-e979606fe74b']);
        console.log('Patients for new ID:', resPatients.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspectUsers();
