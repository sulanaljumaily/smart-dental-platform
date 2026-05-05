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

async function cleanup() {
    try {
        await client.connect();
        
        console.log('\n--- Cleaning up duplicate Sultan records ---');
        
        // We want to KEEP 43 and DELETE 41, 42
        const idsToDelete = [41, 42];

        // Soft delete them first (set deleted_at) just in case, or HARD DELETE if requested.
        // The user said "لم تحذف من قواعد البيانات", implying they want them gone.
        // I'll do a hard delete for these specific IDs.
        const res = await client.query('DELETE FROM patients WHERE id = ANY($1)', [idsToDelete]);
        console.log(`Deleted ${res.rowCount} records.`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

cleanup();
