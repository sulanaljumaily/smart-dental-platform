const { Client } = require('pg');
const client = new Client({
    user: 'postgres.nhueyaeyutfmadbgghfe',
    password: '10770$ULTAn0770',
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    console.log('Adding staff_id column to clinic_invitations...');
    try {
        await client.query(`
            ALTER TABLE clinic_invitations
            ADD COLUMN IF NOT EXISTS staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL;
        `);
        console.log('SUCCESS: staff_id column added (or already existed).');
    } catch (e) {
        console.error('Failed:', e.message);
    }
    await client.end();
}
run().catch(console.error);
