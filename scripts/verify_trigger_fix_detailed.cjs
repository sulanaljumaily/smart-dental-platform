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
        
        // 1. Fetch a valid user ID to act as owner
        const userRes = await client.query(`SELECT id FROM profiles LIMIT 1;`);
        if (userRes.rows.length === 0) {
            console.error("No users found in profiles to test as owner.");
            return;
        }
        const ownerId = userRes.rows[0].id;
        console.log(`Using owner ID: ${ownerId}`);

        console.log("Inserting dummy clinic...");
        try {
            const insertRes = await client.query(`
                INSERT INTO clinics (name, governorate, address, owner_id) 
                VALUES ('عيادة التجربة الموحدة', 'بغداد', 'شارع حيفا', $1)
                RETURNING id;
            `, [ownerId]);
            const clinicId = insertRes.rows[0].id;
            console.log(`Dummy clinic inserted with ID: ${clinicId}`);

            const inventoryRes = await client.query(`
                SELECT item_name, category FROM inventory WHERE clinic_id = $1;
            `, [clinicId]);
            console.log(`\nInventory seeded with ${inventoryRes.rows.length} items.`);

            const treatmentsRes = await client.query(`
                SELECT name FROM treatments WHERE clinic_id = $1;
            `, [clinicId]);
            console.log(`Treatments seeded with ${treatmentsRes.rows.length} items.\n`);

            await client.query(`DELETE FROM inventory WHERE clinic_id = $1`, [clinicId]);
            await client.query(`DELETE FROM treatments WHERE clinic_id = $1`, [clinicId]);
            await client.query(`DELETE FROM clinics WHERE id = $1`, [clinicId]);
            console.log("Verification Clean up complete.");
        } catch (e) {
            console.error("\n=== INSERTION FAILED ===");
            console.error("Message:", e.message);
            console.error("Detail:", e.detail);
            console.error("Table:", e.table);
            console.error("Constraint:", e.constraint);
        }

    } catch (err) {
        console.error("Connection error:", err);
    } finally {
        await client.end();
    }
}

verify();
