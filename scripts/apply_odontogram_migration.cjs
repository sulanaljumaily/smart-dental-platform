const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgzNzA1NiwiZXhwIjoyMDg0NDEzMDU2fQ.sk_hZ5mkw6aKg6_y4h5bOq3hH7t4E9KKNX8bL0kxkMw';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const sql = `
CREATE TABLE IF NOT EXISTS public.odontogram_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tooth_number INT NOT NULL CHECK (
        (tooth_number BETWEEN 11 AND 18) OR
        (tooth_number BETWEEN 21 AND 28) OR
        (tooth_number BETWEEN 31 AND 38) OR
        (tooth_number BETWEEN 41 AND 48)
    ),
    state VARCHAR(50) NOT NULL CHECK (state IN (
        'healthy', 'decayed', 'broken', 'stained', 'abscess', 'impacted',
        'filled', 'endo', 'crown', 'bridge', 'implant', 'ortho'
    )),
    svg_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT unique_tooth_state UNIQUE (tooth_number, state)
);

ALTER TABLE public.odontogram_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_odontogram" ON public.odontogram_templates;
CREATE POLICY "public_read_odontogram"
    ON public.odontogram_templates FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "admin_write_odontogram" ON public.odontogram_templates;
CREATE POLICY "admin_write_odontogram"
    ON public.odontogram_templates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

NOTIFY pgrst, 'reload schema';
`;

async function run() {
    console.log('Applying odontogram_templates migration...');
    let result;
    try {
        result = await supabase.rpc('exec_sql', { query: sql });
    } catch (e) {
        result = { data: null, error: e };
    }
    const { data, error } = result;
    
    if (error) {
        // Try direct REST approach
        console.log('Trying direct table creation via REST...');
        const { error: e2 } = await supabase.from('odontogram_templates').select('id').limit(1);
        if (e2 && e2.code === '42P01') {
            console.log('Table does not exist. Please run the SQL manually in Supabase SQL editor.');
            console.log('\n--- COPY THIS SQL TO SUPABASE SQL EDITOR ---\n');
            console.log(sql);
        } else if (!e2) {
            console.log('✅ Table odontogram_templates already exists!');
        } else {
            console.log('Table status:', e2);
        }
    } else {
        console.log('✅ Migration applied successfully!', data);
    }
}

run();
