const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const SQL_FILES = [
    'supabase/migrations/20260528010000_fix_activity_logs_user_relation.sql'
];

const DB_CONFIG = {
    user: 'postgres.nhueyaeyutfmadbgghfe',
    password: '10770$ULTAn0770',
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
};

console.log('\n🚀 Running activity_logs relationship migration...');

const client = new Client(DB_CONFIG);

const runMigration = async () => {
    try {
        await client.connect();
        console.log('Connected to PostgreSQL!');

        for (const file of SQL_FILES) {
            const filePath = path.join(__dirname, '..', file);
            if (fs.existsSync(filePath)) {
                console.log(`Running ${file}...`);
                const sql = fs.readFileSync(filePath, 'utf-8');
                await client.query(sql);
                console.log(`✅ SQL applied successfully!`);
            } else {
                console.warn(`⚠️ File not found: ${file}`);
            }
        }
        
        console.log('🔄 Reloading PostgREST schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log('✅ PostgREST schema reloaded!');

        console.log('\n🎉 Migration complete!');
    } catch (err) {
        console.error('❌ Error executing migration:', err.message);
    } finally {
        await client.end();
        process.exit(0);
    }
};

runMigration();
