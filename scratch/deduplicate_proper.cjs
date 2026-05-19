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
    console.log('DEDUPLICATING & SEEDING CATEGORIES PROPERLY');
    console.log('='.repeat(60));

    // Fetch all categories
    const res = await client.query('SELECT * FROM patient_store_categories');
    console.log(`Found ${res.rows.length} total categories in database.`);

    const byName = {};
    for (const row of res.rows) {
        if (!byName[row.name]) {
            byName[row.name] = [];
        }
        byName[row.name].push(row);
    }

    const idsToDelete = [];
    const keptCategories = [];

    for (const [name, rows] of Object.entries(byName)) {
        if (rows.length > 1) {
            console.log(`Found duplicates for category: "${name}" (${rows.length} rows)`);
            // Sort by id string representation (or created_at if available)
            rows.sort((a, b) => String(a.id).localeCompare(String(b.id)));
            const keep = rows[0];
            keptCategories.push(keep);
            console.log(`  Keeping category with ID: ${keep.id}`);
            for (let i = 1; i < rows.length; i++) {
                console.log(`  Deleting duplicate category with ID: ${rows[i].id}`);
                idsToDelete.push(rows[i].id);
            }
        } else {
            keptCategories.push(rows[0]);
        }
    }

    if (idsToDelete.length > 0) {
        console.log(`Executing deletion of ${idsToDelete.length} rows...`);
        const deleteQuery = {
            text: 'DELETE FROM patient_store_categories WHERE id = ANY($1)',
            values: [idsToDelete],
        };
        const delRes = await client.query(deleteQuery);
        console.log(`Successfully deleted ${delRes.rowCount} rows.`);
    } else {
        console.log('No duplicates found in patient_store_categories.');
    }

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

    // Print final list of active categories
    console.log('\nFinal list of categories in patient_store_categories:');
    const finalRes = await client.query('SELECT * FROM patient_store_categories ORDER BY sort_order, name');
    finalRes.rows.forEach(r => {
        console.log(`- ID: ${r.id} | Name: ${r.name} | Icon: ${r.icon} | Active: ${r.is_active} | Order: ${r.sort_order}`);
    });

    await client.end();
}

run().catch(async (err) => {
    console.error('An error occurred:', err);
    try {
        await client.end();
    } catch (_) {}
});
