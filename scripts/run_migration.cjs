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

async function runMigration() {
    const migrationFile = process.argv[2];
    if (!migrationFile) {
        console.log('Usage: node scripts/run_migration.cjs <path_to_sql_file>');
        process.exit(1);
    }

    if (!fs.existsSync(migrationFile)) {
        console.error(`❌ File not found: ${migrationFile}`);
        process.exit(1);
    }

    try {
        await client.connect();
        console.log('✅ Connected to Supabase database\n');

        const rawSql = fs.readFileSync(migrationFile, 'utf8');

        // Split by semicolons, filter out comments and empty statements
        const statements = rawSql
            .split(';')
            .map(s => s.trim())
            .filter(s => {
                // Remove comment-only lines
                const withoutComments = s.replace(/--[^\n]*/g, '').trim();
                return withoutComments.length > 0;
            });

        console.log(`📋 Found ${statements.length} SQL statements to execute\n`);
        console.log('════════════════════════════════════════\n');

        let totalAffected = 0;
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            // Extract comment label if present
            const labelMatch = rawSql.match(new RegExp(`--[^\n]*\\n${stmt.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
            
            console.log(`▶ Running statement ${i + 1}/${statements.length}...`);
            console.log(`  ${stmt.slice(0, 80).replace(/\n/g, ' ')}...`);
            
            try {
                const result = await client.query(stmt);
                const affected = result.rowCount || 0;
                totalAffected += affected;
                console.log(`  ✅ Success — ${affected} row(s) affected\n`);
            } catch (stmtErr) {
                console.error(`  ❌ Error: ${stmtErr.message}\n`);
                // Continue with next statement
            }
        }

        console.log('════════════════════════════════════════');
        console.log(`✅ Migration complete! Total rows affected: ${totalAffected}`);

        // Final verification query
        console.log('\n📊 Verification Report:');
        const verifyResult = await client.query(`
            SELECT 'appointments' AS tbl,
                COUNT(*) FILTER (WHERE patient_user_id IS NOT NULL) AS linked,
                COUNT(*) FILTER (WHERE patient_user_id IS NULL) AS unlinked
            FROM appointments
            UNION ALL
            SELECT 'patients',
                COUNT(*) FILTER (WHERE patient_user_id IS NOT NULL AND deleted_at IS NULL),
                COUNT(*) FILTER (WHERE patient_user_id IS NULL AND deleted_at IS NULL)
            FROM patients
        `);

        console.log('\n┌─────────────┬────────┬──────────┐');
        console.log('│ Table       │ Linked │ Unlinked │');
        console.log('├─────────────┼────────┼──────────┤');
        verifyResult.rows.forEach(row => {
            const tbl = row.tbl.padEnd(11);
            const linked = String(row.linked).padEnd(6);
            const unlinked = String(row.unlinked).padEnd(8);
            console.log(`│ ${tbl} │ ${linked} │ ${unlinked} │`);
        });
        console.log('└─────────────┴────────┴──────────┘');

    } catch (err) {
        console.error('\n❌ Fatal error:');
        console.error(err.message || err);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed.');
    }
}

runMigration();
