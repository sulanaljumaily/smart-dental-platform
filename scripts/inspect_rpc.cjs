const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) process.env[k] = envConfig[k];
}

// In case DATABASE_URL is not there, we can extract it from supabase credentials or use standard node-pg params if set
const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error("Missing Connection String");
    process.exit(1);
}

const client = new Client({ connectionString });

async function inspect() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT prosrc 
            FROM pg_proc 
            WHERE proname = 'get_clinic_lab_conversation';
        `);
        if (res.rows.length > 0) {
            console.log("RPC Source:");
            console.log(res.rows[0].prosrc);
        } else {
            console.log("RPC 'get_clinic_lab_conversation' not found.");
        }
    } catch (e) {
        console.error("Failed:", e);
    } finally {
        await client.end();
    }
}

inspect();
