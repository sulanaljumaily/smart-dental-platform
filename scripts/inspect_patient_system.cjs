const { Client } = require('pg');
const client = new Client({
    user: 'postgres.nhueyaeyutfmadbgghfe',
    password: '10770$ULTAn0770',
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    console.log('='.repeat(60));
    console.log('PATIENT SYSTEM - FULL DATABASE INSPECTION');
    console.log('='.repeat(60));

    // 1. appointments table columns
    const r1 = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'appointments'
        ORDER BY ordinal_position;
    `);
    console.log('\n1. appointments COLUMNS:');
    r1.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} | nullable=${r.is_nullable} | default=${r.column_default}`));

    // 2. patients table columns
    const r2 = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'patients'
        ORDER BY ordinal_position;
    `);
    console.log('\n2. patients COLUMNS:');
    r2.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} | nullable=${r.is_nullable}`));

    // 3. suppliers table - check store_type
    const r3 = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'suppliers' AND column_name = 'store_type';
    `);
    console.log('\n3. suppliers.store_type:');
    if (r3.rows.length > 0) {
        r3.rows.forEach(r => console.log(`  FOUND: ${r.column_name}: ${r.data_type} | default=${r.column_default}`));
    } else {
        console.log('  MISSING!');
    }

    // 4. profiles role constraint
    const r4 = await client.query(`
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%role%' AND constraint_schema = 'public';
    `);
    console.log('\n4. profiles role CHECK constraint:');
    r4.rows.forEach(r => console.log(`  ${r.constraint_name}: ${r.check_clause}`));

    // 5. RLS policies on appointments
    const r5 = await client.query(`
        SELECT pol.polname, pol.polcmd,
               pg_get_expr(pol.polqual, pol.polrelid) AS qual
        FROM pg_policy pol
        JOIN pg_class rel ON pol.polrelid = rel.oid
        WHERE rel.relname = 'appointments';
    `);
    console.log('\n5. appointments RLS POLICIES:');
    r5.rows.forEach(r => console.log(`  [${r.polcmd}] ${r.polname}: ${r.qual}`));

    // 6. RLS policies on patients
    const r6 = await client.query(`
        SELECT pol.polname, pol.polcmd,
               pg_get_expr(pol.polqual, pol.polrelid) AS qual
        FROM pg_policy pol
        JOIN pg_class rel ON pol.polrelid = rel.oid
        WHERE rel.relname = 'patients';
    `);
    console.log('\n6. patients RLS POLICIES:');
    r6.rows.forEach(r => console.log(`  [${r.polcmd}] ${r.polname}: ${r.qual}`));

    // 7. patient_store_categories table
    const r7 = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'patient_store_categories'
        ORDER BY ordinal_position;
    `);
    console.log('\n7. patient_store_categories TABLE:');
    if (r7.rows.length > 0) {
        r7.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    } else {
        console.log('  TABLE DOES NOT EXIST - needs creation!');
    }

    // 8. indexes on patient_user_id
    const r8 = await client.query(`
        SELECT indexname, tablename, indexdef
        FROM pg_indexes
        WHERE indexdef LIKE '%patient_user%';
    `);
    console.log('\n8. patient_user INDEXES:');
    if (r8.rows.length > 0) {
        r8.rows.forEach(r => console.log(`  ${r.tablename}: ${r.indexname}`));
    } else {
        console.log('  NO patient_user indexes found!');
    }

    // 9. products target_audience support
    const r9 = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'target_audience';
    `);
    console.log('\n9. products.target_audience:');
    if (r9.rows.length > 0) {
        r9.rows.forEach(r => console.log(`  FOUND: ${r.column_name}: ${r.data_type}`));
    } else {
        console.log('  MISSING!');
    }

    console.log('\n' + '='.repeat(60));
    console.log('INSPECTION COMPLETE');
    console.log('='.repeat(60));
    await client.end();
}
run().catch(console.error);
