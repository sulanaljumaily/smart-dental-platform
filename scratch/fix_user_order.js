const url = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzcwNTYsImV4cCI6MjA4NDQxMzA1Nn0.56MIbpOtVu9b_fwEyo-hvlxGxA_E5c-nU7q1MSfTg-g';

async function run() {
  console.log("=== SEARCHING FOR ORDER ===");
  const res1 = await fetch(`${url}/rest/v1/store_orders?order_number=eq.ORD-979132950-64c7&select=*`, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`
    }
  });
  const orders = await res1.json();
  console.log("Found orders:", JSON.stringify(orders, null, 2));

  if (orders && orders.length > 0) {
    const orderId = orders[0].id;
    console.log(`Updating order ID: ${orderId} to Sultan Sulaiman Said (fff3a4fc-802f-421b-be34-33f6f68ec0d3)...`);
    
    // Update order supplier_id and order_number
    // Wait! Let's update the order_number suffix too if it is -64c7 to -fff3
    const newOrderNumber = 'ORD-979132950-fff3';
    const resUpdateOrder = await fetch(`${url}/rest/v1/store_orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        supplier_id: 'fff3a4fc-802f-421b-be34-33f6f68ec0d3',
        order_number: newOrderNumber
      })
    });
    console.log("Update Order Response status:", resUpdateOrder.status);

    // Update order items supplier_id
    const resUpdateItems = await fetch(`${url}/rest/v1/store_order_items?order_id=eq.${orderId}`, {
      method: 'PATCH',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        supplier_id: 'fff3a4fc-802f-421b-be34-33f6f68ec0d3'
      })
    });
    console.log("Update Items Response status:", resUpdateItems.status);
  } else {
    // If not found, let's search broadly for all orders to see if the order number is slightly different
    console.log("=== SEARCHING BROADLY ===");
    const res2 = await fetch(`${url}/rest/v1/store_orders?order_number=like.*979132950*&select=*`, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });
    const broadOrders = await res2.json();
    console.log("Broad search results:", JSON.stringify(broadOrders, null, 2));
  }
}

run();
