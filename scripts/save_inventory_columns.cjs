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

async function inspect() {
    try {
        await client.connect();
        
        // 1. Column Defaults for inventory
        const defaultRes = await client.query(`
            SELECT column_name, column_default, is_nullable, data_type
            FROM information_schema.columns 
            WHERE table_name = 'inventory'
            ORDER BY ordinal_position;
        `);
        fs.writeFileSync('C:\\Users\\AL NABAA\\Desktop\\ANTI\\smart-dental\\inventory_columns.json', JSON.stringify(defaultRes.rows, null, 2));
        console.log("Saved column defaults to inventory_columns.json");

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
