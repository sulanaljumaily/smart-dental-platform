const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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
            console.error('Usage: node scratch/apply_sql.cjs <file.sql>');
            process.exit(1);
        }
        
        const sql = fs.readFileSync(file, 'utf8');
        console.log(`Executing ${file} as a single SQL query...`);
        const res = await client.query(sql);
        console.log('✨ SQL executed successfully!');
    } catch (err) {
        console.error('❌ SQL execution failed:', err);
    } finally {
        await client.end();
    }
}

run();
