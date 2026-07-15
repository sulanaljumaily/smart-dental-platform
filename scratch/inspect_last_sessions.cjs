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

async function run() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT id, plan_id, procedure_name, session_status, notes, updated_at 
            FROM treatment_sessions 
            ORDER BY updated_at DESC LIMIT 5;
        `);
        console.log('Last 5 treatment sessions:');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Failed to query:', err);
    } finally {
        await client.end();
    }
}
run();
