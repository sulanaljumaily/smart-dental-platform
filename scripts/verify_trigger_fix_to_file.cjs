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

async function verify() {
    try {
        await client.connect();
        
        const userRes = await client.query(`SELECT id FROM profiles LIMIT 1;`);
        const ownerId = userRes.rows[0].id;

        try {
            const insertRes = await client.query(`
                INSERT INTO clinics (name, governorate, address, owner_id, phone) 
                VALUES ('عيادة التجربة الموحدة', 'بغداد', 'شارع حيفا', $1, '0770000000')
                RETURNING id;
            `, [ownerId]);
            const clinicId = insertRes.rows[0].id;

            const inventoryRes = await client.query(`
                SELECT item_name FROM inventory WHERE clinic_id = $1;
            `, [clinicId]);

            const treatmentsRes = await client.query(`
                SELECT name FROM treatments WHERE clinic_id = $1;
            `, [clinicId]);

            // Clean up
            await client.query(`DELETE FROM inventory WHERE clinic_id = $1`, [clinicId]);
            await client.query(`DELETE FROM treatments WHERE clinic_id = $1`, [clinicId]);
            await client.query(`DELETE FROM clinics WHERE id = $1`, [clinicId]);

            fs.writeFileSync('C:\\Users\\AL NABAA\\Desktop\\ANTI\\smart-dental\\error_log.json', JSON.stringify({ 
                success: true, 
                clinicId,
                inventorySeeded: inventoryRes.rows.length,
                treatmentsSeeded: treatmentsRes.rows.length
            }, null, 2));

        } catch (e) {
            const errDetails = {
                message: e.message,
                detail: e.detail,
                hint: e.hint,
                table: e.table,
                column: e.column,
                constraint: e.constraint,
                code: e.code
            };
            fs.writeFileSync('C:\\Users\\AL NABAA\\Desktop\\ANTI\\smart-dental\\error_log.json', JSON.stringify(errDetails, null, 2));
        }

    } catch (err) {
        fs.writeFileSync('C:\\Users\\AL NABAA\\Desktop\\ANTI\\smart-dental\\error_log.json', JSON.stringify({ connection_error: err.message }, null, 2));
    } finally {
        await client.end();
    }
}

verify();
