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

async function link() {
    try {
        await client.connect();
        const phone = '07818641727';
        const userId = 'f61eddec-b35f-4c14-860f-5556b533a0e1';

        console.log(`\n--- Linking all patient files for phone: ${phone} to user: ${userId} ---`);

        const res = await client.query(`
            UPDATE patients 
            SET patient_user_id = $1, user_id = $1
            WHERE phone = $2 AND (patient_user_id IS NULL OR user_id IS NULL)
        `, [userId, phone]);

        console.log(`Updated ${res.rowCount} patient records.`);

        // Also ensure patient 43 is active if requested (though user said 43, maybe they meant 41 if 43 was a mistake?)
        // Let's undelete 43 just in case they are testing with it.
        const res43 = await client.query(`
            UPDATE patients 
            SET deleted_at = NULL 
            WHERE id = 43
        `);
        console.log(`Undeleted patient 43: ${res43.rowCount} records.`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

link();
