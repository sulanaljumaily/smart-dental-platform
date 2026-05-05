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

async function inspectView() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT table_name, view_definition FROM information_schema.views WHERE table_name = 'clinic_members';
        `);
        if (res.rows.length > 0) {
            console.log("--- VIEW DEFINITION ---");
            console.log(res.rows[0].view_definition);
        } else {
            console.log("clinic_members is not a view in information_schema.views.");
            // check if it's a table
            const res2 = await client.query(`
                SELECT pol.polname, pg_get_expr(pol.polqual, pol.polrelid) AS qual FROM pg_policy pol JOIN pg_class rel ON pol.polrelid = rel.oid WHERE rel.relname = 'clinic_members';
            `);
            console.log("--- CLINIC_MEMBERS POLICIES ---");
            res2.rows.forEach(r => console.log(r));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspectView();
