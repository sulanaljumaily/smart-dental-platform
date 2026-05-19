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
    console.log('DEDUPLICATING & SEEDING CATEGORIES (FIXED UUID)');
    console.log('='.repeat(60));

    // 1. Delete duplicate categories keeping only the first one sorted by ID text
    console.log('Cleaning up duplicates in patient_store_categories...');
    const deleteResult = await client.query(`
        DELETE FROM patient_store_categories 
        WHERE id IN (
            SELECT id 
            FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY id::text) as rn 
                FROM patient_store_categories
            ) t 
            WHERE t.rn > 1
        )
    `);
    console.log(`Deleted ${deleteResult.rowCount} duplicate category rows.`);

    // 2. Ensure "المنتجات الجديدة" exists
    console.log('Checking for "المنتجات الجديدة" category...');
    const checkCat = await client.query("SELECT id FROM patient_store_categories WHERE name = 'المنتجات الجديدة'");
    if (checkCat.rows.length === 0) {
        console.log('Inserting "المنتجات الجديدة" category...');
        await client.query(`
            INSERT INTO patient_store_categories (name, icon, is_active, sort_order)
            VALUES ('المنتجات الجديدة', '✨', true, 0)
        `);
        console.log('Inserted "المنتجات الجديدة" category successfully.');
    } else {
        console.log('"المنتجات الجديدة" category already exists.');
    }

    // 3. Inspect final state of patient_store_categories
    console.log('\nFinal categories in patient_store_categories:');
    const cats = await client.query('SELECT * FROM patient_store_categories ORDER BY sort_order, id');
    cats.rows.forEach(r => {
        console.log(`- ID: ${r.id} | Name: ${r.name} | Icon: ${r.icon} | Active: ${r.is_active} | Order: ${r.sort_order}`);
    });

    await client.end();
}

run().catch(console.error);
