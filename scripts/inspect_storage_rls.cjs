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

async function inspect() {
    try {
        await client.connect();
        
        const res = await client.query(`
            SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS qual, pg_get_expr(polwithcheck, polrelid) AS withcheck
            FROM pg_policy 
            WHERE polrelid = (SELECT oid FROM pg_class WHERE relname = 'objects' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage'));
        `);
        
        console.log("=== RLS POLICIES ON storage.objects ===");
        res.rows.forEach(r => {
            console.log(`\n- Policy: ${r.polname} (Cmd: ${r.polcmd})`);
            console.log(`  Qual: ${r.qual}`);
            console.log(`  WithCheck: ${r.withcheck}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
