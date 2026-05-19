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
    console.log('CLEAN DATABASE INSPECTION');
    console.log('='.repeat(60));

    // 1. Get all columns of products table
    const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'products'
    `);
    console.log('\nColumns in products table:');
    columns.rows.forEach(c => {
        console.log(`  ${c.column_name}: ${c.data_type}`);
    });

    // 2. Count products by audience and active status
    const countQuery = await client.query(`
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN 'patient' = ANY(target_audience) THEN 1 END) as patient_targeted,
            COUNT(CASE WHEN 'doctor' = ANY(target_audience) THEN 1 END) as doctor_targeted
        FROM products
    `);
    console.log('\nProducts counts:');
    console.log(countQuery.rows[0]);

    // Let's see if we have is_active or similar boolean fields
    const hasIsActive = columns.rows.some(c => c.column_name === 'is_active');
    const hasStatus = columns.rows.some(c => c.column_name === 'status');
    console.log(`\nHas is_active: ${hasIsActive}, Has status: ${hasStatus}`);

    // 3. Inspect patient_store_categories
    console.log('\npatient_store_categories:');
    const cats = await client.query('SELECT * FROM patient_store_categories ORDER BY sort_order, id');
    cats.rows.forEach(r => {
        console.log(`- ID: ${r.id} | Name: ${r.name} | Icon: ${r.icon} | Active: ${r.is_active} | Order: ${r.sort_order}`);
    });

    // 4. Check if there are products with duplicate categories or mismatch
    const prodCats = await client.query('SELECT DISTINCT category FROM products');
    console.log('\nUnique categories in products table:');
    prodCats.rows.forEach(r => {
        console.log(`- ${r.category}`);
    });

    await client.end();
}

run().catch(console.error);
