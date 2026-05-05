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
            SELECT id, name, public 
            FROM storage.buckets;
        `);
        
        console.log("=== STORAGE BUCKETS ===");
        res.rows.forEach(r => {
            console.log(`- ID: ${r.id}, Name: ${r.name}, Public: ${r.public}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspect();
