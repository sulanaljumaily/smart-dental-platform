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
        
        const userRes = await client.query(`SELECT id FROM profiles LIMIT 1;`);
        if (userRes.rows.length === 0) {
            console.error("No users found");
            return;
        }
        const doctorId = userRes.rows[0].id;

        const planRes = await client.query(`SELECT id FROM subscription_plans LIMIT 1;`);
        const planId = planRes.rows[0]?.id || '00000000-0000-0000-0000-000000000000';

        try {
            const insertRes = await client.query(`
                INSERT INTO subscription_requests (doctor_id, user_id, plan_id, status, payment_method, amount_paid) 
                VALUES ($1, $1, $2, 'pending', 'cash', 150000)
                RETURNING id;
            `, [doctorId, planId]);
            const reqId = insertRes.rows[0].id;
            console.log(`\nVerification successful: dummy request inserted with ID: ${reqId}`);

            // cleanup
            await client.query(`DELETE FROM subscription_requests WHERE id = $1`, [reqId]);
            console.log("Cleanup complete.");
        } catch (e) {
            console.error("\n=== INSERTION FAILED ===");
            console.error(e.message);
        }

    } catch (err) {
        console.error("Connection error:", err);
    } finally {
        await client.end();
    }
}

verify();
