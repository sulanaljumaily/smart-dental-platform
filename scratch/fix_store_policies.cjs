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

    console.log('--- Applying Missing UPDATE & DELETE Policies ---');

    const tables = [
        { name: 'promotional_cards', suffix: ' 3' },
        { name: 'coupons', suffix: '' },
        { name: 'promotions', suffix: ' 2' },
        { name: 'offer_requests', suffix: ' 4' }
    ];

    for (const table of tables) {
        console.log(`\nAdding policies for ${table.name}:`);

        // Check and create UPDATE policy
        const updatePolicyName = `Allow Update All${table.suffix}`;
        try {
            await client.query(`
                DROP POLICY IF EXISTS "${updatePolicyName}" ON public.${table.name};
                CREATE POLICY "${updatePolicyName}" ON public.${table.name} 
                FOR UPDATE USING (true) WITH CHECK (true);
            `);
            console.log(`  Added UPDATE policy: "${updatePolicyName}"`);
        } catch (e) {
            console.error(`  Failed to add UPDATE policy for ${table.name}:`, e.message);
        }

        // Check and create DELETE policy
        const deletePolicyName = `Allow Delete All${table.suffix}`;
        try {
            await client.query(`
                DROP POLICY IF EXISTS "${deletePolicyName}" ON public.${table.name};
                CREATE POLICY "${deletePolicyName}" ON public.${table.name} 
                FOR DELETE USING (true);
            `);
            console.log(`  Added DELETE policy: "${deletePolicyName}"`);
        } catch (e) {
            console.error(`  Failed to add DELETE policy for ${table.name}:`, e.message);
        }
    }

    // Reload PostgREST schema cache
    console.log('\nReloading PostgREST schema cache...');
    await client.query('NOTIFY pgrst, \'reload schema\';');
    console.log('  Schema reload notification sent!');

    await client.end();
    console.log('\n--- Finished Applying Policies ---');
}

run().catch(console.error);
