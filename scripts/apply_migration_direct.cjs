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

async function run() {
    const migrationFile = process.argv[2];
    if (!migrationFile) {
        console.error('Usage: node scripts/apply_migration_direct.cjs <path_to_sql_file>');
        process.exit(1);
    }

    if (!fs.existsSync(migrationFile)) {
        console.error(`❌ File not found: ${migrationFile}`);
        process.exit(1);
    }

    try {
        await client.connect();
        console.log('✅ Connected to Supabase database');
        
        console.log(`▶ Reading ${migrationFile}...`);
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log(`▶ Executing migration as a single transaction...`);
        const res = await client.query(sql);
        console.log('✅ Migration succeeded fully!');
        
        if (res) {
            console.log(`Rows affected / command tag: ${res.command}`);
        }

    } catch (err) {
        console.error('\n❌ Error executing migration:');
        console.error(err.message || err);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed.');
    }
}

run();
