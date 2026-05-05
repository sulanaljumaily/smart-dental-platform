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

async function unlink() {
    try {
        await client.connect();
        
        console.log('\n--- Unlinking Maryam Faris and other non-Sultan records ---');
        
        const correctUserId = 'dac8c601-2f4e-4478-a470-e979606fe74b';

        const res = await client.query(`
            UPDATE patients 
            SET patient_user_id = NULL, user_id = NULL
            WHERE (patient_user_id = $1 OR user_id = $1)
            AND full_name NOT ILIKE '%sultan%'
        `, [correctUserId]);

        console.log(`Unlinked ${res.rowCount} records that do not match 'sultan' name.`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

unlink();
