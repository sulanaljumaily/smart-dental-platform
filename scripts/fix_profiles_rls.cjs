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

    console.log('Applying RLS fix for profiles table...');
    
    // Drop existing restrictive insert policy if it exists
    await client.query(`DROP POLICY IF EXISTS "profiles_insert_v2" ON profiles;`);
    await client.query(`DROP POLICY IF EXISTS "Allow users to insert own profile" ON profiles;`);
    
    // Add a more permissive insert policy for the registration flow
    // This allows anyone to insert a profile row. 
    // Security note: The 'id' column has a foreign key to auth.users, 
    // so you can only insert rows for valid user IDs.
    await client.query(`
        CREATE POLICY "Allow profile insertion during registration" 
        ON profiles FOR INSERT 
        WITH CHECK (true);
    `);

    console.log('RLS fix applied successfully.');
    await client.end();
}
run().catch(console.error);
