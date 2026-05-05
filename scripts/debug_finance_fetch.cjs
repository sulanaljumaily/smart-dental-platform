const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE env variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Target supplier ID from the user log:
const TARGET_SUPPLIER_ID = '64c72ad9-fa3a-4aaf-84b8-513ab96d6cdc'; 
// Assuming this is also the user.id IF direct match was used.
const TEST_USER_ID = TARGET_SUPPLIER_ID; 

async function run() {
    console.log(`--- DEBUGGING useSupplierFinance logic for User: ${TEST_USER_ID} ---`);

    // 1. Fetch Supplier row from suppliers
    console.log("\n1. Querying suppliers table...");
    const { data: supplier, error: supError } = await supabase
        .from('suppliers')
        .select('id, commission_percentage, pending_commission')
        .or(`user_id.eq.${TEST_USER_ID},profile_id.eq.${TEST_USER_ID}`)
        .maybeSingle();

    console.log("Result for .or():", supplier);
    if (supError) console.error("Error .or():", supError);

    let supplierId = supplier?.id || '';
    let commissionRate = supplier?.commission_percentage || 2.5;

    if (!supplier) {
        console.log("\n1b. Falling back to directMatch .eq('id', user.id)...");
        const { data: directMatch, error: directError } = await supabase
            .from('suppliers')
            .select('id, commission_percentage, pending_commission')
            .eq('id', TEST_USER_ID)
            .maybeSingle();

        console.log("Result for directMatch:", directMatch);
        if (directError) console.error("Error directMatch:", directError);
        if (directMatch) {
            supplierId = directMatch.id;
            commissionRate = directMatch.commission_percentage || 2.5;
        }
    }

    if (!supplierId) {
        console.log("\n[ABORT] No supplierId resolved!");
        return;
    }

    console.log(`\nResolved Supplier ID: ${supplierId}`);
    console.log(`Commission Rate: ${commissionRate}%`);

    // 2. Fetch Orders
    console.log(`\n2. Querying store_orders for supplier_id = ${supplierId}...`);
    const { data: orders, error: ordersError } = await supabase
        .from('store_orders')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

    if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        return;
    }

    console.log(`Found ${orders?.length || 0} orders.`);
    if (orders && orders.length > 0) {
        orders.forEach(o => {
            console.log(` - Order #${o.order_number || o.id.slice(0,8)} | Status: '${o.status}' | Total: ${o.total_amount}`);
        });

        const deliveredOrders = orders.filter(o => ['delivered', 'تم التسليم', 'مكتمل'].includes(o.status));
        console.log(` - Delivered/Completed: ${deliveredOrders.length} orders.`);
        const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        console.log(` - Calculated Total Revenue: ${totalRevenue}`);
    } else {
        console.log("No orders returned from query.");
    }
}

run();
