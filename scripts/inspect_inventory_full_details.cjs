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
        
        // 1. Is it a table or view?
        const tableRes = await client.query(`
            SELECT table_type 
            FROM information_schema.tables 
            WHERE table_name = 'inventory';
        `);
        console.log(`Type of inventory: ${tableRes.rows[0]?.table_type}`);

        // 2. Column Defaults for inventory
        const defaultRes = await client.query(`
            SELECT column_name, column_default, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'inventory'
            ORDER BY ordinal_position;
        `);
        console.log("\n=== INVENTORY COLUMN DEFAULTS ===");
        defaultRes.rows.forEach(r => console.log(`${r.column_name}: default=${r.column_default} nullable=${r.is_nullable}`));

        // 3. ANY internal or statement triggers?
        const trRes = await client.query(`
            SELECT tgname, tgisinternal, pg_get_triggerdef(oid)
            FROM pg_trigger 
            WHERE tgrelid = (SELECT oid FROM pg_class WHERE relname = 'inventory');
        `);
        console.log("\n=== ALL TRIGGERS ON INVENTORY ===");
        trRes.rows.forEach(r => console.log(`${r.tgname} (internal=${r.tgisinternal}): ${r.pg_get_triggerdef}`));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
