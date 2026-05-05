const { Client } = require('pg');
const fs = require('fs');

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
    let out = '';
    try {
        await client.connect();

        const tables = ['profiles', 'clinics', 'dental_laboratories', 'suppliers', 'subscription_requests', 'payment_methods', 'subscription_plans'];
        for (const table of tables) {
            out += `\n--- COLUMNS for ${table} ---\n`;
            const cols = await client.query(`
                SELECT column_name, data_type
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [table]);
            out += cols.rows.map(r => r.column_name).join(', ') + '\n';
        }

        out += '\n--- Sample Profile ---\n';
        const profiles = await client.query(`SELECT * FROM profiles LIMIT 1`);
        out += JSON.stringify(profiles.rows[0], null, 2) + '\n';

        out += '\n--- Sample Lab ---\n';
        const labs = await client.query(`SELECT * FROM dental_laboratories LIMIT 1`);
        out += JSON.stringify(labs.rows[0], null, 2) + '\n';

        out += '\n--- Sample Sub Req ---\n';
        const subReqs = await client.query(`SELECT * FROM subscription_requests LIMIT 2`);
        out += JSON.stringify(subReqs.rows, null, 2) + '\n';

        fs.writeFileSync('scripts/inspect_output.txt', out);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
