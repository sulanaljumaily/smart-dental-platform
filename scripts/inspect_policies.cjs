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

async function inspectPolicies() {
    try {
        await client.connect();
        
        console.log('\n--- RLS Policies for patients ---');
        const res = await client.query(`
            SELECT * FROM pg_policies WHERE tablename = 'patients'
        `);
        console.log(JSON.stringify(res.rows, null, 2));

        console.log('\n--- RLS Status for patients ---');
        const statusRes = await client.query(`
            SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'patients'
        `);
        console.log(JSON.stringify(statusRes.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspectPolicies();
