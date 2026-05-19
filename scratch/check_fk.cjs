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
    console.log('CHECKING REFERENCES TO patient_store_categories');
    console.log('='.repeat(60));

    // Get any foreign keys pointing to patient_store_categories
    const fkeys = await client.query(`
        SELECT
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'patient_store_categories';
    `);
    
    console.log('Foreign keys referencing patient_store_categories:');
    if (fkeys.rows.length === 0) {
        console.log('  No foreign keys found referencing this table.');
    } else {
        fkeys.rows.forEach(r => {
            console.log(`  Table: ${r.table_name} | Column: ${r.column_name} -> References: ${r.foreign_table_name}.${r.foreign_column_name}`);
        });
    }

    await client.end();
}

run().catch(console.error);
