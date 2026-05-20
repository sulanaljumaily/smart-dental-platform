const { Client } = require('pg');
const fs = require('fs');

const DB_CONFIG = {
    user: 'postgres.nhueyaeyutfmadbgghfe',
    password: '10770$ULTAn0770',
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
};

async function run() {
    const client = new Client(DB_CONFIG);
    try {
        await client.connect();
        const file = process.argv[2];
        if (!file) {
            console.error('Usage: node scratch/run_and_print.cjs <file.sql>');
            process.exit(1);
        }
        
        const sql = fs.readFileSync(file, 'utf8');
        console.log(`Executing ${file} and printing results...`);
        const res = await client.query(sql);
        if (Array.isArray(res)) {
            res.forEach((r, i) => {
                console.log(`\n--- Result ${i + 1} ---`);
                console.table(r.rows);
            });
        } else {
            console.table(res.rows);
        }
    } catch (err) {
        console.error('❌ SQL execution failed:', err);
    } finally {
        await client.end();
    }
}

run();
