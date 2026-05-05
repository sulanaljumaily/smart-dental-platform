const { Client } = require('pg');

const DB_CONFIG = {
    user: 'postgres.nhueyaeyutfmadbgghfe',
    password: '10770$ULTAn0770',
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
};

const client = new Client(DB_CONFIG);

async function verify() {
    try {
        await client.connect();
        
        // 1. Insert dummy clinic
        console.log("Inserting dummy clinic...");
        const insertRes = await client.query(`
            INSERT INTO clinics (name, governorate, address) 
            VALUES ('عيادة التجربة الموحدة', 'بغداد', 'شارع حيفا')
            RETURNING id;
        `);
        const clinicId = insertRes.rows[0].id;
        console.log(`Dummy clinic inserted with ID: ${clinicId}`);

        // 2. Check for inventory items
        console.log("Checking inventory seeding...");
        const inventoryRes = await client.query(`
            SELECT item_name, category 
            FROM inventory 
            WHERE clinic_id = $1;
        `, [clinicId]);
        
        console.log(`Inventory seeded with ${inventoryRes.rows.length} items.`);
        inventoryRes.rows.forEach(r => console.log(`- ${r.item_name} (${r.category})`));

        // 3. Cleanup
        console.log("Cleaning up dummy clinic...");
        await client.query(`DELETE FROM inventory WHERE clinic_id = $1`, [clinicId]);
        await client.query(`DELETE FROM clinics WHERE id = $1`, [clinicId]);
        console.log("Cleanup complete.");

    } catch (err) {
        console.error("Verification failed:", err);
    } finally {
        await client.end();
    }
}

verify();
