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
    console.log('PRODUCTS COLUMNS & INSPECTION');
    console.log('='.repeat(60));

    // Get all columns of products table
    const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'products'
    `);
    console.log('Columns in products table:');
    columns.rows.forEach(c => {
        console.log(`  ${c.column_name}: ${c.data_type}`);
    });

    // 1. Total products in the database
    const totalProds = await client.query('SELECT count(*) FROM products');
    console.log(`\nTotal products in database: ${totalProds.rows[0].count}`);

    // 2. Sample products
    const sampleProds = await client.query(`
        SELECT p.id, p.name, p.target_audience, p.supplier_id, s.name as supplier_name, s.store_type as supplier_store_type
        FROM products p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LIMIT 10
    `);
    console.log('\nSample Products:');
    sampleProds.rows.forEach(r => {
        console.log(`- ID: ${r.id} | Name: ${r.name} | Audience: ${JSON.stringify(r.target_audience)} | Supplier: ${r.supplier_name} (${r.supplier_store_type})`);
    });

    // 3. Products targeted at patient
    const patientProds = await client.query(`
        SELECT p.id, p.name, p.target_audience, s.name as supplier_name, s.store_type as supplier_store_type
        FROM products p
        JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.target_audience @> '{"patient"}'::text[]
    `);
    console.log(`\nProducts with target_audience containing 'patient': ${patientProds.rows.length}`);
    patientProds.rows.forEach(r => {
        console.log(`- ID: ${r.id} | Name: ${r.name} | Audience: ${JSON.stringify(r.target_audience)} | Supplier: ${r.supplier_name} (${r.supplier_store_type})`);
    });

    // 5. Let's inspect patient_store_categories duplicates
    const cats = await client.query('SELECT * FROM patient_store_categories ORDER BY sort_order');
    console.log('\nCategories in patient_store_categories:');
    cats.rows.forEach(r => {
        console.log(`- ID: ${r.id} | Name: ${r.name} | Icon: ${r.icon} | Active: ${r.is_active} | Order: ${r.sort_order}`);
    });

    await client.end();
}

run().catch(console.error);
