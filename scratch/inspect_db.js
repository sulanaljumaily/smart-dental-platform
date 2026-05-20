const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgzNzA1NiwiZXhwIjoyMDg0NDEzMDU2fQ.sk_hZ5mkw6aKg6_y4h5bOq3hH7t4E9KKNX8bL0kxkMw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- FETCHING BRANDS ---');
  const { data: brands, error: bError } = await supabase.from('brands').select('*');
  if (bError) console.error('Brands error:', bError);
  else console.log('Brands count:', brands.length, '\n', brands);

  console.log('--- FETCHING SUPPLIERS ---');
  const { data: suppliers, error: sError } = await supabase.from('suppliers').select('*');
  if (sError) console.error('Suppliers error:', sError);
  else console.log('Suppliers count:', suppliers.length, '\n', suppliers);
}

main();
