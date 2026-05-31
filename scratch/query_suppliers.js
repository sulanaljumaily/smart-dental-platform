const url = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzcwNTYsImV4cCI6MjA4NDQxMzA1Nn0.56MIbpOtVu9b_fwEyo-hvlxGxA_E5c-nU7q1MSfTg-g';

async function run() {
  console.log("=== SUPPLIERS ===");
  const res1 = await fetch(`${url}/rest/v1/suppliers?select=*`, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`
    }
  });
  const suppliers = await res1.json();
  console.log(JSON.stringify(suppliers, null, 2));

  console.log("=== PRODUCTS ===");
  const res2 = await fetch(`${url}/rest/v1/products?select=id,name,supplier_id,supplier:suppliers(name)&limit=5`, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`
    }
  });
  const products = await res2.json();
  console.log(JSON.stringify(products, null, 2));
}

run();
