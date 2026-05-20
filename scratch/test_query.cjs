const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgzNzA1NiwiZXhwIjoyMDg0NDEzMDU2fQ.sk_hZ5mkw6aKg6_y4h5bOq3hH7t4E9KKNX8bL0kxkMw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- TEST QUERY ---');
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, logo, description: address, is_active: is_verified')
    .in('store_type', ['patient', 'both'])
    .order('name');
  
  if (error) {
    console.error('Query failed:', error);
  } else {
    console.log('Query success:', data);
  }
}

main();
