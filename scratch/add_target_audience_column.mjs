import { createClient } from '@supabase/supabase-js';

const url = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const srKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgzNzA1NiwiZXhwIjoyMDg0NDEzMDU2fQ.sk_hZ5mkw6aKg6_y4h5bOq3hH7t4E9KKNX8bL0kxkMw';

const supabase = createClient(url, srKey);

async function runMigration() {
    console.log('Running database migration for brands...');
    
    // Add column if it doesn't exist
    const addColumnSql = `
        ALTER TABLE public.brands 
        ADD COLUMN IF NOT EXISTS target_audience text[] DEFAULT '{"clinic", "lab"}';
    `;
    
    // Update existing nulls
    const updateExistingSql = `
        UPDATE public.brands 
        SET target_audience = '{"clinic", "lab"}' 
        WHERE target_audience IS NULL;
    `;
    
    // Let's execute these
    const { data: res1, error: err1 } = await supabase.rpc('exec_sql', { sql: addColumnSql });
    if (err1) {
        console.error('Error adding column target_audience:', err1);
    } else {
        console.log('Successfully added target_audience column (or it already existed)!');
    }
    
    const { data: res2, error: err2 } = await supabase.rpc('exec_sql', { sql: updateExistingSql });
    if (err2) {
        console.error('Error updating existing brands:', err2);
    } else {
        console.log('Successfully updated existing brands to default clinics/labs target audience!');
    }

    // Verify columns on brands table
    const verifySql = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'brands';
    `;
    const { data: cols, error: err3 } = await supabase.rpc('exec_sql', { sql: verifySql });
    if (err3) {
        console.error('Error verifying columns:', err3);
    } else {
        console.log('Brands columns list:', cols);
    }
}

runMigration();
