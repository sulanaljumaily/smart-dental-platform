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

    console.log('--- Database Verification & Fix ---');

    // 1. Check if products.featured_order exists
    const featuredOrderCol = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'featured_order'
    `);
    
    if (featuredOrderCol.rows.length === 0) {
        console.log('Adding featured_order to products table...');
        await client.query(`
            ALTER TABLE public.products 
            ADD COLUMN IF NOT EXISTS featured_order INTEGER DEFAULT 0;
        `);
        console.log('  featured_order column added successfully!');
    } else {
        console.log('featured_order column already exists in products.');
    }

    // 2. Check for orphaned records in deal_requests
    console.log('\nChecking for orphaned records in deal_requests...');
    const orphanedProducts = await client.query(`
        SELECT dr.id, dr.product_id 
        FROM deal_requests dr 
        LEFT JOIN products p ON dr.product_id = p.id 
        WHERE p.id IS NULL
    `);
    
    if (orphanedProducts.rows.length > 0) {
        console.log(`Found ${orphanedProducts.rows.length} orphaned product references in deal_requests. Deleting them...`);
        for (const row of orphanedProducts.rows) {
            await client.query('DELETE FROM deal_requests WHERE id = $1', [row.id]);
        }
        console.log('  Orphaned product references deleted.');
    } else {
        console.log('  No orphaned product references found.');
    }

    const orphanedSuppliers = await client.query(`
        SELECT dr.id, dr.supplier_id 
        FROM deal_requests dr 
        LEFT JOIN suppliers s ON dr.supplier_id = s.id 
        WHERE s.id IS NULL
    `);
    
    if (orphanedSuppliers.rows.length > 0) {
        console.log(`Found ${orphanedSuppliers.rows.length} orphaned supplier references in deal_requests. Deleting them...`);
        for (const row of orphanedSuppliers.rows) {
            await client.query('DELETE FROM deal_requests WHERE id = $1', [row.id]);
        }
        console.log('  Orphaned supplier references deleted.');
    } else {
        console.log('  No orphaned supplier references found.');
    }

    // 3. Add Foreign Key constraints to deal_requests
    console.log('\nAdding Foreign Key constraints to deal_requests...');
    try {
        await client.query(`
            ALTER TABLE public.deal_requests 
            ADD CONSTRAINT fk_deal_requests_product 
            FOREIGN KEY (product_id) 
            REFERENCES public.products(id) 
            ON DELETE CASCADE;
        `);
        console.log('  fk_deal_requests_product constraint added successfully!');
    } catch (e) {
        if (e.message.includes('already exists')) {
            console.log('  fk_deal_requests_product constraint already exists.');
        } else {
            console.error('  Failed to add fk_deal_requests_product:', e.message);
        }
    }

    try {
        await client.query(`
            ALTER TABLE public.deal_requests 
            ADD CONSTRAINT fk_deal_requests_supplier 
            FOREIGN KEY (supplier_id) 
            REFERENCES public.suppliers(id) 
            ON DELETE CASCADE;
        `);
        console.log('  fk_deal_requests_supplier constraint added successfully!');
    } catch (e) {
        if (e.message.includes('already exists')) {
            console.log('  fk_deal_requests_supplier constraint already exists.');
        } else {
            console.error('  Failed to add fk_deal_requests_supplier:', e.message);
        }
    }

    // 4. Reload PostgREST schema cache
    console.log('\nReloading PostgREST schema cache...');
    await client.query('NOTIFY pgrst, \'reload schema\';');
    console.log('  Schema reload notification sent!');

    await client.end();
    console.log('\n--- Finished Database Fixes ---');
}

run().catch(console.error);
